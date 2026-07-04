import { parseCsv } from "./data/csvParser.js";
import { buildDataIndexes } from "./data/dataIndex.js";
import { loadDimensionMapping } from "./data/dimensionMapping.js";
import { loadModule2Points } from "./data/module2Config.js";
import { getUniqueValues } from "./data/timeSeries.js?v=20260703-url-navigation";
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
import { renderAppState, wireUi } from "./ui/dataScreen.js?v=20260703-url-navigation";

const store = createDataStore();
const JST_URL_PARAM = "jst";
const MODULE_URL_PARAM = "module";
const MODULE_URL_VALUES = new Set(["module-2", "cet-1"]);

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
  }
};

const initialModule = getUrlModuleParam();
if (initialModule) store.setActiveModule(initialModule);

async function loadFile(file, handle) {
  const text = await file.text();
  const parsed = parseCsv(text);
  const dataIndexes = buildDataIndexes(parsed.columns, parsed.rows);
  const jstOptions = getUniqueValues(parsed.columns, parsed.rows, "jst_code");
  store.setData({
    file,
    fileHandle: handle,
    columns: parsed.columns,
    dataIndexes,
    jstOptions,
    rows: parsed.rows,
    loadedAt: new Date()
  });

  const urlJst = getUrlJstParam();
  const matchedJst = findMatchingJstCode(jstOptions, urlJst);
  if (matchedJst) store.setSelectedJst(matchedJst);
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
restoreLastFile();

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
