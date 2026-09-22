import csv
import io
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from hive_to_dataset import (
    build_hive_query,
    build_kri_template_index,
    find_kris_using_templates,
    get_kri_template_dependencies,
    load_kri_dictionary,
    run_hive_query_to_csv,
    select_kris_by_templates,
)


TEMPLATES = ["F_12.01"]
REFERENCE_DATES = ["2025-03-31"]
JST_CODES = ["FRBNP"]


class FakeDataFrame(dict):
    def __len__(self):
        return 1

    def to_csv(self, path, index=False):
        self.output_path = Path(path)
        self.index = index


class FakeHiveClient:
    def __init__(self):
        self.sql = ""
        self.dataframe = FakeDataFrame()

    def read_sql(self, sql):
        self.sql = sql
        return self.dataframe


class HiveModuleFilterTest(unittest.TestCase):
    def test_filter_is_disabled_by_default(self):
        sql = build_hive_query(TEMPLATES, REFERENCE_DATES, JST_CODES)

        self.assertNotIn("AND module_id =", sql)

    def test_filter_uses_an_exact_escaped_value(self):
        sql = build_hive_query(
            TEMPLATES,
            REFERENCE_DATES,
            JST_CODES,
            module_id="MOD'42",
        )

        self.assertIn("AND module_id = 'MOD''42'", sql)
        self.assertNotIn("module_id LIKE", sql)

    def test_empty_filter_is_disabled(self):
        sql = build_hive_query(
            TEMPLATES,
            REFERENCE_DATES,
            JST_CODES,
            module_id="   ",
        )

        self.assertNotIn("AND module_id =", sql)

    def test_a_list_of_values_generates_an_in_clause(self):
        sql = build_hive_query(
            TEMPLATES,
            REFERENCE_DATES,
            JST_CODES,
            module_id=["COREP", "FINREP"],
        )

        self.assertIn("AND module_id IN ('COREP', 'FINREP')", sql)
        self.assertNotIn("AND module_id =", sql)

    def test_a_single_element_list_still_uses_an_exact_match(self):
        sql = build_hive_query(
            TEMPLATES,
            REFERENCE_DATES,
            JST_CODES,
            module_id=["COREP"],
        )

        self.assertIn("AND module_id = 'COREP'", sql)
        self.assertNotIn("module_id IN", sql)

    def test_an_empty_list_is_disabled(self):
        sql = build_hive_query(
            TEMPLATES,
            REFERENCE_DATES,
            JST_CODES,
            module_id=[],
        )

        self.assertNotIn("AND module_id", sql)

    def test_csv_runner_forwards_the_filter(self):
        client = FakeHiveClient()
        with TemporaryDirectory() as output_dir:
            dataframe = run_hive_query_to_csv(
                templates=TEMPLATES,
                reference_dates=REFERENCE_DATES,
                jst_codes=JST_CODES,
                output_name="module_extract",
                output_dir=output_dir,
                devo_client=client,
                module_id="FUNDING_PLAN",
            )

        self.assertIs(dataframe, client.dataframe)
        self.assertIn("AND module_id = 'FUNDING_PLAN'", client.sql)
        self.assertEqual(client.dataframe.output_path.name, "module_extract.csv")
        self.assertFalse(client.dataframe.index)


def _kri_dictionary_line(code: str, name: str, formula: str) -> str:
    """Rebuilds one raw data line exactly as the real KRI_dictionnary.csv
    encodes it: a single field that is itself a CSV triplet, doubly quoted."""

    inner = io.StringIO()
    csv.writer(inner).writerow([code, name, formula])
    inner_text = inner.getvalue().rstrip("\r\n")

    outer = io.StringIO()
    csv.writer(outer, quoting=csv.QUOTE_ALL).writerow([inner_text])
    outer_text = outer.getvalue().rstrip("\r\n")

    return outer_text + ";;"


def _write_kri_dictionary(directory: Path, rows: list[tuple[str, str, str]]) -> Path:
    lines = ["kri_data_point_id,kri_name,formula;;"]
    lines.extend(_kri_dictionary_line(code, name, formula) for code, name, formula in rows)
    path = directory / "kri_dictionary.csv"
    path.write_text("\n".join(lines), encoding="utf-8")
    return path


class KriDictionaryLoadingTest(unittest.TestCase):
    def test_loads_code_and_formula_from_the_double_csv_format(self):
        with TemporaryDirectory() as directory:
            path = _write_kri_dictionary(
                Path(directory),
                [("LIQV0001", "Some, ratio", "COALESCE({T(C_72.00.a)R(0010)C(0010)},{SPE.DPI(X)})")],
            )

            formulas = load_kri_dictionary(path)

        self.assertEqual(
            formulas["LIQV0001"],
            "COALESCE({T(C_72.00.a)R(0010)C(0010)},{SPE.DPI(X)})",
        )


class KriTemplateDependenciesTest(unittest.TestCase):
    def _index(self, formulas: dict[str, str]) -> dict[str, set[str]]:
        return build_kri_template_index(formulas)

    def test_resolves_a_direct_cellref_and_normalizes_its_annex(self):
        index = self._index({"A": "COALESCE({T(F_18.00.a_dp)R(10)C(20)},{SPE.DPI(X)})"})

        self.assertEqual(index["A"], {"F_18.00"})

    def test_never_strips_a_genuine_finrep_sub_template_number(self):
        index = self._index({"A": "{T(F_04.02.1)R(10)C(20)}"})

        self.assertEqual(index["A"], {"F_04.02.1"})

    def test_resolves_recursively_through_a_kri_reference(self):
        formulas = {
            "LIQ55": "DIVIDE({LIQV0106}, {LIQV0001})",
            "LIQV0106": "{T(C_72.00.a)R(0220)C(0010)}",
            "LIQV0001": "{T(C_72.00.a)R(0010)C(0010)}",
        }

        index = self._index(formulas)

        self.assertEqual(index["LIQ55"], {"C_72.00"})

    def test_resolves_through_several_levels_and_merges_every_template(self):
        formulas = {
            "A": "{B} + {T(F_01.02)R(10)C(20)}",
            "B": "{T(F_18.00)R(10)C(20)}",
        }

        index = self._index(formulas)

        self.assertEqual(index["A"], {"F_01.02", "F_18.00"})

    def test_a_definition_cycle_does_not_recurse_forever(self):
        formulas = {
            "A": "{B} + {T(F_01.02)R(10)C(20)}",
            "B": "{A} + {T(F_18.00)R(10)C(20)}",
        }

        index = self._index(formulas)

        self.assertEqual(index["A"], {"F_01.02", "F_18.00"})
        self.assertEqual(index["B"], {"F_01.02", "F_18.00"})

    def test_a_kri_with_no_template_anywhere_gets_an_empty_set(self):
        index = self._index({"A": "{SPE.DPI(X)}"})

        self.assertEqual(index["A"], set())

    def test_dependencies_can_be_resolved_for_a_single_kri_without_the_full_index(self):
        formulas = {
            "A": "{B}",
            "B": "{T(F_18.00)R(10)C(20)}",
        }

        self.assertEqual(get_kri_template_dependencies("A", formulas), {"F_18.00"})


class SelectKrisByTemplatesTest(unittest.TestCase):
    def setUp(self):
        self.index = {
            "KRI_A": {"F_18.00"},
            "KRI_B": {"F_18.00", "C_72.00"},
            "KRI_C": {"C_72.00"},
            "KRI_D": set(),
        }

    def test_selects_kris_matching_an_exact_template(self):
        self.assertEqual(select_kris_by_templates(["C_72.00"], self.index), ["KRI_B", "KRI_C"])

    def test_selects_kris_matching_a_trailing_wildcard(self):
        self.assertEqual(select_kris_by_templates(["F_18%"], self.index), ["KRI_A", "KRI_B"])

    def test_a_kri_with_no_dependencies_is_never_selected(self):
        self.assertNotIn("KRI_D", select_kris_by_templates(["F_xx% xx<99"], self.index))

    def test_excluding_one_template_does_not_disqualify_a_kri_matching_another(self):
        selected = select_kris_by_templates(["F_18%", "!C_72.00"], self.index)

        self.assertIn("KRI_B", selected)

    def test_excluding_a_kri_s_only_matching_template_removes_it(self):
        selected = select_kris_by_templates(["C_72%", "!C_72.00"], self.index)

        self.assertNotIn("KRI_C", selected)

    def test_end_to_end_helper_loads_resolves_and_selects_in_one_call(self):
        with TemporaryDirectory() as directory:
            path = _write_kri_dictionary(
                Path(directory),
                [
                    ("LIQ55", "Ratio", "DIVIDE({LIQV0106}, {LIQV0001})"),
                    ("LIQV0106", "Numerator", "{T(C_72.00.a)R(0220)C(0010)}"),
                    ("LIQV0001", "Denominator", "{T(C_72.00.a)R(0010)C(0010)}"),
                    ("OTHER", "Unrelated", "{T(F_01.02)R(10)C(20)}"),
                ],
            )

            selected = find_kris_using_templates(["C_72%"], dictionary_path=path)

        # LIQV0001/LIQV0106 are themselves real KRIs with their own direct
        # C_72.00 dependency, not just intermediate sub-expressions - they
        # are expected to match on their own account too.
        self.assertEqual(selected, ["LIQ55", "LIQV0001", "LIQV0106"])
        self.assertNotIn("OTHER", selected)


if __name__ == "__main__":
    unittest.main()
