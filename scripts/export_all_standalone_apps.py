"""Génération Python des versions portables d'Agora Explorer."""

from __future__ import annotations

import base64
import csv
import gzip
import html
import io
import json
import posixpath
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable
from urllib.parse import urlsplit


PROJECT_DIRECTORY = Path(__file__).resolve().parents[1]
APP_DIRECTORY = PROJECT_DIRECTORY / "app"
DEFAULT_DATASETS_DIRECTORY = PROJECT_DIRECTORY / "datasets"
DEFAULT_OUTPUTS_DIRECTORY = PROJECT_DIRECTORY / "outputs"
DEFAULT_STANDALONE_APP_NAME = "Agora Explorer portable"


def export_all_standalone_apps(
    datasets_directory: str | Path | None = None,
    outputs_directory: str | Path | None = None,
    app_name: str | None = None,
    institution_dictionary_file_path: str | Path | None = None,
) -> list[Path]:
    """Génère un HTML portable pour chaque CSV du dossier de données.

    ``app_name`` devient le titre de l'onglet (``<title>``) de chaque fichier
    généré - le même nom pour tous les CSV de ce lot. Omis, le titre par
    défaut (``DEFAULT_STANDALONE_APP_NAME``) est conservé.
    """

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
        export_standalone_app(
            csv_path,
            output_path,
            bundle=bundle,
            app_name=app_name,
            institution_dictionary_file_path=institution_dictionary_file_path,
        )
        generated_files.append(output_path)
    return generated_files


def export_standalone_app(
    data_file_path: str | Path,
    output_path: str | Path | None = None,
    *,
    app_directory: str | Path = APP_DIRECTORY,
    bundle: dict | None = None,
    app_name: str | None = None,
    institution_dictionary_file_path: str | Path | None = None,
) -> Path:
    """Génère une version portable à partir d'un CSV unique.

    ``app_name`` devient le titre de l'onglet (``<title>``) de la page
    générée. Omis, le titre par défaut (``DEFAULT_STANDALONE_APP_NAME``) est
    conservé.
    """

    data_path = Path(data_file_path).expanduser().resolve()
    csv_text = data_path.read_bytes().decode("utf-8", errors="replace")
    if not csv_text.strip():
        raise ValueError(f"Le fichier de données est vide : {data_path}")
    institution_dictionary_csv_text = ""
    if institution_dictionary_file_path is not None:
        dictionary_path = Path(institution_dictionary_file_path).expanduser().resolve()
        institution_dictionary_csv_text = dictionary_path.read_bytes().decode("utf-8-sig", errors="replace")
        if not institution_dictionary_csv_text.strip():
            raise ValueError(f"Le dictionnaire des institutions est vide : {dictionary_path}")
    standalone_bundle = bundle or _build_standalone_bundle(
        Path(app_directory).expanduser().resolve()
    )
    html = _build_standalone_html(
        standalone_bundle,
        csv_text=csv_text,
        file_name=data_path.name,
        app_name=app_name,
        institution_dictionary_csv_text=institution_dictionary_csv_text,
    )
    destination = (
        Path(output_path).expanduser().resolve()
        if output_path is not None
        else Path.cwd() / f"agora-explorer-{data_path.stem}.html"
    )
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(html, encoding="utf-8")
    return destination


def export_consolidated_standalone_app(
    dataset_names: Iterable[str],
    output_name: str,
    datasets_directory: str | Path | None = None,
    outputs_directory: str | Path | None = None,
    app_name: str | None = None,
) -> Path:
    """Fusionne plusieurs CSV déjà générés dans ``datasets/`` et exporte une
    unique application portable consolidée.

    ``dataset_names`` désigne des fichiers déjà présents dans le dossier de
    données (avec ou sans l'extension ``.csv``, comme ``output_name`` dans
    ``run_hive_query_to_csv``). Ils n'ont pas besoin de partager le même
    en-tête : la colonne finale est l'union de toutes les colonnes
    rencontrées (dans l'ordre où elles apparaissent, fichier par fichier) -
    une ligne provenant d'un fichier qui n'a pas une colonne donnée (par ex.
    une date de référence absente de son extraction) reçoit une valeur vide
    pour cette colonne plutôt que de faire échouer la fusion.

    ``app_name`` devient le titre de l'onglet (``<title>``) de la page
    générée. Omis, le titre par défaut (``DEFAULT_STANDALONE_APP_NAME``) est
    conservé.
    """

    # A bare string is iterable character by character in Python - guard
    # against dataset_names="LIQ_KRI" silently exploding into one file per
    # letter (see the equivalent guard in hive_to_dataset.py's _clean_values).
    if isinstance(dataset_names, (str, bytes)):
        dataset_names = [dataset_names]
    dataset_names = list(dataset_names)
    if not dataset_names:
        raise ValueError("La liste des datasets à consolider ne peut pas être vide.")

    datasets_path = _resolve_directory(datasets_directory, DEFAULT_DATASETS_DIRECTORY)
    outputs_path = _resolve_directory(outputs_directory, DEFAULT_OUTPUTS_DIRECTORY)
    outputs_path.mkdir(parents=True, exist_ok=True)

    csv_paths = [datasets_path / _normalize_csv_name(name) for name in dataset_names]
    merged_csv_text = _merge_csv_files(csv_paths)

    bundle = _build_standalone_bundle(APP_DIRECTORY)
    output_csv_name = _normalize_csv_name(output_name)
    html = _build_standalone_html(
        bundle, csv_text=merged_csv_text, file_name=output_csv_name, app_name=app_name
    )
    destination = outputs_path / f"Agora Explorer_{Path(output_csv_name).stem}.html"
    destination.write_text(html, encoding="utf-8")
    return destination


def _merge_csv_files(csv_paths: list[Path]) -> str:
    """Reads every CSV's rows keyed by its own header, then writes them all
    back out under the union of every column encountered - a row missing a
    column found in another file just gets a blank value there."""

    all_columns: list[str] = []
    seen_columns: set[str] = set()
    rows_by_file: list[list[dict[str, str]]] = []

    for csv_path in csv_paths:
        if not csv_path.is_file():
            raise ValueError(f"Dataset introuvable : {csv_path}")

        lines = csv_path.read_bytes().decode("utf-8", errors="replace").splitlines()
        if not lines:
            raise ValueError(f"Le dataset est vide : {csv_path}")

        delimiter = _detect_csv_delimiter(lines[0])
        reader = csv.reader(lines, delimiter=delimiter)
        header = next(reader)
        for column in header:
            if column not in seen_columns:
                seen_columns.add(column)
                all_columns.append(column)

        rows_by_file.append([dict(zip(header, row)) for row in reader])

    output = io.StringIO()
    writer = csv.writer(output, lineterminator="\n")
    writer.writerow(all_columns)
    for rows in rows_by_file:
        for row in rows:
            writer.writerow([row.get(column, "") for column in all_columns])

    return output.getvalue().rstrip("\n")


def _detect_csv_delimiter(header_line: str) -> str:
    """Same heuristic as the app's own CSV parser (see csvParser.js): the
    delimiter that appears most often in the header line wins."""

    candidates = (",", ";", "\t")
    return max(candidates, key=header_line.count)


def _normalize_csv_name(output_name: str) -> str:
    name = Path(str(output_name).strip()).name
    if not name:
        raise ValueError("Le nom du fichier CSV ne peut pas être vide.")
    return name if name.lower().endswith(".csv") else f"{name}.csv"


def _build_standalone_bundle(app_directory: Path) -> dict:
    return {
        "assets": {
            "assets/ITS_all_dimension_mapping.csv": _read_app_text(
                app_directory, "assets/ITS_all_dimension_mapping.csv"
            ),
            "assets/ITS_impossible_x_y.csv": _read_app_text(
                app_directory, "assets/ITS_impossible_x_y.csv"
            ),
            "assets/ITS_explorer_default_expand_depth.csv": _read_app_text(
                app_directory, "assets/ITS_explorer_default_expand_depth.csv"
            ),
            "assets/ITS_explorer_template_groups.csv": _read_app_text(
                app_directory, "assets/ITS_explorer_template_groups.csv"
            ),
            "assets/KRI_dictionnary.csv": _read_app_text(
                app_directory, "assets/KRI_dictionnary.csv"
            ),
        },
        "highchartsJs": _read_app_text(app_directory, "vendor/highcharts.js"),
        "highchartsTreemapJs": _read_app_text(
            app_directory, "vendor/highcharts-treemap.js"
        ),
        "indexHtml": _read_app_text(app_directory, "index.html"),
        "moduleSources": _collect_module_sources(app_directory, "src/main.js"),
        "stylesCss": "\n".join(
            (
                _read_app_text(app_directory, "src/styles.css"),
                _read_app_text(app_directory, "src/creditRiskStyles.css"),
            )
        ),
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


def _build_standalone_html(
    bundle: dict,
    *,
    csv_text: str,
    file_name: str,
    app_name: str | None = None,
    institution_dictionary_csv_text: str = "",
) -> str:
    page_title = html.escape((app_name or "").strip() or DEFAULT_STANDALONE_APP_NAME)
    csv_bytes = csv_text.encode("utf-8")
    compressed_csv = gzip.compress(csv_bytes, compresslevel=9, mtime=0)
    bundle_json = json.dumps(bundle, ensure_ascii=False, separators=(",", ":"))
    compressed_bundle = gzip.compress(
        bundle_json.encode("utf-8"), compresslevel=9, mtime=0
    )
    payload = {
        "csvCompression": "gzip-base64",
        "csvBase64": base64.b64encode(compressed_csv).decode("ascii"),
        "csvByteLength": len(csv_bytes),
        "fileName": file_name or "embedded-data.csv",
        "loadedAt": datetime.now(timezone.utc)
        .isoformat(timespec="milliseconds")
        .replace("+00:00", "Z"),
    }
    if institution_dictionary_csv_text:
        dictionary_bytes = institution_dictionary_csv_text.encode("utf-8")
        compressed_dictionary = gzip.compress(dictionary_bytes, compresslevel=9, mtime=0)
        payload.update({
            "institutionDictionaryCompression": "gzip-base64",
            "institutionDictionaryBase64": base64.b64encode(compressed_dictionary).decode("ascii"),
            "institutionDictionaryByteLength": len(dictionary_bytes),
            "institutionDictionaryFileName": "institution_dictionary.csv",
        })
    app_markup = _extract_app_markup(bundle["indexHtml"])
    return f'''<!doctype html>
<html lang="fr" data-standalone="true">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{page_title}</title>
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
window.__AGORA_STANDALONE_BUNDLE_GZIP__ = {_serialize_inline(base64.b64encode(compressed_bundle).decode("ascii"))};
    </script>
    <script type="module">
{_portable_module_loader()}
    </script>
  </body>
</html>'''


def _portable_module_loader() -> str:
    return r'''setStartupStage("decompressing");
const bundle = JSON.parse(await decompressStandaloneText(window.__AGORA_STANDALONE_BUNDLE_GZIP__));
window.__AGORA_STANDALONE_BUNDLE__ = bundle;
const moduleUrls = new Map();
const nativeFetch = window.fetch.bind(window);

function setStartupStage(activeStage) {
  const labels = {
    downloading: "Downloading...",
    decompressing: "Decompressing...",
    indexing: "Indexing..."
  };
  const status = document.querySelector("#startup-stage");
  if (status && labels[activeStage]) status.textContent = labels[activeStage];
}

async function decompressStandaloneText(base64) {
  if (typeof DecompressionStream !== "function") {
    throw new Error("Ce navigateur ne permet pas de décompresser cette application portable.");
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Response(stream).text();
}

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

  // Anchored to the start of a line (this codebase never indents a static
  // import/export) so a comment mentioning "from \"...\"" or "import \"...\""
  // in plain English - which has bitten this exact bundler twice - can never
  // be mistaken for a real specifier: a "//" comment line can never match
  // "^\\s*(?:import|export)\\b". A multi-line destructured import (import {\n
  // ...\n} from "...") is still matched via the bounded, non-greedy [\\s\\S].
  const transformed = source
    .replace(/^(\s*(?:import|export)\b[\s\S]{0,4000}?\bfrom\s*["'])([^"']+)(["'])/gm, (match, prefix, specifier, suffix) => {
      return `${prefix}${getModuleUrl(resolveModulePath(path, specifier))}${suffix}`;
    })
    .replace(/^(\s*import\s*["'])([^"']+)(["'])/gm, (match, prefix, specifier, suffix) => {
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
