from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from hive_to_dataset import build_hive_query, run_hive_query_to_csv


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


if __name__ == "__main__":
    unittest.main()
