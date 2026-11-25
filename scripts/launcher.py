"""Build the application launcher and resolve uploaded HTML files in Darwin."""

from __future__ import annotations

from collections import defaultdict
import base64
import csv
import gzip
from html import escape
import io
import json
from pathlib import Path
import re
from urllib.parse import quote

if __package__:
    from .hive_to_dataset import _expand_template_expressions
else:
    from hive_to_dataset import _expand_template_expressions


DARWIN_FILE_URL = "https://darwin.escb.eu/livelink/livelink/fetchcsui/{folder_id}/{filename}?nodeid={node_id}&vernum=-2"
TEMPLATE_PATH = Path(__file__).resolve().parents[1] / "examples" / "launcher-preview.html"


def connect_darwin_listing_client():
    """Open the darwin_rests client shown in the Darwin folder example."""

    try:
        import ecb_credentials
        from darwin_rests import DarwinClient
        from vl_connect import env
        credentials = ecb_credentials.load()
        return DarwinClient(
            username=credentials["DARWIN_USERNAME"],
            password=credentials["DARWIN_PWD"],
            proxies=env.get_proxies(),
        )
    except (ImportError, KeyError) as error:
        raise RuntimeError(
            "Le listing Darwin exige darwin_rests, ecb_credentials et vl_connect.env sur cette machine."
        ) from error
    except Exception as error:
        raise RuntimeError("Connexion au listing Darwin impossible.") from error


def _property(entry, name):
    if isinstance(entry, dict):
        return entry.get(name)
    return getattr(entry, name, None)


def _darwin_direct_children(folder_id: int, client) -> list[tuple[int, str]]:
    """Read one folder level; prefer DarwinClient.listdir from darwin_rests."""

    if callable(getattr(client, "listdir", None)):
        try:
            entries = client.listdir(
                node_id=folder_id, properties=["id", "name", "parent_id"],
                recursive=True, max_depth=1,
            )
        except Exception as error:
            raise RuntimeError(f"Listing Darwin impossible pour le dossier {folder_id}.") from error
        result = []
        for entry in entries:
            properties = _property(entry, "properties") or entry
            parent_id = _property(properties, "parent_id")
            if parent_id != folder_id:
                continue
            node_id = _property(properties, "id") or _property(entry, "id")
            name = _property(properties, "name")
            if type(node_id) is not int or node_id <= 0 or not isinstance(name, str) or not name:
                raise ValueError(f"Dossier Darwin {folder_id}: entrée invalide dans le listing.")
            result.append((node_id, name))
        return result

    rest = next((candidate for candidate in (getattr(client, "rest", None), getattr(client, "session", None))
                 if callable(getattr(candidate, "get", None))), None)
    if rest is None:
        raise RuntimeError("Le client Darwin n'expose ni listdir ni session REST pour retrouver les HTML exportés.")
    url = f"https://darwin.escb.eu/livelink/livelink/api/v1/nodes/{folder_id}/nodes"
    result = []
    page = 1
    while True:
        try:
            response = rest.get(url, params={"page": page, "limit": 200})
            if hasattr(response, "raise_for_status"):
                response.raise_for_status()
            payload = response.json() if hasattr(response, "json") else response
        except Exception as error:
            raise RuntimeError(f"Listing REST Darwin impossible pour le dossier {folder_id}, page {page}.") from error
        if not isinstance(payload, dict) or not isinstance(payload.get("data"), list):
            raise ValueError(f"Dossier Darwin {folder_id}: réponse REST inattendue à la page {page}.")
        for entry in payload["data"]:
            properties = _property(entry, "data") or entry
            properties = _property(properties, "properties") or properties
            node_id, name = _property(properties, "id"), _property(properties, "name")
            if type(node_id) is not int or node_id <= 0 or not isinstance(name, str) or not name:
                raise ValueError(f"Dossier Darwin {folder_id}: entrée REST invalide.")
            result.append((node_id, name))
        total_pages = payload.get("page_total")
        if type(total_pages) is not int:
            paging = payload.get("paging")
            total_pages = paging.get("page_total") if isinstance(paging, dict) else None
        if type(total_pages) is not int or total_pages < page:
            raise ValueError(f"Dossier Darwin {folder_id}: pagination REST absente ou incohérente.")
        if page >= total_pages:
            return result
        page += 1


def resolve_darwin_app_links(applications: list[dict], folder_id: int, client) -> dict[str, str]:
    """Match each generated filename to exactly one direct Darwin child node."""

    wanted = {Path(app["html_app"]).name for app in applications}
    matches: dict[str, list[int]] = defaultdict(list)
    for node_id, name in _darwin_direct_children(folder_id, client):
        if name in wanted:
            matches[name].append(node_id)
    missing = sorted(wanted - matches.keys())
    duplicates = sorted(name for name, ids in matches.items() if len(ids) != 1)
    if missing or duplicates:
        problems = []
        if missing:
            problems.append("HTML introuvable(s) dans Darwin : " + ", ".join(missing))
        if duplicates:
            problems.append("plusieurs nœuds Darwin portent le même nom : " + ", ".join(duplicates))
        raise ValueError(" ; ".join(problems))
    return {
        name: DARWIN_FILE_URL.format(folder_id=folder_id, filename=quote(name, safe=""), node_id=matches[name][0])
        for name in wanted
    }


def _institution_lei(member: dict) -> str:
    lei = str(member.get("lei") or "").strip()
    if lei:
        return lei
    institution_id = str(member.get("institution_id") or "").strip()
    return institution_id.rsplit("_", 1)[0] if "_" in institution_id else institution_id


def _collect_institutions(applications: list[dict]) -> dict[str, dict]:
    institutions: dict[str, dict] = {}
    for app in applications:
        for member in app.get("institutions") or []:
            lei = _institution_lei(member)
            if not lei:
                continue
            institution = institutions.setdefault(lei, {"lei": lei, "institution_name": lei, "jst_codes": set()})
            name = str(member.get("institution_name") or "").strip()
            if name and institution["institution_name"] == lei:
                institution["institution_name"] = name
            jst_code = str(member.get("jst_code") or "").strip()
            if jst_code:
                institution["jst_codes"].add(jst_code)
    return institutions


def _peer_group_title(app: dict, members: list[dict]) -> str:
    description = str(app.get("description") or "").strip()
    if description:
        return f"{description} ({len(members)} institution{'s' if len(members) != 1 else ''})"
    if len(members) <= 3:
        return " · ".join(member["institution_name"] for member in members)
    if app.get("jst_code"):
        scope = "JST code: " + ", ".join(app["jst_code"])
    elif app.get("ssm_supervision_country"):
        scope = "Supervision country: " + ", ".join(app["ssm_supervision_country"])
    elif app.get("clusters"):
        scope = "Cluster: " + ", ".join(app["clusters"])
    else:
        scope = "Selected institutions"
    if app.get("ssmsignificance"):
        scope += " · " + ", ".join(app["ssmsignificance"])
    return f"{scope} ({len(members)} institutions)"


def _compact_template_patterns(patterns: list[str]) -> str:
    """Shorten consecutive family prefixes without changing their meaning."""

    compact = []
    index = 0
    while index < len(patterns):
        match = re.fullmatch(r"(.*?)(\d+)%", patterns[index])
        end = index + 1
        if match:
            prefix, digits = match.groups()
            while end < len(patterns):
                following = re.fullmatch(r"(.*?)(\d+)%", patterns[end])
                if not following or following.group(1) != prefix or len(following.group(2)) != len(digits):
                    break
                if int(following.group(2)) != int(digits) + end - index:
                    break
                end += 1
        if end - index >= 3:
            compact.append(f"{patterns[index]} to {patterns[end - 1]}")
        else:
            compact.extend(patterns[index:end])
        index = end
    return ", ".join(compact)


def _extraction_template_description(extraction: dict) -> str:
    selector = str(extraction.get("selector") or "").strip()
    if not selector:
        return "Template scope not specified."
    if extraction.get("selection_type") == "kri_ids":
        return f"KRI data points: {selector}."
    included, excluded = _expand_template_expressions([selector])
    included_text = "all templates" if included == ["%"] else _compact_template_patterns(included)
    description = f"Includes {included_text}"
    if excluded:
        description += f"; excludes {_compact_template_patterns(excluded)}"
    return description + "."


def _updated_date_label(value: str) -> str:
    match = re.match(r"^(\d{4})-(\d{2})-(\d{2})", value)
    return f"{match.group(3)}/{match.group(2)}/{match.group(1)}" if match else "Date unavailable"


def render_launcher_html(applications: list[dict], links: dict[str, str]) -> str:
    """Populate the reviewed launcher layout with real institutions and links."""

    template = TEMPLATE_PATH.read_text(encoding="utf-8")
    institutions = _collect_institutions(applications)
    grouped: dict[tuple[str, ...], list[dict]] = {}
    for app in applications:
        members = app.get("institutions") or []
        if not members or not app.get("html_app"):
            continue
        key = tuple(sorted({_institution_lei(member) for member in members} - {""}))
        if not key:
            continue
        grouped.setdefault(key, []).append(app)
    sections = []
    for number, (leis, apps) in enumerate(grouped.items(), start=1):
        members = sorted((institutions[lei] for lei in leis), key=lambda item: (
            item["institution_name"].casefold(), item["lei"]
        ))
        title = _peer_group_title(apps[0], members)
        articles = []
        for app in apps:
            filename = Path(app["html_app"]).name
            link = links.get(filename)
            if not link:
                raise ValueError(f"Lien introuvable pour l'application {filename}.")
            template_lines = list(dict.fromkeys(
                (str(item.get("label") or item.get("category") or item.get("module") or "Extraction"),
                 _extraction_template_description(item))
                for item in app.get("extractions", [])
            ))
            template_summary = " · ".join(
                f"{escape(label)}: {escape(scope)}" if len(template_lines) > 1 else escape(scope)
                for label, scope in template_lines
            ) or "Template scope not specified."
            institution_map = {}
            for member in app.get("institutions") or []:
                lei = _institution_lei(member)
                institution_id = str(member.get("institution_id") or "").strip()
                if lei and institution_id:
                    # Prefer the consolidated unit when both levels share the same LEI.
                    previous = institution_map.get(lei, "")
                    if not previous or (institution_id.endswith(("_CONS", "_CONSO")) and
                                        not previous.endswith(("_CONS", "_CONSO"))):
                        institution_map[lei] = institution_id
            articles.append(
                '<details class="application" name="launcher-application"><summary class="app-summary">'
                f'<h3 class="app-title">{escape(app["name"])}</h3>'
                '<span class="app-disclosure-arrow" aria-hidden="true">⌄</span></summary>'
                f'<div class="app-action"><a class="open-button" href="{escape(link, quote=True)}" '
                f'data-base-href="{escape(link, quote=True)}" '
                f'data-institution-map="{escape(json.dumps(institution_map), quote=True)}" '
                'target="_blank" rel="noopener noreferrer">Open application ↗</a></div>'
                f'<div class="app-expanded"><p class="app-template-line"><strong>Available templates:</strong> {template_summary}</p>'
                f'<p class="app-updated-at">Updated: {escape(_updated_date_label(str(app.get("updated_at") or "")))}</p></div>'
                '</details>'
            )
        sections.append(
            f'<section class="scope-group" data-group-id="scope-{number}" '
            f'data-institution-leis="{escape("|".join(leis), quote=True)}" aria-labelledby="scope-{number}-title">'
            f'<div class="group-heading"><h2 class="group-title" id="scope-{number}-title">{escape(title)}</h2>'
            f'<span class="group-count">{len(apps)} application{"s" if len(apps) != 1 else ""}</span></div>'
            f'<div class="group-list">{"".join(articles)}</div></section>'
        )
    template = _replace_between(template, "AGORA_GROUPS", "\n".join(sections))
    template = _replace_between(template, "AGORA_PREVIEW_NOTE", "")
    institution_data = [
        {"lei": item["lei"], "name": item["institution_name"], "jst": sorted(item["jst_codes"])}
        for item in sorted(institutions.values(), key=lambda item: (item["institution_name"].casefold(), item["lei"]))
    ]
    template = _replace_between(template, "AGORA_INSTITUTIONS", json.dumps(institution_data).replace("<", "\\u003c"))
    catalog = {"version": 1, "applications": [launcher_catalog_entry(app) for app in applications]}
    start, end = "<!-- AGORA_CATALOG_START -->", "<!-- AGORA_CATALOG_END -->"
    template = _replace_between(template, "AGORA_CATALOG", start + json.dumps(catalog, ensure_ascii=False).replace("<", "\\u003c") + end)
    return template


def launcher_catalog_entry(app: dict) -> dict:
    """Keep only the fields needed to recreate an entry on a later run."""
    fields = (
        "name", "description", "html_app", "institutions", "extractions",
        "clusters", "jst_code", "ssm_supervision_country", "ssmsignificance", "updated_at",
    )
    return {field: app.get(field, [] if field in {"institutions", "extractions"} else "") for field in fields}


def read_launcher_catalog(html: str) -> list[dict] | None:
    """Return the embedded catalog, or None for an older launcher."""
    start, end = "<!-- AGORA_CATALOG_START -->", "<!-- AGORA_CATALOG_END -->"
    if html.count(start) != 1 or html.count(end) != 1:
        return None
    try:
        payload = json.loads(html.split(start, 1)[1].split(end, 1)[0])
    except json.JSONDecodeError as error:
        raise ValueError("Le catalogue du lanceur Darwin est illisible.") from error
    if not isinstance(payload, dict) or payload.get("version") != 1 or not isinstance(payload.get("applications"), list):
        raise ValueError("Le catalogue du lanceur Darwin a un format inattendu.")
    applications = payload["applications"]
    if any(not isinstance(app, dict) or not app.get("html_app") or not app.get("name") for app in applications):
        raise ValueError("Le catalogue du lanceur Darwin contient une application invalide.")
    return applications


def read_standalone_app_details(html: str) -> tuple[list[dict], str]:
    """Recover the institution list and generation date from an existing HTML."""
    match = re.search(r"window\.__AGORA_STANDALONE_DATA__ = (\{[^\n]+\});", html)
    if not match:
        return [], ""
    payload = json.loads(match.group(1))
    institutions = []
    encoded = payload.get("institutionDictionaryBase64")
    if encoded:
        content = gzip.decompress(base64.b64decode(encoded)).decode("utf-8-sig")
        for row in csv.DictReader(io.StringIO(content)):
            institution_id = (row.get("Institution ID") or "").strip()
            if "_" not in institution_id:
                continue
            lei, level = institution_id.rsplit("_", 1)
            institutions.append({
                "institution_id": institution_id, "lei": lei,
                "institution_name": (row.get("Institution Name") or lei).strip(),
                "consolidation_level": (row.get("Consolidation Level") or level).strip(),
                "jst_code": (row.get("JST code") or "").strip(),
            })
    return institutions, str(payload.get("loadedAt") or "")


def _replace_between(source: str, marker: str, content: str) -> str:
    start = f"<!-- {marker}_START -->"
    end = f"<!-- {marker}_END -->"
    if source.count(start) != 1 or source.count(end) != 1:
        raise ValueError(f"Marqueurs {marker} absents ou dupliqués dans le lanceur.")
    before, remainder = source.split(start, 1)
    _, after = remainder.split(end, 1)
    return before + content + after
