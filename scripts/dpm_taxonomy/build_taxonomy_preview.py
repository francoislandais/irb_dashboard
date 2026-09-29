#!/usr/bin/env python3
"""Build the test app's versioned dimension dictionary and empty preview CSV."""

from __future__ import annotations

import csv
import unicodedata
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "data/eba-dpm-history/generated/versioned_dimension_mapping.csv"
MAPPING_OUTPUT = ROOT / "app/assets/ITS_all_dimension_mapping.csv"
DATA_OUTPUT = ROOT / "app/assets/taxonomy-preview-empty-data.csv"
HISTORY_SOURCE = ROOT / "data/eba-dpm-history/generated/template_taxonomy_history.csv"
HISTORY_OUTPUT = ROOT / "app/assets/ITS_template_taxonomy_history.csv"

APP_MAPPING_COLUMNS = [
    "table_id",
    "coordinate",
    "code",
    "parent_coordinate_code",
    "description",
    "order_first",
    "ignore",
    "format",
    "framework",
]
DATA_COLUMNS = [
    "reporting_unit_id",
    "table_id",
    "x_axis_rc_code",
    "y_axis_rc_code",
    "z_axis_rc_code",
    "ref_2026_06_30",
]
APP_HISTORY_COLUMNS = ["table_id", "framework", "effective_from", "effective_to"]


def main() -> None:
    with SOURCE.open(encoding="utf-8-sig", newline="") as source_file:
        reader = csv.DictReader(source_file)
        source_columns = set(reader.fieldnames or [])
        missing = set(APP_MAPPING_COLUMNS) - source_columns
        if missing:
            raise ValueError(f"Source dictionary is missing columns: {sorted(missing)}")

        rows = list(reader)

    unique_rows: list[dict[str, str]] = []
    seen: set[tuple[str, str, str, str]] = set()
    table_ids: set[str] = set()
    for row in rows:
        key = (row["framework"], row["table_id"], row["coordinate"], row["code"])
        if key not in seen:
            seen.add(key)
            unique_rows.append({
                column: "" if column == "order_first" else clean_field(row.get(column, "") or "")
                for column in APP_MAPPING_COLUMNS
            })
        table_ids.add(row["table_id"])

    with MAPPING_OUTPUT.open("w", encoding="utf-8", newline="") as output_file:
        writer = csv.DictWriter(output_file, fieldnames=APP_MAPPING_COLUMNS, delimiter=";", lineterminator="\n")
        writer.writeheader()
        writer.writerows(unique_rows)

    with DATA_OUTPUT.open("w", encoding="utf-8", newline="") as output_file:
        writer = csv.DictWriter(output_file, fieldnames=DATA_COLUMNS, delimiter=";", lineterminator="\n")
        writer.writeheader()
        for table_id in sorted(table_ids, key=natural_sort_key):
            writer.writerow({
                "reporting_unit_id": "TAXONOMY_PREVIEW",
                "table_id": table_id,
                "x_axis_rc_code": "",
                "y_axis_rc_code": "",
                "z_axis_rc_code": "",
                # A text marker keeps the reference-date column present while
                # every axis coordinate stays empty, so no data point matches.
                "ref_2026_06_30": "EMPTY",
            })

    write_taxonomy_history()

    print(f"Wrote {len(unique_rows):,} versioned dimension rows to {MAPPING_OUTPUT}")
    print(f"Wrote {len(table_ids):,} empty template rows to {DATA_OUTPUT}")


def write_taxonomy_history() -> None:
    with HISTORY_SOURCE.open(encoding="utf-8-sig", newline="") as source_file:
        history = csv.DictReader(source_file)
        rows = []
        seen: set[tuple[str, str, str, str]] = set()
        for row in history:
            status = row.get("status", "")
            effective_from = row.get("effective_from", "")
            if not effective_from or status.startswith(("not_applicable", "superseded")):
                continue
            values = (
                row.get("template_id", "").strip(),
                row.get("framework", "").strip(),
                effective_from.strip(),
                row.get("effective_to", "").strip(),
            )
            if not values[0] or not values[1] or values in seen:
                continue
            seen.add(values)
            rows.append(dict(zip(APP_HISTORY_COLUMNS, values)))

    rows.sort(key=lambda row: (
        natural_sort_key(row["table_id"]),
        natural_sort_key(row["framework"]),
        row["effective_from"],
        row["effective_to"],
    ))
    with HISTORY_OUTPUT.open("w", encoding="utf-8", newline="") as output_file:
        writer = csv.DictWriter(output_file, fieldnames=APP_HISTORY_COLUMNS, delimiter=";", lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)
    print(f"Wrote {len(rows):,} template taxonomy periods to {HISTORY_OUTPUT}")


def natural_sort_key(value: str) -> tuple[object, ...]:
    parts: list[object] = []
    current = ""
    is_digit = False
    for character in value:
        next_is_digit = character.isdigit()
        if current and next_is_digit != is_digit:
            parts.append(int(current) if is_digit else current.casefold())
            current = ""
        current += character
        is_digit = next_is_digit
    if current:
        parts.append(int(current) if is_digit else current.casefold())
    return tuple(parts)


def clean_field(value: str) -> str:
    replacements = {"≤": "<=", "≥": ">=", "≠": "!="}
    cleaned = "".join(
        replacements.get(character, character)
        for character in value
        if unicodedata.category(character) != "Cc"
    )
    return cleaned


if __name__ == "__main__":
    main()
