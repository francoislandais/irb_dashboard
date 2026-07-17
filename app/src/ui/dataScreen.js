import { setLatestState } from "./appState.js";
import { renderCet1 } from "./cet1View.js?v=20260710-bp-format";
import { renderCostOfRisk, showCostOfRiskPeerDisplayHelp, showCostOfRiskPeerSelection, wireCostOfRiskUi } from "./costOfRiskView.js?v=20260717-standalone-export";
import { renderExplorer, saveExplorerScrollPosition, scheduleExplorerStickyParentsUpdate, showExplorerPeerSelection, wireExplorerUi } from "./explorerView.js?v=20260717-standalone-export";

const ADD_DATASET_OPTION = "__add_dataset__";
const AUTHORIZE_REMEMBERED_DATASET_OPTION = "__authorize_remembered_dataset__";
const elements = {
  appShell: document.querySelector(".app-shell"),
  chooseFileButton: document.querySelector("#choose-file-button"),
  columnCount: document.querySelector("#column-count"),
  datasetSelect: document.querySelector("#dataset-select"),
  extractionTimestamp: document.querySelector("#extraction-timestamp"),
  exportStandaloneButton: document.querySelector("#export-standalone-button"),
  fileName: document.querySelector("#file-name"),
  fileStatus: document.querySelector("#file-status"),
  forgetFileButton: document.querySelector("#forget-file-button"),
  jstSelect: document.querySelector("#jst-select"),
  moduleButtons: [...document.querySelectorAll("[data-module-target]")],
  moduleViews: [...document.querySelectorAll(".module-view")],
  peerDisplayButtons: [...document.querySelectorAll("[data-peer-display-mode]")],
  peersButton: document.querySelector("#peers-button"),
  reloadFileButton: document.querySelector("#reload-file-button"),
  rowCount: document.querySelector("#row-count"),
  sidebarToggle: document.querySelector("#sidebar-toggle"),
  supportNotice: document.querySelector("#support-notice"),
  unitSelect: document.querySelector("#unit-select")
};

export function wireUi(actions) {
  elements.sidebarToggle?.addEventListener("click", toggleSidebar);
  elements.chooseFileButton?.addEventListener("click", actions.chooseFile);
  elements.reloadFileButton?.addEventListener("click", actions.reloadFile);
  elements.forgetFileButton?.addEventListener("click", actions.forgetFile);
  elements.exportStandaloneButton?.addEventListener("click", actions.exportStandalone);
  elements.peersButton?.addEventListener("click", () => {
    const activeModule = actions.getState().activeModule;
    if (activeModule === "cost-of-risk") {
      showCostOfRiskPeerSelection(actions);
    } else if (activeModule === "explorer") {
      showExplorerPeerSelection(actions);
    }
  });
  elements.peerDisplayButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const peerDisplayMode = button.dataset.peerDisplayMode;
      showCostOfRiskPeerDisplayHelp(peerDisplayMode);
      actions.updatePeerDisplayMode(peerDisplayMode);
    });
  });
  elements.datasetSelect?.addEventListener("change", async (event) => {
    if (event.target.value === ADD_DATASET_OPTION) {
      await actions.chooseFile();
      renderDatasetSelect(
        actions.getState().datasets,
        actions.getState().activeDatasetId,
        actions.getState().rememberedFileReady,
        actions.getState().fileName
      );
      return;
    }
    if (event.target.value === AUTHORIZE_REMEMBERED_DATASET_OPTION) {
      await actions.reloadFile();
      renderDatasetSelect(
        actions.getState().datasets,
        actions.getState().activeDatasetId,
        actions.getState().rememberedFileReady,
        actions.getState().fileName
      );
      return;
    }
    await actions.setActiveDataset(event.target.value);
  });
  elements.jstSelect.addEventListener("change", (event) => {
    actions.updateSelectedJst(event.target.value);
  });
  elements.unitSelect.addEventListener("change", (event) => {
    saveExplorerScrollPosition();
    actions.updateSelectedUnit(event.target.value);
  });
  elements.moduleButtons.forEach((button) => {
    button.addEventListener("click", () => actions.setActiveModule(button.dataset.moduleTarget));
  });
  wireCostOfRiskUi(actions, renderAppState);
  wireExplorerUi(actions, renderAppState);
}

function toggleSidebar() {
  if (!elements.appShell || !elements.sidebarToggle) return;

  const isCollapsed = elements.appShell.classList.toggle("is-sidebar-collapsed");
  elements.sidebarToggle.setAttribute("aria-expanded", String(!isCollapsed));
  elements.sidebarToggle.setAttribute(
    "aria-label",
    isCollapsed ? "Afficher la navigation" : "Masquer la navigation"
  );
  window.setTimeout(scheduleExplorerStickyParentsUpdate, 180);
}

export function renderAppState(state) {
  setLatestState(state);
  const hasData = state.rows.length > 0 || state.columns.length > 0;
  const activeDataset = state.datasets.find((dataset) => dataset.id === state.activeDatasetId) ?? null;

  if (elements.rowCount) elements.rowCount.textContent = state.rows.length.toLocaleString("fr-FR");
  if (elements.columnCount) elements.columnCount.textContent = state.columns.length.toLocaleString("fr-FR");
  if (elements.fileName) elements.fileName.textContent = activeDataset?.label || state.fileName || "-";
  renderExtractionTimestamp(state.extractionTimestamp);
  if (elements.reloadFileButton) elements.reloadFileButton.disabled = !state.fileHandle;
  if (elements.forgetFileButton) {
    elements.forgetFileButton.disabled = !hasData || activeDataset?.source === "embedded";
  }
  if (elements.exportStandaloneButton) elements.exportStandaloneButton.disabled = !hasData;
  if (elements.peersButton) elements.peersButton.disabled = state.jstOptions.length === 0;
  renderPeerDisplayControl(state.peerDisplayMode, state.jstOptions.length > 0);
  renderDatasetSelect(state.datasets, state.activeDatasetId, state.rememberedFileReady, state.fileName);
  renderJstSelect(state.jstOptions, state.selectedJst);
  renderActiveModule(state.activeModule);

  if (elements.fileStatus) {
    if (state.isRestoring) {
      elements.fileStatus.textContent = "Recherche du dernier fichier utilisé...";
    } else if (state.rememberedFileReady) {
      elements.fileStatus.textContent = "Dernier fichier mémorisé. Cliquez sur Recharger pour autoriser sa lecture.";
    } else if (state.error) {
      elements.fileStatus.textContent = state.error;
    } else if (activeDataset?.source === "embedded") {
      elements.fileStatus.textContent = "Dataset embarqué actif.";
    } else if (state.fileName) {
      elements.fileStatus.textContent = `Dataset chargé ${formatLoadedAt(state.loadedAt)}.`;
    } else {
      elements.fileStatus.textContent = "Aucun dataset.";
    }
  }

  if (elements.supportNotice) {
    elements.supportNotice.hidden = !state.capabilityNotice;
    elements.supportNotice.textContent = state.capabilityNotice;
  }
  if (state.activeModule === "explorer") renderExplorer(state);
  if (state.activeModule === "cet-1") renderCet1(state);
  if (state.activeModule === "cost-of-risk") renderCostOfRisk(state);
}

function renderExtractionTimestamp(extractionTimestamp) {
  if (!elements.extractionTimestamp) return;
  const formatted = formatExtractionTimestamp(extractionTimestamp);
  elements.extractionTimestamp.textContent = formatted
    ? `Extraction: ${formatted}`
    : "Extraction date not available";
  elements.extractionTimestamp.title = formatted
    ? `Extraction timestamp: ${extractionTimestamp}`
    : "Extraction date not available";
}

function formatExtractionTimestamp(extractionTimestamp) {
  const value = String(extractionTimestamp ?? "").trim();
  if (!value) return "";

  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    return new Intl.DateTimeFormat("fr-FR", {
      dateStyle: "short"
    }).format(date);
  }

  return value;
}

function renderDatasetSelect(datasets, activeDatasetId, rememberedFileReady = false, rememberedFileName = "") {
  if (!elements.datasetSelect) return;
  elements.datasetSelect.replaceChildren();

  if (datasets.length === 0) {
    elements.datasetSelect.append(new Option("No dataset", "", true, true));
    if (rememberedFileReady) {
      elements.datasetSelect.append(new Option(
        `Authorize remembered dataset${rememberedFileName ? ` - ${rememberedFileName}` : ""}`,
        AUTHORIZE_REMEMBERED_DATASET_OPTION
      ));
    }
    elements.datasetSelect.append(new Option("Add a dataset", ADD_DATASET_OPTION));
    elements.datasetSelect.disabled = false;
    return;
  }

  datasets.forEach((dataset) => {
    const suffix = dataset.source === "embedded" ? " - embarqué" : "";
    elements.datasetSelect.append(new Option(
      `${dataset.label || dataset.fileName || "Dataset"}${suffix}`,
      dataset.id,
      false,
      dataset.id === activeDatasetId
    ));
  });
  if (rememberedFileReady) {
    elements.datasetSelect.append(new Option(
      `Authorize remembered dataset${rememberedFileName ? ` - ${rememberedFileName}` : ""}`,
      AUTHORIZE_REMEMBERED_DATASET_OPTION
    ));
  }
  elements.datasetSelect.append(new Option("Add a dataset", ADD_DATASET_OPTION));
  elements.datasetSelect.disabled = false;
}

function renderJstSelect(jstOptions, selectedJst) {
  elements.jstSelect.replaceChildren();

  if (jstOptions.length === 0) {
    elements.jstSelect.append(new Option("Chargez un CSV", ""));
    elements.jstSelect.disabled = true;
    return;
  }

  jstOptions.forEach((jstCode) => {
    elements.jstSelect.append(new Option(jstCode, jstCode, false, jstCode === selectedJst));
  });
  elements.jstSelect.disabled = false;
}

function renderPeerDisplayControl(peerDisplayMode, hasPeers) {
  const activeMode = peerDisplayMode === "anonymised" ? "anonymised" : "explicit";
  elements.peerDisplayButtons.forEach((button) => {
    const isActive = button.dataset.peerDisplayMode === activeMode;
    button.classList.toggle("is-active", isActive);
    button.disabled = !hasPeers;
    button.setAttribute("aria-checked", String(isActive));
  });
}

function renderActiveModule(activeModule) {
  elements.moduleButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.moduleTarget === activeModule);
  });

  elements.moduleViews.forEach((view) => {
    view.classList.toggle("is-visible", view.id === `${activeModule}-view`);
  });
}

function formatLoadedAt(date) {
  if (!date) return "";
  return `à ${new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(date)}`;
}
