"""Run the production extraction queries against small, raw local CSV copies."""

from __future__ import annotations

import csv
import gzip
import io
import re
import sqlite3
import zipfile
from contextlib import ExitStack
from pathlib import Path


ITS_COLUMNS = {
    "entity_id", "lei", "jst_code", "jst_code_today", "name", "cons_level",
    "is_highest_cons", "cluster", "ssm_supervision_country", "ssmsignificance",
    "module_id", "table_id", "reference_period", "x_axis_rc_code",
    "y_axis_rc_code", "z_axis_rc_code", "ogr", "value_decimal",
}
KRI_COLUMNS = {
    "entity_id", "cons_level", "is_highest_cons", "cluster",
    "ssm_supervision_country", "ssmsignificance", "kri_data_point_id",
    "reference_period", "value_decimal",
}


class _Frame:
    def __init__(self, columns, records):
        self.columns = columns
        self._records = records

    def to_dict(self, *, orient):
        if orient != "records":
            raise ValueError("Only record-oriented results are supported.")
        return self._records


class LocalSourceClient:
    """Minimal read_sql client backed by an in-memory SQLite copy of source CSVs."""

    def __init__(self, its_csv: str | Path, kri_csv: str | Path | None = None):
        self.connection = sqlite3.connect(":memory:")
        self.connection.execute("ATTACH DATABASE ':memory:' AS crp_agora")
        self.connection.create_function(
            "CONCAT", -1, lambda *parts: "".join(str(part) for part in parts)
        )
        self.connection.create_function(
            "regexp_replace", 3,
            lambda value, pattern, replacement: re.sub(pattern, replacement, value)
            if value is not None else None,
        )
        self.connection.create_function(
            "REGEXP", 2,
            lambda pattern, value: bool(re.search(pattern, value or "")),
        )
        self.has_kri = kri_csv is not None
        try:
            self._load("agora_its_bft_current", Path(its_csv), ITS_COLUMNS)
            if kri_csv is not None:
                self._load("agora_dm_imas_kris_raw", Path(kri_csv), KRI_COLUMNS)
        except Exception:
            self.close()
            raise

    def _load(self, table: str, path: Path, required: set[str]) -> None:
        if not path.is_file():
            raise ValueError(f"Fichier source local introuvable : {path}")
        with ExitStack() as stack:
            if path.suffix.lower() == ".zip":
                archive = stack.enter_context(zipfile.ZipFile(path))
                members = [name for name in archive.namelist() if name.lower().endswith(".csv")]
                if len(members) != 1:
                    raise ValueError(f"{path}: l'archive doit contenir exactement un fichier CSV.")
                binary = stack.enter_context(archive.open(members[0]))
                stream = stack.enter_context(io.TextIOWrapper(binary, encoding="utf-8-sig", newline=""))
            else:
                opener = gzip.open if path.suffix.lower() == ".gz" else open
                stream = stack.enter_context(opener(path, "rt", encoding="utf-8-sig", newline=""))
            reader = csv.DictReader(stream)
            columns = reader.fieldnames or []
            missing = required - set(columns)
            if missing:
                raise ValueError(f"{path}: colonnes source manquantes : {', '.join(sorted(missing))}.")
            if len(columns) != len(set(columns)):
                raise ValueError(f"{path}: noms de colonnes en double.")
            fields = ", ".join(f'"{column}" TEXT' for column in columns)
            self.connection.execute(f"CREATE TABLE crp_agora.{table} ({fields})")
            placeholders = ", ".join("?" for _ in columns)
            statement = f"INSERT INTO crp_agora.{table} VALUES ({placeholders})"
            batch = []
            count = 0
            for row in reader:
                if None in row:
                    raise ValueError(f"{path}: ligne CSV avec trop de champs.")
                # Impala's CSV export writes database NULL as the literal
                # string "NULL". Preserve SQL null semantics in local tests.
                batch.append(tuple(
                    None if row[column] is None or row[column].strip().upper() == "NULL"
                    else row[column]
                    for column in columns
                ))
                if len(batch) >= 2000:
                    self.connection.executemany(statement, batch)
                    count += len(batch)
                    batch.clear()
            if batch:
                self.connection.executemany(statement, batch)
                count += len(batch)
            self.connection.commit()
        print(f"[Agora] Source locale : {path} ({count} lignes)", flush=True)

    def read_sql(self, sql: str):
        if "agora_dm_imas_kris_raw" in sql and not self.has_kri:
            raise ValueError("Une extraction KRI nécessite --local-kri-csv.")
        # Hive's RLIKE operator is spelled REGEXP in SQLite; the same regex
        # expression is evaluated by the registered REGEXP function.
        local_sql = re.sub(r"\bRLIKE\b", "REGEXP", sql, flags=re.IGNORECASE)
        cursor = self.connection.execute(local_sql)
        columns = [item[0] for item in cursor.description]
        return _Frame(columns, [dict(zip(columns, row)) for row in cursor.fetchall()])

    def close(self):
        self.connection.close()
