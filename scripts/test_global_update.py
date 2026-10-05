from __future__ import annotations

import base64
import csv
import gzip
import json
import re
import shutil
import sqlite3
import subprocess
import sys
import tempfile
import unittest
from datetime import date
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

SCRIPT_DIRECTORY = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIRECTORY))

from global_update import (  # noqa: E402
    Application,
    EXAMPLE_CONFIG_DIRECTORY,
    Extraction,
    PROJECT_DIRECTORY,
    PRODUCTION_TABLES,
    TEST_ENTITIES_PATH,
    _build_dummy_dataset,
    _build_extraction_sql,
    _build_institution_sql,
    _consolidation_predicate,
    _select_institution_rows,
    _module_matches,
    _read_configuration,
    _read_test_fixture,
    _reference_dates,
    _selected_fixture_templates,
    global_update,
)
from export_all_standalone_apps import (  # noqa: E402
    export_all_standalone_apps,
    export_consolidated_standalone_app,
)


class OutputDirectoryTests(unittest.TestCase):
    def test_global_update_requires_an_external_output_directory(self):
        with self.assertRaisesRegex(ValueError, "obligatoire"):
            global_update(mode="preview")
        with self.assertRaisesRegex(ValueError, "hors du projet"):
            global_update(mode="preview", output_directory=PROJECT_DIRECTORY / "outputs")

        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            project_alias = root / "project-link"
            project_alias.symlink_to(PROJECT_DIRECTORY, target_is_directory=True)
            with self.assertRaisesRegex(ValueError, "hors du projet"):
                global_update(mode="preview", output_directory=project_alias / "outputs")

            output = root / "preview"
            result = global_update(mode="preview", output_directory=output, as_of=date(2026, 9, 26))
            self.assertEqual(Path(result["output_directory"]), output.resolve())
            self.assertTrue((output / "manifest.json").is_file())

    def test_both_export_commands_require_output(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            with self.assertRaisesRegex(ValueError, "obligatoire"):
                export_all_standalone_apps(datasets_directory=temporary_directory)
            with self.assertRaisesRegex(ValueError, "obligatoire"):
                export_consolidated_standalone_app(
                    ["example.csv"], "merged", datasets_directory=temporary_directory,
                )
            with self.assertRaisesRegex(ValueError, "hors du projet"):
                export_all_standalone_apps(
                    datasets_directory=temporary_directory,
                    outputs_directory=PROJECT_DIRECTORY / "outputs",
                )
            output = root / "portable"
            self.assertEqual(
                export_all_standalone_apps(datasets_directory=temporary_directory, outputs_directory=output),
                [],
            )
            self.assertTrue(output.is_dir())

        for script in ("global_update.py", "export_all_standalone_apps.py"):
            result = subprocess.run(
                [sys.executable, str(SCRIPT_DIRECTORY / script)],
                capture_output=True, text=True, check=False,
            )
            self.assertEqual(result.returncode, 2)
            self.assertIn("--output", result.stderr)


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
        cls.applications = _read_configuration(EXAMPLE_CONFIG_DIRECTORY, date(2026, 9, 26))

    def test_example_directory_has_four_valid_applications(self):
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

    def test_kri_preview_marks_identity_values_that_require_metadata(self):
        application = next(app for app in self.applications if any(item.module == "KRI" for item in app.extractions))
        extraction = next(item for item in application.extractions if item.module == "KRI")
        sql = _build_extraction_sql(extraction, application)
        self.assertIn("__REPORTING_UNIT_FILTER_FROM_INSTITUTION_METADATA__", sql)
        self.assertNotIn("WITH reporting_units", sql)
        self.assertNotIn("JOIN", sql)

    def test_its_module_uses_its_without_module_id_filter(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            configuration = Path(temporary_directory) / "config"
            shutil.copytree(EXAMPLE_CONFIG_DIRECTORY, configuration)
            file = configuration / "01-finrep.toml"
            file.write_text(file.read_text(encoding="utf-8").replace('module = "FINREP"', 'module = "ITS"', 1), encoding="utf-8")
            application = _read_configuration(configuration, date(2026, 9, 26))[0]
            extraction = application.extractions[0]
            self.assertEqual(extraction.module, "")
            sql = _build_extraction_sql(extraction, application)
            self.assertIn(f"FROM {PRODUCTION_TABLES['ITS']}", sql)
            self.assertNotIn("AND module_id =", sql)
            _, rows = _build_dummy_dataset(application, _read_test_fixture(TEST_ENTITIES_PATH))
            self.assertTrue(any(row["table_id"] == "F_12.01" for row in rows))

    def test_multiple_modules_and_percent_patterns_filter_its(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            configuration = Path(temporary_directory) / "config"
            shutil.copytree(EXAMPLE_CONFIG_DIRECTORY, configuration)
            file = configuration / "01-finrep.toml"
            file.write_text(file.read_text(encoding="utf-8").replace(
                'module = "FINREP"', 'module = ["COREP", "%FINREP%"]', 1,
            ), encoding="utf-8")
            application = _read_configuration(configuration, date(2026, 9, 26))[0]
            extraction = application.extractions[0]
            self.assertEqual(extraction.modules, ("COREP", "%FINREP%"))
            sql = _build_extraction_sql(extraction, application)
            self.assertIn("module_id = 'COREP'", sql)
            self.assertIn("module_id RLIKE '^.*FINREP.*$'", sql)
            self.assertIn("\n          OR ", sql)
            self.assertTrue(_module_matches("SOMETHING_FINREP_EXTRA", "%FINREP%"))
            self.assertFalse(_module_matches("FINREP1", "FIN_REP%"))
            _, rows = _build_dummy_dataset(application, _read_test_fixture(TEST_ENTITIES_PATH))
            self.assertTrue(any(row["table_id"] == "F_12.01" for row in rows))

    def test_template_list_accepts_a_range_and_exclusions(self):
        patterns = ["F_xx% xx<48", "!F_20.04%", "!F_20.05%", "!F_20.06%", "!F_20.07%", "!F_40%"]
        selector = ", ".join(patterns)
        with tempfile.TemporaryDirectory() as temporary_directory:
            configuration = Path(temporary_directory) / "config"
            shutil.copytree(EXAMPLE_CONFIG_DIRECTORY, configuration)
            file = configuration / "01-finrep.toml"
            replacement = 'templates = [' + ", ".join(json.dumps(pattern) for pattern in patterns) + ']'
            file.write_text(file.read_text(encoding="utf-8").replace('templates = ["F_12.01"]', replacement, 1), encoding="utf-8")
            extraction = _read_configuration(configuration, date(2026, 9, 26))[0].extractions[0]
            self.assertEqual(extraction.selector, selector)
            sql = _build_extraction_sql(extraction, self.applications[0])
            self.assertIn("LIKE 'F_47%'", sql)
            self.assertIn("AND NOT", sql)
            self.assertIn("LIKE 'F_20.04%'", sql)
        available = ["F_20.03", "F_20.04", "F_20.05", "F_20.06", "F_20.07", "F_40.01", "F_47.01", "F_48.00"]
        self.assertEqual(_selected_fixture_templates(selector, available), ["F_20.03", "F_47.01"])

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
            dict(entity_id="E1", lei=lei, cluster="CLUSTER_A", cons_level="CONSO", is_highest_cons="Y", name="Bank A",
                 jst_code="OLD", jst_code_today="JST_A", module_id="COREP", table_id="C_01.00.a",
                 reference_period="2026-03-31", x_axis_rc_code="0010", y_axis_rc_code="0020",
                 z_axis_rc_code="qx01", value_decimal=125.0),
            dict(entity_id="E1", lei=lei, cluster="CLUSTER_A", cons_level="SOLO", is_highest_cons="N", name="Bank A",
                 jst_code="JST_A", module_id="COREP", table_id="C_01.00.b",
                 reference_period="2026-03-31", x_axis_rc_code="0010", y_axis_rc_code="0020",
                 z_axis_rc_code="qx01", value_decimal=75.0),
            dict(entity_id="E1", lei=lei, cluster="CLUSTER_A", cons_level="SUBLIQ", is_highest_cons="N", name="Bank A",
                 jst_code="JST_A", module_id="COREP", table_id="C_01.00.a",
                 reference_period="2026-03-31", x_axis_rc_code="0010", y_axis_rc_code="0020",
                 z_axis_rc_code="qx01", value_decimal=50.0),
            dict(entity_id="E2", lei=other_lei, cluster="CLUSTER_B", cons_level="CONSO", is_highest_cons="Y", name="Bank B",
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
                cluster="CLUSTER_A" if entity_id == "E1" else "CLUSTER_B",
                is_highest_cons="Y" if level == "CONSO" else "N",
                reference_period="2026-03-31", value_decimal=value,
            ))

        dates = ("2025-12-31", "2026-03-31")
        its_extraction = Extraction("COREP", "C_01.00", 1, "QUARTERLY", dates)
        kri_extraction = Extraction("KRI", "C_01.00", 1, "QUARTERLY", dates, ("KRI_1",))
        highest = Application("example", (lei,), "HIGHEST", (its_extraction, kri_extraction))
        both = Application("example", (lei,), "CONSO+SOLO", (its_extraction, kri_extraction))
        all_levels = Application("example", (lei,), "ALL", (its_extraction, kri_extraction))
        clustered = Application("example", (), "CONSO", (its_extraction, kri_extraction), clusters=("CLUSTER_A",))
        cluster_overrides_lei = Application("example", (other_lei,), "CONSO", (its_extraction, kri_extraction), clusters=("CLUSTER_A",))
        its_rows = connection.execute(_build_extraction_sql(its_extraction, highest)).fetchall()
        self.assertEqual(len(its_rows), 1)
        self.assertEqual(its_rows[0][0:2], ("C_01.00", f"{lei}_CONSO"))
        self.assertEqual(its_rows[0][-2:], (None, 125.0))
        self.assertEqual(len(connection.execute(_build_extraction_sql(its_extraction, both)).fetchall()), 2)
        self.assertEqual(len(connection.execute(_build_extraction_sql(its_extraction, all_levels)).fetchall()), 3)
        cluster_its_sql = _build_extraction_sql(its_extraction, clustered)
        self.assertIn("cluster IN (", cluster_its_sql)
        self.assertNotIn("lei IN (", cluster_its_sql)
        self.assertEqual({row[1] for row in connection.execute(cluster_its_sql)}, {f"{lei}_CONSO"})
        self.assertEqual({row[1] for row in connection.execute(_build_extraction_sql(its_extraction, cluster_overrides_lei))}, {f"{lei}_CONSO"})
        two_clusters = Application("example", (), "CONSO", (its_extraction,), clusters=("CLUSTER_A", "CLUSTER_B"))
        self.assertEqual(len(connection.execute(_build_extraction_sql(its_extraction, two_clusters)).fetchall()), 2)
        metadata_cursor = connection.execute(_build_institution_sql(both, PRODUCTION_TABLES["ITS"]))
        metadata_columns = [column[0] for column in metadata_cursor.description]
        metadata = metadata_cursor.fetchall()
        reporting_units = [dict(zip(metadata_columns, row)) for row in metadata]
        both_units = _select_institution_rows(reporting_units, both)
        all_units = _select_institution_rows(reporting_units, all_levels)
        cluster_metadata_sql = _build_institution_sql(clustered, PRODUCTION_TABLES["ITS"])
        self.assertIn("cluster IN (", cluster_metadata_sql)
        self.assertNotIn("lei IN (", cluster_metadata_sql)
        cluster_metadata_cursor = connection.execute(cluster_metadata_sql)
        cluster_columns = [column[0] for column in cluster_metadata_cursor.description]
        cluster_units = _select_institution_rows(
            [dict(zip(cluster_columns, row)) for row in cluster_metadata_cursor.fetchall()], clustered,
        )
        self.assertEqual({row["institution_id"] for row in cluster_units}, {f"{lei}_CONSO"})
        cluster_kri_sql = _build_extraction_sql(kri_extraction, clustered, reporting_units=cluster_units)
        self.assertIn("kri.cluster IN (", cluster_kri_sql)
        self.assertNotIn("lei IN (", cluster_kri_sql)
        self.assertEqual({row[1] for row in connection.execute(cluster_kri_sql)}, {f"{lei}_CONSO"})
        kri_sql = _build_extraction_sql(kri_extraction, both, reporting_units=both_units)
        self.assertNotIn("WITH reporting_units", kri_sql)
        self.assertNotIn("JOIN", kri_sql)
        self.assertIn("kri.entity_id = 'E1'", kri_sql)
        self.assertIn("kri.cons_level = 'SOLO'", kri_sql)
        kri_rows = connection.execute(kri_sql).fetchall()
        self.assertEqual({row[1]: row[-1] for row in kri_rows}, {f"{lei}_CONSO": 0.2, f"{lei}_SOLO": 0.3})
        self.assertEqual(len(connection.execute(_build_extraction_sql(kri_extraction, all_levels, reporting_units=all_units)).fetchall()), 3)
        cross_unit_sql = _build_extraction_sql(kri_extraction, both, reporting_units=[
            next(row for row in reporting_units if row["entity_id"] == "E1" and row["consolidation_level"] == "CONSO"),
            {"entity_id": "E2", "consolidation_level": "SOLO", "institution_id": f"{other_lei}_SOLO"},
        ])
        self.assertEqual(
            {row[1] for row in connection.execute(cross_unit_sql).fetchall()},
            {f"{lei}_CONSO"},
        )
        self.assertEqual({row[1] for row in metadata if row[2] == lei}, {f"{lei}_CONSO", f"{lei}_SOLO", f"{lei}_SUBLIQ"})
        self.assertEqual(next(row for row in metadata if row[1].endswith("CONSO"))[3:5], ("JST_A", "Bank A"))
        highest_cursor = connection.execute(_build_institution_sql(highest, PRODUCTION_TABLES["ITS"]))
        highest_columns = [column[0] for column in highest_cursor.description]
        highest_units = _select_institution_rows(
            [dict(zip(highest_columns, row)) for row in highest_cursor.fetchall()], highest,
        )
        self.assertEqual([row["consolidation_level"] for row in highest_units], ["CONSO"])
        self.assertIn("AND is_highest_cons = 'Y'", _build_institution_sql(highest, PRODUCTION_TABLES["ITS"]))
        self.assertNotIn("MAX(is_highest_cons)", _build_institution_sql(highest, PRODUCTION_TABLES["ITS"]))
        highest_kri_sql = _build_extraction_sql(kri_extraction, highest, reporting_units=highest_units)
        self.assertIn("AND kri.is_highest_cons = 'Y'", highest_kri_sql)
        self.assertEqual(
            {row[1] for row in connection.execute(highest_kri_sql)},
            {f"{lei}_CONSO"},
        )
        self.assertIn("AND is_highest_cons = 'Y'", _build_extraction_sql(its_extraction, highest))

        for application in self.applications:
            institution_sql = _build_institution_sql(application, PRODUCTION_TABLES["ITS"])
            connection.execute("EXPLAIN QUERY PLAN " + institution_sql)
            cursor = connection.execute(institution_sql)
            columns = [column[0] for column in cursor.description]
            application_units = [dict(zip(columns, row)) for row in cursor.fetchall()]
            for extraction in application.extractions:
                if extraction.module == "KRI":
                    selected = _select_institution_rows(application_units, application) if application_units else reporting_units[:1]
                    connection.execute("EXPLAIN QUERY PLAN " + _build_extraction_sql(extraction, application, reporting_units=selected))
                else:
                    connection.execute("EXPLAIN QUERY PLAN " + _build_extraction_sql(extraction, application))

    def test_test_mode_writes_queries_datasets_dictionary_and_standalone_apps(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            result = global_update(
                EXAMPLE_CONFIG_DIRECTORY,
                mode="test",
                output_directory=temporary_directory,
                as_of=date(2026, 9, 26),
                compact_values=True,
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
            manifest = json.loads((output / "manifest.json").read_text(encoding="utf-8"))
            self.assertTrue(manifest["compact_values"])
            self.assertGreater(manifest["applications"][0]["compact_values"]["amount_rows"], 0)
            html_text = html_files[0].read_text(encoding="utf-8")
            self.assertIn("institutionDictionaryBase64", html_text)
            payload_match = re.search(r"window\.__AGORA_STANDALONE_DATA__ = (\{.*?\});", html_text)
            self.assertIsNotNone(payload_match)
            payload = json.loads(payload_match.group(1))
            embedded_csv = gzip.decompress(base64.b64decode(payload["csvBase64"])).decode("utf-8-sig")
            self.assertIn("value_scale", next(csv.reader(embedded_csv.splitlines())))
            self.assertIn(",1000,", embedded_csv)
            dictionary_text = gzip.decompress(base64.b64decode(payload["institutionDictionaryBase64"])).decode("utf-8")
            self.assertIn("Institution ID,JST code,Institution Name,Consolidation Level", dictionary_text)
            bundle_match = re.search(r"window\.__AGORA_STANDALONE_BUNDLE_GZIP__ = (\"[^\"]+\");", html_text)
            self.assertIsNotNone(bundle_match)
            bundle = json.loads(gzip.decompress(base64.b64decode(json.loads(bundle_match.group(1)))))
            requested_assets = {
                match.removeprefix("./")
                for source in bundle["moduleSources"].values()
                for match in re.findall(r"(?:\./)?assets/[A-Za-z0-9_.-]+\.csv", source)
            }
            self.assertLessEqual(requested_assets, bundle["assets"].keys())
            history_asset = "assets/ITS_template_taxonomy_history.csv"
            self.assertIn(history_asset, requested_assets)
            self.assertEqual(
                bundle["assets"][history_asset],
                (SCRIPT_DIRECTORY.parent / "app" / history_asset).read_text(encoding="utf-8"),
            )


class ConfigurationValidationTests(unittest.TestCase):
    LEI = "AAAABBBBCCCCDDDDEEEE"

    def _config(self, root: Path, *, extractions: str = "", **changes) -> Path:
        folder = root / "configuration"
        folder.mkdir()
        values = {
            "name": 'name = "Example"',
            "leis": f'leis = ["{self.LEI}"]',
            "consolidation": 'consolidation = "CONSO"',
        }
        values.update(changes)
        block = extractions or '''[[extractions]]
module = "COREP"
templates = ["C_01.00"]
history_years = 1
frequency = "QUARTERLY"'''
        (folder / "app.toml").write_text("\n".join(values.values()) + "\n\n" + block + "\n", encoding="utf-8")
        return folder

    def test_missing_folder_and_unexpected_file(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            with self.assertRaisesRegex(ValueError, "Dossier de paramétrage introuvable"):
                _read_configuration(root / "missing", date(2026, 9, 26))
            folder = self._config(root)
            (folder / "notes.txt").write_text("not an application", encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "notes.txt"):
                _read_configuration(folder, date(2026, 9, 26))

    def test_temporary_files_do_not_block_configuration(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            folder = self._config(Path(temporary_directory))
            for name in ("finrep.toml.amltmp", "app.toml.tmp", "~$app.toml", "app.toml~"):
                (folder / name).write_text("partial or locked content", encoding="utf-8")
            applications = _read_configuration(folder, date(2026, 9, 26))
            self.assertEqual([application.config_file for application in applications], ["app.toml"])

    def test_invalid_syntax_and_fields_include_filename(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            folder = self._config(Path(temporary_directory))
            file = folder / "app.toml"
            file.write_text('name = "unterminated', encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "app.toml: syntaxe TOML invalide"):
                _read_configuration(folder, date(2026, 9, 26))
            file.write_text('name = "Example"\nunknown = true', encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "app.toml: champ\\(s\\) inconnu"):
                _read_configuration(folder, date(2026, 9, 26))

    def test_invalid_lei_consolidation_frequency_and_history(self):
        cases = [
            ({"leis": 'leis = ["SHORT"]'}, "LEI"),
            ({"consolidation": 'consolidation = "GROUP"'}, "consolidation"),
            ({"extractions": '[[extractions]]\nmodule = "COREP"\ntemplates = ["C_01.00"]\nhistory_years = 0\nfrequency = "QUARTERLY"'}, "history_years"),
            ({"extractions": '[[extractions]]\nmodule = "COREP"\ntemplates = ["C_01.00"]\nhistory_years = 1\nfrequency = "WEEKLY"'}, "fréquence invalide"),
            ({"extractions": '[[extractions]]\nmodule = "COREP"\ntemplates = ["!C_01.00"]\nhistory_years = 1\nfrequency = "QUARTERLY"'}, "Au moins un template"),
        ]
        for case, message in cases:
            with self.subTest(message=message), tempfile.TemporaryDirectory() as temporary_directory:
                extractions = case.get("extractions", "")
                folder = self._config(Path(temporary_directory), extractions=extractions, **{key: value for key, value in case.items() if key != "extractions"})
                with self.assertRaisesRegex(ValueError, message):
                    _read_configuration(folder, date(2026, 9, 26))

    def test_cluster_can_replace_an_empty_or_missing_lei_list(self):
        fixture = _read_test_fixture(TEST_ENTITIES_PATH)
        with tempfile.TemporaryDirectory() as temporary_directory:
            folder = self._config(Path(temporary_directory), leis='leis = []\ncluster = ["CLUSTER_A", "CLUSTER_B"]')
            application = _read_configuration(folder, date(2026, 9, 26))[0]
            self.assertEqual(application.leis, ())
            self.assertEqual(application.clusters, ("CLUSTER_A", "CLUSTER_B"))
            self.assertEqual(len(_build_dummy_dataset(application, fixture)[1]), 4)
            self.assertIn("cluster IN (", _build_institution_sql(application, PRODUCTION_TABLES["ITS"]))

            file = folder / "app.toml"
            file.write_text(file.read_text(encoding="utf-8").replace("leis = []\n", ""), encoding="utf-8")
            self.assertEqual(_read_configuration(folder, date(2026, 9, 26))[0].leis, ())
            file.write_text(file.read_text(encoding="utf-8").replace('cluster = ["CLUSTER_A", "CLUSTER_B"]', 'clusters = ["CLUSTER_A"]'), encoding="utf-8")
            self.assertEqual(_read_configuration(folder, date(2026, 9, 26))[0].clusters, ("CLUSTER_A",))
            file.write_text(file.read_text(encoding="utf-8").replace('clusters = ["CLUSTER_A"]', f'leis = ["{self.LEI}"]\ncluster = ["CLUSTER_B"]'), encoding="utf-8")
            prioritized = _read_configuration(folder, date(2026, 9, 26))[0]
            self.assertEqual(prioritized.clusters, ("CLUSTER_B",))
            self.assertIn("cluster IN (", _build_extraction_sql(prioritized.extractions[0], prioritized))
            self.assertNotIn("lei IN (", _build_extraction_sql(prioritized.extractions[0], prioritized))

    def test_cluster_validation_rejects_empty_selector_and_invalid_lists(self):
        cases = (
            ('leis = []', "au moins un LEI ou un cluster"),
            ('leis = []\ncluster = []', "au moins un LEI ou un cluster"),
            ('leis = []\ncluster = [""]', "texte non vide"),
            ('leis = []\ncluster = ["A", "A"]', "doublons"),
            ('leis = []\ncluster = "A"', "liste TOML"),
            ('leis = []\ncluster = ["A"]\nclusters = ["B"]', "pas les deux"),
        )
        for selection, message in cases:
            with self.subTest(selection=selection), tempfile.TemporaryDirectory() as temporary_directory:
                folder = self._config(Path(temporary_directory), leis=selection)
                with self.assertRaisesRegex(ValueError, message):
                    _read_configuration(folder, date(2026, 9, 26))

    def test_module_list_validation_and_exact_pattern_sql(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            folder = self._config(Path(temporary_directory))
            file = folder / "app.toml"
            original = file.read_text(encoding="utf-8")
            for module, error in (
                ('module = []', "liste TOML non vide"),
                ('module = ["COREP", "corep"]', "doublons"),
                ('module = ["ITS", "COREP"]', "doivent être seuls"),
                ('module = ["KRI", "COREP"]', "doivent être seuls"),
                ('module = ["COREP", 3]', "texte non vide"),
                ('module = "C_REP*"', "module invalide"),
            ):
                with self.subTest(module=module):
                    file.write_text(original.replace('module = "COREP"', module), encoding="utf-8")
                    with self.assertRaisesRegex(ValueError, error):
                        _read_configuration(folder, date(2026, 9, 26))
            file.write_text(original.replace('module = "COREP"', 'module = ["COREP", "FINREP"]'), encoding="utf-8")
            application = _read_configuration(folder, date(2026, 9, 26))[0]
            sql = _build_extraction_sql(application.extractions[0], application)
            self.assertIn("module_id IN ('COREP', 'FINREP')", sql)

    def test_kri_direct_ids_and_selector_validation(self):
        direct = '''[[extractions]]
label = "Liquidity KRI"
module = "KRI"
kri_ids = ["LIQ55"]
history_years = 1
frequency = "QUARTERLY"'''
        with tempfile.TemporaryDirectory() as temporary_directory:
            folder = self._config(Path(temporary_directory), extractions=direct)
            application = _read_configuration(folder, date(2026, 9, 26))[0]
            extraction = application.extractions[0]
            self.assertEqual(extraction.selection_type, "kri_ids")
            self.assertEqual(extraction.kri_data_point_ids, ("LIQ55",))
            self.assertIn("'LIQ55'", _build_extraction_sql(extraction, application))
            file = folder / "app.toml"
            file.write_text(file.read_text(encoding="utf-8").replace("LIQ55", "UNKNOWN_KRI"), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "UNKNOWN_KRI"):
                _read_configuration(folder, date(2026, 9, 26))

    def test_kri_wildcards_and_percent_only(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            folder = self._config(Path(temporary_directory), extractions='''[[extractions]]
module = "KRI"
kri_ids = ["%"]
history_years = 1
frequency = "QUARTERLY"''', leis='leis = ["5493001KJTIIGC8Y1R12"]')
            file = folder / "app.toml"
            application = _read_configuration(folder, date(2026, 9, 26))[0]
            extraction = application.extractions[0]
            sql = _build_extraction_sql(extraction, application)
            self.assertIn("FROM crp_agora.agora_dm_imas_kris_raw kri", sql)
            self.assertNotIn("kri_data_point_id =", sql)
            self.assertNotIn("kri_data_point_id RLIKE", sql)
            self.assertNotIn("kri_data_point_id LIKE", sql)
            _, rows = _build_dummy_dataset(application, _read_test_fixture(TEST_ENTITIES_PATH))
            self.assertEqual({row["y_axis_rc_code"] for row in rows}, {"LIQ101", "LIQ205", "CRFA0900"})
            self.assertNotIn("%", {row["y_axis_rc_code"] for row in rows})

            file.write_text(file.read_text(encoding="utf-8").replace('kri_ids = ["%"]', 'kri_ids = ["LIQ%", "CRFA0900"]'), encoding="utf-8")
            application = _read_configuration(folder, date(2026, 9, 26))[0]
            sql = _build_extraction_sql(application.extractions[0], application)
            self.assertIn("kri_data_point_id RLIKE '^LIQ.*$'", sql)
            self.assertIn("kri_data_point_id = 'CRFA0900'", sql)
            self.assertIn("\n          OR ", sql)

            file.write_text(file.read_text(encoding="utf-8").replace("LIQ%", "NOT_A_KRI%"), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "NOT_A_KRI%"):
                _read_configuration(folder, date(2026, 9, 26))

    def test_duplicate_output_names_and_preflight_before_hive(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            folder = self._config(root)
            (folder / "other.toml").write_text((folder / "app.toml").read_text(encoding="utf-8").replace('name = "Example"', 'name = "Example!"'), encoding="utf-8")
            client = SimpleNamespace(read_sql=lambda sql: self.fail("Hive called before validation"))
            with self.assertRaisesRegex(ValueError, "collision"):
                global_update(folder, mode="hive", output_directory=root / "generated", as_of=date(2026, 9, 26), devo_client=client)
            self.assertFalse((root / "generated").exists())


class HiveExecutionTests(unittest.TestCase):
    LEI = "AAAABBBBCCCCDDDDEEEE"

    @staticmethod
    def _config(path):
        path.mkdir()
        (path / "app.toml").write_text(f'''name = "COREP and KRI"
leis = ["{HiveExecutionTests.LEI}"]
consolidation = "CONSO"

[[extractions]]
module = "COREP"
templates = ["C_01.00"]
history_years = 1
frequency = "QUARTERLY"

[[extractions]]
module = "COREP"
templates = ["C_01.00"]
history_years = 1
frequency = "SEMI_ANNUAL"

[[extractions]]
module = "KRI"
templates = ["C_01.00"]
history_years = 1
frequency = "QUARTERLY"
''', encoding="utf-8")

    @staticmethod
    def _client(*, conflict=False):
        class Frame:
            def __init__(self, records):
                self.records = records
                self.columns = list(records[0])

            def to_dict(self, *, orient):
                assert orient == "records"
                return self.records

        class Client:
            def __init__(self):
                self.calls = []
                self.its_calls = 0

            def read_sql(self, sql):
                self.calls.append(sql)
                if "AS institution_id" in sql:
                    conso = {
                        "ENTITY_ID": "E1",
                        "INSTITUTION_ID": f"{HiveExecutionTests.LEI}_CONSO",
                        "LEI": HiveExecutionTests.LEI,
                        "JST_CODE": "JST_A",
                        "INSTITUTION_NAME": "Bank A",
                        "CONSOLIDATION_LEVEL": "CONSO",
                        "CLUSTER": "CLUSTER_A",
                    }
                    return Frame([conso, {
                        **conso,
                        "INSTITUTION_ID": f"{HiveExecutionTests.LEI}_SOLO",
                        "CONSOLIDATION_LEVEL": "SOLO",
                    }])
                is_kri = "'KRI' AS table_id" in sql
                if not is_kri:
                    self.its_calls += 1
                date_columns = re.findall(r"AS (ref_\d{4}_\d{2}_\d{2})", sql)
                row = {
                    "table_id": "KRI" if is_kri else "C_01.00",
                    "reporting_unit_id": f"{HiveExecutionTests.LEI}_CONSO",
                    "x_axis_rc_code": "" if is_kri else "0010",
                    "y_axis_rc_code": "LIQ55" if is_kri else "0020",
                    "z_axis_rc_code": "",
                    **{column: None for column in date_columns},
                }
                row["ref_2026_06_30"] = 20 if is_kri else 11 if conflict and self.its_calls == 2 else 10
                return Frame([row])

        return Client()

    def test_hive_mode_runs_sequential_queries_and_exports_real_results(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            configuration = root / "config"
            self._config(configuration)
            client = self._client()
            result = global_update(configuration, mode="hive", output_directory=root / "generated", as_of=date(2026, 9, 26), devo_client=client)
            self.assertEqual(result["applications"], 1)
            self.assertEqual(len(client.calls), 4)
            kri_sql = next(sql for sql in client.calls if "'KRI' AS table_id" in sql)
            self.assertNotIn("WITH reporting_units", kri_sql)
            self.assertNotIn("JOIN", kri_sql)
            self.assertIn("kri.cons_level = 'CONSO'", kri_sql)
            self.assertNotIn("kri.cons_level = 'SOLO'", kri_sql)
            output = Path(result["output_directory"])
            with next((output / "applications" / "datasets").glob("*.csv")).open(encoding="utf-8-sig", newline="") as stream:
                reader = csv.DictReader(stream)
                rows = list(reader)
                self.assertEqual([column for column in reader.fieldnames if column.startswith("ref_")], ["ref_2026_06_30"])
            self.assertEqual(len(rows), 2)
            self.assertEqual({row["table_id"]: row["ref_2026_06_30"] for row in rows}, {"C_01.00": "10", "KRI": "20"})
            self.assertTrue((output / "applications" / "html" / "Agora Explorer_COREP_and_KRI.html").is_file())
            self.assertIn("devo.read_sql", (output / "query_index.md").read_text(encoding="utf-8"))

    def test_hive_mode_cluster_only_filters_metadata_and_both_data_tables(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            configuration = root / "config"
            self._config(configuration)
            file = configuration / "app.toml"
            file.write_text(file.read_text(encoding="utf-8").replace(
                f'leis = ["{self.LEI}"]', 'leis = []\ncluster = ["CLUSTER_A"]'
            ), encoding="utf-8")
            client = self._client()
            result = global_update(
                configuration, mode="hive", output_directory=root / "generated",
                as_of=date(2026, 9, 26), devo_client=client,
            )
            self.assertEqual(result["applications"], 1)
            self.assertEqual(len(client.calls), 4)
            self.assertTrue(all("cluster IN (" in sql and "lei IN (" not in sql for sql in client.calls))
            manifest = json.loads((root / "generated" / "manifest.json").read_text(encoding="utf-8"))
            self.assertEqual(manifest["applications"][0]["clusters"], ["CLUSTER_A"])
            self.assertEqual(manifest["applications"][0]["leis"], [])

    def test_hive_mode_rejects_conflicting_overlapping_extractions(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            configuration = root / "config"
            self._config(configuration)
            with self.assertRaisesRegex(ValueError, "valeurs contradictoires"):
                global_update(configuration, mode="hive", output_directory=root / "generated", as_of=date(2026, 9, 26), devo_client=self._client(conflict=True))

    def test_hive_mode_can_compact_amounts_without_touching_unknown_kri(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            configuration = root / "config"
            self._config(configuration)
            result = global_update(
                configuration, mode="hive", output_directory=root / "generated",
                as_of=date(2026, 9, 26), devo_client=self._client(), compact_values=True,
            )
            output = Path(result["output_directory"])
            with next((output / "applications" / "datasets").glob("*.csv")).open(encoding="utf-8-sig", newline="") as stream:
                rows = {row["table_id"]: row for row in csv.DictReader(stream)}
            self.assertEqual(rows["C_01.00"]["ref_2026_06_30"], "0")
            self.assertEqual(rows["C_01.00"]["value_scale"], "1000")
            self.assertEqual(rows["KRI"]["ref_2026_06_30"], "20")
            self.assertEqual(rows["KRI"]["value_scale"], "")

    def test_default_client_comes_from_vl_connect(self):
        from hive_to_dataset import _load_default_devo_client

        client = self._client()
        with patch.dict(sys.modules, {"vl_connect": SimpleNamespace(devo=client)}):
            self.assertIs(_load_default_devo_client(), client)


if __name__ == "__main__":
    unittest.main()
