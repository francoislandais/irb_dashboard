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
try:
    import tomllib
except ModuleNotFoundError:  # Python 3.10
    import tomli as tomllib
from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from functools import lru_cache
from pathlib import Path
from typing import Iterable, Protocol

if __package__:
    from .compact_dataset_values import compact_dataset_rows
    from .export_all_standalone_apps import export_standalone_app
    from .hive_to_dataset import (
        _expand_template_expressions,
        _build_kri_filter,
        _build_template_filter,
        _load_default_devo_client,
        find_kris_using_templates,
        load_kri_dictionary,
    )
else:
    from compact_dataset_values import compact_dataset_rows
    from export_all_standalone_apps import export_standalone_app
    from hive_to_dataset import (
        _expand_template_expressions,
        _build_kri_filter,
        _build_template_filter,
        _load_default_devo_client,
        find_kris_using_templates,
        load_kri_dictionary,
    )


PROJECT_DIRECTORY = Path(__file__).resolve().parents[1]
EXAMPLE_CONFIG_DIRECTORY = PROJECT_DIRECTORY / "examples" / "global-update"
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
    selection_type: str = "templates"
    label: str = ""
    category: str = ""
    modules: tuple[str, ...] = ()


@dataclass(frozen=True)
class Application:
    name: str
    leis: tuple[str, ...]
    consolidation: str
    extractions: tuple[Extraction, ...]
    config_file: str = ""


class QueryClient(Protocol):
    def read_sql(self, sql: str): ...


def _required_text(value: object, field: str, context: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{context}: {field} doit être un texte non vide.")
    return value.strip()


def _string_list(value: object, field: str, context: str) -> tuple[str, ...]:
    if not isinstance(value, list) or not value:
        raise ValueError(f"{context}: {field} doit être une liste TOML non vide de textes.")
    if any(not isinstance(item, str) or not item.strip() for item in value):
        raise ValueError(f"{context}: chaque élément de {field} doit être un texte non vide.")
    items = tuple(item.strip() for item in value)
    if len(set(items)) != len(items):
        raise ValueError(f"{context}: {field} contient des doublons.")
    return items


def _check_keys(value: dict, allowed: set[str], context: str) -> None:
    unknown = set(value) - allowed
    if unknown:
        raise ValueError(f"{context}: champ(s) inconnu(s) : {', '.join(sorted(unknown))}.")


def _is_temporary_file(path: Path) -> bool:
    name = path.name.lower()
    return path.is_file() and (
        name.startswith("~$")
        or name.endswith((".amltmp", ".tmp", ".temp", ".swp", ".swo", ".bak", "~"))
    )


@lru_cache(maxsize=1)
def _known_kri_ids() -> frozenset[str]:
    return frozenset(load_kri_dictionary())


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
    if not path.is_dir():
        raise ValueError(f"Dossier de paramétrage introuvable : {path}")
    entries = sorted(
        (item for item in path.iterdir() if not item.name.startswith(".") and not _is_temporary_file(item)),
        key=lambda item: item.name.casefold(),
    )
    invalid = [item.name for item in entries if not item.is_file() or item.suffix.lower() != ".toml"]
    if invalid:
        raise ValueError(f"{path}: seuls des fichiers .toml sont attendus ; entrée(s) non reconnue(s) : {', '.join(invalid)}.")
    if not entries:
        raise ValueError(f"{path}: aucun fichier .toml à traiter.")

    applications: list[Application] = []
    lei_pattern = re.compile(r"^[A-Z0-9]{20}$")
    names: set[str] = set()
    output_names: set[str] = set()
    for file in entries:
        try:
            with file.open("rb") as stream:
                config = tomllib.load(stream)
        except (tomllib.TOMLDecodeError, UnicodeDecodeError) as error:
            raise ValueError(f"{file}: syntaxe TOML invalide : {error}") from error
        context = file.name
        _check_keys(config, {"name", "leis", "consolidation", "extractions"}, context)
        name = _required_text(config.get("name"), "name", context)
        if name.casefold() in names:
            raise ValueError(f"{context}: nom d'application déjà utilisé : {name}.")
        output_name = _safe_name(name).casefold()
        if output_name in output_names:
            raise ValueError(f"{context}: le nom {name!r} entre en collision avec un autre nom de fichier de sortie.")
        names.add(name.casefold())
        output_names.add(output_name)

        leis = tuple(lei.upper() for lei in _string_list(config.get("leis"), "leis", context))
        if any(not lei_pattern.fullmatch(lei) for lei in leis):
            raise ValueError(f"{context}: chaque LEI doit contenir exactement 20 lettres ou chiffres.")
        if len(set(leis)) != len(leis):
            raise ValueError(f"{context}: leis contient des doublons.")
        consolidation = _required_text(config.get("consolidation"), "consolidation", context).upper()
        if consolidation not in CONSOLIDATION_MODES:
            raise ValueError(f"{context}: consolidation doit être l'un de {', '.join(sorted(CONSOLIDATION_MODES))}.")
        raw_extractions = config.get("extractions")
        if not isinstance(raw_extractions, list) or not raw_extractions:
            raise ValueError(f"{context}: au moins un bloc [[extractions]] est requis.")
        extractions: list[Extraction] = []
        for index, raw in enumerate(raw_extractions, start=1):
            block = f"{context}, extraction {index}"
            if not isinstance(raw, dict):
                raise ValueError(f"{block}: un bloc TOML est attendu.")
            _check_keys(raw, {"category", "label", "module", "templates", "kri_ids", "history_years", "frequency"}, block)
            raw_module = raw.get("module")
            if isinstance(raw_module, str):
                modules = (_required_text(raw_module, "module", block).upper(),)
            elif isinstance(raw_module, list):
                modules = tuple(value.upper() for value in _string_list(raw_module, "module", block))
            else:
                raise ValueError(f"{block}: module doit être un texte non vide ou une liste de textes non vide.")
            if len(set(modules)) != len(modules):
                raise ValueError(f"{block}: module contient des doublons.")
            invalid_modules = [value for value in modules if not re.fullmatch(r"%*[A-Z][A-Z0-9_%]*", value)]
            if invalid_modules:
                raise ValueError(f"{block}: module invalide ({', '.join(invalid_modules)}). Seul % est autorisé comme joker.")
            if len(modules) > 1 and any(value in {"ITS", "KRI"} for value in modules):
                raise ValueError(f"{block}: ITS et KRI doivent être seuls dans leur bloc d'extraction.")
            module = "" if modules == ("ITS",) else ", ".join(modules)
            category = raw.get("category", "")
            if category:
                category = _required_text(category, "category", block)
            elif not isinstance(category, str):
                raise ValueError(f"{block}: category doit être un texte.")
            label = raw.get("label", "")
            if label:
                label = _required_text(label, "label", block)
            elif not isinstance(label, str):
                raise ValueError(f"{block}: label doit être un texte.")
            history_years = raw.get("history_years")
            if type(history_years) is not int or history_years < 1:
                raise ValueError(f"{block}: history_years doit être un entier positif.")
            frequency = _required_text(raw.get("frequency"), "frequency", block).upper().replace("-", "_").replace(" ", "_")
            if frequency not in FREQUENCIES:
                raise ValueError(f"{block}: fréquence invalide ({frequency}); utiliser {', '.join(sorted(FREQUENCIES))}.")
            has_templates = "templates" in raw
            has_kri_ids = "kri_ids" in raw
            if has_templates == has_kri_ids:
                raise ValueError(f"{block}: indiquer exactement un champ templates ou kri_ids.")
            if has_kri_ids and module != "KRI":
                raise ValueError(f"{block}: kri_ids est réservé au module KRI.")
            kri_ids: tuple[str, ...] = ()
            if has_templates:
                templates = _string_list(raw["templates"], "templates", block)
                try:
                    _expand_template_expressions(templates)
                    if module == "KRI":
                        kri_ids = tuple(find_kris_using_templates(templates))
                except ValueError as error:
                    raise ValueError(f"{block}: {error}") from error
                if module == "KRI" and not kri_ids:
                    raise ValueError(f"{block}: aucun KRI ne dépend des templates demandés.")
                selector = ", ".join(templates)
                selection_type = "templates"
            else:
                kri_ids = _string_list(raw["kri_ids"], "kri_ids", block)
                known_kri_ids = _known_kri_ids()
                missing = [pattern for pattern in kri_ids if not any(_kri_pattern_matches(code, pattern) for code in known_kri_ids)]
                if missing:
                    raise ValueError(f"{block}: code(s) ou motif(s) KRI sans correspondance dans le dictionnaire : {', '.join(sorted(missing))}.")
                selector = ", ".join(kri_ids)
                selection_type = "kri_ids"
            history_periods = history_years * PERIODS_PER_YEAR[frequency]
            dates = _reference_dates(frequency, history_periods, as_of)
            extractions.append(Extraction(module, selector, history_years, frequency, dates, kri_ids, selection_type, label, category, () if module in {"", "KRI"} else modules))
        applications.append(Application(name, leis, consolidation, tuple(extractions), context))
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


def _module_patterns(extraction: Extraction) -> tuple[str, ...]:
    return extraction.modules or ((extraction.module,) if extraction.module and extraction.module != "KRI" else ())


def _module_filter(extraction: Extraction) -> str:
    patterns = _module_patterns(extraction)
    if not patterns:
        return ""
    exact = [value for value in patterns if "%" not in value]
    wildcard = [value for value in patterns if "%" in value]
    conditions = []
    if len(exact) == 1:
        conditions.append(f"module_id = {_sql_literal(exact[0])}")
    elif exact:
        conditions.append("module_id IN (" + ", ".join(_sql_literal(value) for value in exact) + ")")
    for pattern in wildcard:
        expression = "^" + re.escape(pattern).replace("%", ".*") + "$"
        conditions.append(f"module_id RLIKE {_sql_literal(expression)}")
    if len(conditions) == 1:
        return "\n      AND " + conditions[0]
    return "\n      AND (\n          " + "\n          OR ".join(conditions) + "\n      )"


def _kri_pattern_matches(code: str, pattern: str) -> bool:
    return re.fullmatch(re.escape(pattern).replace("%", ".*"), code) is not None


def _kri_selection_filter(kri_ids: tuple[str, ...]) -> str:
    if "%" in kri_ids:
        return ""
    exact = [value for value in kri_ids if "%" not in value]
    wildcard = [value for value in kri_ids if "%" in value]
    conditions = []
    if exact:
        conditions.append(_build_kri_filter(exact))
    for pattern in wildcard:
        expression = "^" + re.escape(pattern).replace("%", ".*") + "$"
        conditions.append(f"kri_data_point_id RLIKE {_sql_literal(expression)}")
    return conditions[0] if len(conditions) == 1 else "(\n          " + "\n          OR ".join(conditions) + "\n      )"


def _build_extraction_sql(
    extraction: Extraction, application: Application, tables: dict[str, str] = PRODUCTION_TABLES,
    reporting_units: list[dict[str, str]] | None = None,
) -> str:
    consolidation = _consolidation_predicate(application.consolidation)
    consolidation_filter = f"\n      AND {consolidation}" if consolidation else ""
    if extraction.module == "KRI":
        kri_filter = _kri_selection_filter(extraction.kri_data_point_ids)
        kri_filter_sql = f"\n  AND {kri_filter}" if kri_filter else ""
        if reporting_units is None:
            # Preview cannot know the KRI entity_id values until the separate
            # institution query has run. Keep the query inspectable without
            # pretending that a LEI can filter the KRI source directly.
            unit_case = "__REPORTING_UNIT_CASE_FROM_INSTITUTION_METADATA__"
            unit_filter = "__REPORTING_UNIT_FILTER_FROM_INSTITUTION_METADATA__"
            preview_notice = "-- Preview template: execute institution_metadata.sql to resolve the reporting units.\n"
        else:
            if not reporting_units:
                raise ValueError(f"{application.name}: aucune unité de reporting pour la requête KRI.")
            pairs = [
                f"(kri.entity_id = {_sql_literal(unit['entity_id'])} "
                f"AND kri.cons_level = {_sql_literal(unit['consolidation_level'])})"
                for unit in reporting_units
            ]
            unit_case = "CASE\n" + "\n".join(
                f"        WHEN {pair} THEN {_sql_literal(unit['institution_id'])}"
                for pair, unit in zip(pairs, reporting_units)
            ) + "\n    END"
            unit_filter = "(\n      " + "\n      OR ".join(pairs) + "\n  )"
            preview_notice = ""
        return f"""{preview_notice}SELECT
    'KRI' AS table_id,
    {unit_case} AS reporting_unit_id,
    '' AS x_axis_rc_code,
    kri.kri_data_point_id AS y_axis_rc_code,
    '' AS z_axis_rc_code,
{_date_columns(extraction.reference_dates, 'kri.')}
FROM {tables['KRI']} kri
WHERE kri.value_decimal IS NOT NULL
  AND {unit_filter}
  AND {_date_filter(extraction.reference_dates, 'kri.')}{kri_filter_sql}
GROUP BY
    kri.entity_id,
    kri.cons_level,
    kri.kri_data_point_id
ORDER BY
    kri.entity_id,
    kri.cons_level,
    kri.kri_data_point_id
"""

    template_filter = _build_template_filter(
        [extraction.selector], table_id_expression=NORMALIZED_TABLE_ID,
    )
    module_filter = _module_filter(extraction)
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
    WHERE {_lei_filter(application.leis)}{consolidation_filter}{module_filter}
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
    return f"""SELECT
    entity_id,
    CONCAT(lei, '_', cons_level) AS institution_id,
    lei,
    COALESCE(
        MAX(CASE WHEN TRIM(jst_code_today) <> '' THEN jst_code_today END),
        MAX(jst_code)
    ) AS jst_code,
    MAX(name) AS institution_name,
    cons_level AS consolidation_level,
    MAX(is_highest_cons) AS is_highest_cons
FROM {table}
WHERE {_lei_filter(application.leis)}
GROUP BY
    entity_id,
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
    if manifest.get("compact_values"):
        lines.extend(["Stockage compact des valeurs : activé pour les datasets exportés (sans changement du SQL).", ""])
    for application in manifest["applications"]:
        lines.extend([f"## {application['name']}", "", f"Configuration : `{application['config_file']}`", f"Niveau : `{application['consolidation']}`", f"LEI : {', '.join(application['leis'])}", ""])
        lines.append(f"- [Requête des métadonnées institutionnelles]({application['metadata_query']})")
        current_category = None
        for extraction in application["extractions"]:
            category = extraction["category"] or "Autres extractions"
            if category != current_category:
                lines.extend(["", f"### {category}", ""])
                current_category = category
            year_label = "an" if extraction["history_years"] == 1 else "ans"
            module_label = extraction["module"] or "ITS (all modules)"
            title = extraction["label"] or f"{module_label} / {extraction['selector']}"
            lines.append(
                f"- [Extraction {extraction['index']:02d} — {title}]"
                f"({extraction['query']}) — {extraction['frequency']}, {extraction['history_years']} {year_label}"
                f" ({extraction['history_periods']} périodes)"
                f" ({extraction['reference_dates'][0]} → {extraction['reference_dates'][-1]})"
            )
        if application.get("dataset"):
            lines.extend([f"- Dataset de simulation : `{application['dataset']}`", f"- Dictionnaire : `{application['institution_dictionary']}`", f"- Application : `{application['html_app']}`"])
        lines.append("")
    if manifest["mode"] == "test":
        lines.extend(["Les résultats du mode `test` viennent de la fixture locale ; aucune connexion Hive n'est ouverte.", ""])
    elif manifest["mode"] == "preview" and any(
        extraction["module"] == "KRI"
        for application in manifest["applications"] for extraction in application["extractions"]
    ):
        lines.extend(["Les requêtes KRI en mode `preview` contiennent des marqueurs pour les `entity_id` : la requête des métadonnées doit être exécutée avant de pouvoir les finaliser. Les modes `test` et `hive` produisent des requêtes complètes.", ""])
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


def _module_matches(value: str, pattern: str) -> bool:
    return re.fullmatch(re.escape(pattern).replace("%", ".*"), value) is not None


def _dictionary_rows(application: Application, fixture: dict) -> list[dict[str, str]]:
    return _institution_dictionary_rows(_fixture_reporting_units(application, fixture))


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
            if extraction.selection_type == "kri_ids":
                exact = (code for code in extraction.kri_data_point_ids if "%" not in code)
                matched = (code for code in module_templates.get("KRI", [])
                           if any(_kri_pattern_matches(code, pattern) for pattern in extraction.kri_data_point_ids))
                templates = list(dict.fromkeys((*exact, *matched)))
            else:
                templates = list(extraction.kri_data_point_ids)
            is_kri = True
        else:
            patterns = _module_patterns(extraction)
            available_templates = dict.fromkeys(
                table_id for module_name, group in module_templates.items()
                if module_name != "KRI" and (not patterns or any(_module_matches(module_name, pattern) for pattern in patterns))
                for table_id in group
            )
            templates = _selected_fixture_templates(extraction.selector, available_templates)
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
    required = ("entity_id", "institution_id", "lei", "jst_code", "institution_name", "consolidation_level", "is_highest_cons")
    rows = _dataframe_rows(dataframe, required, query_label)
    result = []
    seen_ids = set()
    seen_pairs = set()
    for row in rows:
        if not row["entity_id"] or not row["institution_id"] or not row["lei"] or not row["consolidation_level"]:
            raise ValueError(f"{query_label}: identifiant, LEI ou niveau vide dans le résultat Hive.")
        pair = (row["entity_id"], row["consolidation_level"])
        if row["institution_id"] in seen_ids or pair in seen_pairs:
            raise ValueError(f"{query_label}: unité de reporting ambiguë dans les métadonnées ({row['institution_id']}).")
        seen_ids.add(row["institution_id"])
        seen_pairs.add(pair)
        result.append({
            "entity_id": row["entity_id"],
            "institution_id": row["institution_id"],
            "lei": row["lei"],
            "jst_code": row["jst_code"],
            "institution_name": row["institution_name"],
            "consolidation_level": row["consolidation_level"],
            "is_highest_cons": row["is_highest_cons"],
        })
    if not result:
        raise ValueError(f"{query_label}: aucune institution trouvée pour les LEI configurés.")
    return result


def _select_institution_rows(rows: list[dict[str, str]], application: Application) -> list[dict[str, str]]:
    levels = set(_selected_levels(application.consolidation, "")) if application.consolidation != "HIGHEST" else set()
    selected = [row for row in rows if row["lei"] in application.leis and (
        row["is_highest_cons"].upper() == "Y" if application.consolidation == "HIGHEST"
        else row["consolidation_level"] in levels
    )]
    if not selected:
        raise ValueError(f"{application.name}: aucune unité de reporting ne correspond au niveau de consolidation demandé.")
    missing_leis = set(application.leis) - {row["lei"] for row in selected}
    if missing_leis:
        raise ValueError(f"{application.name}: aucune unité de reporting pour les LEI : {', '.join(sorted(missing_leis))}.")
    if application.consolidation == "HIGHEST":
        counts = {lei: sum(row["lei"] == lei for row in selected) for lei in application.leis}
        ambiguous = [lei for lei, count in counts.items() if count != 1]
        if ambiguous:
            raise ValueError(f"{application.name}: plus haut niveau de consolidation ambigu pour les LEI : {', '.join(ambiguous)}.")
    if any(not row["jst_code"] for row in selected):
        raise ValueError(f"{application.name}: JST code manquant pour une unité de reporting sélectionnée.")
    return selected


def _institution_dictionary_rows(rows: list[dict[str, str]]) -> list[dict[str, str]]:
    return [{
        "Institution ID": row["institution_id"],
        "JST code": row["jst_code"],
        "Institution Name": row["institution_name"],
        "Consolidation Level": row["consolidation_level"],
    } for row in rows]


def _fixture_reporting_units(application: Application, fixture: dict) -> list[dict[str, str]]:
    entities_by_lei = {entity["lei"]: (index, entity) for index, entity in enumerate(fixture["entities"], start=1)}
    rows = []
    for lei in application.leis:
        match = entities_by_lei.get(lei)
        if not match:
            continue
        index, entity = match
        for level, jst_code in entity["jst_by_level"].items():
            if not jst_code:
                continue
            rows.append({
                "entity_id": entity.get("entity_id", f"TEST_ENTITY_{index}"),
                "institution_id": f"{lei}_{level}",
                "lei": lei,
                "jst_code": jst_code,
                "institution_name": entity["institution_name"],
                "consolidation_level": level,
                "is_highest_cons": "Y" if level == entity["highest_level"] else "N",
            })
    return _select_institution_rows(rows, application)


def _write_application_outputs(
    output_root: Path,
    application: Application,
    folder: str,
    application_manifest: dict,
    fields: list[str],
    rows: list[dict[str, str]],
    dictionary_rows: list[dict[str, str]],
    *,
    compact_values: bool = False,
) -> None:
    app_output_dir = output_root / "applications"
    safe_file_name = folder.lower()
    if compact_values:
        fields, rows, value_counts = compact_dataset_rows(fields, rows)
        application_manifest["compact_values"] = value_counts
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
    compact_values: bool = False,
) -> dict:
    """Prépare, simule ou exécute toutes les applications du dossier TOML."""

    mode = str(mode).strip().lower()
    if mode not in {"preview", "test", "hive"}:
        raise ValueError("mode doit être 'preview', 'test' ou 'hive'.")
    if mode == "hive" and config_path is None:
        raise ValueError("Le mode hive exige --config : les fichiers d'exemple contiennent des LEI fictifs.")
    calculation_date = as_of or date.today()
    config_directory = Path(config_path) if config_path else EXAMPLE_CONFIG_DIRECTORY
    output_root = Path(output_directory) if output_directory else DEFAULT_OUTPUT_DIRECTORY / mode
    if mode == "hive" and output_directory is None:
        output_root /= datetime.now().strftime("%Y%m%d-%H%M%S-%f")
    if mode == "hive" and output_root.exists() and any(output_root.iterdir()):
        raise ValueError(f"Le dossier de sortie Hive doit être vide : {output_root}")
    applications = _read_configuration(config_directory, calculation_date)
    fixture = _read_test_fixture(TEST_ENTITIES_PATH) if mode == "test" else None
    client = (devo_client if devo_client is not None else _load_default_devo_client()) if mode == "hive" else None
    query_root = output_root / "queries"
    manifest: dict = {"mode": mode, "as_of": calculation_date.isoformat(), "config_directory": str(config_directory.resolve()), "compact_values": compact_values, "applications": []}
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
            "config_file": application.config_file,
            "leis": list(application.leis),
            "consolidation": application.consolidation,
            "metadata_query": metadata_relative,
            "extractions": [],
        }
        dictionary_rows = []
        reporting_units = None
        all_dates = tuple(sorted({item for extraction in application.extractions for item in extraction.reference_dates}))
        records: dict[tuple[str, ...], dict[str, str]] = {}
        if mode == "hive":
            try:
                dictionary_frame = client.read_sql(metadata_sql)
            except Exception as error:
                raise RuntimeError(f"{application.name}: échec de la requête des institutions.") from error
            reporting_units = _select_institution_rows(
                _institution_rows(dictionary_frame, f"{application.name} / institutions"), application,
            )
            dictionary_rows = _institution_dictionary_rows(reporting_units)
        elif mode == "test":
            reporting_units = _fixture_reporting_units(application, fixture)
            dictionary_rows = _institution_dictionary_rows(reporting_units)
        for index, extraction in enumerate(application.extractions, start=1):
            source_table = query_table["KRI" if extraction.module == "KRI" else "ITS"]
            sql = _build_extraction_sql(extraction, application, query_table, reporting_units)
            query_relative = (Path("queries") / folder / f"extraction_{index:02d}.sql").as_posix()
            (output_root / query_relative).write_text(sql, encoding="utf-8")
            extraction_manifest = {
                "index": index,
                "label": extraction.label,
                "category": extraction.category,
                "module": extraction.module,
                "modules": list(_module_patterns(extraction)),
                "selector": extraction.selector,
                "selection_type": extraction.selection_type,
                "history_years": extraction.history_years,
                "history_periods": len(extraction.reference_dates),
                "frequency": extraction.frequency,
                "reference_dates": list(extraction.reference_dates),
                "kri_data_point_ids": list(extraction.kri_data_point_ids),
                "query": query_relative,
                "source_table": source_table,
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
            _write_application_outputs(output_root, application, folder, application_manifest, fields, rows, dictionary_rows, compact_values=compact_values)
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
                compact_values=compact_values,
            )
        manifest["applications"].append(application_manifest)
    output_root.mkdir(parents=True, exist_ok=True)
    manifest_path = output_root / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    _write_query_index(output_root / "query_index.md", manifest)
    return {"output_directory": str(output_root), "manifest_path": str(manifest_path), "mode": mode, "applications": len(applications)}


def _main() -> None:
    parser = argparse.ArgumentParser(description="Prépare, simule ou exécute les exports Agora Explorer.")
    parser.add_argument("--config", "--config-dir", type=Path, default=None, help="Dossier des fichiers TOML de paramétrage")
    parser.add_argument("--mode", choices=("preview", "test", "hive"), default="preview")
    parser.add_argument("--output", type=Path, default=None)
    parser.add_argument("--as-of", type=date.fromisoformat, default=None, help="Date de calcul YYYY-MM-DD (utile aux essais reproductibles)")
    parser.add_argument("--compact-values", action="store_true", help="Stocker les montants en milliers entiers et les pourcentages sur quatre chiffres significatifs")
    args = parser.parse_args()
    try:
        result = global_update(args.config, mode=args.mode, output_directory=args.output, as_of=args.as_of, compact_values=args.compact_values)
    except Exception as error:
        parser.exit(2, f"global_update: {error}\n")
    print(f"{result['applications']} application(s) traitée(s) en mode {result['mode']}")
    print(f"Plan et requêtes : {result['output_directory']}")
    print(f"Index : {result['output_directory']}/query_index.md")


if __name__ == "__main__":
    _main()
