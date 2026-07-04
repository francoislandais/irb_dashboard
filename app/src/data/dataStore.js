const initialState = {
  activeModule: "module-2",
  capabilityNotice: "",
  columns: [],
  activeDatasetId: "",
  datasetLabel: "",
  datasets: [],
  dataIndexes: null,
  dimensionMapping: null,
  dimensionMappingError: "",
  error: "",
  fileHandle: null,
  fileName: "",
  isRestoring: false,
  jstOptions: [],
  loadedAt: null,
  module2Points: [],
  module2PointsError: "",
  rememberedFileReady: false,
  rows: [],
  selectedJst: "",
  selectedUnit: "millions"
};

function createDatasetId(source) {
  return `${source || "dataset"}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createDataStore() {
  let state = { ...initialState };
  const listeners = new Set();

  function emit() {
    listeners.forEach((listener) => listener(state));
  }

  return {
    getState() {
      return state;
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    setData({ file, fileHandle, columns, dataIndexes, datasetId, datasetLabel, source, jstOptions, rows, loadedAt }) {
      const nextDatasetId = datasetId || createDatasetId(source || "local");
      const nextDataset = {
        id: nextDatasetId,
        columns,
        dataIndexes,
        fileHandle,
        fileName: file.name,
        jstOptions,
        label: datasetLabel || file.name || "Dataset",
        loadedAt,
        rows,
        source: source || "local"
      };
      const datasets = [
        ...state.datasets.filter((dataset) => dataset.id !== nextDatasetId),
        nextDataset
      ];
      const selectedJst = jstOptions.includes(state.selectedJst)
        ? state.selectedJst
        : jstOptions[0] ?? "";

      state = {
        ...state,
        activeDatasetId: nextDatasetId,
        columns,
        datasets,
        dataIndexes,
        error: "",
        fileHandle,
        fileName: file.name,
        jstOptions,
        loadedAt,
        rememberedFileReady: false,
        rows,
        selectedJst
      };
      emit();
    },

    setActiveDataset(activeDatasetId) {
      const dataset = state.datasets.find((candidate) => candidate.id === activeDatasetId);
      if (!dataset) return;

      const selectedJst = dataset.jstOptions.includes(state.selectedJst)
        ? state.selectedJst
        : dataset.jstOptions[0] ?? "";

      state = {
        ...state,
        activeDatasetId,
        columns: dataset.columns,
        dataIndexes: dataset.dataIndexes,
        error: "",
        fileHandle: dataset.fileHandle,
        fileName: dataset.fileName,
        jstOptions: dataset.jstOptions,
        loadedAt: dataset.loadedAt,
        rememberedFileReady: false,
        rows: dataset.rows,
        selectedJst
      };
      emit();
    },

    forgetDataset(datasetId = state.activeDatasetId) {
      const datasets = state.datasets.filter((dataset) => dataset.id !== datasetId);
      const nextDataset = datasets[0] ?? null;

      state = nextDataset
        ? {
          ...state,
          activeDatasetId: nextDataset.id,
          columns: nextDataset.columns,
          datasets,
          dataIndexes: nextDataset.dataIndexes,
          error: "",
          fileHandle: nextDataset.fileHandle,
          fileName: nextDataset.fileName,
          jstOptions: nextDataset.jstOptions,
          loadedAt: nextDataset.loadedAt,
          rememberedFileReady: false,
          rows: nextDataset.rows,
          selectedJst: nextDataset.jstOptions[0] ?? ""
        }
        : {
          ...state,
          activeDatasetId: "",
          columns: [],
          datasets: [],
          dataIndexes: null,
          error: "",
          fileHandle: null,
          fileName: "",
          jstOptions: [],
          loadedAt: null,
          rememberedFileReady: false,
          rows: [],
          selectedJst: ""
        };
      emit();
    },

    setDimensionMapping(dimensionMapping) {
      state = {
        ...state,
        dimensionMapping,
        dimensionMappingError: ""
      };
      emit();
    },

    setDimensionMappingError(error) {
      state = {
        ...state,
        dimensionMappingError: error?.message ?? "Le mapping interne n'a pas pu être chargé."
      };
      emit();
    },

    setModule2Points(module2Points) {
      state = {
        ...state,
        module2Points,
        module2PointsError: ""
      };
      emit();
    },

    setModule2PointsError(error) {
      state = {
        ...state,
        module2PointsError: error?.message ?? "La configuration interne du module 2 n'a pas pu être chargée."
      };
      emit();
    },

    setRememberedFileReady(fileHandle) {
      state = {
        ...state,
        error: "",
        fileHandle,
        rememberedFileReady: true
      };
      emit();
    },

    setCapabilityNotice(capabilityNotice) {
      state = { ...state, capabilityNotice };
      emit();
    },

    setDatasetLabel(datasetLabel) {
      state = { ...state, datasetLabel };
      emit();
    },

    setSelectedJst(selectedJst) {
      state = { ...state, selectedJst };
      emit();
    },

    setSelectedUnit(selectedUnit) {
      state = { ...state, selectedUnit };
      emit();
    },

    setActiveModule(activeModule) {
      state = { ...state, activeModule };
      emit();
    },

    setError(error) {
      state = {
        ...state,
        error: error?.message ?? "Une erreur est survenue."
      };
      emit();
    },

    setRestoring(isRestoring) {
      state = { ...state, isRestoring };
      emit();
    },

    reset() {
      state = {
        ...initialState,
        capabilityNotice: state.capabilityNotice,
        activeDatasetId: "",
        datasetLabel: state.datasetLabel,
        datasets: [],
        dimensionMapping: state.dimensionMapping,
        dimensionMappingError: state.dimensionMappingError,
        module2Points: state.module2Points,
        module2PointsError: state.module2PointsError,
        rememberedFileReady: false,
        selectedJst: "",
        selectedUnit: state.selectedUnit
      };
      emit();
    }
  };
}
