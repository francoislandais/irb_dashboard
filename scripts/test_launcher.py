from types import SimpleNamespace
import sys
import unittest
from unittest.mock import patch

from scripts.launcher import (
    _extraction_template_description, connect_darwin_listing_client,
    render_launcher_html, resolve_darwin_app_links, read_launcher_catalog,
)


class LauncherTests(unittest.TestCase):
    def setUp(self):
        self.apps = [{
            "name": "FINREP & COREP",
            "html_app": "applications/html/Agora Explorer_FINREP_COREP.html",
            "consolidation": "HIGHEST",
            "institutions": [{
                "institution_id": "5493001KJTIIGC8Y1R12_CONSO",
                "lei": "5493001KJTIIGC8Y1R12",
                "institution_name": "Northstar & Bank",
                "consolidation_level": "CONSO",
                "jst_code": "JST_A",
            }],
            "extractions": [{"label": "Own funds"}],
        }]

    @staticmethod
    def client(*entries):
        return SimpleNamespace(listdir=lambda **kwargs: [SimpleNamespace(
            id=node_id,
            properties=SimpleNamespace(id=node_id, name=name, parent_id=parent_id),
        ) for node_id, name, parent_id in entries])

    def test_links_use_direct_child_node_ids_and_ignore_other_files(self):
        client = self.client(
            (123, "Agora Explorer_FINREP_COREP.html", 999),
            (456, "Agora Explorer_FINREP_COREP.html", 1914437350),
            (789, "data.csv.gz", 1914437350),
        )
        links = resolve_darwin_app_links(self.apps, 1914437350, client)
        self.assertEqual(links["Agora Explorer_FINREP_COREP.html"],
                         "https://darwin.escb.eu/livelink/livelink/fetchcsui/1914437350/Agora%20Explorer_FINREP_COREP.html?nodeid=456&vernum=-2")

    def test_missing_or_ambiguous_html_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "introuvable"):
            resolve_darwin_app_links(self.apps, 1914437350, self.client())
        duplicate = self.client(
            (456, "Agora Explorer_FINREP_COREP.html", 1914437350),
            (457, "Agora Explorer_FINREP_COREP.html", 1914437350),
        )
        with self.assertRaisesRegex(ValueError, "plusieurs nœuds"):
            resolve_darwin_app_links(self.apps, 1914437350, duplicate)

    def test_generated_launcher_has_real_institution_filter_and_link(self):
        html = render_launcher_html(self.apps, {
            "Agora Explorer_FINREP_COREP.html": "https://darwin.escb.eu/livelink/livelink/fetchcsui/1914437350/Agora%20Explorer_FINREP_COREP.html?nodeid=456&vernum=-2",
        })
        self.assertIn('"lei": "5493001KJTIIGC8Y1R12"', html)
        self.assertIn('"name": "Northstar & Bank"', html)
        self.assertIn('"jst": ["JST_A"]', html)
        self.assertIn('href="https://darwin.escb.eu/livelink/livelink/fetchcsui/1914437350/Agora%20Explorer_FINREP_COREP.html?nodeid=456&amp;vernum=-2"', html)
        self.assertIn("FINREP &amp; COREP", html)
        self.assertIn('<details class="application" name="launcher-application"><summary class="app-summary">', html)
        self.assertIn('<div class="app-expanded">', html)
        self.assertIn('Open application ↗</a></div><div class="app-expanded">', html)
        self.assertIn('<p class="app-template-line"><strong>Available templates:</strong>', html)
        self.assertNotIn("Consolidation:", html)
        self.assertNotIn("Preview with example data", html)
        self.assertNotIn("AGORA_GROUPS_START", html)
        catalog = read_launcher_catalog(html)
        self.assertEqual(len(catalog), 1)
        self.assertEqual(catalog[0]["name"], "FINREP & COREP")
        self.assertEqual(catalog[0]["institutions"], self.apps[0]["institutions"])
        self.assertIsNone(read_launcher_catalog("<html>ancien lanceur</html>"))

    def test_update_date_is_shown_only_in_expanded_application_details(self):
        app = {**self.apps[0], "updated_at": "2026-11-25T14:32:00Z"}
        html = render_launcher_html([app], {"Agora Explorer_FINREP_COREP.html": "first.html"})
        self.assertIn('<div class="app-expanded"><p class="app-template-line">', html)
        self.assertIn('<p class="app-updated-at">Updated: 25/11/2026</p>', html)
        self.assertEqual(read_launcher_catalog(html)[0]["updated_at"], app["updated_at"])

    def test_levels_of_same_lei_share_one_institution_and_peer_group(self):
        second = {
            **self.apps[0],
            "name": "Other app",
            "html_app": "applications/html/other.html",
            "institutions": [{
                "institution_id": "5493001KJTIIGC8Y1R12_SOLO",
                "lei": "5493001KJTIIGC8Y1R12",
                "institution_name": "Northstar & Bank",
                "consolidation_level": "SOLO",
                "jst_code": "JST_B",
            }],
        }
        html = render_launcher_html([*self.apps, second], {
            "Agora Explorer_FINREP_COREP.html": "first.html",
            "other.html": "second.html",
        })
        self.assertEqual(html.count('class="scope-group"'), 1)
        self.assertIn('"jst": ["JST_A", "JST_B"]', html)
        self.assertNotIn("_CONSO</h", html)
        self.assertNotIn("_SOLO</h", html)

    def test_template_scope_uses_extraction_range_and_exclusions(self):
        description = _extraction_template_description({
            "selector": "F_xx% xx<48, !F_20.04%, !F_20.05%, !F_20.06%, !F_20.07%, !F_40%",
            "selection_type": "templates",
        })
        self.assertEqual(description,
                         "Includes F_01% to F_47%; excludes F_20.04% to F_20.07%, F_40%.")
        app = {**self.apps[0], "extractions": [{"label": "FINREP", "selector": "F_xx% xx<48, !F_40%",
                                                   "selection_type": "templates"}]}
        html = render_launcher_html([app], {"Agora Explorer_FINREP_COREP.html": "app.html"})
        self.assertIn("Includes F_01% to F_47%; excludes F_40%.", html)
        self.assertNotIn("F_02%, F_03%", html)

    def test_darwin_rests_fallback_uses_the_supplied_connection_pattern(self):
        calls = []
        fake_modules = {
            "ecb_credentials": SimpleNamespace(load=lambda: {
                "DARWIN_USERNAME": "test-user", "DARWIN_PWD": "test-password",
            }),
            "darwin_rests": SimpleNamespace(DarwinClient=lambda **kwargs: calls.append(kwargs) or "client"),
            "vl_connect": SimpleNamespace(env=SimpleNamespace(get_proxies=lambda: {"https": "proxy"})),
        }
        with patch.dict(sys.modules, fake_modules):
            self.assertEqual(connect_darwin_listing_client(), "client")
        self.assertEqual(calls, [{
            "username": "test-user", "password": "test-password", "proxies": {"https": "proxy"},
        }])


if __name__ == "__main__":
    unittest.main()
