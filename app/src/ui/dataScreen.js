import { setLatestState } from "./appState.js";
import { renderCet1 } from "./cet1View.js";
import { renderCostOfRisk, wireCostOfRiskUi } from "./costOfRiskView.js?v=20260709-area-click-fix";
import { renderExplorer, saveExplorerScrollPosition, scheduleExplorerStickyParentsUpdate, wireExplorerUi } from "./explorerView.js?v=20260709-area-click-fix";

const ADD_DATASET_OPTION = "__add_dataset__";
const AUTHORIZE_REMEMBERED_DATASET_OPTION = "__authorize_remembered_dataset__";
let peersDialog = null;

const elements = {
  appShell: document.querySelector(".app-shell"),
  chooseFileButton: document.querySelector("#choose-file-button"),
  columnCount: document.querySelector("#column-count"),
  datasetSelect: document.querySelector("#dataset-select"),
  exportStandaloneButton: document.querySelector("#export-standalone-button"),
  fileName: document.querySelector("#file-name"),
  fileStatus: document.querySelector("#file-status"),
  forgetFileButton: document.querySelector("#forget-file-button"),
  jstSelect: document.querySelector("#jst-select"),
  moduleButtons: [...document.querySelectorAll("[data-module-target]")],
  moduleViews: [...document.querySelectorAll(".module-view")],
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
  elements.peersButton?.addEventListener("click", () => showPeersDialog(actions));
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
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") hidePeersDialog();
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
  if (elements.reloadFileButton) elements.reloadFileButton.disabled = !state.fileHandle;
  if (elements.forgetFileButton) {
    elements.forgetFileButton.disabled = !hasData || activeDataset?.source === "embedded";
  }
  if (elements.exportStandaloneButton) elements.exportStandaloneButton.disabled = !hasData;
  if (elements.peersButton) elements.peersButton.disabled = state.jstOptions.length === 0;
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

function showPeersDialog(actions) {
  hidePeersDialog();

  const state = actions.getState();
  if ((state.jstOptions ?? []).length === 0) return;

  peersDialog = createPeersDialog(state, actions);
  document.body.append(peersDialog);
}

function hidePeersDialog() {
  if (!peersDialog) return;
  peersDialog.remove();
  peersDialog = null;
}

function createPeersDialog(state, actions) {
  const overlay = document.createElement("div");
  overlay.className = "peers-overlay";
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) hidePeersDialog();
  });

  const dialog = document.createElement("section");
  dialog.className = "peers-dialog";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-label", "Peers selection");

  const header = document.createElement("div");
  header.className = "peers-header";
  const title = document.createElement("strong");
  title.textContent = "Peers";
  const subtitle = document.createElement("span");
  subtitle.textContent = "Select JST used in benchmark views.";
  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.setAttribute("aria-label", "Close");
  closeButton.textContent = "×";
  closeButton.addEventListener("click", hidePeersDialog);
  const headerText = document.createElement("div");
  headerText.append(title, subtitle);
  header.append(headerText, closeButton);

  const selectedPeers = new Set(
    (state.peerJstCodes?.length ? state.peerJstCodes : state.jstOptions) ?? []
  );
  const list = document.createElement("div");
  list.className = "peers-list";
  (state.jstOptions ?? []).forEach((jstCode) => {
    const row = document.createElement("label");
    row.className = "peers-row";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = jstCode;
    checkbox.checked = selectedPeers.has(jstCode);
    const label = document.createElement("span");
    label.textContent = jstCode;
    row.append(checkbox, label);
    list.append(row);
  });

  const actionsRow = document.createElement("div");
  actionsRow.className = "peers-actions";
  const cancelButton = document.createElement("button");
  cancelButton.type = "button";
  cancelButton.className = "peers-secondary-button";
  cancelButton.textContent = "Cancel";
  cancelButton.addEventListener("click", hidePeersDialog);
  const applyButton = document.createElement("button");
  applyButton.type = "button";
  applyButton.className = "peers-primary-button";
  applyButton.textContent = "Apply";
  applyButton.addEventListener("click", () => {
    const checkedCodes = [...list.querySelectorAll('input[type="checkbox"]:checked')]
      .map((checkbox) => checkbox.value);
    actions.updatePeerJstCodes(checkedCodes.length > 0 ? checkedCodes : state.jstOptions);
    hidePeersDialog();
  });
  actionsRow.append(cancelButton, applyButton);

  dialog.append(header, list, actionsRow);
  overlay.append(dialog);
  return overlay;
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
