#!/usr/bin/env python3
"""Extract versioned DPM template axes and resolve module taxonomies by date.

The EBA annotated-layout archives are release deltas in many versions. This
builder records each observed layout with source provenance, then derives
per-template intervals from the curated module_release_schedule.csv. Unknown
effective dates are retained as unresolved rows instead of being guessed.
"""

from __future__ import annotations

import argparse
import csv
import functools
import io
import json
import re
import sys
import zipfile
from collections import defaultdict
from datetime import date
from pathlib import Path
from typing import Any, Iterable

from openpyxl import load_workbook

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data" / "eba-dpm-history"
SOURCE_DIR = DATA / "sources"
OUTPUT_DIR = DATA / "generated"
SCHEDULE = DATA / "module_release_schedule.csv"

AXIS_COORDINATES = {
    "x": "x_axis_rc_code",
    "y": "y_axis_rc_code",
    "z": "z_axis_rc_code",
}
VERSION_RE = re.compile(r"(?<!\d)(4\.2\.1|4\.2|4\.1|4\.0|3\.5|3\.4|3\.3|3\.2|3\.1|3\.0(?:\.1)?|2\.10(?:\.1)?|2\.9\.1\.1)(?!\d)")
DOMAIN_REF_RE = re.compile(r"\(([A-Za-z0-9_]+):([A-Za-z0-9_]+)(?:\(([A-Za-z0-9_]+)\))?\)")
NUMERIC_CODE_RE = re.compile(r"^\d{1,4}$")


def clean(value: Any) -> str:
    if value is None:
        return ""
    return " ".join(str(value).replace("\r", " ").replace("\n", " ").split())


def code_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, bool):
        return ""
    if isinstance(value, int):
        return f"{value:04d}" if 0 <= value <= 999 else str(value)
    if isinstance(value, float) and value.is_integer():
        return code_text(int(value))
    result = clean(value)
    if not NUMERIC_CODE_RE.fullmatch(result):
        return ""
    return str(int(result)) if len(result) > 1 and result.startswith("0") else result


def normalize_template(value: Any) -> str:
    text = clean(value)
    text = re.sub(r"\s*\([^)]*\)\s*$", "", text)
    text = text.strip().replace(" ", "_")
    return text


def release_from_name(filename: str, default: str) -> str:
    match = VERSION_RE.search(filename)
    return match.group(1) if match else default


def workbook_module(name: str, archive_path: str) -> str:
    """Get the module identifier from the EBA package path/name."""
    name_only = Path(name).stem
    # Legacy DPM 1.0 names encode module as the final hyphen-separated token.
    legacy = re.search(r"\d{3}(?:-P\d)?-([A-Z][A-Z0-9_-]+)(?:\s|$)", name_only)
    if legacy:
        return legacy.group(1).split("-")[-1]
    newer_legacy = re.search(r"\b3\.5-([A-Z][A-Z0-9_]+)(?:\s|$)", name_only)
    if newer_legacy:
        return newer_legacy.group(1)

    # Newer package paths carry a reporting-area folder and a module code
    # concatenated with the area code (e.g. FINREP9FINREP, SEPA_IPRPAY).
    parts = Path(archive_path).parts
    area = next((p for p in reversed(parts[:-1]) if p.upper() in {
        "AE", "COREP", "DORA", "ESG", "FC", "FINREP", "FP", "GSII", "IF",
        "IMPRAC", "IPU", "IRRBB", "MICA", "MREL", "PAY", "PILLAR3", "REM", "RES", "SBP",
    }), "")
    matches = list(re.finditer(r"\b([A-Z][A-Z0-9_]*?" + re.escape(area) + r")\s+4\.\d", name_only)) if area else []
    if matches:
        token = matches[-1].group(1)
        return token[:-len(area)] or area
    # Flat 4.0/4.1 packages have no area directory. Strip date and version
    # markers, then split a module token from its reporting-area suffix.
    stem = re.sub(r"^\d{6,8}\s+", "", name_only)
    stem = re.sub(r"\s+4\.\d(?:\.\d)?(?:\s|$).*", "", stem)
    stem = re.sub(r"^Annotated Table Layout\s+", "", stem, flags=re.I).strip()
    for area_code in ("PILLAR3", "COREP", "FINREP", "MICA", "MREL", "DORA", "IRRBB", "IMPRAC", "GSII", "ESG", "PAY", "REM", "RES", "SBP", "AE", "FC", "FP", "IF", "IPU"):
        if stem.endswith(area_code):
            return stem[:-len(area_code)] or area_code
    return stem.split()[0] if stem else "UNKNOWN"


def sheet_template(sheet: Any) -> str:
    title = clean(sheet.cell(1, 1).value)
    if " - " in title:
        title = title.split(" - ", 1)[0]
    if not title:
        title = sheet.title
    return normalize_template(title)


def find_marker_rows(sheet: Any) -> tuple[int | None, int | None]:
    columns_row = rows_row = None
    for row in sheet.iter_rows():
        for cell in row[:6]:
            value = clean(cell.value).casefold()
            if value == "columns":
                columns_row = cell.row
            elif value == "rows":
                rows_row = cell.row
        if columns_row and rows_row:
            break
    return columns_row, rows_row


def x_axis_rows(sheet: Any, columns_row: int | None, rows_row: int | None) -> list[tuple[str, str, int]]:
    if columns_row is None:
        return []
    end = rows_row or min(sheet.max_row, columns_row + 20)
    candidates: list[tuple[int, int]] = []
    for row_no in range(columns_row + 1, end):
        codes = sum(1 for col in range(1, sheet.max_column + 1) if code_text(sheet.cell(row_no, col).value))
        if codes:
            candidates.append((codes, row_no))
    if not candidates:
        return []
    max_count = max(count for count, _ in candidates)
    # Choose the last dense row of column codes; a few older layouts carry
    # auxiliary numeric identifiers above or below the actual code row.
    code_row = max(row for count, row in candidates if count == max_count)
    output = []
    for col in range(1, sheet.max_column + 1):
        code = code_text(sheet.cell(code_row, col).value)
        if not code:
            continue
        label = ""
        for previous in range(code_row - 1, columns_row, -1):
            candidate = clean(sheet.cell(previous, col).value)
            if candidate and not code_text(candidate):
                label = candidate
                break
        if label:
            output.append((code, label, code_row))
    return output


def y_axis_rows(sheet: Any, rows_row: int | None) -> list[tuple[str, str, int]]:
    if rows_row is None:
        return []
    output: list[tuple[str, str, int]] = []
    ancestors: list[str] = []
    for row_no in range(rows_row, sheet.max_row + 1):
        code = code_text(sheet.cell(row_no, 3).value)
        label = clean(sheet.cell(row_no, 2).value)
        if not code or not label or code.casefold() in {"code", "row"}:
            continue
        indent = sheet.cell(row_no, 2).alignment.indent or 0
        depth = max(0, round(float(indent) / 2))
        depth = min(depth, len(ancestors))
        ancestors = ancestors[:depth]
        ancestors.append(label)
        output.append((code, "/".join(ancestors), row_no))
    return output


@functools.lru_cache(maxsize=32)
def dictionary_items(dictionary_name: str) -> dict[str, list[tuple[str, str]]]:
    dictionary_path = Path(dictionary_name)
    if not dictionary_path.exists():
        return {}
    workbook = load_workbook(dictionary_path, read_only=True, data_only=True)
    result: dict[str, list[tuple[str, str]]] = defaultdict(list)
    try:
        if "Members" in workbook.sheetnames:
            sheet = workbook["Members"]
            header = [clean(c.value) for c in next(sheet.iter_rows(min_row=1, max_row=1))]
            idx = {name: i for i, name in enumerate(header) if name}
            if {"DomainCode", "MemberCode", "MemberLabel"}.issubset(idx):
                for row in sheet.iter_rows(min_row=2, values_only=True):
                    domain = clean(row[idx["DomainCode"]])
                    code = clean(row[idx["MemberCode"]])
                    label = clean(row[idx["MemberLabel"]])
                    if domain and code and label:
                        result[domain].append(("q" + code if code.startswith("x") else code, label))
        elif "Item" in workbook.sheetnames:
            sheet = workbook["Item"]
            header = [clean(c.value) for c in next(sheet.iter_rows(min_row=1, max_row=1))]
            idx = {name: i for i, name in enumerate(header) if name}
            if {"CategoryCode", "ItemCode", "Name"}.issubset(idx):
                for row in sheet.iter_rows(min_row=2, values_only=True):
                    category = clean(row[idx["CategoryCode"]])
                    code = clean(row[idx["ItemCode"]])
                    label = clean(row[idx["Name"]])
                    if category and code and label:
                        result[category].append((code, label))
    finally:
        workbook.close()
    return dict(result)


def dictionary_z_rows(dictionary_path: Path, sheet: Any) -> list[tuple[str, str]]:
    """Resolve enumerated sheet-per/key-value dimensions from DPM glossaries."""
    if not dictionary_path.exists():
        return []
    refs: list[tuple[str, str]] = []
    key_value_refs: list[tuple[str, str]] = []
    for row in sheet.iter_rows(min_row=1, max_row=min(sheet.max_row, 5)):
        for cell in row:
            text = clean(cell.value)
            if not text:
                continue
            for match in DOMAIN_REF_RE.finditer(text):
                first, second, nested = match.groups()
                # DPM 2.0 marks a tab dimension with <Key value>. Older DPM
                # annotates a varying dimension as (dimension:domain), while
                # fixed selections use member codes such as (AP:x42).
                if "key value" in text.casefold():
                    key_value_refs.append((nested or second, second))
                elif re.fullmatch(r"[A-Z]{2,5}", second):
                    refs.append((second, second))
    refs = list(dict.fromkeys(key_value_refs or refs))
    if not refs:
        return []

    all_items = dictionary_items(str(dictionary_path.resolve()))
    items: list[tuple[str, str]] = []
    for category_or_domain, _subcode in refs:
        items.extend(all_items.get(category_or_domain, []))
    unique: dict[str, str] = {}
    for code, label in items:
        unique.setdefault(code, label)
    return list(unique.items())


def read_schedule() -> list[dict[str, str]]:
    with SCHEDULE.open(encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def schedule_match(module: str, framework: str, template_id: str, rows: list[dict[str, str]]) -> dict[str, str] | None:
    normalized = module.upper()
    family = ".".join(framework.split(".")[:2])
    eligible_versions = {framework, family}
    if family == "3.0":
        eligible_versions.add("3.0.1")
    candidates: list[tuple[tuple[int, int], dict[str, str]]] = []
    for row in rows:
        pattern = row["module_pattern"].upper()
        if pattern == "*" or (pattern.endswith("*") and normalized.startswith(pattern[:-1])) or pattern == normalized:
            template_pattern = (row.get("template_pattern") or "").upper()
            if template_pattern and not template_id.upper().startswith(template_pattern):
                continue
            # Old packages use broad taxonomy IDs; only rows for the exact
            # framework, plus explicit earlier base rows, are applicable.
            if row["framework"] in eligible_versions:
                specificity = (len(pattern.rstrip("*")), len(template_pattern))
                candidates.append((specificity, row))
    return max(candidates, key=lambda item: item[0])[1] if candidates else None


def close_template_intervals(template_rows: Iterable[dict[str, str]]) -> list[dict[str, str]]:
    """Close snapshots only within the same module/template identity.

    A template code can be reused by unrelated modules, and some releases
    split one module into several parallel DPM 2.0 modules. Cross-module
    interval closure would incorrectly make one branch truncate another.
    Module-family aliases are resolved separately by resolve_taxonomy.py.
    """
    ordered = sorted(template_rows, key=lambda r: (r["module_code"], r["template_id"], r["effective_from"] or "9999", r["framework"]))
    by_module_template: dict[tuple[str, str], list[dict[str, str]]] = defaultdict(list)
    for row in ordered:
        if row["effective_from"]:
            by_module_template[(row["module_code"], row["template_id"])].append(row)
    for versions in by_module_template.values():
        versions.sort(key=lambda r: (r["effective_from"], r["framework"]))
        for current, following in zip(versions, versions[1:]):
            current["effective_to"] = following["effective_from"]
    return ordered


def extract_all() -> tuple[list[dict[str, str]], list[dict[str, str]], list[dict[str, str]]]:
    schedules = read_schedule()
    layout_rows: list[dict[str, str]] = []
    template_rows: dict[tuple[str, str, str], dict[str, str]] = {}
    inventory: list[dict[str, str]] = []
    dictionaries = {p.stem.removesuffix("_dictionary"): p for p in SOURCE_DIR.glob("*_dictionary.xlsx")}

    for archive in sorted(SOURCE_DIR.glob("*_layouts.zip")):
        archive_framework = archive.name.removesuffix("_layouts.zip")
        with zipfile.ZipFile(archive) as bundle:
            workbook_names = [n for n in bundle.namelist() if n.lower().endswith(".xlsx")]
            for member in workbook_names:
                module = workbook_module(member, member)
                version = release_from_name(Path(member).name, archive_framework)
                dictionary = dictionaries.get(version) or dictionaries.get(archive_framework)
                try:
                    workbook = load_workbook(io.BytesIO(bundle.read(member)), data_only=True)
                except Exception as error:
                    inventory.append({"framework": version, "module": module, "workbook": member, "sheets": "", "status": f"workbook_error: {error}"})
                    continue
                table_count = 0
                candidate_sheets = [sheet for sheet in workbook.worksheets if sheet.title.casefold() not in {"toc", "contents", "readme", "index"}]
                table_sheet_counts = defaultdict(int)
                for candidate in candidate_sheets:
                    table_sheet_counts[sheet_template(candidate)] += 1
                for sheet in candidate_sheets:
                    table_id = sheet_template(sheet)
                    if not table_id or table_id.casefold() in {"table of contents", "toc"}:
                        continue
                    columns_row, rows_row = find_marker_rows(sheet)
                    xs = x_axis_rows(sheet, columns_row, rows_row)
                    ys = y_axis_rows(sheet, rows_row)
                    header_text = " ".join(
                        clean(sheet.cell(r, c).value)
                        for r in range(1, min(sheet.max_row, 5) + 1)
                        for c in range(1, min(sheet.max_column, 12) + 1)
                    ).casefold()
                    if version.startswith("4."):
                        # DPM 2.0 uses Key value for many cell-level component
                        # dimensions. Only the explicit sheet-per declaration
                        # denotes the table's Z axis.
                        has_variable_tab_axis = "sheet per" in header_text
                    else:
                        has_variable_tab_axis = (
                            "sheet per" in header_text
                            or (table_sheet_counts[table_id] > 1 and bool(re.search(r"\([^)]*\d{3,4}\)\s*$", clean(sheet.title))))
                        )
                    zs = dictionary_z_rows(dictionary, sheet) if has_variable_tab_axis else []
                    effective = schedule_match(module, version, table_id, schedules)
                    status = effective["status"] if effective else "needs_effective_date"
                    from_date = effective["effective_from"] if effective else ""
                    source_note = effective["evidence"] if effective else "No module/date rule matched; do not infer an effective date."
                    if columns_row is None and rows_row is None:
                        continue
                    table_count += 1
                    template_key = (module, table_id, version)
                    template_rows[template_key] = {
                        "module_code": module,
                        "template_id": table_id,
                        "framework": version,
                        "effective_from": from_date,
                        "effective_to": "",
                        "status": status,
                        "effective_source": effective["source_url"] if effective else "",
                        "effective_evidence": source_note,
                        "source_archive": archive.name,
                        "source_workbook": member,
                        "source_sheet": sheet.title,
                    }
                    for axis, entries in (("x", xs), ("y", ys), ("z", [(code, desc, 0) for code, desc in zs])):
                        for order, (code, description, _row_number) in enumerate(entries, 1):
                            layout_rows.append({
                                "table_id": table_id,
                                "coordinate": AXIS_COORDINATES[axis],
                                "code": code,
                                "description": description,
                                "order_first": "" if axis == "y" else str(order),
                                "ignore": "",
                                "format": "",
                                "module_code": module,
                                "framework": version,
                                "effective_from": from_date,
                                "effective_to": "",
                                "status": status,
                                "source_workbook": member,
                                "source_sheet": sheet.title,
                                "effective_source": effective["source_url"] if effective else "",
                            })
                workbook.close()
                inventory.append({
                    "framework": version,
                    "module": module,
                    "workbook": member,
                    "sheets": str(table_count),
                    "status": "parsed",
                })

    # Collapse duplicate sheet tabs, retaining the first occurrence for an
    # identical table/axis/code/release and preserving full source inventory.
    unique_layouts: dict[tuple[str, str, str, str, str], dict[str, str]] = {}
    for row in layout_rows:
        key = (row["module_code"], row["framework"], row["table_id"], row["coordinate"], row["code"])
        unique_layouts.setdefault(key, row)

    # Materialise intervals within each module/template. DPM 2.0 module splits
    # remain visible as separate module histories and are followed by the
    # resolver when the caller requests the former module family.
    sorted_templates = close_template_intervals(template_rows.values())

    return list(unique_layouts.values()), sorted_templates, inventory


def write_csv(path: Path, rows: Iterable[dict[str, str]], columns: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=columns, extrasaction="ignore", lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", type=Path, default=OUTPUT_DIR)
    args = parser.parse_args()
    dimensions, templates, inventory = extract_all()
    write_csv(args.output_dir / "versioned_dimension_mapping.csv", dimensions, [
        "table_id", "coordinate", "code", "description", "order_first", "ignore", "format",
        "module_code", "framework", "effective_from", "effective_to", "status", "source_workbook", "source_sheet", "effective_source",
    ])
    write_csv(args.output_dir / "template_taxonomy_history.csv", templates, [
        "module_code", "template_id", "framework", "effective_from", "effective_to", "status",
        "effective_source", "effective_evidence", "source_archive", "source_workbook", "source_sheet",
    ])
    write_csv(args.output_dir / "workbook_inventory.csv", inventory, ["framework", "module", "workbook", "sheets", "status"])
    unresolved = sorted({
        r["module_code"] for r in templates
        if not r["effective_from"] and not r["status"].startswith(("not_applicable", "superseded"))
    })
    report = {
        "layout_rows": len(dimensions),
        "template_release_rows": len(templates),
        "workbooks": len(inventory),
        "workbooks_with_errors": sum(1 for r in inventory if r["status"].startswith("workbook_error")),
        "modules_without_effective_date_rule": unresolved,
        "schedule_rows": len(read_schedule()),
        "generated_from": "official EBA source packages listed in sources.json",
    }
    (args.output_dir / "build_report.json").write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if report["workbooks_with_errors"] == 0 else 1


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"taxonomy build failed: {error}", file=sys.stderr)
        raise
