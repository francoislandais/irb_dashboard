"""Point d'entrée unique pour planifier les exports Agora Explorer.

``preview`` écrit du SQL ciblant les tables Hive sources sans l'exécuter.
``test`` écrit le même SQL puis simule les résultats avec la fixture locale.
``hive`` exécute les requêtes via ``vl_connect.devo`` et exporte les applications.
"""

from __future__ import annotations

import argparse
import calendar
import csv
import json
import re
from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Iterable, Protocol

from openpyxl import load_workbook

if __package__:
    from .export_all_standalone_apps import export_standalone_app
    from .hive_to_dataset import (
        _expand_template_expressions,
        _build_kri_filter,
        _build_template_filter,
        _load_default_devo_client,
        find_kris_using_templates,
    )
else:
    from export_all_standalone_apps import export_standalone_app
    from hive_to_dataset import (
        _expand_template_expressions,
        _build_kri_filter,
        _build_template_filter,
        _load_default_devo_client,
        find_kris_using_templates,
    )


PROJECT_DIRECTORY = Path(__file__).resolve().parents[1]
EXAMPLE_WORKBOOK = PROJECT_DIRECTORY / "outputs" / "global-update-prototype" / "global_update_examples.xlsx"
TEST_ENTITIES_PATH = PROJECT_DIRECTORY / "scripts" / "fixtures" / "global_update_test_entities.json"
DEFAULT_OUTPUT_DIRECTORY = PROJECT_DIRECTORY / "outputs" / "global-update-prototype" / "generated"
FREQUENCIES = {"MONTHLY", "QUARTERLY", "SEMI_ANNUAL", "ANNUAL"}
PERIODS_PER_YEAR = {"MONTHLY": 12, "QUARTERLY": 4, "SEMI_ANNUAL": 2, "ANNUAL": 1}
CONSOLIDATION_MODES = {"HIGHEST", "CONSO", "SOLO", "CONSO+SOLO", "ALL"}
PRODUCTION_TABLES = {
    "ITS": "crp_agora.agora_its_bft_current",
    "KRI": "crp_agora.agora_dm_imas_kris_raw",
}
NORMALIZED_TABLE_ID = "regexp_replace(table_id, '([.][A-Za-z]+|_dp)+$', '')"
OUTPUT_COLUMNS = [
    "table_id",
    "reporting_unit_id",
    "x_axis_rc_code",
    "y_axis_rc_code",
    "z_axis_rc_code",
]


@dataclass(frozen=True)
class Extraction:
    module: str
    selector: str
    history_years: int
    frequency: str
    reference_dates: tuple[str, ...]
    kri_data_point_ids: tuple[str, ...] = ()


@dataclass(frozen=True)
class Application:
    name: str
    leis: tuple[str, ...]
    consolidation: str
    extractions: tuple[Extraction, ...]


class QueryClient(Protocol):
    def read_sql(self, sql: str): ...


def _split_list(value: object) -> list[str]:
    return list(dict.fromkeys(part.strip() for part in str(value or "").split(",") if part.strip()))


def _month_end(year: int, month: int) -> date:
    return date(year, month, calendar.monthrange(year, month)[1])


def _subtract_months(value: date, months: int) -> date:
    month_index = value.year * 12 + value.month - 1 - months
    year, month_zero_based = divmod(month_index, 12)
    month = month_zero_based + 1
    return _month_end(year, month)


def _latest_period_end(frequency: str, as_of: date) -> date:
    candidates: list[date] = []
    if frequency == "MONTHLY":
        candidates = [_month_end(as_of.year, as_of.month)]
        if candidates[0] > as_of:
            candidates = [_subtract_months(candidates[0], 1)]
    elif frequency == "QUARTERLY":
        candidates = [date(as_of.year, month, calendar.monthrange(as_of.year, month)[1]) for month in (3, 6, 9, 12)]
    elif frequency == "SEMI_ANNUAL":
        candidates = [date(as_of.year, 6, 30), date(as_of.year, 12, 31)]
    elif frequency == "ANNUAL":
        candidates = [date(as_of.year, 12, 31)]
    else:
        raise ValueError(f"Fréquence inconnue : {frequency}")
    available = [candidate for candidate in candidates if candidate <= as_of]
    if available:
        return available[-1]
    return date(as_of.year - 1, 12, 31)


def _reference_dates(frequency: str, history_periods: int, as_of: date) -> tuple[str, ...]:
    latest = _latest_period_end(frequency, as_of)
    interval_months = {"MONTHLY": 1, "QUARTERLY": 3, "SEMI_ANNUAL": 6, "ANNUAL": 12}[frequency]
    dates = [_subtract_months(latest, interval_months * offset) for offset in range(history_periods - 1, -1, -1)]
    return tuple(item.isoformat() for item in dates)


def _read_configuration(path: Path, as_of: date) -> tuple[Application, ...]:
    if not path.is_file():
        raise ValueError(f"Classeur de paramétrage introuvable : {path}")
    workbook = load_workbook(path, read_only=False, data_only=True)
    applications: list[Application] = []
    lei_pattern = re.compile(r"^[A-Z0-9]{20}$")
    for sheet in workbook.worksheets:
        leis = _split_list(sheet["B1"].value)
        consolidation = str(sheet["B2"].value or "").strip().upper()
        if not leis or any(not lei_pattern.fullmatch(lei.upper()) for lei in leis):
            raise ValueError(f"{sheet.title}: B1 doit contenir une liste de LEI de 20 caractères, séparés par des virgules.")
        leis = [lei.upper() for lei in leis]
        if consolidation not in CONSOLIDATION_MODES:
            raise ValueError(f"{sheet.title}: B2 doit être l'un de {', '.join(sorted(CONSOLIDATION_MODES))}.")
        expected_headers = ["module", "template selector", "history years", "frequency"]
        actual_headers = [str(sheet.cell(4, col).value or "").strip().lower() for col in range(1, 5)]
        if actual_headers != expected_headers:
            raise ValueError(f"{sheet.title}: les en-têtes A4:D4 doivent être {expected_headers}.")
        extractions: list[Extraction] = []
        for row_number in range(5, sheet.max_row + 1):
            module, selector, periods, frequency = [sheet.cell(row_number, col).value for col in range(1, 5)]
            if all(value is None or str(value).strip() == "" for value in (module, selector, periods, frequency)):
                continue
            module = str(module or "").strip().upper()
            selector = str(selector or "").strip()
            frequency = str(frequency or "").strip().upper().replace("-", "_").replace(" ", "_")
            try:
                history_years = int(periods)
            except (TypeError, ValueError) as error:
                raise ValueError(f"{sheet.title}, ligne {row_number}: History years doit être un entier.") from error
            if not module or not selector:
                raise ValueError(f"{sheet.title}, ligne {row_number}: Module et Template selector sont requis.")
            if frequency not in FREQUENCIES:
                raise ValueError(f"{sheet.title}, ligne {row_number}: fréquence invalide ({frequency}).")
            if history_years < 1:
                raise ValueError(f"{sheet.title}, ligne {row_number}: History years doit être supérieur ou égal à 1.")
            kri_ids: tuple[str, ...] = ()
            if module == "KRI":
                kri_ids = tuple(find_kris_using_templates([selector]))
                if not kri_ids:
                    raise ValueError(f"{sheet.title}, ligne {row_number}: aucun KRI ne dépend de {selector!r}.")
            history_periods = history_years * PERIODS_PER_YEAR[frequency]
            dates = _reference_dates(frequency, history_periods, as_of)
            extractions.append(Extraction(module, selector, history_years, frequency, dates, kri_ids))
        if not extractions:
            raise ValueError(f"{sheet.title}: au moins une ligne d'extraction est requise.")
        applications.append(Application(sheet.title, tuple(leis), consolidation, tuple(extractions)))
    workbook.close()
    if not applications:
        raise ValueError("Le classeur ne contient aucun onglet d'application.")
    return tuple(applications)


def _sql_literal(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def _selected_levels(mode: str, highest_level: str) -> tuple[str, ...]:
    if mode == "HIGHEST":
        return (highest_level,)
    if mode == "CONSO+SOLO":
        return ("CONSO", "SOLO")
    if mode == "ALL":
        return ("CONSO", "SOLO", "SUBLIQ")
    return (mode,)


def _consolidation_predicate(mode: str) -> str:
    if mode == "HIGHEST":
        return "is_highest_cons = 'Y'"
    if mode == "ALL":
        return ""
    levels = _selected_levels(mode, "")
    return "cons_level IN (" + ", ".join(_sql_literal(item) for item in levels) + ")"


def _lei_filter(leis: Iterable[str]) -> str:
    return "lei IN (\n        " + ",\n        ".join(_sql_literal(lei) for lei in leis) + "\n    )"


def _date_columns(reference_dates: Iterable[str], prefix: str = "") -> str:
    return ",\n".join(
        "    MAX(CASE\n"
        f"        WHEN {prefix}reference_period = {_sql_literal(reference_date)}\n"
        f"        THEN {prefix}value_decimal\n"
        f"    END) AS ref_{reference_date.replace('-', '_')}"
        for reference_date in reference_dates
    )


def _date_filter(reference_dates: Iterable[str], prefix: str = "") -> str:
    return f"{prefix}reference_period IN (\n        " + ",\n        ".join(
        _sql_literal(reference_date) for reference_date in reference_dates
    ) + "\n    )"


def _build_extraction_sql(
    extraction: Extraction, application: Application, tables: dict[str, str] = PRODUCTION_TABLES,
) -> str:
    consolidation = _consolidation_predicate(application.consolidation)
    consolidation_filter = f"\n      AND {consolidation}" if consolidation else ""
    if extraction.module == "KRI":
        return f"""WITH reporting_units AS (
    SELECT DISTINCT
        entity_id,
        cons_level,
        lei
    FROM {tables['ITS']}
    WHERE {_lei_filter(application.leis)}{consolidation_filter}
)
SELECT
    'KRI' AS table_id,
    CONCAT(units.lei, '_', units.cons_level) AS reporting_unit_id,
    '' AS x_axis_rc_code,
    kri.kri_data_point_id AS y_axis_rc_code,
    '' AS z_axis_rc_code,
{_date_columns(extraction.reference_dates, 'kri.')}
FROM {tables['KRI']} kri
JOIN reporting_units units
  ON kri.entity_id = units.entity_id
 AND kri.cons_level = units.cons_level
WHERE kri.value_decimal IS NOT NULL
  AND {_date_filter(extraction.reference_dates, 'kri.')}
  AND {_build_kri_filter(extraction.kri_data_point_ids)}
GROUP BY
    units.lei,
    units.cons_level,
    kri.kri_data_point_id
ORDER BY
    units.lei,
    units.cons_level,
    kri.kri_data_point_id
"""

    template_filter = _build_template_filter(
        [extraction.selector], table_id_expression=NORMALIZED_TABLE_ID,
    )
    return f"""SELECT
    table_id,
    CONCAT(lei, '_', cons_level) AS reporting_unit_id,
    x_axis_rc_code,
    y_axis_rc_code,
    z_axis_rc_code,
{_date_columns(extraction.reference_dates)}
FROM (
    SELECT
        {NORMALIZED_TABLE_ID} AS table_id,
        lei,
        cons_level,
        x_axis_rc_code,
        y_axis_rc_code,
        z_axis_rc_code,
        reference_period,
        value_decimal
    FROM {tables['ITS']}
    WHERE {_lei_filter(application.leis)}{consolidation_filter}
      AND module_id = {_sql_literal(extraction.module)}
      AND {_date_filter(extraction.reference_dates)}
      AND {template_filter}
) source
GROUP BY
    table_id,
    lei,
    cons_level,
    x_axis_rc_code,
    y_axis_rc_code,
    z_axis_rc_code
ORDER BY
    table_id,
    lei,
    cons_level,
    x_axis_rc_code,
    y_axis_rc_code,
    z_axis_rc_code
"""


def _build_institution_sql(application: Application, table: str) -> str:
    consolidation = _consolidation_predicate(application.consolidation)
    consolidation_filter = f"\n  AND {consolidation}" if consolidation else ""
    return f"""SELECT
    CONCAT(lei, '_', cons_level) AS institution_id,
    lei,
    COALESCE(
        MAX(CASE WHEN TRIM(jst_code_today) <> '' THEN jst_code_today END),
        MAX(jst_code)
    ) AS jst_code,
    MAX(name) AS institution_name,
    cons_level AS consolidation_level
FROM {table}
WHERE {_lei_filter(application.leis)}{consolidation_filter}
GROUP BY
    lei,
    cons_level
ORDER BY
    lei,
    cons_level
"""


def _safe_name(value: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9_-]+", "_", value).strip("_")
    return cleaned or "application"


def _write_query_index(output: Path, manifest: dict) -> None:
    lines = ["# Requêtes générées", "", f"Mode : `{manifest['mode']}`", f"Date de calcul : `{manifest['as_of']}`", ""]
    for application in manifest["applications"]:
        lines.extend([f"## {application['name']}", "", f"Niveau : `{application['consolidation']}`", f"LEI : {', '.join(application['leis'])}", ""])
        lines.append(f"- [Requête des métadonnées institutionnelles]({application['metadata_query']})")
        for extraction in application["extractions"]:
            year_label = "an" if extraction["history_years"] == 1 else "ans"
            lines.append(
                f"- [Extraction {extraction['index']:02d} — {extraction['module']} / {extraction['selector']}]"
                f"({extraction['query']}) — {extraction['frequency']}, {extraction['history_years']} {year_label}"
                f" ({extraction['history_periods']} périodes)"
                f" ({extraction['reference_dates'][0]} → {extraction['reference_dates'][-1]})"
            )
        if application.get("dataset"):
            lines.extend([f"- Dataset de simulation : `{application['dataset']}`", f"- Dictionnaire : `{application['institution_dictionary']}`", f"- Application : `{application['html_app']}`"])
        lines.append("")
    if manifest["mode"] == "test":
        lines.extend(["Les résultats du mode `test` viennent de la fixture locale ; aucune connexion Hive n'est ouverte.", ""])
    elif manifest["mode"] == "hive":
        lines.extend(["Les résultats du mode `hive` ont été extraits via `devo.read_sql`.", ""])
    output.write_text("\n".join(lines), encoding="utf-8")


def _read_test_fixture(path: Path) -> dict:
    if not path.is_file():
        raise ValueError(f"Fixture du mode test introuvable : {path}")
    return json.loads(path.read_text(encoding="utf-8"))


def _all_month_ends(start_iso: str, end_iso: str) -> tuple[str, ...]:
    start = date.fromisoformat(start_iso)
    end = date.fromisoformat(end_iso)
    result = []
    year, month = start.year, start.month
    while (year, month) <= (end.year, end.month):
        candidate = _month_end(year, month)
        if start <= candidate <= end:
            result.append(candidate.isoformat())
        month += 1
        if month == 13:
            month = 1
            year += 1
    return tuple(result)


def _selector_matches(value: str, selector: str) -> bool:
    if selector.endswith("%"):
        return value.startswith(selector[:-1])
    return value == selector


def _selected_fixture_templates(selector: str, available: Iterable[str]) -> list[str]:
    included, excluded = _expand_template_expressions([selector])
    return [
        table_id for table_id in available
        if any(_selector_matches(table_id, pattern) for pattern in included)
        and not any(_selector_matches(table_id, pattern) for pattern in excluded)
    ]


def _dictionary_rows(application: Application, fixture: dict) -> list[dict[str, str]]:
    result = []
    entities_by_lei = {item["lei"]: item for item in fixture["entities"]}
    for lei in application.leis:
        entity = entities_by_lei.get(lei)
        if not entity:
            continue
        for level in _selected_levels(application.consolidation, entity["highest_level"]):
            jst_code = entity["jst_by_level"].get(level)
            if not jst_code:
                continue
            result.append({
                "Institution ID": f"{lei}_{level}",
                "JST code": jst_code,
                "Institution Name": entity["institution_name"],
                "Consolidation Level": level,
            })
    return result


def _build_dummy_dataset(application: Application, fixture: dict) -> tuple[list[str], list[dict[str, str]]]:
    all_dates = sorted({ref for item in application.extractions for ref in item.reference_dates})
    headers = OUTPUT_COLUMNS + ["ref_" + ref.replace("-", "_") for ref in all_dates] + ["extraction_timestamp"]
    dictionary = _dictionary_rows(application, fixture)
    selected_ids = {item["Institution ID"] for item in dictionary}
    entities_by_lei = {item["lei"]: item for item in fixture["entities"]}
    records: dict[tuple[str, ...], dict[str, str]] = {}
    available_dates = _all_month_ends(fixture["period_start"], fixture["period_end"])
    module_templates = fixture["templates"]
    for extraction in application.extractions:
        if extraction.module == "KRI":
            templates = list(extraction.kri_data_point_ids)
            is_kri = True
        else:
            templates = _selected_fixture_templates(extraction.selector, module_templates.get(extraction.module, []))
            is_kri = False
        date_set = set(extraction.reference_dates)
        for lei in application.leis:
            entity = entities_by_lei.get(lei)
            if not entity:
                continue
            for level in _selected_levels(application.consolidation, entity["highest_level"]):
                jst_code = entity["jst_by_level"].get(level)
                institution_id = f"{lei}_{level}"
                if not jst_code or institution_id not in selected_ids:
                    continue
                for selected_template in templates:
                    table_id = "KRI" if is_kri else selected_template
                    for period_index, reference_date in enumerate(available_dates, start=1):
                        if reference_date not in date_set:
                            continue
                        x_code = ""
                        y_code = selected_template if is_kri else "0010"
                        z_code = ""
                        key = (table_id, institution_id, x_code, y_code, z_code)
                        record = records.setdefault(key, {
                            "table_id": table_id,
                            "reporting_unit_id": institution_id,
                            "x_axis_rc_code": x_code,
                            "y_axis_rc_code": y_code,
                            "z_axis_rc_code": z_code,
                            **{"ref_" + item.replace("-", "_"): "" for item in all_dates},
                            "extraction_timestamp": date.today().isoformat(),
                        })
                        template_seed = sum(ord(character) for character in table_id + y_code)
                        entity_seed = sum(ord(character) for character in lei)
                        seed = template_seed + entity_seed + (0 if level == "CONSO" else 50 if level == "SOLO" else 90)
                        record["ref_" + reference_date.replace("-", "_")] = str(seed + period_index)
    populated = [
        column for column in headers
        if not column.startswith("ref_") or any(row.get(column, "") != "" for row in records.values())
    ]
    return populated, list(records.values())


def _write_csv(path: Path, fieldnames: list[str], rows: list[dict[str, str]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8-sig", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=fieldnames, extrasaction="ignore", lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)


def _clean_cell(value: object) -> str:
    if value is None:
        return ""
    try:
        if bool(value != value):
            return ""
    except (TypeError, ValueError):
        return ""
    return str(value)


def _dataframe_rows(dataframe: object, required_columns: Iterable[str], query_label: str) -> list[dict[str, str]]:
    if not hasattr(dataframe, "columns") or not hasattr(dataframe, "to_dict"):
        raise TypeError(f"{query_label}: devo.read_sql doit retourner un DataFrame.")
    source_columns = {str(column).strip().lower(): column for column in dataframe.columns}
    missing = set(required_columns) - source_columns.keys()
    if missing:
        raise ValueError(f"{query_label}: colonnes absentes du résultat Hive : {', '.join(sorted(missing))}.")
    return [
        {name: _clean_cell(row[source]) for name, source in source_columns.items()}
        for row in dataframe.to_dict(orient="records")
    ]


def _same_value(left: str, right: str) -> bool:
    try:
        return Decimal(left) == Decimal(right)
    except InvalidOperation:
        return left == right


def _merge_extraction_rows(
    records: dict[tuple[str, ...], dict[str, str]],
    all_dates: tuple[str, ...],
    extraction: Extraction,
    dataframe: object,
    query_label: str,
) -> int:
    date_columns = ["ref_" + item.replace("-", "_") for item in extraction.reference_dates]
    rows = _dataframe_rows(dataframe, OUTPUT_COLUMNS + date_columns, query_label)
    for row in rows:
        key = tuple(row[column] for column in OUTPUT_COLUMNS)
        if not key[0] or not key[1]:
            raise ValueError(f"{query_label}: table_id ou reporting_unit_id vide dans le résultat Hive.")
        record = records.setdefault(key, {
            **dict(zip(OUTPUT_COLUMNS, key)),
            **{"ref_" + item.replace("-", "_"): "" for item in all_dates},
            "extraction_timestamp": date.today().isoformat(),
        })
        for column in date_columns:
            incoming = row[column]
            if not incoming:
                continue
            previous = record[column]
            if previous and not _same_value(previous, incoming):
                raise ValueError(
                    f"{query_label}: valeurs contradictoires pour {key}, {column} "
                    f"({previous} contre {incoming})."
                )
            record[column] = incoming
    return len(rows)


def _institution_rows(dataframe: object, query_label: str) -> list[dict[str, str]]:
    required = ("institution_id", "lei", "jst_code", "institution_name", "consolidation_level")
    rows = _dataframe_rows(dataframe, required, query_label)
    result = []
    for row in rows:
        if not row["institution_id"] or not row["jst_code"]:
            raise ValueError(f"{query_label}: Institution ID ou JST code vide dans le résultat Hive.")
        result.append({
            "Institution ID": row["institution_id"],
            "JST code": row["jst_code"],
            "Institution Name": row["institution_name"],
            "Consolidation Level": row["consolidation_level"],
        })
    if not result:
        raise ValueError(f"{query_label}: aucune institution trouvée pour les LEI configurés.")
    return result


def _write_application_outputs(
    output_root: Path,
    application: Application,
    folder: str,
    application_manifest: dict,
    fields: list[str],
    rows: list[dict[str, str]],
    dictionary_rows: list[dict[str, str]],
) -> None:
    app_output_dir = output_root / "applications"
    safe_file_name = folder.lower()
    dataset_path = app_output_dir / "datasets" / f"{safe_file_name}.csv"
    dictionary_path = app_output_dir / "institutions" / f"{safe_file_name}_institution_dictionary.csv"
    _write_csv(dataset_path, fields, rows)
    dictionary_fields = ["Institution ID", "JST code", "Institution Name", "Consolidation Level"]
    _write_csv(dictionary_path, dictionary_fields, dictionary_rows)
    html_path = app_output_dir / "html" / f"Agora Explorer_{folder}.html"
    export_standalone_app(
        dataset_path,
        html_path,
        institution_dictionary_file_path=dictionary_path,
        app_name=f"Agora Explorer — {application.name}",
    )
    application_manifest.update({
        "dataset": str(dataset_path.relative_to(output_root)),
        "institution_dictionary": str(dictionary_path.relative_to(output_root)),
        "html_app": str(html_path.relative_to(output_root)),
        "rows": len(rows),
    })


def global_update(
    config_path: str | Path | None = None,
    *,
    mode: str = "preview",
    output_directory: str | Path | None = None,
    as_of: date | None = None,
    devo_client: QueryClient | None = None,
) -> dict:
    """Prépare, simule ou exécute toutes les applications du classeur."""

    mode = str(mode).strip().lower()
    if mode not in {"preview", "test", "hive"}:
        raise ValueError("mode doit être 'preview', 'test' ou 'hive'.")
    if mode == "hive" and config_path is None:
        raise ValueError("Le mode hive exige --config : le classeur d'exemple contient des LEI fictifs.")
    calculation_date = as_of or date.today()
    workbook_path = Path(config_path) if config_path else EXAMPLE_WORKBOOK
    output_root = Path(output_directory) if output_directory else DEFAULT_OUTPUT_DIRECTORY / mode
    if mode == "hive" and output_directory is None:
        output_root /= datetime.now().strftime("%Y%m%d-%H%M%S-%f")
    if mode == "hive" and output_root.exists() and any(output_root.iterdir()):
        raise ValueError(f"Le dossier de sortie Hive doit être vide : {output_root}")
    applications = _read_configuration(workbook_path, calculation_date)
    fixture = _read_test_fixture(TEST_ENTITIES_PATH) if mode == "test" else None
    client = (devo_client if devo_client is not None else _load_default_devo_client()) if mode == "hive" else None
    query_root = output_root / "queries"
    manifest: dict = {"mode": mode, "as_of": calculation_date.isoformat(), "applications": []}
    for application in applications:
        folder = _safe_name(application.name)
        app_query_dir = query_root / folder
        app_query_dir.mkdir(parents=True, exist_ok=True)
        query_table = PRODUCTION_TABLES
        metadata_relative = (Path("queries") / folder / "institution_metadata.sql").as_posix()
        metadata_sql = _build_institution_sql(application, query_table["ITS"])
        (output_root / metadata_relative).parent.mkdir(parents=True, exist_ok=True)
        (output_root / metadata_relative).write_text(metadata_sql, encoding="utf-8")
        application_manifest = {
            "name": application.name,
            "leis": list(application.leis),
            "consolidation": application.consolidation,
            "metadata_query": metadata_relative,
            "extractions": [],
        }
        dictionary_rows = []
        all_dates = tuple(sorted({item for extraction in application.extractions for item in extraction.reference_dates}))
        records: dict[tuple[str, ...], dict[str, str]] = {}
        if mode == "hive":
            try:
                dictionary_frame = client.read_sql(metadata_sql)
            except Exception as error:
                raise RuntimeError(f"{application.name}: échec de la requête des institutions.") from error
            dictionary_rows = _institution_rows(dictionary_frame, f"{application.name} / institutions")
        for index, extraction in enumerate(application.extractions, start=1):
            source_table = query_table["KRI" if extraction.module == "KRI" else "ITS"]
            sql = _build_extraction_sql(extraction, application, query_table)
            query_relative = (Path("queries") / folder / f"extraction_{index:02d}.sql").as_posix()
            (output_root / query_relative).write_text(sql, encoding="utf-8")
            extraction_manifest = {
                "index": index,
                "module": extraction.module,
                "selector": extraction.selector,
                "history_years": extraction.history_years,
                "history_periods": len(extraction.reference_dates),
                "frequency": extraction.frequency,
                "reference_dates": list(extraction.reference_dates),
                "kri_data_point_ids": list(extraction.kri_data_point_ids),
                "query": query_relative,
                "source_table": source_table,
                **({"identity_table": query_table["ITS"]} if extraction.module == "KRI" else {}),
            }
            if mode == "hive":
                query_label = f"{application.name} / extraction {index:02d}"
                try:
                    dataframe = client.read_sql(sql)
                except Exception as error:
                    raise RuntimeError(f"{query_label}: échec de la requête Hive ({query_relative}).") from error
                extraction_manifest["query_rows"] = _merge_extraction_rows(
                    records, all_dates, extraction, dataframe, query_label,
                )
            application_manifest["extractions"].append(extraction_manifest)
        if mode == "test":
            fields, rows = _build_dummy_dataset(application, fixture)
            dictionary_rows = _dictionary_rows(application, fixture)
            _write_application_outputs(output_root, application, folder, application_manifest, fields, rows, dictionary_rows)
            application_manifest["simulated_rows"] = len(rows)
        elif mode == "hive":
            populated_dates = [
                "ref_" + item.replace("-", "_") for item in all_dates
                if any(record["ref_" + item.replace("-", "_")] for record in records.values())
            ]
            if not populated_dates:
                raise ValueError(f"{application.name}: aucune donnée non vide remontée par les extractions Hive.")
            fields = OUTPUT_COLUMNS + populated_dates + ["extraction_timestamp"]
            _write_application_outputs(
                output_root, application, folder, application_manifest, fields, list(records.values()), dictionary_rows,
            )
        manifest["applications"].append(application_manifest)
    output_root.mkdir(parents=True, exist_ok=True)
    manifest_path = output_root / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    _write_query_index(output_root / "query_index.md", manifest)
    return {"output_directory": str(output_root), "manifest_path": str(manifest_path), "mode": mode, "applications": len(applications)}


def _main() -> None:
    parser = argparse.ArgumentParser(description="Prépare, simule ou exécute les exports Agora Explorer.")
    parser.add_argument("--config", type=Path, default=None, help="Classeur XLSX de paramétrage")
    parser.add_argument("--mode", choices=("preview", "test", "hive"), default="preview")
    parser.add_argument("--output", type=Path, default=None)
    parser.add_argument("--as-of", type=date.fromisoformat, default=None, help="Date de calcul YYYY-MM-DD (utile aux essais reproductibles)")
    args = parser.parse_args()
    try:
        result = global_update(args.config, mode=args.mode, output_directory=args.output, as_of=args.as_of)
    except Exception as error:
        parser.exit(2, f"global_update: {error}\n")
    print(f"{result['applications']} application(s) traitée(s) en mode {result['mode']}")
    print(f"Plan et requêtes : {result['output_directory']}")
    print(f"Index : {result['output_directory']}/query_index.md")


if __name__ == "__main__":
    _main()
