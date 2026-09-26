from __future__ import annotations

import base64
import gzip
import json
import re
import sys
import tempfile
import unittest
from datetime import date
from pathlib import Path

SCRIPT_DIRECTORY = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIRECTORY))

from global_update import (  # noqa: E402
    EXAMPLE_WORKBOOK,
    LEI_TOKEN,
    TEST_TABLES,
    _apply_consolidation_filter,
    _build_extraction_sql,
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
        sql = _build_extraction_sql(extraction, application, TEST_TABLES["ITS"])
        self.assertIn(f"FROM {TEST_TABLES['ITS']}", sql)
        self.assertIn("lei IN (", sql)
        self.assertNotIn(f"jst_code IN ('{LEI_TOKEN}')", sql)
        self.assertIn("CONCAT(lei, '_', consolidation_level) AS reporting_unit_id", sql)
        self.assertIn("WHEN reference_period =", sql)

    def test_consolidation_modes_replace_or_remove_highest_flag(self):
        sql = "AND is_highest_cons = 'Y'"
        self.assertEqual(_apply_consolidation_filter(sql, "HIGHEST"), sql)
        self.assertIn("consolidation_level IN ('CONSO', 'SOLO')", _apply_consolidation_filter(sql, "CONSO+SOLO"))
        self.assertEqual(_apply_consolidation_filter(sql, "ALL"), "")

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
