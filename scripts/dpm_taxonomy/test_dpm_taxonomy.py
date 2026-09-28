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
    def test_real_dpm_210_delta_and_2020_applicability_rules(self):
        archive = zipfile.ZipFile(SOURCES / "2.10_layouts.zip")
        covid_file = next(n for n in archive.namelist() if "COVID19" in n and n.endswith(".xlsx"))
        fp_file = next(n for n in archive.namelist() if "-FP " in n and n.endswith(".xlsx"))
        self.assertEqual(builder.release_from_name(fp_file, "2.10"), "2.10.1")
        workbook = load_workbook(io.BytesIO(archive.read(covid_file)), data_only=True)
        self.assertIn("F 90.01", workbook.sheetnames)
        sheet = workbook["F 90.01"]
        columns_row, rows_row = builder.find_marker_rows(sheet)
        self.assertTrue(builder.x_axis_rows(sheet, columns_row, rows_row))
        self.assertTrue(builder.y_axis_rows(sheet, rows_row))
        schedule = builder.read_schedule()
        self.assertEqual(builder.schedule_match("COVID19", "2.10", "F_90.01", schedule)["effective_from"], "2020-06-30")
        self.assertEqual(builder.schedule_match("FP", "2.10.1", "Y_01.01", schedule)["effective_from"], "2020-12-31")
        self.assertEqual(builder.schedule_match("SBP", "2.10", "C_106.00", schedule)["effective_from"], "2020-09-30")
        self.assertEqual(builder.schedule_match("FINREP", "3.2", "F_00.01", schedule)["effective_from"], "2022-12-31")
        self.assertEqual(builder.schedule_match("SBP_CR", "4.2", "C_107.00", schedule)["effective_from"], "2025-12-31")
        self.assertEqual(builder.schedule_match("SBPIMV", "4.2", "C_106.00", schedule)["effective_from"], "2026-02-28")
        self.assertEqual(builder.schedule_match("COREP_OF", "4.2", "C_01.00", schedule)["effective_from"], "2026-06-30")
        workbook.close()
        archive.close()

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

        credit_risk = workbook["C_08.01.a"]
        credit_x = builder.x_axis_rows(credit_risk, *builder.find_marker_rows(credit_risk))
        credit_by_code = {code: description for code, description, _row in credit_x}
        self.assertEqual(
            credit_by_code["50"],
            "Credit risk mitigation (CRM) techniques with substitution effects on the exposure/Unfunded credit protection/(-) Credit derivatives",
        )
        self.assertEqual(
            credit_by_code["102"],
            "BREAKDOWN OF THE FULLY ADJUSTED EXPOSURE VALUE OF OFF-BALANCE SHEET ITEMS BY CONVERSION FACTORS/STANDARD CONVERSION FACTORS/0",
        )
        self.assertEqual(
            credit_by_code["103"],
            "BREAKDOWN OF THE FULLY ADJUSTED EXPOSURE VALUE OF OFF-BALANCE SHEET ITEMS BY CONVERSION FACTORS/STANDARD CONVERSION FACTORS/0.1",
        )

        operational_risk = workbook["C_17.01.a"]
        operational_x = builder.x_axis_rows(operational_risk, *builder.find_marker_rows(operational_risk))
        self.assertIn(("10", "Event types/INTERNAL FRAUD", 7), operational_x)

        tab_sheet = workbook["C_07.00.a"]
        top = " ".join(str(c.value or "") for row in tab_sheet.iter_rows(min_row=1, max_row=5, max_col=12) for c in row).casefold()
        self.assertIn("sheet per exposure class", top)
        z = builder.dictionary_z_rows(SOURCES / "4.2_dictionary.xlsx", tab_sheet)
        self.assertTrue(z)
        workbook.close()
        archive.close()

    def test_legacy_corep_0801_z_axis_uses_numbered_template_sheets(self):
        archive = zipfile.ZipFile(SOURCES / "3.2_layouts.zip")
        corep_file = next(n for n in archive.namelist() if "COREP" in n and n.endswith(".xlsx"))
        workbook = load_workbook(io.BytesIO(archive.read(corep_file)), data_only=True)
        sheets = [sheet for sheet in workbook.worksheets if sheet.title.startswith("C 08.01.a(")]

        z_rows = [entry for sheet in sheets for entry in builder.legacy_sheet_z_rows(sheet)]
        self.assertEqual(len(sheets), 17)
        self.assertEqual(len(z_rows), 17)
        self.assertEqual(len({code for code, _description in z_rows}), 17)
        self.assertTrue(all(code.isdigit() for code, _description in z_rows))
        self.assertEqual(z_rows[0][0], "0001")
        self.assertIn("Total with own estimates", z_rows[0][1])
        self.assertFalse(any(code.casefold().startswith("qx") for code, _description in z_rows))

        x_rows = builder.x_axis_rows(sheets[0], *builder.find_marker_rows(sheets[0]))
        x_by_code = {code: description for code, description, _row in x_rows}
        self.assertEqual(
            x_by_code["50"],
            "Credit risk mitigation (CRM) techniques with substitution effects on the exposure/Unfunded credit protection/(-) Credit derivatives",
        )

        # The old domain-wide resolver leaked more than 300 unrelated members
        # into this 17-tab template; DPM 1.0 must use its sheets instead.
        leaked = builder.dictionary_z_rows(SOURCES / "3.2_dictionary.xlsx", sheets[0])
        self.assertGreater(len(leaked), 300)

        workbook.close()
        archive.close()

    def test_suffix_is_kept_only_when_it_disambiguates_an_axis_code(self):
        mappings = [
            {"module_code": "COREP", "framework": "3.2", "table_id": "C_01.00.a", "coordinate": "y_axis_rc_code", "code": "10", "description": "Own funds"},
            {"module_code": "COREP", "framework": "3.2", "table_id": "C_01.00.b", "coordinate": "y_axis_rc_code", "code": "10", "description": " own   funds "},
            {"module_code": "RES", "framework": "3.2", "table_id": "T_01.00.a", "coordinate": "y_axis_rc_code", "code": "511", "description": "Own funds/CET1/Share capital"},
            {"module_code": "RES", "framework": "3.2", "table_id": "T_01.00.b", "coordinate": "y_axis_rc_code", "code": "511", "description": "Liabilities/Residual liabilities/Share capital"},
        ]
        templates = [
            {"module_code": "COREP", "framework": "3.2", "template_id": "C_01.00.a", "effective_from": "2023-06-30", "effective_to": "", "status": "official"},
            {"module_code": "COREP", "framework": "3.2", "template_id": "C_01.00.b", "effective_from": "2023-06-30", "effective_to": "", "status": "official"},
            {"module_code": "RES", "framework": "3.2", "template_id": "T_01.00.a", "effective_from": "2023-06-30", "effective_to": "", "status": "official"},
            {"module_code": "RES", "framework": "3.2", "template_id": "T_01.00.b", "effective_from": "2023-06-30", "effective_to": "", "status": "official"},
        ]
        exceptions, conflicts = builder.find_discriminating_suffix_templates(mappings, templates)
        self.assertEqual(exceptions, {("RES", "T_01.00")})
        self.assertEqual(conflicts[("RES", "T_01.00")], 1)

    def test_corep_0801_suffixes_merge_when_codes_do_not_collide(self):
        mappings = [
            {"module_code": "COREP", "framework": "2.9.1.1", "table_id": "C_08.01.a", "coordinate": "y_axis_rc_code", "code": "80", "description": "Total exposures/Specialized lending slotting criteria (b)"},
            {"module_code": "COREP", "framework": "2.9.1.1", "table_id": "C_08.01.b", "coordinate": "y_axis_rc_code", "code": "80", "description": "Total exposures/Specialized lending slotting criteria: total"},
            {"module_code": "COREP", "framework": "2.9.1.1", "table_id": "C_08.01.a", "coordinate": "y_axis_rc_code", "code": "100", "description": "Total exposures/Specialized lending slotting criteria (b)/0.5"},
            {"module_code": "COREP", "framework": "2.9.1.1", "table_id": "C_08.01.b", "coordinate": "y_axis_rc_code", "code": "100", "description": "Total exposures/Specialized lending slotting criteria: total/0.5"},
            {"module_code": "COREP", "framework": "2.9.1.1", "table_id": "C_08.01.b", "coordinate": "x_axis_rc_code", "code": "100", "description": "Of which: off balance sheet items"},
        ]
        templates = [
            {"module_code": "COREP", "framework": "2.9.1.1", "template_id": f"C_08.01.{suffix}", "effective_from": "2019-12-31", "effective_to": "2021-06-30", "status": "baseline"}
            for suffix in ("a", "b")
        ]

        exceptions, conflicts = builder.find_discriminating_suffix_templates(mappings, templates)

        self.assertNotIn(("COREP", "C_08.01"), exceptions)
        self.assertNotIn(("COREP", "C_08.01"), conflicts)

    def test_module_schedule_selects_reference_date_intervals(self):
        rows = [
            {"module_code": "COREP", "template_id": "C_01.00", "framework": "3.0.1", "effective_from": "2021-06-30", "effective_to": "2023-06-30", "effective_source": "eba", "status": "official"},
            {"module_code": "COREP", "template_id": "C_01.00", "framework": "3.2", "effective_from": "2023-06-30", "effective_to": "", "effective_source": "eba", "status": "official"},
        ]
        self.assertEqual(resolve("COREP", "C_01.00", builder.date(2022, 12, 31), rows)[0]["framework"], "3.0.1")
        self.assertEqual(resolve("COREP", "C_01.00", builder.date(2023, 6, 30), rows)[0]["framework"], "3.2")

    def test_interval_closure_does_not_cross_module_boundaries(self):
        rows = [
            {"module_code": "COREP", "template_id": "C_01.00", "framework": "3.2", "effective_from": "2023-06-30", "effective_to": "", "status": "official"},
            {"module_code": "COREP_OF", "template_id": "C_01.00", "framework": "4.0", "effective_from": "2025-03-31", "effective_to": "", "status": "official"},
            {"module_code": "COREP_OF", "template_id": "C_01.00", "framework": "4.2", "effective_from": "2026-06-30", "effective_to": "", "status": "official"},
            {"module_code": "CODIS", "template_id": "K_04.00.a", "framework": "4.1", "effective_from": "2025-06-30", "effective_to": "", "status": "official"},
            {"module_code": "PILLAR3", "template_id": "K_04.00.a", "framework": "3.3", "effective_from": "2023-12-31", "effective_to": "", "status": "official"},
        ]
        history = builder.close_template_intervals(rows)
        corep = [r for r in history if r["module_code"] == "COREP"]
        corep_of = [r for r in history if r["module_code"] == "COREP_OF"]
        codis = next(r for r in history if r["module_code"] == "CODIS")
        pillar = next(r for r in history if r["module_code"] == "PILLAR3")
        self.assertEqual(corep[0]["effective_to"], "")
        self.assertEqual(corep_of[0]["effective_to"], "2026-06-30")
        self.assertEqual(codis["effective_to"], "")
        self.assertEqual(pillar["effective_to"], "")
        self.assertEqual(resolve("COREP", "C_01.00", builder.date(2026, 7, 1), history)[0]["framework"], "4.2")

    def test_resolver_follows_dpm2_module_split_for_same_template(self):
        rows = [
            {"module_code": "COREP", "template_id": "C_01.00", "framework": "3.2", "effective_from": "2023-06-30", "effective_to": "2026-03-31", "effective_source": "eba", "status": "official"},
            {"module_code": "COREP_OF", "template_id": "C_01.00", "framework": "4.2", "effective_from": "2026-03-31", "effective_to": "", "effective_source": "eba", "status": "official"},
        ]
        self.assertEqual(resolve("COREP", "C_01.00", builder.date(2026, 4, 30), rows)[0]["framework"], "4.2")

    def test_resolver_keeps_parallel_split_modules_ambiguous(self):
        rows = [
            {"module_code": "COREP", "template_id": "C_00.01", "framework": "3.2", "effective_from": "2023-06-30", "effective_to": "", "status": "official"},
            {"module_code": "COREP_OF", "template_id": "C_00.01", "framework": "4.2", "effective_from": "2026-06-30", "effective_to": "", "status": "official"},
            {"module_code": "COREP_LR", "template_id": "C_00.01", "framework": "4.2", "effective_from": "2026-03-31", "effective_to": "", "status": "official"},
        ]
        found = resolve("COREP", "C_00.01", builder.date(2026, 7, 1), rows)
        self.assertEqual({r["module_code"] for r in found}, {"COREP_OF", "COREP_LR"})

    def test_sheet_level_exception_rules_are_explicit(self):
        rows = builder.read_schedule()
        imv = builder.schedule_match("SBP", "3.2.1", "C_106.00", rows)
        other = builder.schedule_match("SBP", "3.2.1", "C_107.01.a", rows)
        self.assertEqual(imv["effective_from"], "2022-09-30")
        self.assertEqual(other["effective_from"], "2022-12-31")
        pay_gap_ci = builder.schedule_match("REM", "3.2.2", "R_06.00.a", rows)
        pay_gap_if = builder.schedule_match("REM", "3.2.2", "R_06.01.a", rows)
        regular_rem = builder.schedule_match("REM", "3.2.2", "R_05.00", rows)
        self.assertEqual(pay_gap_ci["effective_from"], "2023-12-31")
        self.assertEqual(pay_gap_if["effective_from"], "2022-12-31")
        self.assertEqual(regular_rem["effective_from"], "2022-12-31")
        dora = builder.schedule_match("DORA", "4.2", "D_01.00", rows)
        self.assertEqual(dora["status"], "not_applicable_replaced")


if __name__ == "__main__":
    unittest.main()
