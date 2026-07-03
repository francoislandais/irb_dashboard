import { parseCsv } from "./data/csvParser.js";
import { buildDataIndexes } from "./data/dataIndex.js";
import { loadDimensionMapping } from "./data/dimensionMapping.js";
import { loadModule2Points } from "./data/module2Config.js";
import { getUniqueValues } from "./data/timeSeries.js?v=20260703-data-index-3";
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
import { renderAppState, wireUi } from "./ui/dataScreen.js?v=20260703-data-index-3";

const store = createDataStore();

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
  },

  updateSelectedUnit(unit) {
    store.setSelectedUnit(unit);
  },

  setActiveModule(activeModule) {
    store.setActiveModule(activeModule);
  }
};

async function loadFile(file, handle) {
  const text = await file.text();
  const parsed = parseCsv(text);
  const dataIndexes = buildDataIndexes(parsed.columns, parsed.rows);
  store.setData({
    file,
    fileHandle: handle,
    columns: parsed.columns,
    dataIndexes,
    jstOptions: getUniqueValues(parsed.columns, parsed.rows, "jst_code"),
    rows: parsed.rows,
    loadedAt: new Date()
  });
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
