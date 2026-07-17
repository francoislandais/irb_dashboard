const initialState = {
  activeModule: "explorer",
  capabilityNotice: "",
  columns: [],
  activeDatasetId: "",
  datasetLabel: "",
  datasets: [],
  dataIndexes: null,
  dimensionMapping: null,
  dimensionMappingError: "",
  error: "",
  extractionTimestamp: "",
  fileHandle: null,
  fileName: "",
  isRestoring: false,
  jstOptions: [],
  loadedAt: null,
  explorerPoints: [],
  explorerPointsError: "",
  peerDisplayMode: "explicit",
  peerJstCodes: [],
  rememberedFileReady: false,
  rows: [],
  selectedJst: "",
  selectedUnit: "millions"
};

function createDatasetId(source) {
  return `${source || "dataset"}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizePeerJstCodes(peerJstCodes, jstOptions) {
  const allowed = new Set(jstOptions ?? []);
  return (peerJstCodes ?? []).filter((jstCode) => allowed.has(jstCode));
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

    setData({ file, fileHandle, columns, dataIndexes, datasetId, datasetLabel, extractionTimestamp, source, jstOptions, rows, loadedAt }) {
      const nextDatasetId = datasetId || createDatasetId(source || "local");
      const nextDataset = {
        id: nextDatasetId,
        columns,
        dataIndexes,
        extractionTimestamp: extractionTimestamp || "",
        fileHandle,
        fileName: file.name,
        isLoaded: true,
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
      const peerJstCodes = state.activeDatasetId === nextDatasetId
        ? normalizePeerJstCodes(state.peerJstCodes, jstOptions)
        : [...jstOptions];

      state = {
        ...state,
        activeDatasetId: nextDatasetId,
        columns,
        datasets,
        dataIndexes,
        error: "",
        extractionTimestamp: extractionTimestamp || "",
        fileHandle,
        fileName: file.name,
        jstOptions,
        loadedAt,
        peerJstCodes,
        rememberedFileReady: false,
        rows,
        selectedJst
      };
      emit();
    },

    registerDatasetManifest(entries) {
      const existingIds = new Set(state.datasets.map((dataset) => dataset.id));
      const manifestDatasets = (entries ?? [])
        .filter((entry) => entry.handle && entry.id && !existingIds.has(entry.id))
        .map((entry) => ({
          id: entry.id,
          columns: [],
          dataIndexes: null,
          fileHandle: entry.handle,
          fileName: entry.fileName,
          extractionTimestamp: "",
          isLoaded: false,
          jstOptions: [],
          label: entry.fileName || "Dataset",
          loadedAt: null,
          rows: [],
          source: "local"
        }));
      if (manifestDatasets.length === 0) return;

      state = {
        ...state,
        datasets: [...state.datasets, ...manifestDatasets]
      };
      emit();
    },

    setActiveDataset(activeDatasetId) {
      const dataset = state.datasets.find((candidate) => candidate.id === activeDatasetId);
      if (!dataset || dataset.isLoaded === false) return;

      const selectedJst = dataset.jstOptions.includes(state.selectedJst)
        ? state.selectedJst
        : dataset.jstOptions[0] ?? "";
      const peerJstCodes = normalizePeerJstCodes(state.peerJstCodes, dataset.jstOptions);

      state = {
        ...state,
        activeDatasetId,
        columns: dataset.columns,
        dataIndexes: dataset.dataIndexes,
        error: "",
        extractionTimestamp: dataset.extractionTimestamp || "",
        fileHandle: dataset.fileHandle,
        fileName: dataset.fileName,
        jstOptions: dataset.jstOptions,
        loadedAt: dataset.loadedAt,
        peerJstCodes,
        rememberedFileReady: false,
        rows: dataset.rows,
        selectedJst
      };
      emit();
    },

    forgetDataset(datasetId = state.activeDatasetId) {
      const datasets = state.datasets.filter((dataset) => dataset.id !== datasetId);
      const nextDataset = datasets.find((dataset) => dataset.isLoaded !== false) ?? null;

      state = {
        ...state,
        activeDatasetId: nextDataset?.id ?? "",
        columns: nextDataset?.columns ?? [],
        datasets,
        dataIndexes: nextDataset?.dataIndexes ?? null,
        error: "",
        extractionTimestamp: nextDataset?.extractionTimestamp ?? "",
        fileHandle: nextDataset?.fileHandle ?? null,
        fileName: nextDataset?.fileName ?? "",
        jstOptions: nextDataset?.jstOptions ?? [],
        loadedAt: nextDataset?.loadedAt ?? null,
        peerJstCodes: nextDataset ? normalizePeerJstCodes(state.peerJstCodes, nextDataset.jstOptions) : [],
        rememberedFileReady: false,
        rows: nextDataset?.rows ?? [],
        selectedJst: nextDataset?.jstOptions[0] ?? ""
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

    setExplorerPoints(explorerPoints) {
      state = {
        ...state,
        explorerPoints,
        explorerPointsError: ""
      };
      emit();
    },

    setExplorerPointsError(error) {
      state = {
        ...state,
        explorerPointsError: error?.message ?? "La configuration interne du module Explorer n'a pas pu être chargée."
      };
      emit();
    },

    setRememberedFileReady(fileHandle, fileName = "") {
      state = {
        ...state,
        error: "",
        fileHandle,
        fileName: fileName || state.fileName,
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

    setPeerJstCodes(peerJstCodes) {
      state = {
        ...state,
        peerJstCodes: normalizePeerJstCodes(peerJstCodes, state.jstOptions)
      };
      emit();
    },

    setPeerDisplayMode(peerDisplayMode) {
      state = { ...state, peerDisplayMode: peerDisplayMode === "anonymised" ? "anonymised" : "explicit" };
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
        explorerPoints: state.explorerPoints,
        explorerPointsError: state.explorerPointsError,
        peerDisplayMode: state.peerDisplayMode,
        rememberedFileReady: false,
        selectedJst: "",
        selectedUnit: state.selectedUnit
      };
      emit();
    }
  };
}
