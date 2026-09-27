import io
import sys
import unittest
import zipfile
import csv
from pathlib import Path

from openpyxl import load_workbook

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))
import build_taxonomy as builder  # noqa: E402
from resolve_taxonomy import resolve  # noqa: E402


ROOT = SCRIPT_DIR.parents[1]
SOURCES = ROOT / "data" / "eba-dpm-history" / "sources"


class DpmTaxonomyTests(unittest.TestCase):
    def test_real_dpm_42_layout_recovers_axes_and_sheet_dimension(self):
        archive = zipfile.ZipFile(SOURCES / "4.2_layouts.zip")
        corep_file = next(n for n in archive.namelist() if "COREP_OFCOREP" in n)
        workbook = load_workbook(io.BytesIO(archive.read(corep_file)), data_only=True)

        sheet = workbook["C_01.00"]
        columns_row, rows_row = builder.find_marker_rows(sheet)
        xs = builder.x_axis_rows(sheet, columns_row, rows_row)
        ys = builder.y_axis_rows(sheet, rows_row)
        self.assertIn(("10", "Amount", 6), xs)
        self.assertIn("10", [code for code, _description, _row in ys])
        self.assertTrue(any(path.startswith("OWN FUNDS") for code, path, _row in ys if code == "10"))
        with (ROOT / "app" / "assets" / "ITS_all_dimension_mapping.csv").open(encoding="cp1252", newline="") as handle:
            current = list(csv.DictReader(handle, delimiter=";"))
        current_y = next(r for r in current if r["table_id"] == "C_01.00" and r["coordinate"] == "y_axis_rc_code" and r["code"] == "10")
        self.assertEqual(current_y["description"].casefold(), "own funds")
        self.assertNotIn("sheet per", " ".join(str(c.value or "") for row in sheet.iter_rows(min_row=1, max_row=5, max_col=12) for c in row).casefold())

        tab_sheet = workbook["C_07.00.a"]
        top = " ".join(str(c.value or "") for row in tab_sheet.iter_rows(min_row=1, max_row=5, max_col=12) for c in row).casefold()
        self.assertIn("sheet per exposure class", top)
        z = builder.dictionary_z_rows(SOURCES / "4.2_dictionary.xlsx", tab_sheet)
        self.assertTrue(z)
        workbook.close()
        archive.close()

    def test_module_schedule_selects_reference_date_intervals(self):
        rows = [
            {"module_code": "COREP", "template_id": "C_01.00", "framework": "3.0.1", "effective_from": "2021-06-30", "effective_to": "2023-06-30", "effective_source": "eba", "status": "official"},
            {"module_code": "COREP", "template_id": "C_01.00", "framework": "3.2", "effective_from": "2023-06-30", "effective_to": "", "effective_source": "eba", "status": "official"},
        ]
        self.assertEqual(resolve("COREP", "C_01.00", builder.date(2022, 12, 31), rows)[0]["framework"], "3.0.1")
        self.assertEqual(resolve("COREP", "C_01.00", builder.date(2023, 6, 30), rows)[0]["framework"], "3.2")

    def test_resolver_follows_dpm2_module_split_for_same_template(self):
        rows = [
            {"module_code": "COREP", "template_id": "C_01.00", "framework": "3.2", "effective_from": "2023-06-30", "effective_to": "2026-03-31", "effective_source": "eba", "status": "official"},
            {"module_code": "COREP_OF", "template_id": "C_01.00", "framework": "4.2", "effective_from": "2026-03-31", "effective_to": "", "effective_source": "eba", "status": "official"},
        ]
        self.assertEqual(resolve("COREP", "C_01.00", builder.date(2026, 4, 30), rows)[0]["framework"], "4.2")

    def test_sheet_level_exception_rules_are_explicit(self):
        rows = builder.read_schedule()
        imv = builder.schedule_match("SBP", "3.2.1", "C_106.00", rows)
        other = builder.schedule_match("SBP", "3.2.1", "C_107.01.a", rows)
        self.assertEqual(imv["effective_from"], "2022-09-30")
        self.assertEqual(other["effective_from"], "2022-12-31")
        dora = builder.schedule_match("DORA", "4.2", "D_01.00", rows)
        self.assertEqual(dora["status"], "not_applicable_replaced")


if __name__ == "__main__":
    unittest.main()
