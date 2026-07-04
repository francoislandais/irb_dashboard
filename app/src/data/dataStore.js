const initialState = {
  activeModule: "module-2",
  capabilityNotice: "",
  columns: [],
  datasetLabel: "",
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

    setData({ file, fileHandle, columns, dataIndexes, jstOptions, rows, loadedAt }) {
      const selectedJst = jstOptions.includes(state.selectedJst)
        ? state.selectedJst
        : jstOptions[0] ?? "";

      state = {
        ...state,
        columns,
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
        datasetLabel: state.datasetLabel,
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
