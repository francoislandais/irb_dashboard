import { setLatestState } from "./appState.js";
import { getInstitutionDisplayInfo } from "../data/institutionDictionary.js?v=20260925-institution-dictionary";
import { renderCreditRisk, syncCreditRiskUrlParams, wireCreditRiskUi } from "./creditRiskView.js?v=20260925-institution-id";
import { renderExplorer, renderExplorerHeaderReferenceControl, saveExplorerScrollPosition, scheduleExplorerStickyParentsUpdate, wireExplorerUi } from "./explorerView.js?v=20260925-institution-dictionary";
import { renderIrb, wireIrbUi } from "./irbView.js?v=20260917-kri-unit-fix";
import { showDatasetDialog } from "./datasetDialog.js?v=20260925-institution-id";
import { showPeerSelectionDialog, updatePeerSelectionDialog } from "./peerSelectionDialog.js?v=20260911-peer-dialog";
import { createUrlState, readUrlStateParams, replaceUrlState } from "./urlState.js";

const ADD_DATASET_OPTION = "__add_dataset__";
const AUTHORIZE_REMEMBERED_DATASET_OPTION = "__authorize_remembered_dataset__";
const SIDEBAR_URL_PARAM = "sidebar";
const SIDEBAR_COLLAPSED_VALUE = "collapsed";
const SIDEBAR_LOCKED_VALUE = "locked";
const elements = {
  appShell: document.querySelector(".app-shell"),
  chooseFileButton: document.querySelector("#choose-file-button"),
  columnCount: document.querySelector("#column-count"),
  datasetInfoButton: document.querySelector("#dataset-info-button"),
  datasetSelect: document.querySelector("#dataset-select"),
  exportStandaloneButton: document.querySelector("#export-standalone-button"),
  fileName: document.querySelector("#file-name"),
  fileStatus: document.querySelector("#file-status"),
  forgetFileButton: document.querySelector("#forget-file-button"),
  institutionSelect: document.querySelector("#institution-select"),
  institutionPickerToggle: document.querySelector("#institution-picker-toggle"),
  institutionPickerMenu: document.querySelector("#institution-picker-menu"),
  institutionPickerName: document.querySelector("#institution-picker-name"),
  institutionPickerDetails: document.querySelector("#institution-picker-details"),
  institutionPickerLevel: document.querySelector("#institution-picker-level"),
  institutionDictionaryButton: document.querySelector("#institution-dictionary-button"),
  institutionDictionaryClear: document.querySelector("#institution-dictionary-clear"),
  institutionDictionaryInput: document.querySelector("#institution-dictionary-input"),
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
  applyUrlSidebarVisibility();
  elements.sidebarToggle?.addEventListener("click", toggleSidebar);
  elements.chooseFileButton?.addEventListener("click", actions.chooseFile);
  elements.reloadFileButton?.addEventListener("click", actions.reloadFile);
  elements.forgetFileButton?.addEventListener("click", actions.forgetFile);
  elements.exportStandaloneButton?.addEventListener("click", actions.exportStandalone);
  elements.datasetInfoButton?.addEventListener("click", () => {
    showDatasetDialog(actions.getState());
  });
  elements.peersButton?.addEventListener("click", () => {
    showPeerSelectionDialog(actions.getState(), actions);
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
  elements.institutionSelect.addEventListener("change", (event) => {
    actions.updateSelectedInstitution(event.target.value);
  });
  elements.institutionPickerToggle.addEventListener("click", () => {
    setInstitutionPickerOpen(elements.institutionPickerMenu.hidden);
  });
  elements.institutionPickerMenu.addEventListener("click", (event) => {
    const option = event.target.closest("[data-institution-option]");
    if (!option) return;
    setInstitutionPickerOpen(false);
    elements.institutionSelect.value = option.dataset.institutionOption;
    elements.institutionSelect.dispatchEvent(new Event("change", { bubbles: true }));
  });
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".institution-picker")) setInstitutionPickerOpen(false);
  });
  elements.institutionPickerToggle.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setInstitutionPickerOpen(false);
    if (event.key === "ArrowDown" && elements.institutionPickerMenu.hidden) {
      event.preventDefault();
      setInstitutionPickerOpen(true);
      elements.institutionPickerMenu.querySelector("[data-institution-option]")?.focus();
    }
  });
  elements.institutionPickerMenu.addEventListener("keydown", (event) => {
    const options = [...elements.institutionPickerMenu.querySelectorAll("[data-institution-option]")];
    const currentIndex = options.indexOf(document.activeElement);
    if (event.key === "Escape") {
      event.preventDefault();
      setInstitutionPickerOpen(false);
      elements.institutionPickerToggle.focus();
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      const nextIndex = (currentIndex + step + options.length) % options.length;
      options[nextIndex]?.focus();
    }
  });
  elements.institutionPickerMenu.addEventListener("focusout", (event) => {
    if (!elements.institutionPickerMenu.contains(event.relatedTarget)) setInstitutionPickerOpen(false);
  });
  elements.institutionDictionaryButton.addEventListener("click", () => elements.institutionDictionaryInput.click());
  elements.institutionDictionaryInput.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      actions.loadInstitutionDictionary(await file.text(), file.name);
    } catch (error) {
      actions.setInstitutionDictionaryError(error);
    } finally {
      event.target.value = "";
    }
  });
  elements.institutionDictionaryClear.addEventListener("click", actions.clearInstitutionDictionary);
  elements.unitSelect.addEventListener("change", (event) => {
    saveExplorerScrollPosition();
    actions.updateSelectedUnit(event.target.value);
  });
  elements.moduleButtons.forEach((button) => {
    button.addEventListener("click", () => actions.setActiveModule(button.dataset.moduleTarget));
  });
  wireCreditRiskUi(actions, renderAppState);
  wireExplorerUi(actions, renderAppState);
  wireIrbUi(actions, renderAppState);
}

function toggleSidebar() {
  if (!elements.appShell || !elements.sidebarToggle) return;
  if (readUrlStateParams().get(SIDEBAR_URL_PARAM) === SIDEBAR_LOCKED_VALUE) return;

  const isCollapsed = elements.appShell.classList.toggle("is-sidebar-collapsed");
  updateSidebarToggleAccessibility(isCollapsed);
  const url = createUrlState();
  if (isCollapsed) url.searchParams.set(SIDEBAR_URL_PARAM, SIDEBAR_COLLAPSED_VALUE);
  else url.searchParams.set(SIDEBAR_URL_PARAM, "expanded");
  replaceUrlState(url);
  window.setTimeout(scheduleExplorerStickyParentsUpdate, 180);
}

// "locked" keeps the sidebar collapsed and hides its toggle button
// entirely (no way to bring it back from the UI), driven by the
// "sidebar" URL param so it can be enabled per-link (e.g. an exported app).
function applyUrlSidebarVisibility() {
  if (!elements.appShell || !elements.sidebarToggle) return;
  const sidebarParam = readUrlStateParams().get(SIDEBAR_URL_PARAM);
  const isLocked = sidebarParam === SIDEBAR_LOCKED_VALUE;
  const isCollapsed = sidebarParam === null || isLocked || sidebarParam === SIDEBAR_COLLAPSED_VALUE;
  elements.appShell.classList.toggle("is-sidebar-collapsed", isCollapsed);
  elements.appShell.classList.toggle("is-sidebar-locked", isLocked);
  updateSidebarToggleAccessibility(isCollapsed);
}

function updateSidebarToggleAccessibility(isCollapsed) {
  elements.sidebarToggle.setAttribute("aria-expanded", String(!isCollapsed));
  elements.sidebarToggle.setAttribute(
    "aria-label",
    isCollapsed ? "Afficher la navigation" : "Masquer la navigation"
  );
}

export function renderAppState(state) {
  setLatestState(state);
  updatePeerSelectionDialog(state);
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
  if (elements.peersButton) elements.peersButton.disabled = (state.institutionOptions ?? state.jstOptions).length === 0;
  renderDatasetSelect(state.datasets, state.activeDatasetId, state.rememberedFileReady, state.fileName);
  renderInstitutionSelect(state);
  renderExplorerHeaderReferenceControl(state);
  renderActiveModule(state.activeModule, state.availableModules);

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
  if (state.activeModule === "irb") renderIrb(state);
  if (state.activeModule === "credit-risk") {
    renderCreditRisk(state);
    syncCreditRiskUrlParams();
  }
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

function renderInstitutionSelect(state) {
  const institutionOptions = state.institutionOptions ?? state.jstOptions ?? [];
  const selectedInstitutionId = state.selectedInstitutionId ?? state.selectedJst;
  const dictionary = state.institutionDictionary ?? {};
  elements.institutionSelect.replaceChildren();
  elements.institutionPickerMenu.replaceChildren();

  if (institutionOptions.length === 0) {
    elements.institutionSelect.append(new Option("Chargez un CSV", ""));
    elements.institutionPickerToggle.disabled = true;
    elements.institutionPickerName.textContent = "Chargez un CSV";
    elements.institutionPickerDetails.textContent = "";
    elements.institutionPickerLevel.hidden = true;
    elements.institutionPickerMenu.hidden = true;
    elements.institutionPickerToggle.setAttribute("aria-expanded", "false");
    elements.institutionDictionaryButton.disabled = false;
    elements.institutionDictionaryButton.textContent = state.institutionDictionaryFileName ? "Replace names" : "Add names";
    elements.institutionDictionaryButton.title = state.institutionDictionaryError
      || state.institutionDictionaryFileName
      || "Load an optional institution dictionary";
    elements.institutionDictionaryButton.classList.toggle("has-error", Boolean(state.institutionDictionaryError));
    elements.institutionDictionaryClear.hidden = !state.institutionDictionaryFileName;
    return;
  }

  institutionOptions.forEach((institutionId) => {
    const entry = getInstitutionDisplayInfo(dictionary, institutionId);
    const institutionName = entry?.institutionName || institutionId;
    const option = new Option(institutionName, institutionId, false, institutionId === selectedInstitutionId);
    elements.institutionSelect.append(option);
    const row = document.createElement("button");
    row.type = "button";
    row.className = "institution-picker-option";
    row.dataset.institutionOption = institutionId;
    row.setAttribute("role", "option");
    row.setAttribute("aria-selected", String(institutionId === selectedInstitutionId));
    row.setAttribute("aria-label", [entry?.consolidationLevel, institutionName, entry?.jstCode || institutionId].filter(Boolean).join(", "));
    const level = createInstitutionLevelBadge(entry?.consolidationLevel);
    const text = document.createElement("span");
    text.className = "institution-picker-option-text";
    const name = document.createElement("span");
    name.className = "institution-picker-option-name";
    name.textContent = institutionName;
    text.append(name);
    if (entry) {
      const subline = document.createElement("span");
      subline.className = "institution-picker-option-details";
      subline.textContent = `JST ${entry.jstCode}`;
      text.append(subline);
    }
    row.append(level, text);
    elements.institutionPickerMenu.append(row);
  });
  const selectedEntry = getInstitutionDisplayInfo(dictionary, selectedInstitutionId);
  elements.institutionPickerName.textContent = selectedEntry?.institutionName || selectedInstitutionId;
  elements.institutionPickerDetails.textContent = selectedEntry ? `JST ${selectedEntry.jstCode}` : "";
  elements.institutionPickerLevel.textContent = selectedEntry?.consolidationLevel ?? "";
  elements.institutionPickerLevel.hidden = !selectedEntry?.consolidationLevel;
  elements.institutionPickerToggle.disabled = false;
  elements.institutionPickerToggle.setAttribute("aria-label", selectedEntry
    ? `Select an institution. Current selection: ${selectedEntry.institutionName}, ${selectedEntry.consolidationLevel}, JST ${selectedEntry.jstCode}`
    : `Select an institution. Current selection: ${selectedInstitutionId}`);
  elements.institutionDictionaryButton.disabled = false;
  elements.institutionDictionaryButton.textContent = state.institutionDictionaryError
    ? "Retry names"
    : state.institutionDictionaryFileName ? "Replace names" : "Add names";
  elements.institutionDictionaryButton.title = state.institutionDictionaryError
    || state.institutionDictionaryFileName
    || "Load an optional institution dictionary";
  elements.institutionDictionaryButton.classList.toggle("has-error", Boolean(state.institutionDictionaryError));
  elements.institutionDictionaryClear.hidden = !state.institutionDictionaryFileName;
}

function createInstitutionLevelBadge(level) {
  const badge = document.createElement("span");
  badge.className = "institution-picker-option-level institution-level-badge";
  badge.textContent = level || "";
  if (!level) badge.setAttribute("aria-hidden", "true");
  return badge;
}

function setInstitutionPickerOpen(isOpen) {
  elements.institutionPickerMenu.hidden = !isOpen || elements.institutionPickerToggle.disabled;
  elements.institutionPickerToggle.setAttribute("aria-expanded", String(!elements.institutionPickerMenu.hidden));
}

function renderActiveModule(activeModule, availableModules = []) {
  const available = new Set(availableModules);
  elements.moduleButtons.forEach((button) => {
    const isAvailable = available.has(button.dataset.moduleTarget);
    button.hidden = !isAvailable;
    button.classList.toggle("is-active", isAvailable && button.dataset.moduleTarget === activeModule);
  });

  elements.moduleViews.forEach((view) => {
    view.classList.toggle("is-visible", Boolean(activeModule) && view.id === `${activeModule}-view`);
  });
}

function formatLoadedAt(date) {
  if (!date) return "";
  return `à ${new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(date)}`;
}
