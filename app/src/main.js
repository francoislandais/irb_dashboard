import { parseCsv } from "./data/csvParser.js";
import { buildDataIndexes } from "./data/dataIndex.js";
import { loadDimensionMapping } from "./data/dimensionMapping.js";
import { loadModule2Points } from "./data/module2Config.js";
import { getUniqueValues } from "./data/timeSeries.js?v=20260704-standalone-export";
import {
  clearStoredFileHandle,
  getStoredFileHandle,
  hasReadPermission,
  isFileSystemAccessSupported,
  openCsvFile,
  readFileFromHandle,
  storeFileHandle
} from "./data/localFileSource.js";
import { createDataStore } from "./data/dataStore.js";
import { renderAppState, wireUi } from "./ui/dataScreen.js?v=20260704-standalone-export";

const store = createDataStore();
const JST_URL_PARAM = "jst";
const MODULE_URL_PARAM = "module";
const MODULE_URL_VALUES = new Set(["module-2", "cet-1"]);
const STANDALONE_MODULE_PATHS = [
  "src/data/csvParser.js",
  "src/data/dataIndex.js",
  "src/data/dataStore.js",
  "src/data/dimensionMapping.js",
  "src/data/localFileSource.js",
  "src/data/module2Config.js",
  "src/data/timeSeries.js",
  "src/ui/dataScreen.js",
  "src/main.js"
];
const standaloneData = window.__AGORA_STANDALONE_DATA__ ?? null;
let currentCsvText = standaloneData?.csvText ?? "";
let currentCsvFileName = standaloneData?.fileName ?? "";

const actions = {
  getState() {
    return store.getState();
  },

  async chooseFile() {
    try {
      const source = await openCsvFile();
      if (!source) return;

      if (source.kind === "persistent") {
        await storeFileHandle(source.handle);
      } else {
        await clearStoredFileHandle();
      }

      await loadFile(source.file, source.handle ?? null);
    } catch (error) {
      if (isPickerAbort(error)) return;
      store.setError(error);
    }
  },

  async reloadFile() {
    const handle = store.getState().fileHandle ?? await getStoredFileHandle();
    if (!handle) {
      await actions.chooseFile();
      return;
    }

    try {
      const file = await readFileFromHandle(handle);
      await loadFile(file, handle);
    } catch (error) {
      store.setError(error);
    }
  },

  async forgetFile() {
    await clearStoredFileHandle();
    store.reset();
  },

  updateDatasetLabel(label) {
    store.setDatasetLabel(label);
  },

  updateSelectedJst(jstCode) {
    store.setSelectedJst(jstCode);
    updateUrlJstParam(jstCode);
  },

  updateSelectedUnit(unit) {
    store.setSelectedUnit(unit);
  },

  setActiveModule(activeModule) {
    store.setActiveModule(activeModule);
    updateUrlModuleParam(activeModule);
  },

  async exportStandalone() {
    try {
      await exportStandaloneHtml();
    } catch (error) {
      store.setError(error);
    }
  }
};

const initialModule = getUrlModuleParam();
if (initialModule) store.setActiveModule(initialModule);

async function loadFile(file, handle) {
  const text = await file.text();
  currentCsvText = text;
  currentCsvFileName = file.name;
  await loadCsvText(text, file.name, handle, new Date());
}

async function loadCsvText(text, fileName, handle, loadedAt) {
  const parsed = parseCsv(text);
  const dataIndexes = buildDataIndexes(parsed.columns, parsed.rows);
  const jstOptions = getUniqueValues(parsed.columns, parsed.rows, "jst_code");
  store.setData({
    file: { name: fileName },
    fileHandle: handle,
    columns: parsed.columns,
    dataIndexes,
    jstOptions,
    rows: parsed.rows,
    loadedAt
  });

  const urlJst = getUrlJstParam();
  const matchedJst = findMatchingJstCode(jstOptions, urlJst);
  if (matchedJst) store.setSelectedJst(matchedJst);
}

async function loadStandaloneData() {
  if (!standaloneData?.csvText) return false;

  currentCsvText = standaloneData.csvText;
  currentCsvFileName = standaloneData.fileName || "embedded-data.csv";
  await loadCsvText(
    standaloneData.csvText,
    currentCsvFileName,
    null,
    new Date(standaloneData.loadedAt || Date.now())
  );
  store.setCapabilityNotice("Version portable : les données sont intégrées dans ce fichier HTML.");
  return true;
}

function getUrlJstParam() {
  return new URLSearchParams(window.location.search).get(JST_URL_PARAM) ?? "";
}

function updateUrlJstParam(jstCode) {
  const url = new URL(window.location.href);
  if (jstCode) {
    url.searchParams.set(JST_URL_PARAM, jstCode);
  } else {
    url.searchParams.delete(JST_URL_PARAM);
  }
  window.history.replaceState({}, "", url);
}

function getUrlModuleParam() {
  const module = new URLSearchParams(window.location.search).get(MODULE_URL_PARAM) ?? "";
  return MODULE_URL_VALUES.has(module) ? module : "";
}

function updateUrlModuleParam(activeModule) {
  const url = new URL(window.location.href);
  if (MODULE_URL_VALUES.has(activeModule)) {
    url.searchParams.set(MODULE_URL_PARAM, activeModule);
  } else {
    url.searchParams.delete(MODULE_URL_PARAM);
  }
  window.history.replaceState({}, "", url);
}

function findMatchingJstCode(jstOptions, requestedJst) {
  if (!requestedJst) return "";

  const exactMatch = jstOptions.find((jstCode) => jstCode === requestedJst);
  if (exactMatch) return exactMatch;

  const normalizedRequestedJst = normalizeJstForUrlMatch(requestedJst);
  return jstOptions.find((jstCode) => (
    normalizeJstForUrlMatch(jstCode) === normalizedRequestedJst
  )) ?? "";
}

function normalizeJstForUrlMatch(value) {
  return String(value ?? "").replace(/[\s_-]+/g, "").toUpperCase();
}

async function exportStandaloneHtml() {
  if (!currentCsvText) {
    throw new Error("Chargez un CSV avant d'exporter une version portable.");
  }

  const bundle = await getStandaloneBundle();
  const html = buildStandaloneHtml(bundle);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const link = document.createElement("a");
  const safeName = currentCsvFileName
    ? currentCsvFileName.replace(/\.[^.]+$/, "").replace(/[^a-z0-9_-]+/gi, "-")
    : "agora-data";

  const downloadUrl = URL.createObjectURL(blob);
  link.href = downloadUrl;
  link.download = `agora-explorer-${safeName || "portable"}.html`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
}

async function getStandaloneBundle() {
  if (window.__AGORA_STANDALONE_BUNDLE__) {
    return window.__AGORA_STANDALONE_BUNDLE__;
  }

  const [indexHtml, stylesCss, mappingCsv, moduleEntries] = await Promise.all([
    fetchAppText("index.html"),
    fetchAppText("src/styles.css"),
    fetchAppText("assets/ITS_all_dimension_mapping.csv"),
    Promise.all(STANDALONE_MODULE_PATHS.map(async (path) => [path, await fetchAppText(path)]))
  ]);

  return {
    assets: {
      "assets/ITS_all_dimension_mapping.csv": mappingCsv
    },
    indexHtml,
    moduleSources: Object.fromEntries(moduleEntries),
    stylesCss
  };
}

async function fetchAppText(path) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Impossible de préparer l'export portable : ${path} est introuvable.`);
  }
  return response.text();
}

function buildStandaloneHtml(bundle) {
  const appMarkup = extractAppMarkup(bundle.indexHtml);
  const standalonePayload = {
    csvText: currentCsvText,
    fileName: currentCsvFileName || "embedded-data.csv",
    loadedAt: new Date().toISOString()
  };

  return `<!doctype html>
<html lang="fr" data-standalone="true">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Agora Explorer portable</title>
    <style>
${bundle.stylesCss}
    </style>
  </head>
  <body>
${appMarkup}
    <script>
window.__AGORA_STANDALONE_DATA__ = ${serializeForInlineScript(standalonePayload)};
window.__AGORA_STANDALONE_BUNDLE__ = ${serializeForInlineScript(bundle)};
    </script>
    <script type="module">
const bundle = window.__AGORA_STANDALONE_BUNDLE__;
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
  if (!source) throw new Error(\`Module introuvable dans le fichier portable: \${path}\`);

  const transformed = source
    .replace(/(\\bfrom\\s*["'])([^"']+)(["'])/g, (match, prefix, specifier, suffix) => {
      return \`\${prefix}\${getModuleUrl(resolveModulePath(path, specifier))}\${suffix}\`;
    })
    .replace(/(\\bimport\\s*["'])([^"']+)(["'])/g, (match, prefix, specifier, suffix) => {
      return \`\${prefix}\${getModuleUrl(resolveModulePath(path, specifier))}\${suffix}\`;
    });

  const url = URL.createObjectURL(new Blob([transformed], { type: "text/javascript;charset=utf-8" }));
  moduleUrls.set(path, url);
  return url;
}

function resolveModulePath(fromPath, specifier) {
  const cleanSpecifier = specifier.split("?")[0].split("#")[0];
  if (!cleanSpecifier.startsWith(".")) return cleanSpecifier;
  return new URL(cleanSpecifier, \`https://standalone.local/\${fromPath}\`).pathname.slice(1);
}

await import(getModuleUrl("src/main.js"));
    </script>
  </body>
</html>`;
}

function serializeForInlineScript(value) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003C")
    .replace(/>/g, "\\u003E")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function extractAppMarkup(indexHtml) {
  const bodyMatch = indexHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (!bodyMatch) {
    throw new Error("Impossible de préparer l'export portable : structure HTML non reconnue.");
  }

  return bodyMatch[1]
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<link\b[^>]*rel=["']stylesheet["'][^>]*>/gi, "")
    .trim();
}

async function restoreLastFile() {
  if (!isFileSystemAccessSupported()) {
    store.setCapabilityNotice(
      "Votre navigateur ne permet pas de mémoriser l'accès au fichier. Le CSV pourra être chargé, mais il faudra le sélectionner à chaque nouvelle session."
    );
    return;
  }

  const handle = await getStoredFileHandle();
  if (!handle) return;

  store.setRestoring(true);
  try {
    if (!(await hasReadPermission(handle))) {
      store.setRememberedFileReady(handle);
      return;
    }

    const file = await readFileFromHandle(handle, { requestPermission: false });
    await loadFile(file, handle);
  } catch (error) {
    store.setError(error);
  } finally {
    store.setRestoring(false);
  }
}

function isPickerAbort(error) {
  return error?.name === "AbortError";
}

wireUi(actions);
store.subscribe(renderAppState);
renderAppState(store.getState());
loadInternalMapping();
loadModule2Configuration();
if (standaloneData?.csvText) {
  loadStandaloneData();
} else {
  restoreLastFile();
}

async function loadInternalMapping() {
  try {
    store.setDimensionMapping(await loadDimensionMapping());
  } catch (error) {
    store.setDimensionMappingError(error);
  }
}

async function loadModule2Configuration() {
  try {
    store.setModule2Points(await loadModule2Points());
  } catch (error) {
    store.setModule2PointsError(error);
  }
}
