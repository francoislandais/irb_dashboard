import { parseCsv } from "./data/csvParser.js";
import { buildDataIndexes } from "./data/dataIndex.js";
import { loadDimensionMapping } from "./data/dimensionMapping.js?v=20260704-cost-risk";
import { loadExplorerPoints } from "./data/explorerConfig.js";
import { getUniqueValues } from "./data/timeSeries.js?v=20260708-explorer-rename";
import {
  clearStoredDatasetFileHandle,
  clearStoredFileHandle,
  getStoredDatasetFileHandles,
  getStoredFileHandle,
  hasReadPermission,
  isFileSystemAccessSupported,
  openCsvFile,
  readFileFromHandle,
  storeDatasetFileHandle,
  storeFileHandle
} from "./data/localFileSource.js?v=20260704-local-source";
import { createDataStore } from "./data/dataStore.js?v=20260713-stage-transfer-all-stage-denom";
import { renderAppState, wireUi } from "./ui/dataScreen.js?v=20260713-stage-transfer-all-stage-denom";

const store = createDataStore();
const JST_URL_PARAM = "jst";
const MODULE_URL_PARAM = "module";
const DATASET_URL_PARAM = "dataset";
const PEERS_EXCLUDED_URL_PARAM = "peers_excluded";
const MODULE_URL_VALUES = new Set(["explorer", "cet-1", "cost-of-risk"]);
const STANDALONE_MODULE_PATHS = [
  "src/data/csvParser.js",
  "src/data/cet1.js",
  "src/data/costOfRisk.js",
  "src/data/core/axisCode.js",
  "src/data/core/axisColumns.js",
  "src/data/core/formatting.js",
  "src/data/core/referenceColumns.js",
  "src/data/dataIndex.js",
  "src/data/dataStore.js",
  "src/data/dimensionMapping.js",
  "src/data/localFileSource.js",
  "src/data/explorer.js",
  "src/data/explorerBenchmark.js",
  "src/data/explorerConfig.js",
  "src/data/peerDistribution.js",
  "src/data/timeSeries.js",
  "src/ui/appState.js",
  "src/ui/auditTrailDialog.js",
  "src/ui/benchmarkLineChart.js",
  "src/ui/cet1View.js",
  "src/ui/contextMenu.js",
  "src/ui/costOfRiskStageTransfers.js",
  "src/ui/costOfRiskView.js",
  "src/ui/dataScreen.js",
  "src/ui/explorerView.js",
  "src/ui/theme.js",
  "src/main.js"
];
const standaloneData = window.__AGORA_STANDALONE_DATA__ ?? null;
let currentCsvText = standaloneData?.csvText ?? "";
let currentCsvFileName = standaloneData?.fileName ?? "";
const csvTextByDatasetId = new Map();

const actions = {
  getState() {
    return store.getState();
  },

  async chooseFile() {
    try {
      const source = await openCsvFile();
      if (!source) return;

      if (source.kind === "persistent") {
        const datasetId = createDatasetId("local");
        await storeFileHandle(source.handle);
        await storeDatasetFileHandle({ id: datasetId, fileName: source.file.name, handle: source.handle });
        await loadFile(source.file, source.handle ?? null, {
          datasetId,
          datasetLabel: source.file.name,
          source: "local"
        });
      } else {
        await clearStoredFileHandle();
        await loadFile(source.file, null, {
          datasetId: createDatasetId("session"),
          datasetLabel: source.file.name,
          source: "session"
        });
      }
    } catch (error) {
      if (isPickerAbort(error)) return;
      store.setError(error);
    }
  },

  async reloadFile() {
    const state = store.getState();
    const handle = state.fileHandle ?? await getStoredFileHandle();
    if (!handle) {
      await actions.chooseFile();
      return;
    }

    try {
      const file = await readFileFromHandle(handle);
      await loadFile(file, handle, {
        datasetId: state.activeDatasetId || createDatasetId("local"),
        datasetLabel: state.fileName || file.name,
        source: "local"
      });
    } catch (error) {
      store.setError(error);
    }
  },

  async forgetFile() {
    const state = store.getState();
    if (state.activeDatasetId) {
      csvTextByDatasetId.delete(state.activeDatasetId);
      await clearStoredDatasetFileHandle(state.activeDatasetId);
      await clearStoredFileHandle();
      store.forgetDataset(state.activeDatasetId);
      updateUrlDatasetParam(store.getState().activeDatasetId);
      return;
    }
    await clearStoredFileHandle();
    store.reset();
    updateUrlDatasetParam("");
  },

  async setActiveDataset(datasetId) {
    const dataset = store.getState().datasets.find((candidate) => candidate.id === datasetId);
    if (dataset?.isLoaded === false) {
      try {
        const file = await readFileFromHandle(dataset.fileHandle);
        await loadFile(file, dataset.fileHandle, {
          datasetId: dataset.id,
          datasetLabel: dataset.label || dataset.fileName,
          source: dataset.source || "local"
        });
      } catch (error) {
        store.setError(error);
        return;
      }
    } else {
      store.setActiveDataset(datasetId);
    }
    updateUrlDatasetParam(store.getState().activeDatasetId);
    updateUrlJstParam(store.getState().selectedJst);
    applyUrlPeerExclusions(store.getState().jstOptions);
    updateUrlPeerExclusionsParam(store.getState());
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

  updatePeerJstCodes(peerJstCodes) {
    store.setPeerJstCodes(peerJstCodes);
    updateUrlPeerExclusionsParam(store.getState());
  },

  updatePeerDisplayMode(peerDisplayMode) {
    store.setPeerDisplayMode(peerDisplayMode);
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

async function loadFile(file, handle, options = {}) {
  const text = await file.text();
  currentCsvText = text;
  currentCsvFileName = file.name;
  await loadCsvText(text, file.name, handle, new Date(), options);
}

async function loadCsvText(text, fileName, handle, loadedAt, options = {}) {
  const parsed = parseCsv(text);
  const dataIndexes = buildDataIndexes(parsed.columns, parsed.rows);
  const jstOptions = getUniqueValues(parsed.columns, parsed.rows, "jst_code");
  const datasetId = options.datasetId || createDatasetId(options.source || "local");
  csvTextByDatasetId.set(datasetId, text);
  store.setData({
    file: { name: fileName },
    fileHandle: handle,
    columns: parsed.columns,
    dataIndexes,
    datasetId,
    datasetLabel: options.datasetLabel || fileName,
    source: options.source || "local",
    jstOptions,
    rows: parsed.rows,
    loadedAt
  });
  updateUrlDatasetParam(store.getState().activeDatasetId);

  const urlJst = getUrlJstParam();
  const matchedJst = findMatchingJstCode(jstOptions, urlJst);
  if (matchedJst) store.setSelectedJst(matchedJst);
  applyUrlPeerExclusions(jstOptions);
}

async function loadStandaloneData() {
  if (!standaloneData?.csvText) return false;

  currentCsvText = standaloneData.csvText;
  currentCsvFileName = standaloneData.fileName || "embedded-data.csv";
  await loadCsvText(
    standaloneData.csvText,
    currentCsvFileName,
    null,
    new Date(standaloneData.loadedAt || Date.now()),
    {
      datasetId: "embedded",
      datasetLabel: "Données embarquées",
      source: "embedded"
    }
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

function getUrlDatasetParam() {
  return new URLSearchParams(window.location.search).get(DATASET_URL_PARAM) ?? "";
}

function updateUrlDatasetParam(datasetId) {
  const url = new URL(window.location.href);
  if (datasetId) {
    url.searchParams.set(DATASET_URL_PARAM, datasetId);
  } else {
    url.searchParams.delete(DATASET_URL_PARAM);
  }
  window.history.replaceState({}, "", url);
}

function getUrlPeerExclusionsParam() {
  return new URLSearchParams(window.location.search)
    .get(PEERS_EXCLUDED_URL_PARAM)
    ?.split(",")
    .map((value) => value.trim())
    .filter(Boolean) ?? [];
}

function applyUrlPeerExclusions(jstOptions) {
  const excludedFromUrl = getUrlPeerExclusionsParam();
  if (excludedFromUrl.length === 0 || jstOptions.length === 0) return;

  const excludedNormalized = new Set(excludedFromUrl.map(normalizeJstForUrlMatch));
  const peerJstCodes = jstOptions.filter((jstCode) => (
    !excludedNormalized.has(normalizeJstForUrlMatch(jstCode))
  ));
  store.setPeerJstCodes(peerJstCodes.length > 0 ? peerJstCodes : jstOptions);
  updateUrlPeerExclusionsParam(store.getState());
}

function updateUrlPeerExclusionsParam(state = store.getState()) {
  const url = new URL(window.location.href);
  const jstOptions = state.jstOptions ?? [];
  const selectedPeers = new Set(state.peerJstCodes?.length ? state.peerJstCodes : jstOptions);
  const excludedPeers = jstOptions.filter((jstCode) => !selectedPeers.has(jstCode));

  if (excludedPeers.length > 0) {
    url.searchParams.set(PEERS_EXCLUDED_URL_PARAM, excludedPeers.join(","));
  } else {
    url.searchParams.delete(PEERS_EXCLUDED_URL_PARAM);
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
  const state = store.getState();
  const csvText = csvTextByDatasetId.get(state.activeDatasetId) || currentCsvText;
  const csvFileName = state.fileName || currentCsvFileName;
  if (!csvText) {
    throw new Error("Chargez un CSV avant d'exporter une version portable.");
  }

  const bundle = await getStandaloneBundle();
  const html = buildStandaloneHtml(bundle, { csvText, fileName: csvFileName });
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const link = document.createElement("a");
  const safeName = csvFileName
    ? csvFileName.replace(/\.[^.]+$/, "").replace(/[^a-z0-9_-]+/gi, "-")
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

  const [indexHtml, stylesCss, mappingCsv, highchartsJs, highchartsTreemapJs, moduleEntries] = await Promise.all([
    fetchAppText("index.html"),
    fetchAppText("src/styles.css"),
    fetchAppText("assets/ITS_all_dimension_mapping.csv"),
    fetchAppText("vendor/highcharts.js"),
    fetchAppText("vendor/highcharts-treemap.js"),
    Promise.all(STANDALONE_MODULE_PATHS.map(async (path) => [path, await fetchAppText(path)]))
  ]);

  return {
    assets: {
      "assets/ITS_all_dimension_mapping.csv": mappingCsv
    },
    highchartsJs,
    highchartsTreemapJs,
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

function buildStandaloneHtml(bundle, activeDataset) {
  const appMarkup = extractAppMarkup(bundle.indexHtml);
  const standalonePayload = {
    csvText: activeDataset.csvText,
    fileName: activeDataset.fileName || "embedded-data.csv",
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
${escapeInlineScriptSource(bundle.highchartsJs ?? "")}
    </script>
    <script>
${escapeInlineScriptSource(bundle.highchartsTreemapJs ?? "")}
    </script>
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

function escapeInlineScriptSource(source) {
  return String(source).replace(/<\/script/gi, "<\\/script");
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
  const storedDatasets = await getStoredDatasetFileHandles();
  if (!handle && storedDatasets.length === 0) return;

  store.registerDatasetManifest(storedDatasets);

  store.setRestoring(true);
  try {
    const targetEntry = selectDatasetEntryToRestore(storedDatasets);
    if (targetEntry) {
      if (!(await hasReadPermission(targetEntry.handle))) {
        store.setRememberedFileReady(targetEntry.handle, targetEntry.fileName || targetEntry.handle.name || "");
        return;
      }
      const file = await readFileFromHandle(targetEntry.handle, { requestPermission: false });
      await loadFile(file, targetEntry.handle, {
        datasetId: targetEntry.id,
        datasetLabel: targetEntry.fileName || file.name,
        source: "local"
      });
      return;
    }

    if (!handle) return;
    if (!(await hasReadPermission(handle))) {
      store.setRememberedFileReady(handle, handle.name || "");
      return;
    }

    const file = await readFileFromHandle(handle, { requestPermission: false });
    await loadFile(file, handle, {
      datasetId: createDatasetId("local"),
      datasetLabel: file.name,
      source: "local"
    });
  } catch (error) {
    store.setError(error);
  } finally {
    store.setRestoring(false);
  }
}

function selectDatasetEntryToRestore(storedDatasets) {
  const entriesWithHandle = storedDatasets.filter((entry) => entry.handle);
  if (entriesWithHandle.length === 0) return null;

  const requestedDatasetId = getUrlDatasetParam();
  const requestedEntry = requestedDatasetId
    ? entriesWithHandle.find((entry) => entry.id === requestedDatasetId)
    : null;
  if (requestedEntry) return requestedEntry;

  return [...entriesWithHandle].sort((left, right) => (
    new Date(right.storedAt || 0) - new Date(left.storedAt || 0)
  ))[0];
}

function isPickerAbort(error) {
  return error?.name === "AbortError";
}

function createDatasetId(source) {
  return `${source || "dataset"}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

wireUi(actions);
store.subscribe(renderAppState);
renderAppState(store.getState());
loadInternalMapping();
loadExplorerConfiguration();
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

async function loadExplorerConfiguration() {
  try {
    store.setExplorerPoints(await loadExplorerPoints());
  } catch (error) {
    store.setExplorerPointsError(error);
  }
}
