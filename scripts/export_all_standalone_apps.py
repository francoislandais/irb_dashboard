"""Génération Python des versions portables d'Agora Explorer."""

from __future__ import annotations

import json
import posixpath
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit


PROJECT_DIRECTORY = Path(__file__).resolve().parents[1]
APP_DIRECTORY = PROJECT_DIRECTORY / "app"
DEFAULT_DATASETS_DIRECTORY = PROJECT_DIRECTORY / "datasets"
DEFAULT_OUTPUTS_DIRECTORY = PROJECT_DIRECTORY / "outputs"


def export_all_standalone_apps(
    datasets_directory: str | Path | None = None,
    outputs_directory: str | Path | None = None,
) -> list[Path]:
    """Génère un HTML portable pour chaque CSV du dossier de données."""

    datasets_path = _resolve_directory(datasets_directory, DEFAULT_DATASETS_DIRECTORY)
    outputs_path = _resolve_directory(outputs_directory, DEFAULT_OUTPUTS_DIRECTORY)
    datasets_path.mkdir(parents=True, exist_ok=True)
    outputs_path.mkdir(parents=True, exist_ok=True)
    csv_files = sorted(
        (
            path
            for path in datasets_path.iterdir()
            if path.is_file() and path.suffix.lower() == ".csv"
        ),
        key=lambda path: path.name.casefold(),
    )
    bundle = _build_standalone_bundle(APP_DIRECTORY) if csv_files else None
    generated_files = []
    for csv_path in csv_files:
        output_path = outputs_path / f"Agora Explorer_{csv_path.stem}.html"
        export_standalone_app(csv_path, output_path, bundle=bundle)
        generated_files.append(output_path)
    return generated_files


def export_standalone_app(
    data_file_path: str | Path,
    output_path: str | Path | None = None,
    *,
    app_directory: str | Path = APP_DIRECTORY,
    bundle: dict | None = None,
) -> Path:
    """Génère une version portable à partir d'un CSV unique."""

    data_path = Path(data_file_path).expanduser().resolve()
    csv_text = data_path.read_bytes().decode("utf-8", errors="replace")
    if not csv_text.strip():
        raise ValueError(f"Le fichier de données est vide : {data_path}")
    standalone_bundle = bundle or _build_standalone_bundle(
        Path(app_directory).expanduser().resolve()
    )
    html = _build_standalone_html(
        standalone_bundle, csv_text=csv_text, file_name=data_path.name
    )
    destination = (
        Path(output_path).expanduser().resolve()
        if output_path is not None
        else Path.cwd() / f"agora-explorer-{data_path.stem}.html"
    )
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(html, encoding="utf-8")
    return destination


def _build_standalone_bundle(app_directory: Path) -> dict:
    return {
        "assets": {
            "assets/ITS_all_dimension_mapping.csv": _read_app_text(
                app_directory, "assets/ITS_all_dimension_mapping.csv"
            )
        },
        "highchartsJs": _read_app_text(app_directory, "vendor/highcharts.js"),
        "highchartsTreemapJs": _read_app_text(
            app_directory, "vendor/highcharts-treemap.js"
        ),
        "indexHtml": _read_app_text(app_directory, "index.html"),
        "moduleSources": _collect_module_sources(app_directory, "src/main.js"),
        "stylesCss": _read_app_text(app_directory, "src/styles.css"),
    }


def _collect_module_sources(app_directory: Path, entry_path: str) -> dict[str, str]:
    sources: dict[str, str] = {}

    def collect(path: str) -> None:
        if path in sources:
            return
        source = _read_app_text(app_directory, path)
        sources[path] = source
        for dependency in _module_dependencies(path, source):
            collect(dependency)

    collect(entry_path)
    return sources


def _module_dependencies(from_path: str, source: str) -> list[str]:
    dependencies: list[str] = []
    for pattern in (
        r"\bfrom\s*[\"']([^\"']+)[\"']",
        r"\bimport\s*[\"']([^\"']+)[\"']",
        r"\bimport\s*\(\s*[\"']([^\"']+)[\"']\s*\)",
    ):
        for specifier in re.findall(pattern, source):
            dependency = _resolve_module_path(from_path, specifier)
            if dependency and dependency not in dependencies:
                dependencies.append(dependency)
    return dependencies


def _resolve_module_path(from_path: str, specifier: str) -> str:
    clean_specifier = urlsplit(specifier).path
    if not clean_specifier.startswith("."):
        return ""
    return posixpath.normpath(
        posixpath.join(posixpath.dirname(from_path), clean_specifier)
    )


def _build_standalone_html(bundle: dict, *, csv_text: str, file_name: str) -> str:
    payload = {
        "csvText": csv_text,
        "fileName": file_name or "embedded-data.csv",
        "loadedAt": datetime.now(timezone.utc)
        .isoformat(timespec="milliseconds")
        .replace("+00:00", "Z"),
    }
    app_markup = _extract_app_markup(bundle["indexHtml"])
    return f'''<!doctype html>
<html lang="fr" data-standalone="true">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Agora Explorer portable</title>
    <style>
{bundle["stylesCss"]}
    </style>
  </head>
  <body>
{app_markup}
    <script>
{_escape_inline_script(bundle.get("highchartsJs", ""))}
    </script>
    <script>
{_escape_inline_script(bundle.get("highchartsTreemapJs", ""))}
    </script>
    <script>
window.__AGORA_STANDALONE_DATA__ = {_serialize_inline(payload)};
window.__AGORA_STANDALONE_BUNDLE__ = {_serialize_inline(bundle)};
    </script>
    <script type="module">
{_portable_module_loader()}
    </script>
  </body>
</html>'''


def _portable_module_loader() -> str:
    return r'''const bundle = window.__AGORA_STANDALONE_BUNDLE__;
const moduleUrls = new Map();
const nativeFetch = window.fetch.bind(window);

window.fetch = async (resource, options) => {
  const url = typeof resource === "string" ? resource : resource?.url ?? "";
  const assetKey = Object.keys(bundle.assets).find((key) => url.includes(key) || url.endsWith(key.split("/").at(-1)));
  if (assetKey) {
    return new Response(bundle.assets[assetKey], {
      headers: { "content-type": "text/csv;charset=utf-8" },
      status: 200
    });
  }
  return nativeFetch(resource, options);
};

function getModuleUrl(path) {
  if (moduleUrls.has(path)) return moduleUrls.get(path);
  const source = bundle.moduleSources[path];
  if (!source) throw new Error(`Module introuvable dans le fichier portable: ${path}`);

  const transformed = source
    .replace(/(\bfrom\s*["'])([^"']+)(["'])/g, (match, prefix, specifier, suffix) => {
      return `${prefix}${getModuleUrl(resolveModulePath(path, specifier))}${suffix}`;
    })
    .replace(/(\bimport\s*["'])([^"']+)(["'])/g, (match, prefix, specifier, suffix) => {
      return `${prefix}${getModuleUrl(resolveModulePath(path, specifier))}${suffix}`;
    })
    .replace(/(\bimport\s*\(\s*["'])([^"']+)(["']\s*\))/g, (match, prefix, specifier, suffix) => {
      return `${prefix}${getModuleUrl(resolveModulePath(path, specifier))}${suffix}`;
    });

  const url = URL.createObjectURL(new Blob([transformed], { type: "text/javascript;charset=utf-8" }));
  moduleUrls.set(path, url);
  return url;
}

function resolveModulePath(fromPath, specifier) {
  const cleanSpecifier = specifier.split("?")[0].split("#")[0];
  if (!cleanSpecifier.startsWith(".")) return cleanSpecifier;
  return new URL(cleanSpecifier, `https://standalone.local/${fromPath}`).pathname.slice(1);
}

await import(getModuleUrl("src/main.js"));'''


def _extract_app_markup(index_html: str) -> str:
    body_match = re.search(r"<body[^>]*>([\s\S]*?)</body>", index_html, re.I)
    if not body_match:
        raise ValueError(
            "Impossible de préparer l'export portable : structure HTML non reconnue."
        )
    markup = re.sub(
        r"<script\b[\s\S]*?</script>", "", body_match.group(1), flags=re.I
    )
    markup = re.sub(
        r"<link\b[^>]*rel=[\"']stylesheet[\"'][^>]*>", "", markup, flags=re.I
    )
    return markup.strip()


def _serialize_inline(value: object) -> str:
    serialized = json.dumps(value, ensure_ascii=False, separators=(",", ":"))
    return (
        serialized.replace("<", "\\u003C")
        .replace(">", "\\u003E")
        .replace("&", "\\u0026")
        .replace("\u2028", "\\u2028")
        .replace("\u2029", "\\u2029")
    )


def _escape_inline_script(source: str) -> str:
    return re.sub(r"</script", r"<\\/script", source, flags=re.I)


def _read_app_text(app_directory: Path, relative_path: str) -> str:
    return (app_directory / relative_path).read_bytes().decode(
        "utf-8", errors="replace"
    )


def _resolve_directory(value: str | Path | None, default: Path) -> Path:
    return Path(value).expanduser().resolve() if value is not None else default


if __name__ == "__main__":
    generated = export_all_standalone_apps()
    if not generated:
        print(f"Aucun fichier CSV trouvé dans {DEFAULT_DATASETS_DIRECTORY}")
    else:
        print(f"{len(generated)} application(s) générée(s) :")
        for generated_file in generated:
            print(f"- {generated_file}")
