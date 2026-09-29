from __future__ import annotations

import base64
import csv
import gzip
import json
import re
import sqlite3
import sys
import tempfile
import unittest
from datetime import date
from pathlib import Path

SCRIPT_DIRECTORY = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIRECTORY))

from global_update import (  # noqa: E402
    Application,
    EXAMPLE_WORKBOOK,
    Extraction,
    PRODUCTION_TABLES,
    _build_extraction_sql,
    _build_institution_sql,
    _consolidation_predicate,
    _read_configuration,
    _reference_dates,
    global_update,
)


class ReferenceDateTests(unittest.TestCase):
    def test_monthly_skips_unfinished_current_month(self):
        self.assertEqual(
            _reference_dates("MONTHLY", 2, date(2026, 3, 14)),
            ("2026-01-31", "2026-02-28"),
        )

    def test_monthly_includes_period_on_its_end_date(self):
        self.assertEqual(
            _reference_dates("MONTHLY", 1, date(2026, 3, 31)),
            ("2026-03-31",),
        )

    def test_quarterly_uses_the_last_completed_quarter_end(self):
        self.assertEqual(
            _reference_dates("QUARTERLY", 3, date(2026, 3, 15)),
            ("2025-06-30", "2025-09-30", "2025-12-31"),
        )

    def test_all_frequency_endpoints_are_inclusive(self):
        self.assertEqual(_reference_dates("SEMI_ANNUAL", 1, date(2026, 6, 30)), ("2026-06-30",))
        self.assertEqual(_reference_dates("ANNUAL", 1, date(2026, 12, 31)), ("2026-12-31",))


class QueryPlanTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.applications = _read_configuration(EXAMPLE_WORKBOOK, date(2026, 9, 26))

    def test_example_workbook_has_four_valid_applications(self):
        self.assertEqual(len(self.applications), 4)
        self.assertTrue(all(application.extractions for application in self.applications))
        finrep = self.applications[0].extractions
        self.assertEqual(finrep[0].history_years, 2)
        self.assertEqual(len(finrep[0].reference_dates), 24)
        self.assertEqual(len(finrep[1].reference_dates), 8)

    def test_extraction_filters_by_lei_and_uses_composite_institution_id(self):
        application = self.applications[0]
        extraction = application.extractions[0]
        sql = _build_extraction_sql(extraction, application)
        self.assertIn(f"FROM {PRODUCTION_TABLES['ITS']}", sql)
        self.assertIn("lei IN (", sql)
        self.assertIn("CONCAT(lei, '_', cons_level) AS reporting_unit_id", sql)
        self.assertIn("WHEN reference_period =", sql)

    def test_consolidation_modes_use_source_column_and_values(self):
        self.assertEqual(_consolidation_predicate("HIGHEST"), "is_highest_cons = 'Y'")
        self.assertEqual(_consolidation_predicate("CONSO+SOLO"), "cons_level IN ('CONSO', 'SOLO')")
        self.assertEqual(_consolidation_predicate("ALL"), "")

    def test_generated_queries_execute_against_tables_built_from_supplied_schemas(self):
        schema_directory = SCRIPT_DIRECTORY / "fixtures" / "hive_schemas"
        connection = sqlite3.connect(":memory:")
        self.addCleanup(connection.close)
        connection.execute("ATTACH DATABASE ':memory:' AS crp_agora")
        connection.create_function("CONCAT", -1, lambda *parts: "".join(str(part) for part in parts))
        connection.create_function("regexp_replace", 3, lambda value, pattern, replacement: re.sub(pattern, replacement, value))
        columns_by_source = {}
        for source, table_name in (("ITS", "agora_its_bft_current"), ("KRI", "agora_dm_imas_kris_raw")):
            with (schema_directory / f"{table_name}.csv").open(newline="", encoding="utf-8-sig") as stream:
                columns = [row["name"] for row in csv.DictReader(stream)]
            columns_by_source[source] = columns
            fields = ", ".join(f'"{column}" {"REAL" if column == "value_decimal" else "TEXT"}' for column in columns)
            connection.execute(f"CREATE TABLE crp_agora.{table_name} ({fields})")
        self.assertNotIn("lei", columns_by_source["KRI"])

        def insert(table_name, values):
            field_names = ", ".join(f'"{field}"' for field in values)
            placeholders = ", ".join("?" for _ in values)
            connection.execute(
                f"INSERT INTO crp_agora.{table_name} ({field_names}) VALUES ({placeholders})",
                tuple(values.values()),
            )

        lei = "AAAABBBBCCCCDDDDEEEE"
        other_lei = "FFFFGGGGHHHHIIIIJJJJ"
        its_rows = [
            dict(entity_id="E1", lei=lei, cons_level="CONSO", is_highest_cons="Y", name="Bank A",
                 jst_code="OLD", jst_code_today="JST_A", module_id="COREP", table_id="C_01.00.a",
                 reference_period="2026-03-31", x_axis_rc_code="0010", y_axis_rc_code="0020",
                 z_axis_rc_code="qx01", value_decimal=125.0),
            dict(entity_id="E1", lei=lei, cons_level="SOLO", is_highest_cons="N", name="Bank A",
                 jst_code="JST_A", module_id="COREP", table_id="C_01.00.b",
                 reference_period="2026-03-31", x_axis_rc_code="0010", y_axis_rc_code="0020",
                 z_axis_rc_code="qx01", value_decimal=75.0),
            dict(entity_id="E1", lei=lei, cons_level="SUBLIQ", is_highest_cons="N", name="Bank A",
                 jst_code="JST_A", module_id="COREP", table_id="C_01.00.a",
                 reference_period="2026-03-31", x_axis_rc_code="0010", y_axis_rc_code="0020",
                 z_axis_rc_code="qx01", value_decimal=50.0),
            dict(entity_id="E2", lei=other_lei, cons_level="CONSO", is_highest_cons="Y", name="Bank B",
                 jst_code="JST_B", module_id="COREP", table_id="C_01.00.a",
                 reference_period="2026-03-31", x_axis_rc_code="0010", y_axis_rc_code="0020",
                 z_axis_rc_code="qx01", value_decimal=900.0),
        ]
        for row in its_rows:
            insert("agora_its_bft_current", row)
        for entity_id, level, value in (("E1", "CONSO", 0.2), ("E1", "SOLO", 0.3),
                                        ("E1", "SUBLIQ", 0.4), ("E2", "CONSO", 0.9)):
            insert("agora_dm_imas_kris_raw", dict(
                entity_id=entity_id, cons_level=level, kri_data_point_id="KRI_1",
                reference_period="2026-03-31", value_decimal=value,
            ))

        dates = ("2025-12-31", "2026-03-31")
        its_extraction = Extraction("COREP", "C_01.00", 1, "QUARTERLY", dates)
        kri_extraction = Extraction("KRI", "C_01.00", 1, "QUARTERLY", dates, ("KRI_1",))
        highest = Application("example", (lei,), "HIGHEST", (its_extraction, kri_extraction))
        both = Application("example", (lei,), "CONSO+SOLO", (its_extraction, kri_extraction))
        all_levels = Application("example", (lei,), "ALL", (its_extraction, kri_extraction))
        its_rows = connection.execute(_build_extraction_sql(its_extraction, highest)).fetchall()
        self.assertEqual(len(its_rows), 1)
        self.assertEqual(its_rows[0][0:2], ("C_01.00", f"{lei}_CONSO"))
        self.assertEqual(its_rows[0][-2:], (None, 125.0))
        self.assertEqual(len(connection.execute(_build_extraction_sql(its_extraction, both)).fetchall()), 2)
        self.assertEqual(len(connection.execute(_build_extraction_sql(its_extraction, all_levels)).fetchall()), 3)
        kri_rows = connection.execute(_build_extraction_sql(kri_extraction, both)).fetchall()
        self.assertEqual({row[1]: row[-1] for row in kri_rows}, {f"{lei}_CONSO": 0.2, f"{lei}_SOLO": 0.3})
        self.assertEqual(len(connection.execute(_build_extraction_sql(kri_extraction, all_levels)).fetchall()), 3)
        metadata = connection.execute(_build_institution_sql(both, PRODUCTION_TABLES["ITS"])).fetchall()
        self.assertEqual({row[0] for row in metadata}, {f"{lei}_CONSO", f"{lei}_SOLO"})
        self.assertEqual(next(row for row in metadata if row[0].endswith("CONSO"))[2:4], ("JST_A", "Bank A"))

        for application in self.applications:
            connection.execute("EXPLAIN QUERY PLAN " + _build_institution_sql(application, PRODUCTION_TABLES["ITS"]))
            for extraction in application.extractions:
                connection.execute("EXPLAIN QUERY PLAN " + _build_extraction_sql(extraction, application))

    def test_test_mode_writes_queries_datasets_dictionary_and_standalone_apps(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            result = global_update(
                EXAMPLE_WORKBOOK,
                mode="test",
                output_directory=temporary_directory,
                as_of=date(2026, 9, 26),
            )
            self.assertEqual(result["applications"], 4)
            output = Path(temporary_directory)
            self.assertTrue((output / "query_index.md").is_file())
            self.assertEqual(len(list((output / "queries").glob("*/*.sql"))), 4 + 9)
            html_files = list((output / "applications" / "html").glob("*.html"))
            dataset_files = list((output / "applications" / "datasets").glob("*.csv"))
            dictionary_files = list((output / "applications" / "institutions").glob("*.csv"))
            self.assertEqual(len(html_files), 4)
            self.assertEqual(len(dataset_files), 4)
            self.assertEqual(len(dictionary_files), 4)
            html_text = html_files[0].read_text(encoding="utf-8")
            self.assertIn("institutionDictionaryBase64", html_text)
            payload_match = re.search(r"window\.__AGORA_STANDALONE_DATA__ = (\{.*?\});", html_text)
            self.assertIsNotNone(payload_match)
            payload = json.loads(payload_match.group(1))
            dictionary_text = gzip.decompress(base64.b64decode(payload["institutionDictionaryBase64"])).decode("utf-8")
            self.assertIn("Institution ID,JST code,Institution Name,Consolidation Level", dictionary_text)


if __name__ == "__main__":
    unittest.main()
