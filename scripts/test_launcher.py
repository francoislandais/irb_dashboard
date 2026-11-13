from types import SimpleNamespace
import sys
import unittest
from unittest.mock import patch

from scripts.launcher import connect_darwin_listing_client, render_launcher_html, resolve_darwin_app_links


class LauncherTests(unittest.TestCase):
    def setUp(self):
        self.apps = [{
            "name": "FINREP & COREP",
            "html_app": "applications/html/Agora Explorer_FINREP_COREP.html",
            "consolidation": "HIGHEST",
            "institutions": [{
                "institution_id": "LEI123_CONSO",
                "institution_name": "Northstar & Bank",
                "consolidation_level": "CONSO",
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
                         "https://darwin.escb.eu/livelink/livelink/app/nodes/456")

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
            "Agora Explorer_FINREP_COREP.html": "https://darwin.escb.eu/livelink/livelink/app/nodes/456",
        })
        self.assertIn('data-institution-id="LEI123_CONSO"', html)
        self.assertIn('data-institution-name="Northstar &amp; Bank"', html)
        self.assertIn('href="https://darwin.escb.eu/livelink/livelink/app/nodes/456"', html)
        self.assertIn("FINREP &amp; COREP", html)
        self.assertNotIn("Preview with example data", html)
        self.assertNotIn("AGORA_GROUPS_START", html)

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
