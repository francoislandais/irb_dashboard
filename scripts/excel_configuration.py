"""Read the single-sheet application/extraction configuration workbook.

Only ordinary XLSX cell values are needed, so the production reader uses the
standard library and does not add a spreadsheet package to the Hive machine.
"""

from __future__ import annotations

import json
from pathlib import Path
from xml.etree import ElementTree as ET
from zipfile import BadZipFile, ZipFile


HEADERS = (
    "type", "description", "activate", "update", "name", "jst_code", "leis", "cluster", "ssm_supervision_country",
    "ssmsignificance", "consolidation", "export-dataset", "category", "module",
    "label", "templates", "kri_ids", "history_years", "frequency",
)
CURRENT_OLD_HEADERS = HEADERS[:1] + HEADERS[2:]
PREVIOUS_HEADERS = CURRENT_OLD_HEADERS[:4] + CURRENT_OLD_HEADERS[5:]
LEGACY_HEADERS = PREVIOUS_HEADERS[:2] + PREVIOUS_HEADERS[3:]
NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}


def _column_index(reference: str) -> int:
    letters = "".join(character for character in reference if character.isalpha())
    result = 0
    for character in letters.upper():
        result = result * 26 + ord(character) - ord("A") + 1
    return result - 1


def _cell_value(cell: ET.Element, shared: list[str]):
    kind = cell.get("t")
    if kind == "inlineStr":
        return "".join(node.text or "" for node in cell.findall(".//m:is/m:t", NS))
    value = cell.find("m:v", NS)
    if value is None:
        return None
    raw = value.text or ""
    if kind == "s":
        return shared[int(raw)]
    if kind == "b":
        return raw == "1"
    if kind in {"str", "e"}:
        return raw
    number = float(raw)
    return int(number) if number.is_integer() else number


def _rows(path: Path):
    try:
        with ZipFile(path) as archive:
            workbook = ET.fromstring(archive.read("xl/workbook.xml"))
            sheets = workbook.findall("m:sheets/m:sheet", NS)
            if len(sheets) != 1:
                raise ValueError(f"{path}: le classeur doit contenir un seul onglet.")
            shared = []
            if "xl/sharedStrings.xml" in archive.namelist():
                strings = ET.fromstring(archive.read("xl/sharedStrings.xml"))
                shared = ["".join(t.text or "" for t in si.findall(".//m:t", NS))
                          for si in strings.findall("m:si", NS)]
            document = ET.fromstring(archive.read("xl/worksheets/sheet1.xml"))
    except (BadZipFile, KeyError, ET.ParseError, OSError) as error:
        raise ValueError(f"{path}: fichier XLSX illisible ou endommagé : {error}") from error
    for row in document.findall("m:sheetData/m:row", NS):
        values = {}
        for cell in row.findall("m:c", NS):
            index = _column_index(cell.get("r", ""))
            if index >= len(HEADERS):
                if _cell_value(cell, shared) not in (None, ""):
                    raise ValueError(f"{path}, ligne {row.get('r')}: colonne au-delà de {HEADERS[-1]} non prévue.")
                continue
            if cell.find("m:f", NS) is not None:
                raise ValueError(f"{path}, ligne {row.get('r')}: les formules ne sont pas autorisées dans le paramétrage.")
            values[index] = _cell_value(cell, shared)
        yield int(row.get("r", "0")), [values.get(index) for index in range(len(HEADERS))]


def _text(value, field: str, context: str):
    if value is None or value == "":
        return None
    if not isinstance(value, str):
        raise ValueError(f"{context}: {field} doit être du texte.")
    return value.strip()


def _list(value, field: str, context: str, *, singleton: bool = False):
    raw = _text(value, field, context)
    if raw is None:
        return None
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as error:
        if singleton:
            return [raw]
        raise ValueError(f"{context}: {field} doit être une liste JSON, par exemple [\"FR\"].") from error
    if not isinstance(parsed, list):
        if singleton and isinstance(parsed, str):
            return [parsed]
        raise ValueError(f"{context}: {field} doit être une liste JSON.")
    return parsed


def _toggle(value, field: str, context: str, default: bool):
    if value in (None, ""):
        return default
    if type(value) is bool:
        return value
    if type(value) is int and value in (0, 1):
        return bool(value)
    if isinstance(value, str) and value.strip().lower() in {"true", "false", "1", "0", "oui", "non"}:
        return value.strip().lower() in {"true", "1", "oui"}
    raise ValueError(f"{context}: {field} doit valoir 1/0 ou true/false.")


def read_excel_configuration(path: Path):
    """Return TOML-shaped application blocks and row-aware contexts."""
    rows = iter(_rows(path))
    try:
        header_number, header = next(rows)
    except StopIteration:
        raise ValueError(f"{path}: classeur vide.") from None
    known_headers = (HEADERS, CURRENT_OLD_HEADERS, PREVIOUS_HEADERS, LEGACY_HEADERS)
    layout = next((candidate for candidate in known_headers
                   if tuple(header[:len(candidate)]) == candidate
                   and all(value is None for value in header[len(candidate):])), None)
    if header_number != 1 or layout is None:
        raise ValueError(f"{path}: les en-têtes de la première ligne ne correspondent pas au modèle fourni.")
    applications = []
    current = None
    seen_parent = False
    for number, values in rows:
        if all(value in (None, "") for value in values[:len(layout)]):
            continue
        context = f"{path.name}, ligne {number}"
        record = {field: None for field in HEADERS}
        record.update(zip(layout, values[:len(layout)]))
        kind = _text(record.pop("type"), "type", context)
        active = _toggle(record.pop("activate"), "activate", context, True)
        update = record.pop("update")
        if update not in (None, ""):
            raise ValueError(f"{context}: la colonne update est réservée à la future planification et doit rester vide pour l'instant.")
        if kind not in {"APPLICATION", "EXTRACTION"}:
            raise ValueError(f"{context}: type doit être APPLICATION ou EXTRACTION.")
        if kind == "APPLICATION":
            seen_parent = True
            if any(record[field] not in (None, "") for field in ("category", "module", "label", "templates", "kri_ids", "history_years", "frequency")):
                raise ValueError(f"{context}: les colonnes d'extraction doivent rester vides sur une ligne APPLICATION.")
            current = None
            if not active:
                continue
            config = {field: _text(record[field], field, context) for field in ("name", "description", "consolidation") if record[field] not in (None, "")}
            for field in ("leis", "jst_code", "cluster", "ssm_supervision_country", "ssmsignificance"):
                value = _list(record[field], field, context, singleton=field in {"cluster", "jst_code"})
                if value is not None:
                    config[field] = value
            config["export-dataset"] = _toggle(record["export-dataset"], "export-dataset", context, False)
            config["extractions"] = []
            current = (config, context)
            applications.append(current)
        else:
            if any(record[field] not in (None, "") for field in ("name", "description", "leis", "jst_code", "cluster", "ssm_supervision_country", "ssmsignificance", "consolidation", "export-dataset")):
                raise ValueError(f"{context}: les colonnes d'application doivent rester vides sur une ligne EXTRACTION.")
            if current is None:
                if not seen_parent:
                    raise ValueError(f"{context}: extraction sans application active précédente.")
                continue  # Child of a disabled application.
            if not active:
                continue
            extraction = {field: _text(record[field], field, context) for field in ("category", "label", "frequency") if record[field] not in (None, "")}
            if record["module"] not in (None, ""):
                module = _text(record["module"], "module", context)
                extraction["module"] = _list(module, "module", context) if module.startswith("[") else module
            for field in ("templates", "kri_ids"):
                value = _list(record[field], field, context)
                if value is not None:
                    extraction[field] = value
            years = record["history_years"]
            if years not in (None, ""):
                extraction["history_years"] = years
            current[0]["extractions"].append(extraction)
    if not applications:
        raise ValueError(f"{path}: aucune application active à traiter.")
    return applications
