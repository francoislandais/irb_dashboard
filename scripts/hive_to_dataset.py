"""Extraction Hive vers le dossier local ``datasets/`` d'Agora Explorer."""

from __future__ import annotations

from datetime import date
from pathlib import Path
from typing import Iterable, Protocol


PROJECT_DIRECTORY = Path(__file__).resolve().parents[1]
DEFAULT_DATASET_DIRECTORY = PROJECT_DIRECTORY / "datasets"


class HiveClient(Protocol):
    """Interface minimale attendue du client Hive, notamment ``devo``."""

    def read_sql(self, sql: str): ...


def build_hive_query(
    templates: Iterable[str],
    reference_dates: Iterable[str],
    jst_codes: Iterable[str],
) -> str:
    """Construit la requête Hive au format pivoté attendu par l'application."""

    templates = _clean_values(templates, "templates")
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
    template_list = ",\n".join(
        f"          {_sql_literal(template)}" for template in templates
    )
    date_list = ",\n".join(
        f"          {_sql_literal(reference_date)}"
        for reference_date in reference_dates
    )
    jst_code_list = ",\n".join(
        f"          {_sql_literal(jst_code)}" for jst_code in jst_codes
    )

    return f"""SELECT
    table_id,
    jst_code,
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
      AND is_highest_cons = 'Y'
      AND reference_period IN (
{date_list}
      )
      AND regexp_replace(table_id, '\\\\.[A-Za-z]+$', '') IN (
{template_list}
      )
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


def run_hive_query_to_csv(
    templates: Iterable[str],
    reference_dates: Iterable[str],
    jst_codes: Iterable[str],
    output_name: str,
    output_dir: str | Path | None = None,
    devo_client: HiveClient | None = None,
):
    """Exécute la requête et enregistre le CSV directement dans ``datasets/``.

    ``devo_client`` peut être omis lorsque le package ``devo`` est importable.
    Dans un notebook où ``devo`` est déjà initialisé, le passer simplement avec
    ``devo_client=devo``.
    """

    sql = build_hive_query(templates, reference_dates, jst_codes)
    client = devo_client or _load_default_devo_client()
    dataframe = client.read_sql(sql)

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


def _clean_values(values: Iterable[str], label: str) -> list[str]:
    if values is None:
        raise ValueError(f"La liste des {label} ne peut pas être vide.")
    cleaned = list(dict.fromkeys(str(value).strip() for value in values if str(value).strip()))
    if not cleaned:
        raise ValueError(f"La liste des {label} ne peut pas être vide.")
    return cleaned


def _validate_reference_dates(reference_dates: Iterable[str]) -> None:
    for reference_date in reference_dates:
        try:
            parsed = date.fromisoformat(reference_date)
        except ValueError as error:
            raise ValueError(
                f"Date de référence invalide : {reference_date!r}. Format attendu : YYYY-MM-DD."
            ) from error
        if parsed.isoformat() != reference_date:
            raise ValueError(
                f"Date de référence invalide : {reference_date!r}. Format attendu : YYYY-MM-DD."
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
            "Aucun client devo n'est disponible. Passez le client avec devo_client=devo."
        ) from error
    return devo
