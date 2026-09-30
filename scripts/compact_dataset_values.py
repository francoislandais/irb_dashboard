"""Optional, auditable reduction of Hive CSV values before portable export.

The scale is stored per row so the application can restore euro amounts before
indexing them. An unknown or changing taxonomy format leaves the row intact.
"""

from __future__ import annotations

import csv
import re
from collections import defaultdict
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from functools import lru_cache
from pathlib import Path


APP_ASSETS = Path(__file__).resolve().parents[1] / "app" / "assets"
SCALE_COLUMN = "value_scale"
AMOUNT_SCALE = 1000
MAX_SAFE_INTEGER = 2**53 - 1
PERCENT_FORMATS = ("%", "pct", "percent", "percentage", "pourcent", "pourcentage")
AXES = ("y_axis_rc_code", "z_axis_rc_code", "x_axis_rc_code")
REFERENCE_COLUMN = re.compile(r"^ref_(\d{4})_(\d{2})_(\d{2})$")


def _code(value: object) -> str:
    text = str(value or "").strip()
    return text.zfill(4) if re.fullmatch(r"[0-9]+", text) else text


@lru_cache(maxsize=1)
def _format_index():
    points: dict[tuple[str, str, str, str], str | None] = {}
    frameworks: dict[str, set[str]] = defaultdict(set)
    with (APP_ASSETS / "ITS_all_dimension_mapping.csv").open(encoding="utf-8-sig", newline="") as stream:
        for row in csv.DictReader(stream, delimiter=";"):
            table, framework, axis, code = (
                row["table_id"].strip(), row["framework"].strip(),
                row["coordinate"].strip(), _code(row["code"]),
            )
            if not all((table, framework, axis, code)):
                continue
            frameworks[table].add(framework)
            key = (table, framework, axis, code)
            value = row["format"].strip()
            if key in points and points[key] != value:
                points[key] = None
            else:
                points[key] = value

    history: dict[str, list[tuple[str, str, str]]] = defaultdict(list)
    with (APP_ASSETS / "ITS_template_taxonomy_history.csv").open(encoding="utf-8-sig", newline="") as stream:
        for row in csv.DictReader(stream, delimiter=";"):
            table, framework = row["table_id"].strip(), row["framework"].strip()
            if framework in frameworks.get(table, ()):
                history[table].append((row["effective_from"].strip(), row["effective_to"].strip(), framework))
    return points, history


def _framework_for_date(table: str, reference_date: str, history: dict) -> str:
    periods = history.get(table, ())
    candidates = [period for period in periods if period[0] and period[0] <= reference_date and (not period[1] or reference_date <= period[1])]
    if candidates:
        return max(candidates, key=lambda period: (period[0], tuple(int(part) for part in re.findall(r"\d+", period[2]))))[2]
    return min(periods, key=lambda period: period[0])[2] if periods else ""


def _value_kind(row: dict[str, str], reference_date: str, points: dict, history: dict) -> str:
    table = row.get("table_id", "")
    framework = _framework_for_date(table, reference_date, history)
    if not framework:
        return "unknown"
    present_axes = [(axis, _code(row.get(axis, ""))) for axis in AXES if _code(row.get(axis, ""))]
    if not present_axes:
        return "unknown"
    formats = []
    for axis, code in present_axes:
        key = (table, framework, axis, code)
        if key not in points or points[key] is None:
            return "unknown"
        formats.append(points[key])
    first_explicit = next((item for item in formats if item), "")
    if first_explicit.lower() == "unit":
        return "unit"
    if any(keyword in first_explicit.lower() for keyword in PERCENT_FORMATS):
        return "percent"
    return "amount"


def _four_significant_digits(value: Decimal) -> str:
    if not value:
        return "0"
    precision = Decimal(1).scaleb(value.adjusted() - 3)
    rounded = value.quantize(precision, rounding=ROUND_HALF_UP).normalize()
    plain = format(rounded, "f")
    scientific = str(rounded)
    return min((plain, scientific), key=len)


def compact_dataset_rows(
    fields: list[str], rows: list[dict[str, str]],
) -> tuple[list[str], list[dict[str, str]], dict[str, int]]:
    """Reduce only rows whose populated dates have one known, stable format."""
    if SCALE_COLUMN in fields:
        raise ValueError("Le dataset contient déjà une colonne value_scale.")
    points, history = _format_index()
    references = [(field, "-".join(REFERENCE_COLUMN.fullmatch(field).groups()))
                  for field in fields if REFERENCE_COLUMN.fullmatch(field)]
    output_fields = [*fields]
    output_fields.insert(output_fields.index("z_axis_rc_code") + 1, SCALE_COLUMN)
    stats = {"amount_rows": 0, "percent_rows": 0, "unit_rows": 0, "unchanged_rows": 0}
    output_rows = []
    kind_cache: dict[tuple[str, str, str, str, str], str] = {}
    for original in rows:
        row = {**original, SCALE_COLUMN: ""}
        populated = [(field, reference_date) for field, reference_date in references if str(row.get(field, "")).strip()]
        kinds = set()
        for _, reference_date in populated:
            key = (row.get("table_id", ""), row.get("x_axis_rc_code", ""),
                   row.get("y_axis_rc_code", ""), row.get("z_axis_rc_code", ""), reference_date)
            if key not in kind_cache:
                kind_cache[key] = _value_kind(row, reference_date, points, history)
            kinds.add(kind_cache[key])
        if len(kinds) != 1 or "unknown" in kinds:
            stats["unchanged_rows"] += 1
            output_rows.append(row)
            continue
        kind = kinds.pop()
        try:
            numbers = {field: Decimal(str(row[field]).strip()) for field, _ in populated}
            if any(not value.is_finite() for value in numbers.values()):
                raise InvalidOperation
            if kind == "amount":
                reduced = {field: int(value / AMOUNT_SCALE) for field, value in numbers.items()}
                if any(abs(value * AMOUNT_SCALE) > MAX_SAFE_INTEGER for value in reduced.values()):
                    raise InvalidOperation
                for field, value in reduced.items():
                    row[field] = str(value)
                row[SCALE_COLUMN] = str(AMOUNT_SCALE)
            elif kind == "percent":
                for field, value in numbers.items():
                    row[field] = _four_significant_digits(value)
            stats[f"{kind}_rows"] += 1
        except (InvalidOperation, ValueError, OverflowError):
            row = {**original, SCALE_COLUMN: ""}
            stats["unchanged_rows"] += 1
        output_rows.append(row)
    return output_fields, output_rows, stats
