#!/usr/bin/env python3
"""Resolve the applicable EBA framework release for a template/reference date."""

from __future__ import annotations

import argparse
import csv
import json
from datetime import date
from pathlib import Path

from build_taxonomy import OUTPUT_DIR, normalize_template

MODULE_FAMILIES = {
    "COREP": ("COREP",),
    "FINREP": ("FINREP",),
    "IF": ("IF",),
    "RES": ("RES", "RESOL"),
    "SBP": ("SBP",),
    "REM": ("REM",),
    "MICA": ("MICA",),
    "MREL_TLAC": ("MREL_TLAC", "MRELTLACDIS"),
    "PILLAR3": ("PILLAR3", "CODIS", "ESGDIS", "FINDIS", "GSIIDIS", "IRRBBDIS", "MRELTLACDIS", "P3DH", "REMDIS"),
}


def module_matches(requested: str | None, actual: str) -> bool:
    if not requested:
        return True
    if actual.casefold() == requested.casefold():
        return True
    family = MODULE_FAMILIES.get(requested.upper())
    return bool(family and any(actual.upper().startswith(prefix) for prefix in family))


def resolve(module: str | None, template: str, reference_date: date, rows: list[dict[str, str]]) -> list[dict[str, str]]:
    wanted = normalize_template(template)
    matches = []
    for row in rows:
        if normalize_template(row["template_id"]) != wanted:
            continue
        if not module_matches(module, row["module_code"]):
            continue
        if not row["effective_from"]:
            continue
        start = date.fromisoformat(row["effective_from"])
        end = date.fromisoformat(row["effective_to"]) if row["effective_to"] else None
        if start <= reference_date and (end is None or reference_date < end):
            matches.append(row)
    if not matches:
        return []
    latest_date = max(row["effective_from"] for row in matches)
    return [row for row in matches if row["effective_from"] == latest_date]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("template", help="EBA table/template code, for example C_01.00")
    parser.add_argument("reference_date", help="Reporting reference date, YYYY-MM-DD")
    parser.add_argument("--module", help="Module code to disambiguate templates reused across modules")
    parser.add_argument("--history", type=Path, default=OUTPUT_DIR / "template_taxonomy_history.csv")
    args = parser.parse_args()

    if not args.history.exists():
        parser.error(f"Missing generated history file: {args.history}. Run build_taxonomy.py first.")
    ref_date = date.fromisoformat(args.reference_date)
    with args.history.open(encoding="utf-8-sig", newline="") as handle:
        history = list(csv.DictReader(handle))
    found = resolve(args.module, args.template, ref_date, history)
    if not found:
        possible = [r for r in history if normalize_template(r["template_id"]) == normalize_template(args.template)]
        if possible:
            print(json.dumps({
                "status": "unresolved_or_not_applicable",
                "template": normalize_template(args.template),
                "reference_date": ref_date.isoformat(),
                "known_module_versions": [{"module": r["module_code"], "framework": r["framework"], "status": r["status"], "effective_from": r["effective_from"]} for r in possible],
            }, ensure_ascii=False, indent=2))
            return 2
        print(json.dumps({"status": "template_not_found", "template": normalize_template(args.template), "reference_date": ref_date.isoformat()}, indent=2))
        return 3
    if len(found) > 1 and not args.module:
        print(json.dumps({
            "status": "ambiguous_module",
            "template": normalize_template(args.template),
            "reference_date": ref_date.isoformat(),
            "matches": [{"module": r["module_code"], "framework": r["framework"], "effective_from": r["effective_from"], "effective_to": r["effective_to"]} for r in found],
        }, ensure_ascii=False, indent=2))
        return 4
    print(json.dumps({
        "status": "resolved",
        "template": normalize_template(args.template),
        "reference_date": ref_date.isoformat(),
        "matches": [{
            "module": r["module_code"],
            "framework": r["framework"],
            "effective_from": r["effective_from"],
            "effective_to_exclusive": r["effective_to"],
            "source": r["effective_source"],
            "source_workbook": r["source_workbook"],
        } for r in found],
    }, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
