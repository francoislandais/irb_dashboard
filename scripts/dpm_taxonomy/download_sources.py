#!/usr/bin/env python3
"""Download the official EBA DPM dictionary/layout source snapshots."""

from __future__ import annotations

import hashlib
import json
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data" / "eba-dpm-history"
SOURCES = DATA / "sources.json"
DESTINATION = DATA / "sources"
MANIFEST = DATA / "download_manifest.json"


def filename(url: str, framework: str, kind: str) -> str:
    suffix = ".xlsx" if kind == "dictionary" else ".zip"
    return f"{framework}_{kind}{suffix}"


def download(url: str, path: Path) -> dict[str, object]:
    request = urllib.request.Request(url, headers={"User-Agent": "AgoraExplorer-DPM-Research/1.0"})
    digest = hashlib.sha256()
    total = 0
    with urllib.request.urlopen(request, timeout=90) as response, path.open("wb") as output:
        status = response.status
        while chunk := response.read(1024 * 1024):
            output.write(chunk)
            digest.update(chunk)
            total += len(chunk)
    if total < 1024:
        path.unlink(missing_ok=True)
        raise RuntimeError(f"Unexpectedly small download ({total} bytes): {url}")
    return {"url": url, "http_status": status, "bytes": total, "sha256": digest.hexdigest()}


def main() -> int:
    catalog = json.loads(SOURCES.read_text(encoding="utf-8"))
    DESTINATION.mkdir(parents=True, exist_ok=True)
    by_url: dict[str, dict[str, object]] = {}

    for item in catalog["frameworks"]:
        version = item["framework"]
        for kind in ("dictionary", "layouts"):
            url = item[kind]
            if url in by_url:
                by_url[url]["frameworks"].append(version)
                continue
            target = DESTINATION / filename(url, version, kind)
            if target.exists() and target.stat().st_size > 1024:
                data = target.read_bytes()
                entry = {
                    "url": url,
                    "http_status": "cached",
                    "bytes": len(data),
                    "sha256": hashlib.sha256(data).hexdigest(),
                }
            else:
                print(f"Downloading {version} {kind} -> {target.name}", flush=True)
                entry = download(url, target)
            entry.update({"filename": target.name, "kind": kind, "frameworks": [version]})
            by_url[url] = entry

    for item in catalog.get("supporting_assets", []):
        url = item["url"]
        if url in by_url:
            continue
        target = DESTINATION / item["filename"]
        if target.exists() and target.stat().st_size > 1024:
            data = target.read_bytes()
            entry = {
                "url": url,
                "http_status": "cached",
                "bytes": len(data),
                "sha256": hashlib.sha256(data).hexdigest(),
            }
        else:
            print(f"Downloading supporting asset -> {target.name}", flush=True)
            entry = download(url, target)
        entry.update({"filename": target.name, "kind": item["kind"], "frameworks": []})
        by_url[url] = entry

    manifest = {
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "sources_catalog": "sources.json",
        "assets": sorted(by_url.values(), key=lambda item: ((item["frameworks"] or ["supporting"])[0], item["kind"])),
    }
    MANIFEST.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {len(by_url)} verified source assets to {DESTINATION}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"source download failed: {error}", file=sys.stderr)
        raise
