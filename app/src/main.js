import { parseCsv } from "./data/csvParser.js";
import { removeEmptyReferenceColumns, validateCsvDataset } from "./data/csvSchema.js";
import { buildDataIndexes, getIndexedJstCodes } from "./data/dataIndex.js?v=20260804-lazy-index";
import { loadDimensionMapping } from "./data/dimensionMapping.js?v=20260704-cost-risk";
import { loadExplorerPoints } from "./data/explorerConfig.js";
import { loadImpossibleXYCombinations } from "./data/impossibleXYCombinations.js";
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
import { createDataStore } from "./data/dataStore.js?v=20260806-impossible-combinations";
import { renderAppState, wireUi } from "./ui/dataScreen.js?v=20260820-global-unit-filter";
import {
  buildStandaloneHtml,
  getStandaloneModuleDependencies,
  resolveStandaloneModulePath
} from "./standaloneExport.mjs";
import { createUrlState, readUrlStateParams, replaceUrlState } from "./ui/urlState.js";

const store = createDataStore();
const JST_URL_PARAM = "jst";
const MODULE_URL_PARAM = "module";
const DATASET_URL_PARAM = "dataset";
const UNIT_URL_PARAM = "unit";
const PEERS_EXCLUDED_URL_PARAM = "peers_excluded";
const PEER_DISPLAY_MODE_URL_PARAM = "peer_mode";
const MODULE_URL_VALUES = new Set(["explorer", "irb", "credit-risk"]);
const MODULE_URL_ALIASES = new Map([["cet-1", "irb"]]);
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
      updateUrlModuleParam(store.getState().activeModule);
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
    updateUrlModuleParam(store.getState().activeModule);
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
    updateUrlUnitParam(store.getState().selectedUnit);
  },

  updatePeerJstCodes(peerJstCodes) {
    store.setPeerJstCodes(peerJstCodes);
    updateUrlPeerExclusionsParam(store.getState());
  },

  updatePeerDisplayMode(peerDisplayMode) {
    store.setPeerDisplayMode(peerDisplayMode);
    updateUrlPeerDisplayModeParam(store.getState().peerDisplayMode);
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
store.setPeerDisplayMode(getUrlPeerDisplayModeParam());
updateUrlPeerDisplayModeParam(store.getState().peerDisplayMode);
store.setSelectedUnit(getUrlUnitParam());
updateUrlUnitParam(store.getState().selectedUnit);

async function loadFile(file, handle, options = {}) {
  const text = await file.text();
  currentCsvText = text;
  currentCsvFileName = file.name;
  await loadCsvText(text, file.name, handle, new Date(), options);
}

async function loadCsvText(text, fileName, handle, loadedAt, options = {}) {
  const rawParsed = parseCsv(text);
  const parsed = removeEmptyReferenceColumns(rawParsed.columns, rawParsed.rows);
  validateCsvDataset(parsed.columns, parsed.rows);
  const dataIndexes = buildDataIndexes(parsed.columns, parsed.rows);
  const jstOptions = getIndexedJstCodes({ dataIndexes });
  const extractionTimestamp = getExtractionTimestamp(parsed.columns, parsed.rows);
  const datasetId = options.datasetId || createDatasetId(options.source || "local");
  csvTextByDatasetId.set(datasetId, text);
  store.setData({
    file: { name: fileName },
    fileHandle: handle,
    columns: parsed.columns,
    dataIndexes,
    datasetId,
    datasetLabel: options.datasetLabel || fileName,
    extractionTimestamp,
    source: options.source || "local",
    jstOptions,
    rows: parsed.rows,
    loadedAt
  });
  updateUrlDatasetParam(store.getState().activeDatasetId);
  updateUrlModuleParam(store.getState().activeModule);

  const urlJst = getUrlJstParam();
  const matchedJst = findMatchingJstCode(jstOptions, urlJst);
  if (matchedJst) store.setSelectedJst(matchedJst);
  applyUrlPeerExclusions(jstOptions);
}

function getExtractionTimestamp(columns, rows) {
  const index = columns.findIndex((column) => (
    ["extraction_timestamp", "extraction timestamp"].includes(String(column ?? "").trim().toLowerCase())
  ));
  if (index === -1) return "";
  return String(rows[0]?.[index] ?? "").trim();
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
  return readUrlStateParams().get(JST_URL_PARAM) ?? "";
}

function updateUrlJstParam(jstCode) {
  const url = createUrlState();
  if (jstCode) {
    url.searchParams.set(JST_URL_PARAM, jstCode);
  } else {
    url.searchParams.delete(JST_URL_PARAM);
  }
  replaceAppUrlState(url);
}

function getUrlModuleParam() {
  const module = readUrlStateParams().get(MODULE_URL_PARAM) ?? "";
  if (MODULE_URL_ALIASES.has(module)) return MODULE_URL_ALIASES.get(module);
  return MODULE_URL_VALUES.has(module) ? module : "";
}

function updateUrlModuleParam(activeModule) {
  const url = createUrlState();
  if (MODULE_URL_VALUES.has(activeModule)) {
    url.searchParams.set(MODULE_URL_PARAM, activeModule);
  } else {
    url.searchParams.delete(MODULE_URL_PARAM);
  }
  replaceAppUrlState(url);
}

function getUrlDatasetParam() {
  return readUrlStateParams().get(DATASET_URL_PARAM) ?? "";
}

function updateUrlDatasetParam(datasetId) {
  const url = createUrlState();
  if (datasetId) {
    url.searchParams.set(DATASET_URL_PARAM, datasetId);
  } else {
    url.searchParams.delete(DATASET_URL_PARAM);
  }
  replaceAppUrlState(url);
}

function getUrlPeerExclusionsParam() {
  return readUrlStateParams()
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
  const url = createUrlState();
  const jstOptions = state.jstOptions ?? [];
  const selectedPeers = new Set(state.peerJstCodes?.length ? state.peerJstCodes : jstOptions);
  const excludedPeers = jstOptions.filter((jstCode) => !selectedPeers.has(jstCode));

  if (excludedPeers.length > 0) {
    url.searchParams.set(PEERS_EXCLUDED_URL_PARAM, excludedPeers.join(","));
  } else {
    url.searchParams.delete(PEERS_EXCLUDED_URL_PARAM);
  }
  replaceAppUrlState(url);
}

function getUrlPeerDisplayModeParam() {
  return readUrlStateParams().get(PEER_DISPLAY_MODE_URL_PARAM) === "anonymised"
    ? "anonymised"
    : "explicit";
}

function updateUrlPeerDisplayModeParam(peerDisplayMode) {
  const url = createUrlState();
  url.searchParams.set(
    PEER_DISPLAY_MODE_URL_PARAM,
    peerDisplayMode === "anonymised" ? "anonymised" : "explicit"
  );
  replaceAppUrlState(url);
}

function getUrlUnitParam() {
  const unit = readUrlStateParams().get(UNIT_URL_PARAM) ?? "";
  return ["millions", "billions", "thousands", "euros"].includes(unit) ? unit : "millions";
}

function updateUrlUnitParam(unit) {
  const url = createUrlState();
  url.searchParams.set(UNIT_URL_PARAM, ["billions", "thousands", "euros"].includes(unit) ? unit : "millions");
  replaceAppUrlState(url);
}

function replaceAppUrlState(url) {
  replaceUrlState(url);
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

  const [indexHtml, stylesCss, creditRiskStylesCss, mappingCsv, impossibleCombinationsCsv, highchartsJs, highchartsTreemapJs, moduleSources] = await Promise.all([
    fetchAppText("index.html"),
    fetchAppText("src/styles.css"),
    fetchAppText("src/creditRiskStyles.css"),
    fetchAppText("assets/ITS_all_dimension_mapping.csv"),
    fetchAppText("assets/ITS_impossible_x_y.csv"),
    fetchAppText("vendor/highcharts.js"),
    fetchAppText("vendor/highcharts-treemap.js"),
    collectStandaloneModuleSources("src/main.js")
  ]);

  return {
    assets: {
      "assets/ITS_all_dimension_mapping.csv": mappingCsv,
      "assets/ITS_impossible_x_y.csv": impossibleCombinationsCsv
    },
    highchartsJs,
    highchartsTreemapJs,
    indexHtml,
    moduleSources,
    stylesCss: `${stylesCss}\n${creditRiskStylesCss}`
  };
}

async function fetchAppText(path) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Impossible de préparer l'export portable : ${path} est introuvable.`);
  }
  return response.text();
}

async function collectStandaloneModuleSources(entryPath) {
  const sources = new Map();
  await collectStandaloneModuleSource(entryPath, sources);
  return Object.fromEntries(sources);
}

async function collectStandaloneModuleSource(path, sources) {
  if (sources.has(path)) return;

  const source = await fetchAppText(path);
  sources.set(path, source);

  const dependencies = getStandaloneModuleDependencies(path, source);
  await Promise.all(dependencies.map((dependencyPath) => collectStandaloneModuleSource(dependencyPath, sources)));
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
loadImpossibleCombinations();
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

async function loadImpossibleCombinations() {
  try {
    store.setImpossibleXYCombinations(await loadImpossibleXYCombinations());
  } catch (error) {
    store.setImpossibleXYCombinationsError(error);
  }
}

async function loadExplorerConfiguration() {
  try {
    store.setExplorerPoints(await loadExplorerPoints());
  } catch (error) {
    store.setExplorerPointsError(error);
  }
}
