"""Build the application launcher and resolve uploaded HTML files in Darwin."""

from __future__ import annotations

from collections import defaultdict
from html import escape
from pathlib import Path
from urllib.parse import quote


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
    if len(members) <= 3:
        return " · ".join(member["institution_name"] for member in members)
    if app.get("ssm_supervision_country"):
        scope = "Supervision country: " + ", ".join(app["ssm_supervision_country"])
    elif app.get("clusters"):
        scope = "Cluster: " + ", ".join(app["clusters"])
    else:
        scope = "Selected institutions"
    if app.get("ssmsignificance"):
        scope += " · " + ", ".join(app["ssmsignificance"])
    return f"{scope} ({len(members)} institutions)"


def _member_markup(member: dict) -> str:
    jst_codes = ", ".join(sorted(member["jst_codes"]))
    metadata = f'LEI {member["lei"]}' + (f" · JST {jst_codes}" if jst_codes else "")
    return (
        '<span class="group-member" '
        f'data-institution-lei="{escape(member["lei"], quote=True)}" '
        f'data-institution-name="{escape(member["institution_name"], quote=True)}" '
        f'data-institution-jst="{escape(jst_codes, quote=True)}">'
        f'<strong>{escape(member["institution_name"])}</strong>'
        f'<small>{escape(metadata)}</small></span>'
    )


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
        member_labels = "".join(_member_markup(member) for member in members)
        articles = []
        for app in apps:
            filename = Path(app["html_app"]).name
            link = links.get(filename)
            if not link:
                raise ValueError(f"Lien introuvable pour l'application {filename}.")
            labels = list(dict.fromkeys(item.get("label") or item.get("category") or item.get("module") or ""
                                        for item in app.get("extractions", [])))
            labels = [label for label in labels if label]
            description = "; ".join(labels[:3]) + (f"; +{len(labels) - 3} more" if len(labels) > 3 else "")
            articles.append(
                '<article class="application">'
                f'<div><h3 class="app-title">{escape(app["name"])}</h3>'
                f'<p class="app-description">{escape(description or "Reporting data")}</p>'
                f'<div class="app-meta"><span><strong>Institutions:</strong> {len(members)}</span></div></div>'
                f'<div class="app-action"><a class="open-button" href="{escape(link, quote=True)}" '
                'target="_blank" rel="noopener noreferrer">Open application ↗</a></div></article>'
            )
        sections.append(
            f'<section class="scope-group" data-group-id="scope-{number}" aria-labelledby="scope-{number}-title">'
            f'<h2 class="group-title" id="scope-{number}-title">{escape(title)}</h2>'
            f'<p class="group-levels">{member_labels}</p>'
            f'<div class="group-list">{"".join(articles)}</div></section>'
        )
    template = _replace_between(template, "AGORA_GROUPS", "\n".join(sections))
    template = _replace_between(template, "AGORA_PREVIEW_NOTE", "")
    return template


def _replace_between(source: str, marker: str, content: str) -> str:
    start = f"<!-- {marker}_START -->"
    end = f"<!-- {marker}_END -->"
    if source.count(start) != 1 or source.count(end) != 1:
        raise ValueError(f"Marqueurs {marker} absents ou dupliqués dans le lanceur.")
    before, remainder = source.split(start, 1)
    _, after = remainder.split(end, 1)
    return before + content + after
