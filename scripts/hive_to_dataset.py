"""Extraction Hive vers le dossier local ``datasets/`` d'Agora Explorer."""

from __future__ import annotations

import csv
import re
from datetime import date
from pathlib import Path
from typing import Iterable, Protocol


PROJECT_DIRECTORY = Path(__file__).resolve().parents[1]
DEFAULT_DATASET_DIRECTORY = PROJECT_DIRECTORY / "datasets"
DEFAULT_KRI_DICTIONARY_PATH = PROJECT_DIRECTORY / "app" / "assets" / "KRI_dictionnary.csv"

_TEMPLATE_RANGE_PATTERN = re.compile(
    r"^(?P<prefix>[A-Za-z]+)_xx%(?:\s+xx<(?P<upper_bound>\d+))$",
    re.IGNORECASE,
)
# Only the annex markers actually observed in the KRI dictionary's own
# cellrefs - deliberately not a catch-all "any trailing letters" pattern,
# since some templates have a genuine, meaningful trailing ".1"/".2" (e.g.
# FINREP's F_04.02.1 vs F_04.02.2) that must never be stripped.
_TEMPLATE_ANNEX_SEGMENT_PATTERN = re.compile(
    r"(?:\.(?:dp|a|b|c|d|e|w|x)|_dp)$", re.IGNORECASE
)
_CELLREF_TEMPLATE_PATTERN = re.compile(r"\{T\(([^)]+)\)")
_BRACE_PATTERN = re.compile(r"\{([^{}]+)\}")
_KRI_OFFSET_SUFFIX_PATTERN = re.compile(r"\[T-\d+[YQM]\]\s*$", re.IGNORECASE)


class HiveClient(Protocol):
    """Interface minimale attendue du client Hive, notamment ``devo``."""

    def read_sql(self, sql: str): ...


def build_hive_query(
    templates: Iterable[str],
    reference_dates: Iterable[str],
    jst_codes: Iterable[str],
    module_id: str | Iterable[str] | None = None,
) -> str:
    """Construit la requête Hive au format pivoté attendu par l'application.

    En plus des identifiants explicites, ``templates`` accepte :

    - une plage comme ``F_xx% xx<48`` (préfixes ``F_01%`` à ``F_47%``) ;
    - un joker final comme ``F_20.04%`` ;
    - une exclusion précédée de ``!``, comme ``!F_20.04%``.

    ``module_id`` ajoute une correspondance sur la colonne Hive du même nom :
    une valeur unique (``str``) génère ``module_id = ...``, une liste de
    valeurs (ex. ``["COREP", "FINREP"]``) génère ``module_id IN (...)``. Le
    filtre est désactivé lorsque l'argument est omis ou vide.

    Cette table Hive n'expose aucune colonne d'horodatage d'extraction :
    ``extraction_timestamp`` est ajoutée après coup par
    ``run_hive_query_to_csv`` avec la date du jour, pas par cette requête.
    """

    templates = _clean_values(templates, "templates")
    reference_dates = _clean_values(reference_dates, "dates de référence")
    jst_codes = _clean_values(jst_codes, "JST codes")
    module_ids = _clean_module_id(module_id)
    _validate_reference_dates(reference_dates)

    date_columns = ",\n".join(
        f"""    MAX(CASE
        WHEN reference_period = {_sql_literal(reference_date)}
        THEN value_decimal
    END) AS ref_{reference_date.replace("-", "_")}"""
        for reference_date in reference_dates
    )
    date_list = ",\n".join(
        f"          {_sql_literal(reference_date)}"
        for reference_date in reference_dates
    )
    jst_code_list = ",\n".join(
        f"          {_sql_literal(jst_code)}" for jst_code in jst_codes
    )
    template_filter = _build_template_filter(templates)
    if not module_ids:
        module_filter = ""
    elif len(module_ids) == 1:
        module_filter = f"\n      AND module_id = {_sql_literal(module_ids[0])}"
    else:
        module_id_list = ", ".join(_sql_literal(value) for value in module_ids)
        module_filter = f"\n      AND module_id IN ({module_id_list})"

    return f"""SELECT
    table_id,
    jst_code AS reporting_unit_id,
    x_axis_rc_code,
    y_axis_rc_code,
    z_axis_rc_code,
{date_columns}
FROM (
    SELECT
        regexp_replace(table_id, '\\\\.[A-Za-z]+$', '') AS table_id,
        jst_code,
        x_axis_rc_code,
        y_axis_rc_code,
        z_axis_rc_code,
        reference_period,
        value_decimal
    FROM crp_agora.agora_its_bft_current
    WHERE jst_code IN (
{jst_code_list}
    )
      AND is_group_head = 'Y'
      AND is_highest_cons = 'Y'{module_filter}
      AND reference_period IN (
{date_list}
      )
      AND {template_filter}
) t
GROUP BY
    table_id,
    jst_code,
    x_axis_rc_code,
    y_axis_rc_code,
    z_axis_rc_code
ORDER BY
    table_id,
    jst_code,
    x_axis_rc_code,
    y_axis_rc_code,
    z_axis_rc_code
"""


def build_kri_hive_query(
    kri_data_point_ids: Iterable[str],
    reference_dates: Iterable[str],
    jst_codes: Iterable[str],
) -> str:
    """Construit la requête Hive KRI, pivotée au même format que ``build_hive_query``.

    Il n'y a pas de paramètre ``templates`` : le template produit est
    toujours unique et fixe, appelé ``KRI`` (voir ``table_id`` ci-dessous) -
    ``kri_data_point_ids`` en tient lieu, sur l'unique axe y du template.

    Chaque valeur de ``kri_data_point_ids`` est un identifiant exact
    (``LIQ52``) ou, si elle se termine par ``%``, un préfixe (``LIQ%``) pour
    matcher tout KRI dont l'identifiant commence par ce préfixe (``LIKE``).
    Les deux formes peuvent être mélangées dans la même liste.

    ``x_axis_rc_code`` et ``z_axis_rc_code`` sont vides pour chaque ligne -
    ce template n'a pas ces axes - mais restent présentes dans le résultat
    pour que le CSV garde exactement les mêmes colonnes que le dataset ITS
    existant, sans rien changer au chargement côté application.
    """

    kri_data_point_ids = _clean_values(kri_data_point_ids, "KRI data point ids")
    reference_dates = _clean_values(reference_dates, "dates de référence")
    jst_codes = _clean_values(jst_codes, "JST codes")
    _validate_reference_dates(reference_dates)

    date_columns = ",\n".join(
        f"""    MAX(CASE
        WHEN reference_period = {_sql_literal(reference_date)}
        THEN value_decimal
    END) AS ref_{reference_date.replace("-", "_")}"""
        for reference_date in reference_dates
    )
    date_list = ",\n".join(
        f"          {_sql_literal(reference_date)}"
        for reference_date in reference_dates
    )
    jst_code_list = ",\n".join(
        f"          {_sql_literal(jst_code)}" for jst_code in jst_codes
    )
    kri_filter = _build_kri_filter(kri_data_point_ids)

    return f"""SELECT
    'KRI' AS table_id,
    jst_code AS reporting_unit_id,
    '' AS x_axis_rc_code,
    kri_data_point_id AS y_axis_rc_code,
    '' AS z_axis_rc_code,
{date_columns}
FROM crp_agora.agora_dm_imas_kris_raw
WHERE jst_code IN (
{jst_code_list}
    )
  AND is_group_head = 'Y'
  AND is_highest_cons = 'Y'
  AND value_decimal IS NOT NULL
  AND reference_period IN (
{date_list}
      )
  AND {kri_filter}
GROUP BY
    jst_code,
    kri_data_point_id
ORDER BY
    jst_code,
    kri_data_point_id
"""


def load_kri_dictionary(
    path: str | Path | None = None,
) -> dict[str, str]:
    """Charge le dictionnaire KRI brut en un dict ``code -> formule``.

    Le fichier n'est pas un CSV ordinaire : chaque ligne de données est un
    unique champ, lui-même un triplet CSV ``id,nom,"formule"`` (la formule
    étant ré-échappée, puisqu'elle peut contenir des virgules), suivi de
    ``;;``. On le lit donc en deux passes - d'abord dé-échapper la ligne
    entière, puis découper le triplet qui en ressort - au lieu d'un simple
    ``csv.reader`` qui se tromperait sur la structure.
    """

    dictionary_path = Path(path) if path is not None else DEFAULT_KRI_DICTIONARY_PATH
    text = dictionary_path.read_text(encoding="utf-8", errors="replace")

    formulas: dict[str, str] = {}
    for line in text.splitlines()[1:]:
        line = line.strip()
        if line.endswith(";;"):
            line = line[:-2]
        if not line:
            continue

        outer_fields = next(csv.reader([line]), [])
        if not outer_fields:
            continue

        inner_fields = next(csv.reader([outer_fields[0]]), [])
        if len(inner_fields) < 3:
            continue

        code = inner_fields[0].strip()
        formula = inner_fields[2].strip()
        if code:
            formulas[code] = formula

    return formulas


def _normalize_template_id(template_id: str) -> str:
    """Retire les suffixes d'annexe (``.a``, ``.dp``, ``.a_dp``, ``.b.dp``...)
    d'un code de template - une formule KRI et le référentiel de données
    doivent se retrouver sur le même identifiant normalisé, comme le fait
    déjà la requête Hive elle-même (``regexp_replace(table_id,
    '\\.[A-Za-z]+$', '')``) pour le cas à un seul segment.

    Répété jusqu'à stabilité pour retirer les annexes composées (``.a.dp``,
    ``.b_dp``...) sans jamais toucher un suffixe numérique réel et
    significatif (``F_04.02.1`` reste ``F_04.02.1`` - ce n'est pas une
    annexe, c'est un template FINREP distinct de ``F_04.02.2``).
    """

    normalized = template_id.strip()
    while True:
        stripped = _TEMPLATE_ANNEX_SEGMENT_PATTERN.sub("", normalized)
        if stripped == normalized:
            return normalized
        normalized = stripped


def _extract_formula_references(
    formula: str,
    known_kri_codes: Iterable[str],
) -> tuple[set[str], set[str]]:
    """Extrait, pour une formule KRI, les templates référencés directement
    (``{T(...)...}``) et les autres KRI référencés directement (``{CODE}``
    ou ``{CODE[T-1Y]}``) - sans résoudre les KRI de manière récursive, voir
    ``get_kri_template_dependencies`` pour cela.
    """

    templates = {
        _normalize_template_id(match.group(1))
        for match in _CELLREF_TEMPLATE_PATTERN.finditer(formula)
    }

    known_kri_codes = known_kri_codes if isinstance(known_kri_codes, (set, frozenset)) else set(known_kri_codes)
    kri_refs: set[str] = set()
    for match in _BRACE_PATTERN.finditer(formula):
        inner = match.group(1)
        # {T(...)...} is a cellref (already captured above) and
        # {SPE.DPI(...)} is an internal data point - neither is a reference
        # to another KRI.
        if inner.startswith("T(") or inner.startswith("SPE.DPI("):
            continue
        code = _KRI_OFFSET_SUFFIX_PATTERN.sub("", inner).strip()
        if code in known_kri_codes:
            kri_refs.add(code)

    return templates, kri_refs


def build_kri_template_index(
    kri_formulas: dict[str, str],
) -> dict[str, set[str]]:
    """Calcule, pour chaque KRI du dictionnaire, l'ensemble des templates
    dont il dépend, en remontant récursivement à travers les KRI qu'il
    référence jusqu'au niveau le plus fin - un ensemble vide si ni ce KRI ni
    aucun de ses sous-KRI ne référence directement de template.

    Résolu par propagation à point fixe plutôt que par une récursion
    naïvement mémoïsée : une définition circulaire (A référence B qui
    référence A) casserait une mémoïsation classique - le nœud rencontré en
    second dans le cycle se verrait mis en cache avant que le premier n'ait
    fini d'accumuler ses propres templates, et resterait incomplet pour de
    bon. Ici, chaque KRI d'un même cycle reçoit correctement l'union
    complète de tout ce qui est atteignable depuis le cycle : on part des
    templates référencés directement par chacun, puis on propage le long
    des références entre KRI jusqu'à ce que plus rien ne change - l'ordre
    de visite n'a alors plus d'importance.
    """

    known_codes = set(kri_formulas)
    direct_refs: dict[str, set[str]] = {}
    resolved: dict[str, set[str]] = {}

    for code, formula in kri_formulas.items():
        templates, kri_refs = _extract_formula_references(formula, known_codes)
        direct_refs[code] = kri_refs
        resolved[code] = templates

    changed = True
    while changed:
        changed = False
        for code, kri_refs in direct_refs.items():
            for ref_code in kri_refs:
                missing = resolved[ref_code] - resolved[code]
                if missing:
                    resolved[code] |= missing
                    changed = True

    return resolved


def get_kri_template_dependencies(
    kri_code: str,
    kri_formulas: dict[str, str],
) -> set[str]:
    """Résout les templates utilisés pour nourrir un seul KRI - voir
    ``build_kri_template_index`` pour la logique de résolution (identique
    ici ; ce raccourci recalcule tout l'index, ce qui reste négligeable vu
    la taille du dictionnaire).
    """

    return build_kri_template_index(kri_formulas).get(kri_code, set())


def select_kris_by_templates(
    templates: Iterable[str],
    kri_template_index: dict[str, set[str]],
) -> list[str]:
    """Sélectionne tous les KRI dépendant d'au moins un template de la liste.

    ``templates`` accepte exactement la même syntaxe que ``build_hive_query``
    (voir ``_expand_template_expressions``) : un identifiant exact, un joker
    final (``F_01%``), une plage (``F_xx% xx<48``) ou une exclusion précédée
    de ``!`` (``!F_20.04%``). Une exclusion ne disqualifie pas un KRI dans
    son ensemble : elle retire seulement le(s) template(s) exclus de son
    ensemble de dépendances avant de vérifier s'il en reste un qui
    correspond à une inclusion - un KRI qui dépend à la fois d'un template
    inclus et d'un template exclu reste donc sélectionné grâce au premier.
    """

    templates = _clean_values(templates, "templates")
    included, excluded = _expand_template_expressions(templates)

    def matches(template_id: str, pattern: str) -> bool:
        if pattern.endswith("%"):
            return template_id.startswith(pattern[:-1])
        return template_id == pattern

    def matches_any(template_id: str, patterns: list[str]) -> bool:
        return any(matches(template_id, pattern) for pattern in patterns)

    selected = []
    for code, dependency_templates in kri_template_index.items():
        effective = {t for t in dependency_templates if not matches_any(t, excluded)}
        if any(matches_any(t, included) for t in effective):
            selected.append(code)

    return sorted(selected)


def find_kris_using_templates(
    templates: Iterable[str],
    dictionary_path: str | Path | None = None,
) -> list[str]:
    """Raccourci bout-en-bout : charge le dictionnaire, résout les
    dépendances de chaque KRI puis sélectionne ceux qui utilisent au moins
    un des templates demandés (voir ``select_kris_by_templates``).
    """

    kri_formulas = load_kri_dictionary(dictionary_path)
    kri_template_index = build_kri_template_index(kri_formulas)
    return select_kris_by_templates(templates, kri_template_index)


def run_hive_query_to_csv(
    templates: Iterable[str],
    reference_dates: Iterable[str],
    jst_codes: Iterable[str],
    output_name: str,
    output_dir: str | Path | None = None,
    devo_client: HiveClient | None = None,
    module_id: str | Iterable[str] | None = None,
):
    """Exécute la requête et enregistre le CSV directement dans ``datasets/``.

    ``devo_client`` peut être omis lorsque le package ``devo`` est importable.
    Dans un notebook où ``devo`` est déjà initialisé, le passer simplement avec
    ``devo_client=devo``.

    ``module_id`` est transmis à ``build_hive_query`` (valeur unique ou liste,
    voir sa docstring). Sa valeur par défaut ``None`` conserve l'extraction
    ITS sans filtre de module.
    """

    sql = build_hive_query(
        templates,
        reference_dates,
        jst_codes,
        module_id=module_id,
    )
    client = devo_client or _load_default_devo_client()
    dataframe = client.read_sql(sql)
    dataframe["extraction_timestamp"] = date.today().isoformat()

    dataset_directory = (
        Path(output_dir).expanduser().resolve()
        if output_dir is not None
        else DEFAULT_DATASET_DIRECTORY
    )
    dataset_directory.mkdir(parents=True, exist_ok=True)
    output_path = dataset_directory / _normalize_csv_name(output_name)
    dataframe.to_csv(output_path, index=False)

    print(f"CSV sauvegardé : {output_path}")
    print(f"Nombre de lignes : {len(dataframe):,}")
    return dataframe


def run_kri_hive_query_to_csv(
    kri_data_point_ids: Iterable[str],
    reference_dates: Iterable[str],
    jst_codes: Iterable[str],
    output_name: str,
    output_dir: str | Path | None = None,
    devo_client: HiveClient | None = None,
):
    """Exécute la requête KRI et enregistre le CSV directement dans ``datasets/``.

    ``devo_client`` peut être omis lorsque le package ``devo`` est importable.
    Dans un notebook où ``devo`` est déjà initialisé, le passer simplement avec
    ``devo_client=devo``.
    """

    sql = build_kri_hive_query(kri_data_point_ids, reference_dates, jst_codes)
    client = devo_client or _load_default_devo_client()
    dataframe = client.read_sql(sql)
    dataframe["extraction_timestamp"] = date.today().isoformat()

    dataset_directory = (
        Path(output_dir).expanduser().resolve()
        if output_dir is not None
        else DEFAULT_DATASET_DIRECTORY
    )
    dataset_directory.mkdir(parents=True, exist_ok=True)
    output_path = dataset_directory / _normalize_csv_name(output_name)
    dataframe.to_csv(output_path, index=False)

    print(f"CSV sauvegardé : {output_path}")
    print(f"Nombre de lignes : {len(dataframe):,}")
    return dataframe


def _build_kri_filter(kri_data_point_ids: Iterable[str]) -> str:
    """Construit le filtre SQL sur ``kri_data_point_id``.

    Chaque valeur est un identifiant exact (``=``) ou, si elle se termine
    par ``%``, un préfixe (``LIKE``) - les deux formes peuvent être
    mélangées dans la même liste.
    """

    conditions = [
        f"kri_data_point_id LIKE {_sql_literal(kri_id)}"
        if kri_id.endswith("%")
        else f"kri_data_point_id = {_sql_literal(kri_id)}"
        for kri_id in kri_data_point_ids
    ]
    if len(conditions) == 1:
        return conditions[0]

    return "(\n          " + "\n          OR ".join(conditions) + "\n      )"


def _expand_template_expressions(
    templates: Iterable[str],
) -> tuple[list[str], list[str]]:
    """Résout chaque expression de template en motifs plats (inclusions,
    exclusions), sans rien émettre de spécifique à SQL.

    Une plage comme ``F_xx% xx<48`` est développée en préfixes concrets
    (``F_01%`` à ``F_47%``) ; un identifiant exact ou un joker final
    (``F_20.04%``) est renvoyé tel quel. C'est le "moteur" partagé par
    ``_build_template_filter`` (SQL) et ``select_kris_by_templates``
    (filtrage en mémoire du référentiel KRI) - un seul endroit comprend la
    syntaxe des expressions de template.
    """

    included: list[str] = []
    excluded: list[str] = []

    for expression in templates:
        is_exclusion = expression.startswith("!")
        template = expression[1:].strip() if is_exclusion else expression
        if not template:
            raise ValueError(f"Expression de template invalide : {expression!r}.")

        target = excluded if is_exclusion else included
        match = _TEMPLATE_RANGE_PATTERN.fullmatch(template)
        if match is None:
            if "%" in template[:-1] or "_" in template.replace("_", "", 1):
                raise ValueError(
                    f"Joker invalide dans l'expression {expression!r}. "
                    "Seul un % final est accepté."
                )
            target.append(template)
            continue

        prefix = match.group("prefix").upper()
        upper_bound = int(match.group("upper_bound"))
        if upper_bound <= 1 or upper_bound > 100:
            raise ValueError(
                f"Borne invalide dans l'expression de template {template!r}. "
                "La borne doit être comprise entre 2 et 100."
            )

        target.extend(f"{prefix}_{number:02d}%" for number in range(1, upper_bound))

    if not included:
        raise ValueError("Au moins un template à inclure doit être indiqué.")

    return included, excluded


def _build_template_filter(templates: Iterable[str]) -> str:
    """Construit le filtre SQL pour inclusions, plages et exclusions."""

    table_id = "regexp_replace(table_id, '\\\\.[A-Za-z]+$', '')"
    included, excluded = _expand_template_expressions(templates)

    def clause(pattern: str) -> str:
        operator = "LIKE" if pattern.endswith("%") else "="
        return f"{table_id} {operator} {_sql_literal(pattern)}"

    include_filter = (
        "(\n          " + "\n          OR ".join(map(clause, included)) + "\n      )"
    )
    if not excluded:
        return include_filter

    exclude_filter = (
        "(\n          " + "\n          OR ".join(map(clause, excluded)) + "\n      )"
    )
    return f"{include_filter}\n      AND NOT {exclude_filter}"


def _clean_values(values: Iterable[str], label: str) -> list[str]:
    if values is None:
        raise ValueError(f"La liste des {label} ne peut pas être vide.")
    # A bare string is iterable character by character in Python - silently
    # exploding e.g. templates="F_01%" into ["F", "_", "0", "1", "%"] would
    # turn a single intended filter into several, the lone "%" among them
    # matching everything on its own. Treat a bare string as one value.
    if isinstance(values, (str, bytes)):
        values = [values]
    cleaned = list(
        dict.fromkeys(str(value).strip() for value in values if str(value).strip())
    )
    if not cleaned:
        raise ValueError(f"La liste des {label} ne peut pas être vide.")
    return cleaned


def _clean_module_id(module_id: str | Iterable[str] | None) -> list[str]:
    """Normalise ``module_id`` en liste, sans exiger de valeur (contrairement
    à ``_clean_values``) puisque ce filtre est optionnel et désactivé quand
    il est vide. Une chaîne seule est traitée comme une valeur unique, pas
    itérée caractère par caractère - même précaution que ``_clean_values``."""

    if module_id is None:
        return []
    if isinstance(module_id, (str, bytes)):
        module_id = [module_id]
    return list(
        dict.fromkeys(str(value).strip() for value in module_id if str(value).strip())
    )


def _validate_reference_dates(reference_dates: Iterable[str]) -> None:
    for reference_date in reference_dates:
        try:
            parsed = date.fromisoformat(reference_date)
        except ValueError as error:
            raise ValueError(
                f"Date de référence invalide : {reference_date!r}. "
                "Format attendu : YYYY-MM-DD."
            ) from error
        if parsed.isoformat() != reference_date:
            raise ValueError(
                f"Date de référence invalide : {reference_date!r}. "
                "Format attendu : YYYY-MM-DD."
            )


def _sql_literal(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def _normalize_csv_name(output_name: str) -> str:
    name = Path(str(output_name).strip()).name
    if not name:
        raise ValueError("Le nom du fichier CSV ne peut pas être vide.")
    return name if name.lower().endswith(".csv") else f"{name}.csv"


def _load_default_devo_client() -> HiveClient:
    try:
        import devo  # type: ignore[import-not-found]
    except ImportError as error:
        raise RuntimeError(
            "Aucun client devo n'est disponible. "
            "Passez le client avec devo_client=devo."
        ) from error
    return devo
