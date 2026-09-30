import unittest

from scripts.compact_dataset_values import compact_dataset_rows


class CompactDatasetValuesTests(unittest.TestCase):
    def test_amount_percent_unit_and_unknown_keep_their_meaning(self):
        fields = [
            "table_id", "reporting_unit_id", "x_axis_rc_code", "y_axis_rc_code", "z_axis_rc_code",
            "ref_2026_06_30", "ref_2024_12_31", "extraction_timestamp",
        ]

        def row(table, x, y, value, older=""):
            return dict(table_id=table, reporting_unit_id="BANK_CONSO", x_axis_rc_code=x,
                        y_axis_rc_code=y, z_axis_rc_code="", ref_2026_06_30=value,
                        ref_2024_12_31=older, extraction_timestamp="2026-09-30")

        rows = [
            row("C_03.00", "0010", "0020", "1234567.89", "-1234567"),
            row("C_03.00", "0010", "0010", "0.131855"),
            row("R_08.00", "", "0010", "4567.25"),
            row("KRI", "", "LIQ55", "1234567.89"),
            row("C_03.00", "0010", "0070", "0.131855", "0.123456"),
        ]
        result_fields, compacted, counts = compact_dataset_rows(fields, rows)
        self.assertIn("value_scale", result_fields)
        self.assertEqual(compacted[0]["ref_2026_06_30"], "1234")
        self.assertEqual(compacted[0]["ref_2024_12_31"], "-1234")
        self.assertEqual(compacted[0]["value_scale"], "1000")
        self.assertEqual(compacted[1]["ref_2026_06_30"], "0.1319")
        self.assertEqual(compacted[1]["value_scale"], "")
        self.assertEqual(compacted[2]["ref_2026_06_30"], "4567.25")
        self.assertEqual(compacted[3]["ref_2026_06_30"], "1234567.89")
        self.assertEqual(compacted[4]["ref_2026_06_30"], "0.131855")
        self.assertEqual(counts, {
            "amount_rows": 1, "percent_rows": 1, "unit_rows": 1, "unchanged_rows": 2,
        })

    def test_zero_and_small_negative_amounts_truncate_toward_zero(self):
        fields = ["table_id", "reporting_unit_id", "x_axis_rc_code", "y_axis_rc_code",
                  "z_axis_rc_code", "ref_2026_06_30"]
        row = dict(table_id="C_03.00", reporting_unit_id="BANK_CONSO", x_axis_rc_code="0010",
                   y_axis_rc_code="0020", z_axis_rc_code="", ref_2026_06_30="-999")
        _, compacted, _ = compact_dataset_rows(fields, [row])
        self.assertEqual(compacted[0]["ref_2026_06_30"], "0")
        self.assertEqual(compacted[0]["value_scale"], "1000")


if __name__ == "__main__":
    unittest.main()
