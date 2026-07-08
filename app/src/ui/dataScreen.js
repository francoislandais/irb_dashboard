import { getIndexedAxisCodes, getIndexedRowsByCoordinates, getIndexedRowsByTableJst, getIndexedTableIds } from "../data/dataIndex.js";
import { COST_OF_RISK_FILTER_ALL, COST_OF_RISK_WATERFALL_X_CODES, COST_OF_RISK_X_AXIS_CODE, buildCostOfRiskF02ImpairmentRatio, buildCostOfRiskF02ImpairmentSeries, buildCostOfRiskF12ContributionSeries, buildCostOfRiskF2VsF12Audit, buildCostOfRiskFilteredSelectionValue, buildCostOfRiskStageExposureTable, buildCostOfRiskStageTransferFlowDiagram, buildCostOfRiskStageTransferWaterfall, buildCostOfRiskWaterfall, getCostOfRiskFilterOptions, getCostOfRiskWaterfallXAxisOptions, getCostOfRiskXAxisOptions } from "../data/costOfRisk.js?v=20260707-stage-flow";
import { createStageTransferWaterfallData, getStageTransferAxisLabel, getStageTransferDisplayValue, renderCostOfRiskStageExposureTable, renderCostOfRiskStageTransferFlowDiagram } from "./costOfRiskStageTransfers.js?v=20260707-stage-flow-3";
import { buildModule2AxisSeries, MODULE_2_TARGET } from "../data/timeSeries.js?v=20260704-cost-risk";
import { normalizeAxisCode } from "../data/module2Config.js";

let latestState = null;

let activeModule2TemplateId = MODULE_2_TARGET.tableId;
let hasAppliedUrlTemplate = false;
const module2TemplateContexts = new Map();
const module2TemplateAxisState = {
  scroll: { left: 0, top: 0 },
  search: ""
};
const COMMON_MODULE_2_DENOMINATORS = [
  {
    label: "Total risk exposure amount",
    tableId: "C_02.00",
    selectedXCode: "0010",
    selectedYCode: "0010",
    selectedZCode: ""
  }
];
const MODULE_2_STICKY_PARENT_ROW_HEIGHT = 28;
const TEMPLATE_URL_PARAM = "template";
const ADD_DATASET_OPTION = "__add_dataset__";
const AUTHORIZE_REMEMBERED_DATASET_OPTION = "__authorize_remembered_dataset__";
let module2StickyFrame = 0;
let module2ContextMenu = null;
let module2BenchmarkDialog = null;
let peersDialog = null;
let activeCostOfRiskXAxisCode = COST_OF_RISK_X_AXIS_CODE;
let activeCostOfRiskSmoothingWindow = 4;
let activeCostOfRiskReferenceDate = "";
let activeCostOfRiskTab = "f2-vs-f12";
let activeCostOfRiskCoreXCodes = new Set(COST_OF_RISK_WATERFALL_X_CODES);
let activeCostOfRiskAuditSeries = "f12";
let activeCostOfRiskDisplayMode = "ratio";
let costOfRiskChart = null;
let costOfRiskF2VsF12Chart = null;
let costOfRiskStageTransferChart = null;
let costOfRiskWaterfallChart = null;
let costOfRiskTreemapChart = null;
const activeCostOfRiskFilters = {
  asset: "Loans and advances",
  counterparty: COST_OF_RISK_FILTER_ALL,
  stage: COST_OF_RISK_FILTER_ALL
};
const COST_OF_RISK_BENCHMARK_GRAYS = ["#8f9893", "#a2aaa6", "#b4bbb8", "#7f8984"];
const COST_OF_RISK_BENCHMARK_DASHES = ["ShortDash", "ShortDot", "Dash", "Dot"];
const COST_OF_RISK_TREEMAP_STAGE_OPTIONS = [
  { label: "Stage 1", value: "Stage 1" },
  { label: "Stage 2", value: "Stage 2" },
  { label: "Stage 3", value: "Stage 3" },
  { label: "POCI", value: "POCI" }
];
const COST_OF_RISK_TREEMAP_COUNTERPARTIES = [
  { label: "Central banks", shortLabel: "CB", value: "Central banks" },
  { label: "Governments", shortLabel: "Gov", value: "General governments" },
  { label: "Credit institutions", shortLabel: "CI", value: "Credit institutions" },
  { label: "Other financials", shortLabel: "OFI", value: "Other financial corporations" },
  { label: "NFC", shortLabel: "NFC", value: "Non-financial corporations" },
  { label: "HH", shortLabel: "HH", value: "Households" }
];

const elements = {
  appShell: document.querySelector(".app-shell"),
  chooseFileButton: document.querySelector("#choose-file-button"),
  columnCount: document.querySelector("#column-count"),
  cet1Dashboard: document.querySelector("#cet1-dashboard"),
  cet1DenominatorContext: document.querySelector("#cet1-denominator-context"),
  cet1DenominatorValue: document.querySelector("#cet1-denominator-value"),
  cet1Empty: document.querySelector("#cet1-empty"),
  cet1NumeratorContext: document.querySelector("#cet1-numerator-context"),
  cet1NumeratorValue: document.querySelector("#cet1-numerator-value"),
  cet1RatioChange: document.querySelector("#cet1-ratio-change"),
  cet1RatioChangeContext: document.querySelector("#cet1-ratio-change-context"),
  cet1RatioContext: document.querySelector("#cet1-ratio-context"),
  cet1RatioValue: document.querySelector("#cet1-ratio-value"),
  costOfRiskAsset: document.querySelector("#cost-of-risk-asset"),
  costOfRiskAudit: document.querySelector("#cost-of-risk-audit"),
  costOfRiskCounterparty: document.querySelector("#cost-of-risk-counterparty"),
  costOfRiskCoreDefinition: document.querySelector("#cost-of-risk-core-definition"),
  costOfRiskF2VsF12CoreDefinition: document.querySelector("#cost-of-risk-f2-f12-core-definition"),
  costOfRiskContext: document.querySelector("#cost-of-risk-context"),
  costOfRiskChart: document.querySelector("#cost-of-risk-chart"),
  costOfRiskChartTitle: document.querySelector("#cost-of-risk-chart-title"),
  costOfRiskDashboard: document.querySelector("#cost-of-risk-dashboard"),
  costOfRiskDenominatorContext: document.querySelector("#cost-of-risk-denominator-context"),
  costOfRiskDenominatorValue: document.querySelector("#cost-of-risk-denominator-value"),
  costOfRiskDisplayMode: document.querySelector("#cost-of-risk-display-mode"),
  costOfRiskEmpty: document.querySelector("#cost-of-risk-empty"),
  costOfRiskF2VsF12Chart: document.querySelector("#cost-of-risk-f2-f12-chart"),
  costOfRiskF02Context: document.querySelector("#cost-of-risk-f02-context"),
  costOfRiskF02Value: document.querySelector("#cost-of-risk-f02-value"),
  costOfRiskPoints: document.querySelector("#cost-of-risk-points"),
  costOfRiskRatioContext: document.querySelector("#cost-of-risk-ratio-context"),
  costOfRiskRatioValue: document.querySelector("#cost-of-risk-ratio-value"),
  costOfRiskSmoothing: document.querySelector("#cost-of-risk-smoothing"),
  costOfRiskSmoothingValue: document.querySelector("#cost-of-risk-smoothing-value"),
  costOfRiskStage: document.querySelector("#cost-of-risk-stage"),
  costOfRiskStageExposureTable: document.querySelector("#cost-of-risk-stage-exposure-table"),
  costOfRiskStageTransferChart: document.querySelector("#cost-of-risk-stage-transfer-chart"),
  costOfRiskStageTransferTitle: document.querySelector("#cost-of-risk-stage-transfer-title"),
  costOfRiskTabButtons: [...document.querySelectorAll("[data-cost-of-risk-tab]")],
  costOfRiskTabPanels: [...document.querySelectorAll("[data-cost-of-risk-panel]")],
  costOfRiskTreemap: document.querySelector("#cost-of-risk-treemap"),
  costOfRiskValue: document.querySelector("#cost-of-risk-value"),
  costOfRiskWaterfall: document.querySelector("#cost-of-risk-waterfall"),
  costOfRiskWaterfallTitle: document.querySelector("#cost-of-risk-waterfall-title"),
  costOfRiskXAxis: document.querySelector("#cost-of-risk-x-axis"),
  datasetSelect: document.querySelector("#dataset-select"),
  exportStandaloneButton: document.querySelector("#export-standalone-button"),
  fileName: document.querySelector("#file-name"),
  fileStatus: document.querySelector("#file-status"),
  forgetFileButton: document.querySelector("#forget-file-button"),
  jstSelect: document.querySelector("#jst-select"),
  moduleButtons: [...document.querySelectorAll("[data-module-target]")],
  moduleViews: [...document.querySelectorAll(".module-view")],
  module2AxisButtons: [...document.querySelectorAll("[data-module-2-axis]")],
  module2AxisCaptions: {
    template: document.querySelector('[data-axis-caption="template"]'),
    x: document.querySelector('[data-axis-caption="x"]'),
    y: document.querySelector('[data-axis-caption="y"]'),
    z: document.querySelector('[data-axis-caption="z"]')
  },
  module2Empty: document.querySelector("#module-2-empty"),
  module2Table: document.querySelector("#module-2-table"),
  module2TableWrap: document.querySelector(".metric-table-wrap"),
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
    actions.setActiveDataset(event.target.value);
  });
  elements.jstSelect.addEventListener("change", (event) => {
    actions.updateSelectedJst(event.target.value);
  });
  elements.unitSelect.addEventListener("change", (event) => {
    saveModule2ScrollPosition();
    actions.updateSelectedUnit(event.target.value);
  });
  elements.costOfRiskAsset?.addEventListener("change", (event) => {
    activeCostOfRiskFilters.asset = event.target.value;
    renderAppState(actions.getState());
  });
  elements.costOfRiskCounterparty?.addEventListener("change", (event) => {
    activeCostOfRiskFilters.counterparty = event.target.value;
    renderAppState(actions.getState());
  });
  elements.costOfRiskStage?.addEventListener("change", (event) => {
    activeCostOfRiskFilters.stage = event.target.value;
    renderAppState(actions.getState());
  });
  elements.costOfRiskDisplayMode?.addEventListener("change", (event) => {
    activeCostOfRiskDisplayMode = event.target.value === "amount" ? "amount" : "ratio";
    renderAppState(actions.getState());
  });
  elements.costOfRiskXAxis?.addEventListener("change", (event) => {
    activeCostOfRiskXAxisCode = event.target.value;
    renderAppState(actions.getState());
  });
  elements.costOfRiskSmoothing?.addEventListener("input", (event) => {
    activeCostOfRiskSmoothingWindow = clampCostOfRiskSmoothingWindow(event.target.value);
    renderAppState(actions.getState());
  });
  elements.costOfRiskDashboard?.addEventListener("change", (event) => {
    const checkbox = event.target.closest?.("[data-cost-of-risk-core-code]");
    if (!checkbox) return;

    updateCostOfRiskCoreDefinition(checkbox.dataset.costOfRiskCoreCode, checkbox.checked);
    renderAppState(actions.getState());
  });
  elements.costOfRiskTabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      activeCostOfRiskTab = button.dataset.costOfRiskTab || "contributions";
      renderAppState(actions.getState());
    });
  });
  elements.module2AxisButtons.forEach((button) => {
    button.addEventListener("click", () => {
      saveModule2ScrollPosition();
      getActiveModule2Context().activeAxis = button.getAttribute("data-module-2-axis") || "y";
      renderAppState(actions.getState());
    });
  });
  elements.module2TableWrap?.addEventListener("scroll", scheduleModule2StickyParentsUpdate, { passive: true });
  elements.module2TableWrap?.addEventListener("scroll", hideModule2ContextMenu, { passive: true });
  elements.module2Table.addEventListener("click", (event) => {
    hideModule2ContextMenu();

    const toggle = event.target.closest("[data-toggle-path]");
    if (toggle) {
      toggleModule2Path(toggle.dataset.togglePath);
      return;
    }

    const row = event.target.closest("tbody tr[data-point-code]");
    if (row) selectModule2Row(row.dataset.pointCode, { shouldToggle: true, shouldFocus: true });
  });
  elements.module2Table.addEventListener("contextmenu", (event) => {
    const row = event.target.closest("tbody tr[data-normalized-path]");
    if (!row) return;

    event.preventDefault();
    if (row.dataset.pointCode) {
      setSelectedModule2CodeForActiveAxis(row.dataset.pointCode);
      applyModule2Selection();
      renderModule2AxisTabs();
      row.focus({ preventScroll: true });
    }
    showModule2ContextMenu(row, event);
  });
  elements.module2Table.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      moveModule2Selection(event.key === "ArrowDown" ? 1 : -1);
      return;
    }

    if (event.key !== "Enter" && event.key !== " ") return;

    const row = event.target.closest("tbody tr[data-point-code]");
    if (!row) return;

    event.preventDefault();
    selectModule2Row(row.dataset.pointCode, { shouldToggle: true, shouldFocus: true });
  });
  elements.moduleButtons.forEach((button) => {
    button.addEventListener("click", () => actions.setActiveModule(button.dataset.moduleTarget));
  });
  document.addEventListener("click", hideModule2ContextMenu);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      hideModule2ContextMenu();
      hideModule2BenchmarkDialog();
      hidePeersDialog();
    }
  });
}

function toggleSidebar() {
  if (!elements.appShell || !elements.sidebarToggle) return;

  const isCollapsed = elements.appShell.classList.toggle("is-sidebar-collapsed");
  elements.sidebarToggle.setAttribute("aria-expanded", String(!isCollapsed));
  elements.sidebarToggle.setAttribute(
    "aria-label",
    isCollapsed ? "Afficher la navigation" : "Masquer la navigation"
  );
  window.setTimeout(scheduleModule2StickyParentsUpdate, 180);
}

export function renderAppState(state) {
  latestState = state;
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
  if (state.activeModule === "module-2") renderModule2(state);
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

function renderCostOfRisk(state) {
  if (!elements.costOfRiskEmpty || !elements.costOfRiskDashboard) return;
  renderCostOfRiskTabs();

  const filterOptions = getCostOfRiskFilterOptions(state);
  const xAxisOptions = getCostOfRiskXAxisOptions(state);
  const waterfallXAxisOptions = getCostOfRiskWaterfallXAxisOptions(state);
  normalizeActiveCostOfRiskCoreDefinition(waterfallXAxisOptions);
  normalizeActiveCostOfRiskFilter("asset", filterOptions.assets);
  normalizeActiveCostOfRiskFilter("counterparty", filterOptions.counterparties);
  normalizeActiveCostOfRiskFilter("stage", filterOptions.stages);
  const selectedCoreXCodes = getActiveCostOfRiskCoreXCodes(waterfallXAxisOptions);
  if (selectedCoreXCodes.length > 0 && !selectedCoreXCodes.includes(activeCostOfRiskXAxisCode)) {
    activeCostOfRiskXAxisCode = selectedCoreXCodes[0];
  }
  if (!xAxisOptions.some((option) => option.code === activeCostOfRiskXAxisCode)) {
    activeCostOfRiskXAxisCode = xAxisOptions.some((option) => option.code === COST_OF_RISK_X_AXIS_CODE)
      ? COST_OF_RISK_X_AXIS_CODE
      : xAxisOptions[0]?.code ?? COST_OF_RISK_X_AXIS_CODE;
  }
  const selection = buildCostOfRiskFilteredSelectionValue(
    state,
    activeCostOfRiskFilters,
    activeCostOfRiskXAxisCode,
    activeCostOfRiskReferenceDate
  );
  activeCostOfRiskReferenceDate = selection.referenceDate || activeCostOfRiskReferenceDate;
  const f02Ratio = buildCostOfRiskF02ImpairmentRatio(state, activeCostOfRiskReferenceDate);
  const f02Series = buildCostOfRiskF02ImpairmentSeries(state);
  const waterfall = buildCostOfRiskWaterfall(state, activeCostOfRiskFilters, activeCostOfRiskReferenceDate, selectedCoreXCodes);

  renderCostOfRiskFilterSelect(elements.costOfRiskAsset, filterOptions.assets, activeCostOfRiskFilters.asset);
  renderCostOfRiskFilterSelect(elements.costOfRiskCounterparty, filterOptions.counterparties, activeCostOfRiskFilters.counterparty);
  renderCostOfRiskFilterSelect(elements.costOfRiskStage, filterOptions.stages, activeCostOfRiskFilters.stage);
  if (elements.costOfRiskDisplayMode) elements.costOfRiskDisplayMode.value = activeCostOfRiskDisplayMode;
  renderCostOfRiskXAxisOptions(
    selectedCoreXCodes.length > 0 ? xAxisOptions.filter((option) => selectedCoreXCodes.includes(option.code)) : xAxisOptions,
    activeCostOfRiskXAxisCode
  );
  renderCostOfRiskSmoothingControl(activeCostOfRiskSmoothingWindow);
  renderCostOfRiskCoreDefinition(waterfallXAxisOptions);

  if (selection.status) {
    elements.costOfRiskEmpty.hidden = false;
    elements.costOfRiskEmpty.textContent = selection.status;
    const canAdjustFilters = selection.status.includes("matches the selected filters");
    elements.costOfRiskDashboard.hidden = !canAdjustFilters;
    if (canAdjustFilters) {
      elements.costOfRiskValue.textContent = "-";
      elements.costOfRiskContext.textContent = "-";
      elements.costOfRiskDenominatorValue.textContent = "-";
      elements.costOfRiskDenominatorContext.textContent = "-";
      elements.costOfRiskRatioValue.textContent = "-";
      elements.costOfRiskRatioContext.textContent = "-";
      elements.costOfRiskF02Value.textContent = "-";
      elements.costOfRiskF02Context.textContent = "-";
      elements.costOfRiskPoints.textContent = "-";
      renderCostOfRiskWaterfallTitle("");
      renderCostOfRiskChartTitle(null, xAxisOptions, activeCostOfRiskXAxisCode);
    }
    destroyCostOfRiskChart();
    destroyCostOfRiskWaterfallChart();
    destroyCostOfRiskStageTransferChart();
    destroyCostOfRiskTreemapChart();
    return;
  }

  elements.costOfRiskEmpty.hidden = true;
  elements.costOfRiskEmpty.textContent = "";
  elements.costOfRiskDashboard.hidden = false;
  elements.costOfRiskValue.textContent = formatMetricValue(selection.value, state.selectedUnit);
  elements.costOfRiskContext.textContent = `${state.selectedJst} - x_axis ${activeCostOfRiskXAxisCode} - ${selection.referenceDate}`;
  elements.costOfRiskDenominatorValue.textContent = formatMetricValue(selection.denominator, state.selectedUnit);
  elements.costOfRiskDenominatorContext.textContent = selection.denominatorLabel;
  const selectedSmoothedPoint = getSelectedSmoothedCostOfRiskPoint(
    selection.series,
    activeCostOfRiskSmoothingWindow,
    activeCostOfRiskReferenceDate
  );
  elements.costOfRiskRatioValue.textContent = formatCostOfRiskDisplayValue(
    activeCostOfRiskDisplayMode === "ratio"
      ? selectedSmoothedPoint?.smoothedRatioBasisPoints ?? selection.ratioBasisPoints
      : selectedSmoothedPoint?.smoothedValue ?? selection.value,
    activeCostOfRiskDisplayMode,
    state.selectedUnit
  );
  elements.costOfRiskRatioContext.textContent = `${state.selectedJst} - ${selection.referenceDate} - ${activeCostOfRiskDisplayMode === "ratio" ? formatCostOfRiskSmoothingLabel(activeCostOfRiskSmoothingWindow) : "amount"}`;
  elements.costOfRiskF02Value.textContent = formatCostOfRiskDisplayValue(
    activeCostOfRiskDisplayMode === "ratio" ? f02Ratio.ratioBasisPoints : f02Ratio.value,
    activeCostOfRiskDisplayMode,
    state.selectedUnit
  );
  elements.costOfRiskF02Context.textContent = `${state.selectedJst} - ${f02Ratio.referenceDate || "-"} - quarterly`;
  elements.costOfRiskPoints.textContent = selection.option.points.length === 0
    ? "-"
    : selection.option.points.join(", ");
  const selectedWaterfallPoint = (waterfall.points ?? []).find((point) => point.code === activeCostOfRiskXAxisCode);
  renderCostOfRiskWaterfallTitle(waterfall.referenceDate);
  renderCostOfRiskChartTitle(selectedWaterfallPoint, xAxisOptions, activeCostOfRiskXAxisCode);
  if (activeCostOfRiskTab === "contributions") {
    renderCostOfRiskWaterfallChart(waterfall, state.selectedJst, activeCostOfRiskDisplayMode, state.selectedUnit);
    renderCostOfRiskChart(
      selection,
      state.selectedJst,
      activeCostOfRiskSmoothingWindow,
      activeCostOfRiskDisplayMode === "ratio" ? selectedWaterfallPoint?.ratioBasisPoints : selectedWaterfallPoint?.value,
      activeCostOfRiskDisplayMode,
      state.selectedUnit
    );
    destroyCostOfRiskTreemapChart();
    destroyCostOfRiskF2VsF12Chart();
    destroyCostOfRiskStageTransferChart();
  } else if (activeCostOfRiskTab === "f2-vs-f12") {
    destroyCostOfRiskWaterfallChart();
    destroyCostOfRiskChart();
    destroyCostOfRiskTreemapChart();
    destroyCostOfRiskStageTransferChart();
    renderCostOfRiskF2VsF12Chart(
      f02Series,
      buildCostOfRiskF12ContributionSeries(state, activeCostOfRiskFilters, selectedCoreXCodes),
      activeCostOfRiskDisplayMode,
      state.selectedUnit
    );
    renderCostOfRiskAuditTable(
      buildCostOfRiskF2VsF12Audit(state, activeCostOfRiskFilters, selectedCoreXCodes),
      state.selectedUnit
    );
  } else if (activeCostOfRiskTab === "stage-transfers") {
    destroyCostOfRiskWaterfallChart();
    destroyCostOfRiskChart();
    destroyCostOfRiskF2VsF12Chart();
    destroyCostOfRiskTreemapChart();
    clearCostOfRiskAuditTable();
    renderCostOfRiskStageExposureTable({
      activeReferenceDate: activeCostOfRiskReferenceDate,
      container: elements.costOfRiskStageExposureTable,
      exposureTable: buildCostOfRiskStageExposureTable(state, activeCostOfRiskFilters),
      formatMetricValue,
      formatReferenceQuarterLabel,
      formatSignedMetricValue,
      onSelectReferenceDate: selectCostOfRiskReferenceDate,
      selectedUnit: state.selectedUnit
    });
    renderCostOfRiskStageTransferView(state);
  } else if (activeCostOfRiskTab === "analysis") {
    destroyCostOfRiskWaterfallChart();
    destroyCostOfRiskChart();
    destroyCostOfRiskF2VsF12Chart();
    destroyCostOfRiskStageTransferChart();
    clearCostOfRiskAuditTable();
    renderCostOfRiskTreemap(buildCostOfRiskCounterpartyTreemapData(state), activeCostOfRiskDisplayMode, state.selectedUnit);
  } else {
    destroyCostOfRiskWaterfallChart();
    destroyCostOfRiskChart();
    destroyCostOfRiskF2VsF12Chart();
    destroyCostOfRiskStageTransferChart();
    destroyCostOfRiskTreemapChart();
    clearCostOfRiskAuditTable();
  }
}

function renderCostOfRiskTabs() {
  elements.costOfRiskTabButtons.forEach((button) => {
    const isActive = button.dataset.costOfRiskTab === activeCostOfRiskTab;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });

  elements.costOfRiskTabPanels.forEach((panel) => {
    const isActive = panel.dataset.costOfRiskPanel === activeCostOfRiskTab;
    panel.classList.toggle("is-active", isActive);
    panel.hidden = !isActive;
  });
}

function normalizeActiveCostOfRiskFilter(name, options) {
  if (!options.some((option) => option.value === activeCostOfRiskFilters[name])) {
    activeCostOfRiskFilters[name] = COST_OF_RISK_FILTER_ALL;
  }
}

function getActiveCostOfRiskStageTransferStage() {
  if (activeCostOfRiskFilters.stage === "Stage 1") return "1";
  if (activeCostOfRiskFilters.stage === "Stage 2") return "2";
  if (activeCostOfRiskFilters.stage === "Stage 3") return "3";
  return "3";
}

function isCostOfRiskAllStageSelected() {
  return !activeCostOfRiskFilters.stage || activeCostOfRiskFilters.stage === COST_OF_RISK_FILTER_ALL;
}

function normalizeActiveCostOfRiskCoreDefinition(options) {
  const availableCodes = new Set((options ?? []).map((option) => option.code));
  activeCostOfRiskCoreXCodes = new Set(
    [...activeCostOfRiskCoreXCodes].filter((code) => availableCodes.has(code))
  );

  if (activeCostOfRiskCoreXCodes.size === 0 && availableCodes.size > 0) {
    activeCostOfRiskCoreXCodes = new Set(availableCodes);
  }
}

function getActiveCostOfRiskCoreXCodes(options) {
  const optionCodes = (options ?? []).map((option) => option.code);
  return optionCodes.filter((code) => activeCostOfRiskCoreXCodes.has(code));
}

function updateCostOfRiskCoreDefinition(code, isSelected) {
  if (!code) return;
  if (isSelected) {
    activeCostOfRiskCoreXCodes.add(code);
  } else {
    if (activeCostOfRiskCoreXCodes.size <= 1) return;
    activeCostOfRiskCoreXCodes.delete(code);
  }

  if (!activeCostOfRiskCoreXCodes.has(activeCostOfRiskXAxisCode) && activeCostOfRiskCoreXCodes.size > 0) {
    activeCostOfRiskXAxisCode = [...activeCostOfRiskCoreXCodes][0];
  }
}

function renderCostOfRiskFilterSelect(select, options, selectedValue) {
  if (!select) return;

  select.replaceChildren();
  options.forEach((option) => {
    select.append(new Option(option.label, option.value, false, option.value === selectedValue));
  });
  select.disabled = options.length <= 1;
}

function renderCostOfRiskCoreDefinition(options) {
  renderCostOfRiskCoreDefinitionTable(elements.costOfRiskCoreDefinition, options);
  renderCostOfRiskCoreDefinitionTable(elements.costOfRiskF2VsF12CoreDefinition, options, true);
}

function renderCostOfRiskCoreDefinitionTable(container, options, isCompact = false) {
  if (!container) return;

  const selectedCodes = getActiveCostOfRiskCoreXCodes(options);
  const selectedCodeSet = new Set(selectedCodes);
  const table = document.createElement("table");
  table.className = isCompact
    ? "cost-of-risk-core-table cost-of-risk-core-table--compact"
    : "cost-of-risk-core-table";
  table.append(createCostOfRiskCoreColumnGroup(isCompact));

  const tbody = document.createElement("tbody");
  let previousSectionLabel = "";
  (options ?? []).forEach((option) => {
    const sectionLabel = getCostOfRiskCoreSectionLabel(option.code);
    if (sectionLabel && sectionLabel !== previousSectionLabel) {
      tbody.append(createCostOfRiskCoreSectionRow(sectionLabel));
      previousSectionLabel = sectionLabel;
    }

    const row = document.createElement("tr");
    row.classList.toggle("is-disabled", !selectedCodeSet.has(option.code));

    const checkboxCell = document.createElement("td");
    checkboxCell.className = "cost-of-risk-core-check";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = selectedCodeSet.has(option.code);
    checkbox.dataset.costOfRiskCoreCode = option.code;
    checkbox.setAttribute("aria-label", `Use ${option.code}`);
    checkboxCell.append(checkbox);

    const codeCell = document.createElement("td");
    codeCell.className = "cost-of-risk-core-code";
    codeCell.textContent = option.code;

    const labelCell = document.createElement("td");
    labelCell.className = "cost-of-risk-core-label";
    labelCell.textContent = option.label;

    row.append(checkboxCell, codeCell, labelCell);
    tbody.append(row);
  });

  table.append(tbody);
  container.replaceChildren(table);
}

function createCostOfRiskCoreColumnGroup(isCompact) {
  const colgroup = document.createElement("colgroup");
  [
    isCompact ? "22px" : "26px",
    isCompact ? "42px" : "48px",
    "auto"
  ].forEach((width) => {
    const col = document.createElement("col");
    col.style.width = width;
    colgroup.append(col);
  });
  return colgroup;
}

function createCostOfRiskCoreSectionRow(sectionLabel) {
  const row = document.createElement("tr");
  row.className = "cost-of-risk-core-section-row";
  const cell = document.createElement("td");
  cell.colSpan = 3;
  cell.textContent = sectionLabel;
  row.append(cell);
  return row;
}

function getCostOfRiskCoreSectionLabel(code) {
  const numericCode = Number(code);
  if (!Number.isFinite(numericCode)) return "";
  return numericCode >= 110 ? "Direct P&L impact" : "Allowances variation";
}

function renderCostOfRiskXAxisOptions(options, selectedCode) {
  if (!elements.costOfRiskXAxis) return;

  elements.costOfRiskXAxis.replaceChildren();
  if (options.length === 0) {
    elements.costOfRiskXAxis.append(new Option(COST_OF_RISK_X_AXIS_CODE, COST_OF_RISK_X_AXIS_CODE));
    elements.costOfRiskXAxis.disabled = true;
    return;
  }

  options.forEach((option) => {
    elements.costOfRiskXAxis.append(new Option(option.label, option.code, false, option.code === selectedCode));
  });
  elements.costOfRiskXAxis.disabled = false;
}

function renderCostOfRiskSmoothingControl(windowSize) {
  if (elements.costOfRiskSmoothing) {
    elements.costOfRiskSmoothing.value = String(windowSize);
  }
  if (elements.costOfRiskSmoothingValue) {
    elements.costOfRiskSmoothingValue.value = formatCostOfRiskSmoothingLabel(windowSize);
    elements.costOfRiskSmoothingValue.textContent = formatCostOfRiskSmoothingLabel(windowSize);
  }
}

function renderCostOfRiskChartTitle(selectedPoint, xAxisOptions, selectedCode) {
  if (!elements.costOfRiskChartTitle) return;
  const fallbackLabel = xAxisOptions.find((option) => option.code === selectedCode)?.label ?? selectedCode;
  const label = selectedPoint?.label ?? fallbackLabel;
  const cleanLabel = String(label || "").replace(new RegExp(`^${selectedCode}\\s*-\\s*`), "");
  elements.costOfRiskChartTitle.textContent = `${selectedCode} - ${cleanLabel}`;
}

function renderCostOfRiskWaterfallTitle(referenceDate) {
  if (!elements.costOfRiskWaterfallTitle) return;
  const dateLabel = referenceDate ? ` - ${formatReferenceQuarterLabel(referenceDate)}` : "";
  elements.costOfRiskWaterfallTitle.textContent = `F12 Contribution Breakdown${dateLabel}`;
}

function renderCostOfRiskChart(selection, jstCode, smoothingWindow, selectedContribution, displayMode = "ratio", selectedUnit = "millions") {
  if (!elements.costOfRiskChart || !window.Highcharts) return;

  const series = (selection.benchmarkSeries ?? [])
    .map((benchmark, index) => {
      const isSelected = benchmark.jstCode === jstCode;
      const points = smoothCostOfRiskPoints(benchmark.points ?? [], smoothingWindow);
      const color = getCostOfRiskSeriesColor(index, isSelected, selectedContribution);
      const chartData = createCostOfRiskChartData(points, displayMode);
      return {
        clip: false,
        color,
        dashStyle: getCostOfRiskSeriesDash(index, isSelected),
        data: chartData,
        dataLabels: { enabled: false },
        lineWidth: isSelected ? 3.6 : 1.45,
        marker: {
          fillColor: isSelected ? "#ffffff" : color,
          enabled: isSelected,
          lineColor: color,
          lineWidth: isSelected ? 1.5 : 0,
          radius: isSelected ? 4 : 0,
          symbol: "circle"
        },
        name: benchmark.jstCode,
        opacity: isSelected ? 1 : 0.78,
        states: {
          hover: {
            enabled: true,
            halo: {
              size: isSelected ? 5 : 0
            },
            lineWidth: isSelected ? 4 : 2.1,
            lineWidthPlus: 0
          },
          inactive: {
            opacity: isSelected ? 1 : 0.42
          }
        },
        zIndex: isSelected ? 100 : 1
      };
    })
    .filter((benchmark) => benchmark.data.length > 0)
    .sort((left, right) => {
      if (left.name === jstCode) return 1;
      if (right.name === jstCode) return -1;
      return left.name.localeCompare(right.name);
    });
  const yBounds = getCostOfRiskYAxisBounds(series);
  const selectedReferencePoint = selection.series?.find((point) => point.label === activeCostOfRiskReferenceDate);

  if (series.length === 0) {
    destroyCostOfRiskChart();
    elements.costOfRiskChart.textContent = "";
    return;
  }

  const options = {
    chart: {
      animation: false,
      backgroundColor: "transparent",
      events: {
        render() {
          renderCostOfRiskEndpointLabels(this, jstCode);
        }
      },
      spacingRight: 128,
      type: "line"
    },
    credits: { enabled: false },
    legend: { enabled: false },
    plotOptions: {
      series: {
        animation: false,
        clip: false,
        cursor: "pointer",
        events: {
          legendItemClick() {
            return true;
          }
        },
        marker: {
          enabled: true,
          radius: 3
        },
        states: {
          hover: {
            animation: false,
            lineWidthPlus: 0
          }
        }
      },
      line: {
        point: {
          events: {
            click() {
              selectCostOfRiskReferenceDate(this.referenceLabel);
            }
          }
        }
      }
    },
    series,
    title: { text: null },
    tooltip: {
      headerFormat: "<span style=\"font-size:11px\">{point.key:%d/%m/%Y}</span><br/>",
      pointFormatter() {
        return `<span style="color:${this.series.color}">\u25cf</span> <b>${escapeHtml(this.series.name)}</b>: ${formatCostOfRiskDisplayValue(this.y, displayMode, selectedUnit)}<br/><span style="color:#6f7974">${formatCostOfRiskSmoothingLabel(smoothingWindow)}</span>`;
      },
      shared: false,
      split: false,
      stickOnContact: true,
      xDateFormat: "%d/%m/%Y"
    },
    xAxis: {
      labels: { style: { color: "#5f6b65" } },
      lineColor: "#c2cac5",
      lineWidth: 1,
      plotLines: selectedReferencePoint?.date instanceof Date ? [{
        color: "#7f8984",
        dashStyle: "ShortDash",
        value: selectedReferencePoint.date.getTime(),
        width: 1,
        zIndex: 3
      }] : [],
      tickColor: "#d9dedb",
      type: "datetime"
    },
    yAxis: {
      gridLineColor: "#edf0ee",
      labels: {
        formatter() {
          return displayMode === "ratio"
            ? new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(this.value)
            : formatMetricValue(this.value, selectedUnit);
        },
        style: { color: "#5f6b65" }
      },
      max: yBounds.max,
      min: yBounds.min,
      lineColor: "#aeb8b2",
      lineWidth: 1,
      startOnTick: false,
      endOnTick: false,
      tickAmount: 8,
      title: { text: displayMode === "ratio" ? "Basis points" : "Amount" }
    }
  };

  if (costOfRiskChart) {
    costOfRiskChart.update(options, true, true, false);
  } else {
    costOfRiskChart = window.Highcharts.chart(elements.costOfRiskChart, options);
  }
}

function renderCostOfRiskF2VsF12Chart(f02Series, f12Series, displayMode = "ratio", selectedUnit = "millions") {
  if (!elements.costOfRiskF2VsF12Chart || !window.Highcharts) return;

  const series = [
    {
      color: "#b8b8b8",
      dashStyle: "ShortDash",
      data: createCostOfRiskRatioChartData(f12Series.points, displayMode),
      lineWidth: 2.6,
      marker: {
        enabled: true,
        fillColor: "#b8b8b8",
        lineColor: "#b8b8b8",
        lineWidth: 1.2,
        radius: 3,
        symbol: "circle"
      },
      name: "F12 total selected contributions",
      custom: { auditSeries: "f12" }
    },
    {
      color: primaryDark,
      data: createCostOfRiskRatioChartData(f02Series.points, displayMode),
      lineWidth: 2.8,
      marker: {
        enabled: true,
        fillColor: "#primaryDark",
        lineColor: "#primaryDark",
        lineWidth: 1.2,
        radius: 3,
        symbol: "circle"
      },
      name: "F2",
      custom: { auditSeries: "f2" }
    }
    
  ].filter((item) => item.data.length > 0);

  if (series.length === 0) {
    destroyCostOfRiskF2VsF12Chart();
    elements.costOfRiskF2VsF12Chart.textContent = "";
    return;
  }

  const yBounds = getCostOfRiskYAxisBounds(series);
  const activePoint = [...(f02Series.points ?? []), ...(f12Series.points ?? [])]
    .find((point) => point.label === activeCostOfRiskReferenceDate && point.date instanceof Date);
  const options = {
    chart: {
      animation: false,
      backgroundColor: "transparent",
      type: "line"
    },
    credits: { enabled: false },
    legend: {
      enabled: true,
      align: "center",
      verticalAlign: "bottom",
      layout: "horizontal",
      y: 8
    },
    plotOptions: {
      series: {
        animation: false,
        cursor: "pointer",
        point: {
          events: {
            click() {
              selectCostOfRiskAuditSeries(this.series.options.custom?.auditSeries, this.referenceLabel);
            }
          }
        },
        states: {
          hover: {
            animation: false,
            lineWidthPlus: 0
          }
        }
      }
    },
    series,
    title: { text: null },
    tooltip: {
      shared: false,
      formatter() {
        const date = new Date(this.x);
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        const year = date.getFullYear();

        return `
          <span style="font-size:11px">Q${quarter} ${year}</span><br/>
          <span style="color:${this.series.color}">●</span>
          <b>${this.series.name}</b>: ${formatCostOfRiskDisplayValue(this.y, displayMode, selectedUnit)}
        `;
      }
    },
    xAxis: {
      labels: { style: { color: "#5f6b65" } },
      lineColor: "#c2cac5",
      lineWidth: 1,
      plotLines: activePoint ? [{
        color: "#7f8984",
        dashStyle: "ShortDash",
        value: activePoint.date.getTime(),
        width: 1,
        zIndex: 3
      }] : [],
      tickColor: "#d9dedb",
      type: "datetime"
    },
    yAxis: {
      gridLineColor: "#edf0ee",
      labels: {
        formatter() {
          return displayMode === "ratio"
            ? new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(this.value)
            : formatMetricValue(this.value, selectedUnit);
        },
        style: { color: "#5f6b65" }
      },
      lineColor: "#aeb8b2",
      lineWidth: 1,
      max: yBounds.max,
      min: yBounds.min,
      startOnTick: false,
      endOnTick: false,
      tickAmount: 8,
      title: { text: displayMode === "ratio" ? "Basis points" : "Amount" }
    }
  };

  if (costOfRiskF2VsF12Chart) {
    costOfRiskF2VsF12Chart.update(options, true, true, false);
  } else {
    costOfRiskF2VsF12Chart = window.Highcharts.chart(elements.costOfRiskF2VsF12Chart, options);
  }
}

function destroyCostOfRiskChart() {
  if (!costOfRiskChart) return;
  costOfRiskChart.destroy();
  costOfRiskChart = null;
}

function destroyCostOfRiskF2VsF12Chart() {
  if (!costOfRiskF2VsF12Chart) return;
  costOfRiskF2VsF12Chart.destroy();
  costOfRiskF2VsF12Chart = null;
}

function destroyCostOfRiskStageTransferChart() {
  if (!costOfRiskStageTransferChart) return;
  costOfRiskStageTransferChart.destroy();
  costOfRiskStageTransferChart = null;
}

const primaryDark = getComputedStyle(document.documentElement)

  .getPropertyValue("--primary-dark")

  .trim();

function renderCostOfRiskWaterfallChart(waterfall, jstCode, displayMode = "ratio", selectedUnit = "millions") {
  if (!elements.costOfRiskWaterfall || !window.Highcharts) return;

  const contributions = (waterfall.points ?? [])
    .filter((point) => Number.isFinite(getCostOfRiskPointDisplayValue(point, displayMode)))
    .map((point) => ({
      color: getCostOfRiskPointDisplayValue(point, displayMode) >= 0 ? "#f5f5f5" : primaryDark,
      code: point.code,
      name: `${point.code} - ${point.label}`,
      y: getCostOfRiskPointDisplayValue(point, displayMode)
    }));

  if (contributions.length === 0) {
    destroyCostOfRiskWaterfallChart();
    elements.costOfRiskWaterfall.textContent = "";
    return;
  }

  const waterfallData = createManualWaterfallData(contributions);
  waterfallData.valueFormatter = (value) => formatCostOfRiskDisplayValue(value, displayMode, selectedUnit, true);
  waterfallData.selectedCode = activeCostOfRiskXAxisCode;
  const options = {
    chart: {
      animation: false,
      backgroundColor: "transparent",
      events: {
        render() {
          renderManualCostOfRiskWaterfall(this, waterfallData);
          wireCostOfRiskWaterfallAxisLabels(this);
        }
      },
      marginBottom: 50,
      type: "line"
    },
    credits: { enabled: false },
    legend: { enabled: false },
    plotOptions: {
      series: {
        animation: false,
        enableMouseTracking: false,
        marker: { enabled: false }
      }
    },
    series: [{
      data: waterfallData.items.map((item) => item.end),
      lineWidth: 0,
      name: "Contribution",
      showInLegend: false
    }],
    title: { text: null },
    tooltip: { enabled: false },
    xAxis: {
      categories: waterfallData.items.map((item) => item.name),
      labels: {
        enabled: false
      },
      lineColor: "#c2cac5",
      tickColor: "#d9dedb",
      type: "category"
    },
    yAxis: {
      gridLineColor: "#edf0ee",
      labels: {
        formatter() {
          return formatCostOfRiskDisplayValue(this.value, displayMode, selectedUnit);
        },
        style: { color: "#5f6b65" }
      },
      lineColor: "#aeb8b2",
      lineWidth: 1,
      max: waterfallData.max,
      min: waterfallData.min,
      plotLines: [{
        color: "#aeb8b2",
        dashStyle: "ShortDash",
        value: 0,
        width: 1
      }],
      title: { text: displayMode === "ratio" ? "Basis points" : "Amount" }
    }
  };

  if (costOfRiskWaterfallChart) {
    costOfRiskWaterfallChart.update(options, true, true, false);
  } else {
    costOfRiskWaterfallChart = window.Highcharts.chart(elements.costOfRiskWaterfall, options);
  }
}

function renderCostOfRiskStageTransferView(state) {
  if (isCostOfRiskAllStageSelected()) {
    renderCostOfRiskStageTransferFlowChart(
      buildCostOfRiskStageTransferFlowDiagram(state, activeCostOfRiskReferenceDate, activeCostOfRiskFilters),
      state.selectedUnit,
      activeCostOfRiskDisplayMode
    );
    return;
  }

  renderCostOfRiskStageTransferWaterfallChart(
    buildCostOfRiskStageTransferWaterfall(state, getActiveCostOfRiskStageTransferStage(), activeCostOfRiskReferenceDate, activeCostOfRiskFilters),
    state.selectedUnit,
    activeCostOfRiskDisplayMode
  );
}

function renderCostOfRiskStageTransferFlowChart(flowDiagram, selectedUnit, displayMode = "amount") {
  if (!elements.costOfRiskStageTransferChart) return;
  destroyCostOfRiskStageTransferChart();

  if (elements.costOfRiskStageTransferTitle) {
    const dateLabel = flowDiagram.referenceDate ? ` - ${formatReferenceQuarterLabel(flowDiagram.referenceDate)}` : "";
    elements.costOfRiskStageTransferTitle.textContent = `F12.02 Stage transfer flows - ${flowDiagram.assetLabel} - All stages${dateLabel}`;
  }

  renderCostOfRiskStageTransferFlowDiagram({
    container: elements.costOfRiskStageTransferChart,
    displayMode,
    flowDiagram,
    formatValue: formatCostOfRiskDisplayValue,
    primaryDark,
    selectedUnit
  });
}

function renderCostOfRiskStageTransferWaterfallChart(waterfall, selectedUnit, displayMode = "amount") {
  if (!elements.costOfRiskStageTransferChart || !window.Highcharts) return;
  if (!costOfRiskStageTransferChart) elements.costOfRiskStageTransferChart.replaceChildren();

  if (elements.costOfRiskStageTransferTitle) {
    const stageLabel = `Stage ${waterfall.stage}`;
    const dateLabel = waterfall.referenceDate ? ` - ${formatReferenceQuarterLabel(waterfall.referenceDate)}` : "";
    elements.costOfRiskStageTransferTitle.textContent = `F12.02 Stage transfers - ${waterfall.assetLabel} - ${stageLabel}${dateLabel}`;
  }

  const stageRatioDenominator = waterfall.globalVariation?.previousValue ?? null;
  const contributions = (waterfall.points ?? [])
    .map((point) => {
      const displayValue = getStageTransferDisplayValue(point.value, stageRatioDenominator, displayMode);
      return {
        axisLabel: getStageTransferAxisLabel(point),
        color: displayValue >= 0 ? "#f5f5f5" : primaryDark,
        flowDirection: point.sign >= 0 ? "inflow" : "outflow",
        name: point.label,
        y: displayValue
      };
    })
    .filter((point) => Number.isFinite(point.y));
  const globalVariationValue = getStageTransferDisplayValue(waterfall.globalVariation?.value, stageRatioDenominator, displayMode);
  const globalVariation = Number.isFinite(globalVariationValue)
    ? {
      axisLabel: "Delta",
      color: globalVariationValue >= 0 ? "#f5f5f5" : primaryDark,
      name: waterfall.globalVariation.label || "Global variation",
      y: globalVariationValue
    }
    : null;
  const contributionTotal = contributions.reduce((total, point) => total + point.y, 0);
  const residual = globalVariation
    ? {
      axisLabel: "repayments, sales,\nwrite-off...",
      color: (globalVariation.y - contributionTotal) >= 0 ? "#f5f5f5" : primaryDark,
      name: "Other movements (repayments, sales, write-offs...)",
      y: globalVariation.y - contributionTotal
    }
    : null;

  if (contributions.length === 0 && !globalVariation) {
    destroyCostOfRiskStageTransferChart();
    elements.costOfRiskStageTransferChart.textContent = waterfall.status || "";
    return;
  }

  const waterfallData = createStageTransferWaterfallData(contributions, waterfall.stage, globalVariation, residual);
  waterfallData.valueFormatter = (value) => formatCostOfRiskDisplayValue(value, displayMode, selectedUnit, true);
  waterfallData.selectedCode = "";
  waterfallData.axisLabelColor = primaryDark;
  waterfallData.axisLabelFontSize = "12px";
  waterfallData.axisLabelLineHeight = "14px";
  waterfallData.barWidthRatio = 0.68;
  waterfallData.compactGroups = true;
  waterfallData.groupGapUnits = 0.62;
  waterfallData.itemGapUnits = 0.48;
  waterfallData.groupLabelFontSize = "12px";
  waterfallData.groupLabelOffset = 20;
  const options = {
    chart: {
      animation: false,
      backgroundColor: "transparent",
      events: {
        render() {
          renderManualCostOfRiskWaterfall(this, waterfallData);
        }
      },
      marginBottom: 50,
      marginTop: 30,
      type: "line"
    },
    credits: { enabled: false },
    legend: { enabled: false },
    plotOptions: {
      series: {
        animation: false,
        enableMouseTracking: false,
        marker: { enabled: false }
      }
    },
    series: [{
      data: waterfallData.items.map((item) => item.end),
      lineWidth: 0,
      name: "Stage transfer",
      showInLegend: false
    }],
    title: { text: null },
    tooltip: { enabled: false },
    xAxis: {
      categories: waterfallData.items.map((item) => item.name),
      labels: { enabled: false },
      lineColor: "#c2cac5",
      tickColor: "#d9dedb",
      type: "category"
    },
    yAxis: {
      gridLineColor: "#edf0ee",
      labels: {
        formatter() {
          return formatCostOfRiskDisplayValue(this.value, displayMode, selectedUnit);
        },
        style: { color: "#5f6b65" }
      },
      lineColor: "#aeb8b2",
      lineWidth: 1,
      max: waterfallData.max,
      min: waterfallData.min,
      plotLines: [{
        color: "#aeb8b2",
        dashStyle: "ShortDash",
        value: 0,
        width: 1
      }],
      title: { text: displayMode === "ratio" ? "Basis points" : "Amount" }
    }
  };

  if (costOfRiskStageTransferChart) {
    costOfRiskStageTransferChart.update(options, true, true, false);
  } else {
    costOfRiskStageTransferChart = window.Highcharts.chart(elements.costOfRiskStageTransferChart, options);
  }
}

function buildCostOfRiskCounterpartyTreemapData(state) {
  const baseFilters = {
    ...activeCostOfRiskFilters,
    counterparty: COST_OF_RISK_FILTER_ALL
  };
  const counterpartyOptions = activeCostOfRiskFilters.counterparty === COST_OF_RISK_FILTER_ALL
    ? COST_OF_RISK_TREEMAP_COUNTERPARTIES
    : COST_OF_RISK_TREEMAP_COUNTERPARTIES.filter((counterparty) => counterparty.value === activeCostOfRiskFilters.counterparty);
  const totalWaterfall = buildCostOfRiskWaterfall(state, baseFilters, activeCostOfRiskReferenceDate);
  const stageOptions = activeCostOfRiskFilters.stage === COST_OF_RISK_FILTER_ALL
    ? COST_OF_RISK_TREEMAP_STAGE_OPTIONS
    : COST_OF_RISK_TREEMAP_STAGE_OPTIONS.filter((stage) => stage.value === activeCostOfRiskFilters.stage);
  const stageWaterfalls = stageOptions.map((stage) => {
    const totalByCode = getCostOfRiskWaterfallPointMap(buildCostOfRiskWaterfall(state, {
      ...baseFilters,
      stage: stage.value
    }, activeCostOfRiskReferenceDate));
    const counterpartyWaterfalls = counterpartyOptions.map((counterparty) => ({
      counterparty,
      pointByCode: getCostOfRiskWaterfallPointMap(buildCostOfRiskWaterfall(state, {
        ...baseFilters,
        counterparty: counterparty.value,
        stage: stage.value
      }, activeCostOfRiskReferenceDate))
    }));

    return {
      counterpartyWaterfalls,
      label: stage.label,
      totalByCode
    };
  });

  return {
    points: (totalWaterfall.points ?? []).map((point) => {
      const counterpartyChildren = counterpartyOptions.map((counterparty) => {
        const stages = stageWaterfalls.map((stage) => {
          const stageWaterfall = stage.counterpartyWaterfalls.find((candidate) => candidate.counterparty.value === counterparty.value);

          return {
            counterpartyLabel: counterparty.label,
            counterpartyShortLabel: counterparty.shortLabel,
            key: `${counterparty.shortLabel}-${stage.label}`,
            label: stage.label,
            ratioBasisPoints: stageWaterfall?.pointByCode.get(point.code)?.ratioBasisPoints ?? 0,
            value: stageWaterfall?.pointByCode.get(point.code)?.value ?? 0
          };
        });

        return {
          key: counterparty.shortLabel,
          label: counterparty.label,
          shortLabel: counterparty.shortLabel,
          ratioBasisPoints: sumCostOfRiskTreemapChildren(stages),
          value: sumCostOfRiskTreemapChildren(stages, "value"),
          children: stages
        };
      });

      return {
        ...point,
        children: counterpartyChildren
      };
    }),
    referenceDate: totalWaterfall.referenceDate
  };
}

function getCostOfRiskWaterfallPointMap(waterfall) {
  return new Map((waterfall.points ?? []).map((point) => [point.code, point]));
}

function sumCostOfRiskTreemapChildren(children, field = "ratioBasisPoints") {
  return children.reduce((sum, child) => (
    sum + (Number.isFinite(child[field]) ? child[field] : 0)
  ), 0);
}

function renderCostOfRiskTreemap(treemapData, displayMode = "ratio", selectedUnit = "millions") {
  if (!elements.costOfRiskTreemap) return;

  if (!window.Highcharts?.seriesTypes?.treemap) {
    destroyCostOfRiskTreemapChart();
    elements.costOfRiskTreemap.hidden = false;
    elements.costOfRiskTreemap.textContent = "Treemap module is not available.";
    return;
  }

  const data = createCostOfRiskTreemapSeriesData(treemapData.points ?? [], displayMode);
  if (data.length === 0) {
    destroyCostOfRiskTreemapChart();
    elements.costOfRiskTreemap.textContent = "";
    elements.costOfRiskTreemap.hidden = true;
    return;
  }

  elements.costOfRiskTreemap.hidden = false;
  const options = {
    chart: {
      animation: false,
      backgroundColor: "transparent",
      spacing: [6, 6, 6, 6],
      type: "treemap"
    },
    credits: { enabled: false },
    legend: { enabled: false },
    plotOptions: {
      treemap: {
        allowTraversingTree: false,
        animation: false,
        borderColor: "#ffffff",
        borderRadius: 2,
        borderWidth: 2,
        cursor: "pointer",
        dataLabels: {
          enabled: true,
          overflow: "justify",
          style: {
            color: "#4f5b56",
            fontSize: "10px",
            fontWeight: "500",
            textOutline: "none"
          }
        },
        layoutAlgorithm: "squarified",
        layoutStartingDirection: "horizontal",
        levels: [{
          borderColor: "#ffffff",
          borderWidth: 9,
          dataLabels: {
            align: "left",
            allowOverlap: false,
            enabled: true,
            formatter() {
              const width = Math.max(48, Math.floor((this.point.shapeArgs?.width ?? 170) - 22));
              return `<span style="display:inline-block;max-width:${width}px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;border-radius:3px;background:rgba(255,255,255,0.78);color:#43514b;padding:3px 5px;">${escapeHtml(this.point.name)}</span>`;
            },
            inside: true,
            style: {
              color: "#43514b",
              fontSize: "11px",
              fontWeight: "600",
              lineHeight: "14px",
              textOutline: "none"
            },
            useHTML: true,
            verticalAlign: "top"
          },
          level: 1
        }, {
          borderColor: "#ffffff",
          borderWidth: 4,
          dataLabels: {
            enabled: false
          },
          level: 2
        }, {
          borderColor: "#ffffff",
          borderWidth: 1,
          dataLabels: {
            enabled: true,
            formatter() {
              const displayValue = this.point.custom?.displayValue;
              const label = getCostOfRiskTreemapLeafLabel(this.point);
              if (!label || !Number.isFinite(displayValue)) return "";
              return formatCostOfRiskTreemapLeafHtml(label, displayValue, displayMode, selectedUnit);
            },
            useHTML: true
          },
          level: 3
        }],
        point: {
          events: {
            click() {
              const code = this.custom?.xCode;
              if (code) selectCostOfRiskXAxisFromWaterfall(code);
            }
          }
        },
        states: {
          hover: {
            brightness: 0
          },
          inactive: {
            opacity: 1
          }
        }
      }
    },
    series: [{
      data,
      name: "Contribution",
      type: "treemap"
    }],
    title: { text: null },
    tooltip: {
      outside: true,
      pointFormatter() {
        const value = this.custom?.ratioBasisPoints;
        const displayValue = this.custom?.displayValue;
        const counterparty = this.custom?.counterparty;
        const stage = this.custom?.stage;
        const valueText = Number.isFinite(displayValue)
          ? `<span style="color:${getCostOfRiskTreemapTooltipDirectionColor(displayValue)};font-weight:700;">${getCostOfRiskTreemapArrow(displayValue)} ${formatCostOfRiskDisplayValue(displayValue, displayMode, selectedUnit)}</span>`
          : "-";
        return `${counterparty ? `<b>${escapeHtml(counterparty)}</b>` : `<b>${escapeHtml(this.name)}</b>`}${stage ? `<br>${escapeHtml(formatCostOfRiskTreemapStageLabel(stage))}` : ""}<br>${valueText}`;
      }
    }
  };

  if (costOfRiskTreemapChart) {
    costOfRiskTreemapChart.update(options, true, true, false);
  } else {
    costOfRiskTreemapChart = window.Highcharts.chart(elements.costOfRiskTreemap, options);
  }
}

function createCostOfRiskTreemapSeriesData(points, displayMode = "ratio") {
  return (points ?? []).flatMap((point) => {
    const displayValue = getCostOfRiskPointDisplayValue(point, displayMode);
    if (!Number.isFinite(displayValue) || displayValue === 0) return [];

    const parentId = `x-${point.code}`;
    const parentColor = getCostOfRiskTreemapColor(displayValue);
    const parent = {
      borderColor: "#ffffff",
      borderWidth: 9,
      color: parentColor,
      custom: {
        displayValue,
        ratioBasisPoints: point.ratioBasisPoints,
        value: point.value,
        xCode: point.code,
        xLabel: point.label
      },
      id: parentId,
      name: point.label
    };
    const children = (point.children ?? [])
      .filter((child) => Number.isFinite(getCostOfRiskPointDisplayValue(child, displayMode)) && getCostOfRiskPointDisplayValue(child, displayMode) !== 0)
      .flatMap((child) => createCostOfRiskTreemapCounterpartyData(point, child, parentId, displayMode));

    if (children.length === 0) {
      children.push({
        borderColor: "#ffffff",
        borderWidth: 1,
        color: parentColor,
        custom: {
          counterparty: "Total",
          displayValue,
          ratioBasisPoints: point.ratioBasisPoints,
          value: point.value,
          xCode: point.code,
          xLabel: point.label
        },
        id: `${parentId}-total`,
        name: "Total",
        parent: parentId,
        value: Math.max(0.01, Math.abs(displayValue))
      });
    }

    return [parent, ...children];
  });
}

function createCostOfRiskTreemapCounterpartyData(point, counterparty, parentId, displayMode = "ratio") {
  const counterpartyId = `${parentId}-${counterparty.key}`;
  const counterpartyDisplayValue = getCostOfRiskPointDisplayValue(counterparty, displayMode);
  const counterpartyNode = {
    borderColor: "#ffffff",
    borderWidth: 4,
    color: getCostOfRiskTreemapColor(counterpartyDisplayValue),
    custom: {
      counterparty: counterparty.label,
      counterpartyShortLabel: counterparty.shortLabel,
      displayValue: counterpartyDisplayValue,
      ratioBasisPoints: counterparty.ratioBasisPoints,
      value: counterparty.value,
      xCode: point.code,
      xLabel: point.label
    },
    id: counterpartyId,
    name: counterparty.label,
    parent: parentId
  };
  const stageLeaves = (counterparty.children ?? [])
    .filter((stage) => Number.isFinite(getCostOfRiskPointDisplayValue(stage, displayMode)) && getCostOfRiskPointDisplayValue(stage, displayMode) !== 0)
    .map((stage) => {
      const stageDisplayValue = getCostOfRiskPointDisplayValue(stage, displayMode);
      return {
      borderColor: "#ffffff",
      borderWidth: 1,
      color: getCostOfRiskTreemapColor(stageDisplayValue),
      custom: {
        counterparty: stage.counterpartyLabel ?? counterparty.label,
        counterpartyShortLabel: stage.counterpartyShortLabel ?? counterparty.shortLabel,
        displayValue: stageDisplayValue,
        ratioBasisPoints: stage.ratioBasisPoints,
        value: stage.value,
        stage: stage.label,
        xCode: point.code,
        xLabel: point.label
      },
      id: `${counterpartyId}-${stage.key}`,
      name: stage.label,
      parent: counterpartyId,
      value: Math.max(0.01, Math.abs(stageDisplayValue))
    };
    });

  if (stageLeaves.length === 0) {
    stageLeaves.push({
      borderColor: "#ffffff",
      borderWidth: 1,
      color: getCostOfRiskTreemapColor(counterpartyDisplayValue),
      custom: {
        counterparty: counterparty.label,
        counterpartyShortLabel: counterparty.shortLabel,
        displayValue: counterpartyDisplayValue,
        ratioBasisPoints: counterparty.ratioBasisPoints,
        value: counterparty.value,
        stage: "Total",
        xCode: point.code,
        xLabel: point.label
      },
      id: `${counterpartyId}-total`,
      name: "Total",
      parent: counterpartyId,
      value: Math.max(0.01, Math.abs(counterpartyDisplayValue))
    });
  }

  return [counterpartyNode, ...stageLeaves];
}

function getCostOfRiskTreemapColor(value) {
  return value >= 0 ? "#8fb6a8" : "#b84b43";
}

function getCostOfRiskTreemapLeafLabel(point) {
  const custom = point?.custom ?? {};
  const width = point?.shapeArgs?.width ?? 0;
  const height = point?.shapeArgs?.height ?? 0;
  if (width < 82 || height < 34) return "";

  const counterparty = custom.counterpartyShortLabel;
  const stage = custom.stage;
  const stageLabel = formatCostOfRiskTreemapStageLabel(stage);

  if (!counterparty || !stageLabel) return "";
  return `${counterparty} - ${stageLabel}`;
}

function formatCostOfRiskTreemapLeafHtml(label, value, displayMode = "ratio", selectedUnit = "millions") {
  const color = getCostOfRiskTreemapDirectionColor(value);
  const arrow = getCostOfRiskTreemapArrow(value);

  return [
    `<span style="display:block;color:white;font-weight:600;line-height:1.1;">${escapeHtml(label)}</span>`,
    `<span style="display:block;margin-top:2px;color:${color};font-weight:900;font-size:17px;line-height:1.05;">${arrow} ${formatCostOfRiskDisplayValue(value, displayMode, selectedUnit)}</span>`
  ].join("");
}

function getCostOfRiskTreemapArrow(value) {
  return value < 0 ? "▼" : "▲";
}

function getCostOfRiskTreemapDirectionColor(value) {
  return value < 0 ? "white" : "white";
}

function getCostOfRiskTreemapTooltipDirectionColor(value) {
  return value < 0 ? "#b84b43" : "#5f937f";
}

function formatCostOfRiskTreemapStageLabel(stage) {
  if (stage === "Stage 1") return "S1";
  if (stage === "Stage 2") return "S2";
  if (stage === "Stage 3") return "S3";
  return "";
}

function createManualWaterfallData(contributions) {
  const total = contributions.reduce((sum, point) => sum + point.y, 0);
  let runningTotal = 0;
  const items = [];
  const values = [0, total];

  items.push({
    color: total >= 0 ? "#8fb6a8" : primaryDark,
    contribution: total,
    end: total,
    isTotal: true,
    name: "Total contribution",
    start: 0
  });

  contributions.forEach((point) => {
    const start = runningTotal;
    const end = runningTotal + point.y;

    items.push({
      color: point.color,
      code: point.code,
      contribution: point.y,
      end,
      name: point.name,
      start
    });
    values.push(end);
    runningTotal = end;
  });

  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue;
  const padding = range > 0 ? range * 0.08 : 1;

  return {
    items,
    max: maxValue + padding,
    min: minValue - padding
  };
}

function renderManualCostOfRiskWaterfall(chart, waterfallData) {
  clearManualCostOfRiskWaterfall(chart);
  chart.customCostOfRiskWaterfallData = waterfallData;

  const items = waterfallData.items ?? [];
  const xAxis = chart.xAxis[0];
  const yAxis = chart.yAxis[0];
  const horizontalLayout = getCostOfRiskWaterfallHorizontalLayout(chart, items, waterfallData);
  const slotWidth = horizontalLayout.slotWidth;
  const barWidthRatio = waterfallData.barWidthRatio ?? 0.56;
  const barWidth = Math.max(14, Math.min(46, slotWidth * barWidthRatio));
  const elements = [];

  items.forEach((item, index) => {
    if (item.isSpacer) return;

    const selectedCode = waterfallData.selectedCode ?? activeCostOfRiskXAxisCode;
    const isSelected = item.code && item.code === selectedCode;
    const xCenter = horizontalLayout.getXCenter(index, xAxis);
    const x = xCenter - barWidth / 2;
    const startY = yAxis.toPixels(item.start, false);
    const endY = yAxis.toPixels(item.end, false);
    const top = Math.min(startY, endY);
    const height = Math.max(1, Math.abs(endY - startY));
    const labelY = top - 16;

    if (item.groupLabel) {
      const groupLabel = chart.renderer
        .text(item.groupLabel, xCenter, chart.plotTop - (waterfallData.groupLabelOffset ?? 2))
        .css({
          color: "#5f6b65",
          fontSize: waterfallData.groupLabelFontSize || "10px",
          fontWeight: "600"
        })
        .attr({
          align: "center",
          zIndex: 7
        })
        .add();
      elements.push(groupLabel);
    }

    if (isSelected) {
  const bandWidth = slotWidth * 0.88;
  const bandX = xCenter - bandWidth / 2;

  const selectedBand = chart.renderer
    .rect(
      bandX,
      chart.plotTop,
      bandWidth,
      chart.plotHeight,
      4
    )
    .attr({
      fill: "#f3f5f4",
      stroke: "none",
      zIndex: 1
    })
    .add();

  elements.push(selectedBand);
}

    const shapePath = createCostOfRiskWaterfallArrowPath(
        x,
        top,
        barWidth,
        height,
        item.contribution
      );
    const shape = shapePath
      ? chart.renderer.path(shapePath)
      : chart.renderer.rect(x, top, barWidth, height, 3);
    shape
      .attr({
        fill: item.color,
            stroke: primaryDark,
        "stroke-width": isSelected ? 2 : 1,
        zIndex: isSelected ? 8 : 6
      })
      .add();
    const label = chart.renderer
      .text(formatManualWaterfallValue(item.contribution, waterfallData), xCenter, Math.max(chart.plotTop + 10, labelY))
      .css({
        color: primaryDark,
        fontSize: "10px",
        fontWeight: isSelected ? "700" : "500"
      })
      .attr({
        align: "center",
        zIndex: 7
      })
      .add();

    elements.push(shape, label);

    if (item.code) {
      [shape, label].forEach((element) => {
        element.css({ cursor: "pointer" });
        element.on("click", () => selectCostOfRiskXAxisFromWaterfall(item.code));
      });
    }

    const axisLabel = renderCostOfRiskWaterfallAxisLabel(chart, item, xCenter);
    if (axisLabel) elements.push(axisLabel);

    if (!item.isTotal && index < items.length - 1 && !items[index + 1]?.isTotal && !items[index + 1]?.isSpacer && !items[index + 1]?.groupLabel) {
      const nextXCenter = horizontalLayout.getXCenter(index + 1, xAxis);
      const connectorY = yAxis.toPixels(item.end, false);
      const connector = chart.renderer
        .path([
          ["M", xCenter + barWidth / 2, connectorY],
          ["L", nextXCenter - barWidth / 2, connectorY]
        ])
        .attr({
          stroke: "#9ea8a2",
          "stroke-dasharray": "4 4",
          "stroke-width": 1,
          zIndex: 5
        })
        .add();
      elements.push(connector);
    }
  });

  chart.customCostOfRiskWaterfall = elements;
}

function getCostOfRiskWaterfallHorizontalLayout(chart, items, waterfallData) {
  if (!waterfallData.compactGroups) {
    return {
      getXCenter: (index, xAxis) => xAxis.toPixels(index, false),
      slotWidth: items.length ? chart.plotWidth / items.length : 0
    };
  }

  const itemGap = waterfallData.itemGapUnits ?? 0.6;
  const groupGap = waterfallData.groupGapUnits ?? 0.7;
  const unitsByIndex = [];
  let cursor = 0;
  let previousGroupIndex = null;

  items.forEach((item, index) => {
    if (item.isSpacer) {
      unitsByIndex[index] = null;
      return;
    }

    if (previousGroupIndex !== null && item.groupIndex !== previousGroupIndex) {
      cursor += groupGap;
    }

    unitsByIndex[index] = cursor;
    cursor += itemGap;
    previousGroupIndex = item.groupIndex;
  });

  const usedUnits = unitsByIndex.filter((unit) => unit !== null);
  const maxUnit = usedUnits.length > 0 ? Math.max(...usedUnits) : 0;
  const slotWidth = chart.plotWidth / Math.max(1, maxUnit + 1);

  return {
    getXCenter: (index, xAxis) => {
      const unit = unitsByIndex[index];
      if (unit === null || unit === undefined) return xAxis.toPixels(index, false);
      return chart.plotLeft + (unit + 0.5) * slotWidth;
    },
    slotWidth
  };
}

function formatManualWaterfallValue(value, waterfallData) {
  if (typeof waterfallData.valueFormatter === "function") {
    return waterfallData.valueFormatter(value);
  }
  return `${value > 0 ? "+" : ""}${value.toFixed(1)} bp`;
}

function renderCostOfRiskWaterfallAxisLabel(chart, item, xCenter) {
  const lines = getCostOfRiskWaterfallLabelLines(item.axisLabel || item.name);
  if (lines.length === 0) return null;

  const isSelected = item.code && item.code === activeCostOfRiskXAxisCode;
  const waterfallData = chart.customCostOfRiskWaterfallData ?? {};
  const label = chart.renderer
    .text(lines.map(escapeHtml).join("<br/>"), xCenter, chart.plotTop + chart.plotHeight + 24)
    .css({
      color: waterfallData.axisLabelColor || (isSelected ? "#24352d" : "#5f6b65"),
      cursor: item.code ? "pointer" : "default",
      fontSize: waterfallData.axisLabelFontSize || "9px",
      fontWeight: isSelected ? "700" : "500",
      lineHeight: waterfallData.axisLabelLineHeight || "12px",
      textAlign: "center"
    })
    .attr({
      align: "center",
      zIndex: 9
    })
    .add();

  if (item.code) {
    label.on("click", () => selectCostOfRiskXAxisFromWaterfall(item.code));
  }

  return label;
}

function createCostOfRiskWaterfallArrowPath(x, top, width, height, contribution) {
  if (height < 8) {
    return [
      ["M", x, top],
      ["L", x + width, top],
      ["L", x + width, top + height],
      ["L", x, top + height],
      ["Z"]
    ];
  }

  const isPositive = contribution >= 0;
  const bottom = top + height;
  const headHeight = Math.min(18, Math.max(7, height * 0.34));
  const bodyInset = width * 0.18;
  const leftBody = x + bodyInset;
  const rightBody = x + width - bodyInset;
  const center = x + width / 2;

  if (isPositive) {
    const headBase = top + headHeight;
    return [
      ["M", center, top],
      ["L", x + width, headBase],
      ["L", rightBody, headBase],
      ["L", rightBody, bottom],
      ["L", leftBody, bottom],
      ["L", leftBody, headBase],
      ["L", x, headBase],
      ["Z"]
    ];
  }

  const headBase = bottom - headHeight;
  return [
    ["M", leftBody, top],
    ["L", rightBody, top],
    ["L", rightBody, headBase],
    ["L", x + width, headBase],
    ["L", center, bottom],
    ["L", x, headBase],
    ["L", leftBody, headBase],
    ["Z"]
  ];
}

function getSelectedCostOfRiskWaterfallColor(item) {
  if (item.contribution < 0) return "#b84b43";
  return "#8fb6a8";
}

function getSelectedCostOfRiskWaterfallStroke(item) {
  if (item.contribution < 0) return "#8f312b";
  return "#5f937f";
}

function selectCostOfRiskXAxisFromWaterfall(code) {
  if (!code || code === activeCostOfRiskXAxisCode) return;

  activeCostOfRiskXAxisCode = code;
  if (elements.costOfRiskXAxis) {
    elements.costOfRiskXAxis.value = code;
  }
  if (latestState) renderAppState(latestState);
}

function wrapCostOfRiskWaterfallLabel(value) {
  const code = getCostOfRiskWaterfallLabelCode(value);
  const label = getCostOfRiskWaterfallLabelLines(value).map(escapeHtml).join("<br>");
  if (!code) return label;

  const isSelected = code === activeCostOfRiskXAxisCode;
  return `<span class="cost-risk-waterfall-x-label" data-x-code="${escapeHtml(code)}" style="cursor:pointer;pointer-events:auto;font-weight:${isSelected ? "700" : "500"};color:${isSelected ? "#24352d" : "#5f6b65"}">${label}</span>`;
}

function getCostOfRiskWaterfallLabelLines(value) {
  const text = String(value ?? "").replace(/^\d{4}\s+-\s+/, "");
  const explicitLines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  if (explicitLines.length > 1) return explicitLines.slice(0, 4);

  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let currentLine = "";

  words.forEach((word) => {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (candidate.length > 15 && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = candidate;
    }
  });

  if (currentLine) lines.push(currentLine);
  return lines.slice(0, 4);
}

function getCostOfRiskWaterfallLabelCode(value) {
  const match = String(value ?? "").match(/^(\d{4})\s+-\s+/);
  return match?.[1] ?? "";
}

function wireCostOfRiskWaterfallAxisLabels(chart) {
  if (chart.customCostOfRiskAxisLabelClickHandler) return;

  chart.customCostOfRiskAxisLabelClickHandler = (event) => {
    const target = event.target?.nodeType === Node.TEXT_NODE
      ? event.target.parentElement
      : event.target;
    const label = target?.closest?.(".cost-risk-waterfall-x-label");
    if (!label || !chart.renderTo.contains(label)) return;

    event.preventDefault();
    event.stopPropagation();
    selectCostOfRiskXAxisFromWaterfall(label.dataset.xCode);
  };

  chart.renderTo.addEventListener("click", chart.customCostOfRiskAxisLabelClickHandler, true);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function clearManualCostOfRiskWaterfall(chart) {
  if (!Array.isArray(chart.customCostOfRiskWaterfall)) return;

  chart.customCostOfRiskWaterfall.forEach((element) => element.destroy());
  chart.customCostOfRiskWaterfall = [];
}

function destroyCostOfRiskWaterfallChart() {
  if (!costOfRiskWaterfallChart) return;
  costOfRiskWaterfallChart.destroy();
  costOfRiskWaterfallChart = null;
}

function destroyCostOfRiskTreemapChart() {
  if (!costOfRiskTreemapChart) return;
  costOfRiskTreemapChart.destroy();
  costOfRiskTreemapChart = null;
}

function getCostOfRiskSeriesColor(index, isSelected, selectedContribution = 0) {
  if (isSelected) {
    return primaryDark;
  }
  return COST_OF_RISK_BENCHMARK_GRAYS[index % COST_OF_RISK_BENCHMARK_GRAYS.length];
}

function getCostOfRiskSeriesDash(index, isSelected) {
  if (isSelected) return "Solid";
  return COST_OF_RISK_BENCHMARK_DASHES[index % COST_OF_RISK_BENCHMARK_DASHES.length];
}

function createCostOfRiskChartData(points, displayMode = "ratio") {
  return points
    .filter((point) => point.date instanceof Date && Number.isFinite(displayMode === "ratio" ? point.smoothedRatioBasisPoints : point.smoothedValue))
    .map((point) => ({
      referenceLabel: point.label,
      x: point.date.getTime(),
      y: displayMode === "ratio" ? point.smoothedRatioBasisPoints : point.smoothedValue
    }));
}

function createCostOfRiskRatioChartData(points, displayMode = "ratio") {
  return (points ?? [])
    .filter((point) => point.date instanceof Date && Number.isFinite(getCostOfRiskPointDisplayValue(point, displayMode)))
    .map((point) => ({
      referenceLabel: point.label,
      x: point.date.getTime(),
      y: getCostOfRiskPointDisplayValue(point, displayMode)
    }));
}

function renderCostOfRiskEndpointLabels(chart, selectedJst) {
  clearCostOfRiskEndpointLabels(chart);

  const candidates = chart.series
    .filter((serie) => serie.visible && serie.points?.length > 0)
    .map((serie) => {
      const point = [...serie.points]
        .reverse()
        .find((candidate) => Number.isFinite(candidate.plotX) && Number.isFinite(candidate.plotY));

      if (!point) return null;

      return {
        anchorX: chart.plotLeft + point.plotX,
        anchorY: chart.plotTop + point.plotY,
        color: serie.color,
        isSelected: serie.name === selectedJst,
        name: serie.name
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.anchorY - right.anchorY);

  if (candidates.length === 0) return;

  const top = chart.plotTop + 4;
  const bottom = chart.plotTop + chart.plotHeight - 12;
  const availableHeight = Math.max(1, bottom - top);
  const gap = candidates.length <= 1 ? 0 : Math.max(11, Math.min(18, availableHeight / (candidates.length - 1)));
  let previousY = top - gap;

  candidates.forEach((candidate) => {
    candidate.labelY = Math.max(candidate.anchorY, previousY + gap);
    previousY = candidate.labelY;
  });

  const overflow = candidates.at(-1).labelY - bottom;
  if (overflow > 0) {
    candidates.forEach((candidate) => {
      candidate.labelY -= overflow;
    });
  }

  for (let index = candidates.length - 2; index >= 0; index -= 1) {
    candidates[index].labelY = Math.min(candidates[index].labelY, candidates[index + 1].labelY - gap);
  }

  const underflow = top - candidates[0].labelY;
  if (underflow > 0) {
    candidates.forEach((candidate) => {
      candidate.labelY += underflow;
    });
  }

  const labelX = Math.min(chart.chartWidth - 54, chart.plotLeft + chart.plotWidth + 18);
  chart.customCostOfRiskEndpointLabels = [];

  candidates.forEach((candidate) => {
    const targetY = Math.max(top, Math.min(bottom, candidate.labelY));
    const connectorEndX = labelX - 5;
    const connector = chart.renderer
      .path([
        ["M", candidate.anchorX, candidate.anchorY],
        ["L", connectorEndX, targetY]
      ])
      .attr({
        stroke: candidate.color,
        "stroke-dasharray": "4 4",
        "stroke-width": candidate.isSelected ? 1.35 : 1,
        opacity: candidate.isSelected ? 0.95 : 0.78,
        zIndex: candidate.isSelected ? 80 : 70
      })
      .add();
    const label = chart.renderer
      .label(candidate.name, labelX, targetY - 9, "rect")
      .css({
        color: candidate.color,
        fontSize: candidate.isSelected ? "11px" : "10px",
        fontWeight: candidate.isSelected ? "700" : "600"
      })
      .attr({
        fill: "rgba(255, 255, 255, 0.92)",
        padding: 2,
        r: 3,
        stroke: candidate.isSelected ? candidate.color : "rgba(255,255,255,0)",
        "stroke-width": candidate.isSelected ? 1 : 0,
        zIndex: candidate.isSelected ? 90 : 75
      })
      .add();

    chart.customCostOfRiskEndpointLabels.push(connector, label);
  });
}

function clearCostOfRiskEndpointLabels(chart) {
  if (!Array.isArray(chart.customCostOfRiskEndpointLabels)) return;

  chart.customCostOfRiskEndpointLabels.forEach((element) => element.destroy());
  chart.customCostOfRiskEndpointLabels = [];
}

function getCostOfRiskYAxisBounds(series) {
  const values = series
    .flatMap((serie) => serie.data.map((point) => point.y))
    .filter((value) => Number.isFinite(value));

  if (values.length === 0) return { max: undefined, min: undefined };

  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue;
  const padding = range > 0 ? range * 0.015 : Math.max(Math.abs(maxValue) * 0.015, 0.5);

  return {
    max: maxValue + padding,
    min: minValue - padding
  };
}

function clampCostOfRiskSmoothingWindow(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 1;
  return Math.max(1, Math.min(4, Math.round(parsed)));
}

function formatCostOfRiskSmoothingLabel(windowSize) {
  return `${windowSize}Q`;
}

function formatReferenceQuarterLabel(label) {
  const match = String(label ?? "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return label || "-";

  const [, , month, year] = match;
  const quarter = Math.max(1, Math.min(4, Math.ceil(Number(month) / 3)));
  return `Q${quarter} ${year}`;
}

function getSelectedSmoothedCostOfRiskPoint(points, smoothingWindow, referenceDate) {
  const smoothedPoints = smoothCostOfRiskPoints(points ?? [], smoothingWindow);
  return smoothedPoints.find((point) => point.label === referenceDate) ?? smoothedPoints.at(-1) ?? null;
}

function selectCostOfRiskReferenceDate(referenceDate) {
  if (!referenceDate || referenceDate === activeCostOfRiskReferenceDate) return;

  activeCostOfRiskReferenceDate = referenceDate;
  if (latestState) renderAppState(latestState);
}

function selectCostOfRiskAuditSeries(seriesName, referenceDate) {
  if (seriesName) activeCostOfRiskAuditSeries = seriesName;
  if (referenceDate) activeCostOfRiskReferenceDate = referenceDate;
  if (latestState) renderAppState(latestState);
}

function renderCostOfRiskAuditTable(audit, selectedUnit) {
  if (!elements.costOfRiskAudit) return;

  const rows = (audit?.rows ?? []).filter((row) => {
    if (activeCostOfRiskAuditSeries === "f2") return row.section === "F2" || row.section === "Denominator" || row.section === "Denominator components";
    return row.section === "F12" || row.section === "F12 components" || row.section === "Denominator" || row.section === "Denominator components";
  });
  const dates = audit?.dates ?? [];

  if (rows.length === 0 || dates.length === 0) {
    elements.costOfRiskAudit.textContent = "";
    return;
  }

  const activeDateIndex = Math.max(0, dates.findIndex((date) => date.label === activeCostOfRiskReferenceDate));
  const activeDate = dates[activeDateIndex] ?? dates.at(-1);
  const title = document.createElement("div");
  title.className = "cost-of-risk-audit-title";
  const titlePrefix = activeCostOfRiskAuditSeries === "f2"
    ? "Audit trail - F2"
    : "Audit trail - F12 selected contributions";
  title.textContent = `${titlePrefix} - ${formatReferenceQuarterLabel(activeDate?.label)}`;

  const tableWrap = document.createElement("div");
  tableWrap.className = "cost-of-risk-audit-table-wrap";
  const table = document.createElement("table");
  table.className = "cost-of-risk-audit-table";
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  ["Step", "Component", "Source", "Selected date", "Value"].forEach((label) => {
    const cell = document.createElement("th");
    cell.scope = "col";
    cell.textContent = label;
    headerRow.append(cell);
  });
  thead.append(headerRow);

  const tbody = document.createElement("tbody");
  rows.forEach((row) => {
    const tr = document.createElement("tr");
    const sectionCell = document.createElement("td");
    sectionCell.className = "cost-of-risk-audit-section";
    sectionCell.textContent = row.section;
    const labelCell = document.createElement("td");
    labelCell.className = "cost-of-risk-audit-label";
    labelCell.textContent = row.label;
    const sourceCell = document.createElement("td");
    sourceCell.className = "cost-of-risk-audit-source";
    sourceCell.textContent = row.source;
    const dateCell = document.createElement("td");
    dateCell.className = "cost-of-risk-audit-date";
    dateCell.textContent = formatReferenceQuarterLabel(activeDate?.label);
    const valueCell = document.createElement("td");
    valueCell.className = "cost-of-risk-audit-value is-active-reference";
    valueCell.textContent = formatCostOfRiskAuditValue(row.values?.[activeDateIndex], row.type, selectedUnit);
    tr.append(sectionCell, labelCell, sourceCell, dateCell, valueCell);
    tbody.append(tr);
  });

  table.append(thead, tbody);
  tableWrap.append(table);
  elements.costOfRiskAudit.replaceChildren(title, tableWrap);
}

function clearCostOfRiskAuditTable() {
  if (!elements.costOfRiskAudit) return;
  elements.costOfRiskAudit.textContent = "";
}

function formatCostOfRiskAuditValue(value, type, selectedUnit) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "-";
  if (type === "bp") return formatBasisPointsValue(value);
  return formatMetricValue(value, selectedUnit || "millions");
}

function smoothCostOfRiskPoints(points, smoothingWindow) {
  const windowSize = clampCostOfRiskSmoothingWindow(smoothingWindow);
  if (windowSize <= 1) {
    return points.map((point) => ({
      ...point,
      smoothedRatioBasisPoints: point.ratioBasisPoints,
      smoothedValue: point.value
    }));
  }

  return points.map((point, index) => {
    const windowValues = points
      .slice(Math.max(0, index - windowSize + 1), index + 1)
      .map((candidate) => candidate.ratioBasisPoints)
      .filter((value) => Number.isFinite(value));
    const windowAmountValues = points
      .slice(Math.max(0, index - windowSize + 1), index + 1)
      .map((candidate) => candidate.value)
      .filter((value) => Number.isFinite(value));

    return {
      ...point,
      smoothedRatioBasisPoints: windowValues.length
        ? windowValues.reduce((total, value) => total + value, 0) / windowValues.length
        : null,
      smoothedValue: windowAmountValues.length
        ? windowAmountValues.reduce((total, value) => total + value, 0) / windowAmountValues.length
        : null
    };
  });
}

function renderCet1(state) {
  const snapshot = getCet1RatioSnapshot(state);
  if (!elements.cet1Empty || !elements.cet1Dashboard) return;

  if (snapshot.status) {
    elements.cet1Empty.hidden = false;
    elements.cet1Empty.textContent = snapshot.status;
    elements.cet1Dashboard.hidden = true;
    return;
  }

  elements.cet1Empty.hidden = true;
  elements.cet1Dashboard.hidden = false;
  elements.cet1RatioValue.textContent = formatPercentValue(snapshot.ratio.currentValue);
  elements.cet1RatioContext.textContent = `${snapshot.jstCode} - ${snapshot.currentDateLabel}`;
  elements.cet1RatioChange.textContent = formatBasisPointChange(snapshot.ratio.changeBasisPoints);
  elements.cet1RatioChangeContext.textContent = `vs ${snapshot.previousDateLabel}`;
  elements.cet1NumeratorValue.textContent = formatCet1Amount(snapshot.numerator.currentValue, state.selectedUnit);
  elements.cet1NumeratorContext.textContent = `C_01.00 - ${snapshot.currentDateLabel}`;
  elements.cet1DenominatorValue.textContent = formatCet1Amount(snapshot.denominator.currentValue, state.selectedUnit);
  elements.cet1DenominatorContext.textContent = `C_02.00 - ${snapshot.currentDateLabel}`;
}

function getCet1RatioSnapshot(state) {
  const indexes = getCet1RequiredIndexes(state.columns);
  if (!indexes || !state.selectedJst) {
    return { status: "Load a CSV and select a JST." };
  }

  const referenceColumns = getCet1ReferenceColumns(state.columns);
  const latestReferenceColumn = referenceColumns.at(-1);
  const previousReferenceColumn = referenceColumns.at(-2);
  if (!latestReferenceColumn || !previousReferenceColumn) {
    return { status: "At least two reference dates are required to compute the CET1 movement." };
  }

  const ratio = getCet1DataPoint(state, indexes, {
    tableId: "C_03.00",
    xCode: "0010",
    yCode: "0010"
  }, latestReferenceColumn, previousReferenceColumn);
  const numerator = getCet1DataPoint(state, indexes, {
    tableId: "C_01.00",
    yCode: "0020"
  }, latestReferenceColumn, previousReferenceColumn);
  const denominator = getCet1DataPoint(state, indexes, {
    tableId: "C_02.00",
    xCode: "0010",
    yCode: "0010"
  }, latestReferenceColumn, previousReferenceColumn);

  if (!ratio) {
    return { status: "CET1 capital ratio is not available for the selected JST." };
  }
  if (!numerator) {
    return { status: "Common Equity Tier 1 capital is not available for the selected JST." };
  }
  if (!denominator) {
    return { status: "Total risk exposure amount is not available for the selected JST." };
  }

  return {
    currentDateLabel: formatCet1ReferenceDate(latestReferenceColumn.date),
    jstCode: state.selectedJst,
    denominator,
    numerator,
    previousDateLabel: formatCet1ReferenceDate(previousReferenceColumn.date),
    ratio: {
      ...ratio,
      changeBasisPoints: calculateBasisPointChange(ratio.currentValue, ratio.previousValue)
    }
  };
}

function getCet1DataPoint(state, indexes, coordinates, latestReferenceColumn, previousReferenceColumn) {
  const matchedRows = state.rows.filter((row) => (
    row[indexes.jstCode] === state.selectedJst
    && row[indexes.tableId] === coordinates.tableId
    && matchesCet1Axis(row, indexes, "x", coordinates.xCode)
    && matchesCet1Axis(row, indexes, "y", coordinates.yCode)
    && matchesCet1Axis(row, indexes, "z", coordinates.zCode)
  ));

  if (matchedRows.length === 0) return null;

  const currentValue = sumCet1Rows(matchedRows, latestReferenceColumn.index);
  const previousValue = sumCet1Rows(matchedRows, previousReferenceColumn.index);
  if (currentValue === null || previousValue === null) return null;

  return {
    currentValue,
    previousValue
  };
}

function matchesCet1Axis(row, indexes, axis, code) {
  if (!code) return true;
  const index = indexes[`${axis}AxisRcCode`];
  if (index === -1 || index === undefined) return false;
  return normalizeAxisCode(row[index], axis) === normalizeAxisCode(code, axis);
}

function sumCet1Rows(rows, columnIndex) {
  const values = rows
    .map((row) => parseCet1NumericValue(row[columnIndex]))
    .filter((value) => value !== null);

  if (values.length === 0) return null;
  return values.reduce((total, value) => total + value, 0);
}

function getCet1RequiredIndexes(columns) {
  const indexes = {
    jstCode: columns.indexOf("jst_code"),
    tableId: columns.indexOf("table_id"),
    xAxisRcCode: columns.indexOf("x_axis_rc_code"),
    yAxisRcCode: columns.indexOf("y_axis_rc_code"),
    zAxisRcCode: columns.indexOf("z_axis_rc_code")
  };

  return [indexes.jstCode, indexes.tableId, indexes.xAxisRcCode, indexes.yAxisRcCode]
    .every((index) => index !== -1)
    ? indexes
    : null;
}

function getCet1ReferenceColumns(columns) {
  return columns
    .map((name, index) => {
      const match = String(name).match(/^ref_(\d{4})_(\d{2})_(\d{2})$/);
      if (!match) return null;

      const [, year, month, day] = match;
      return {
        date: new Date(Number(year), Number(month) - 1, Number(day)),
        index
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.date - right.date);
}

function parseCet1NumericValue(value) {
  const parsed = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function formatCet1ReferenceDate(date) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}

function calculateBasisPointChange(currentValue, previousValue) {
  const valuesLookLikeFractions = Math.abs(currentValue) <= 1 && Math.abs(previousValue) <= 1;
  return (currentValue - previousValue) * (valuesLookLikeFractions ? 10000 : 100);
}

function formatBasisPointChange(value) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0
  }).format(value)} bp`;
}

function formatBasisPointsValue(value) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "-";

  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0
  }).format(value)} bp`;
}

function formatCet1Amount(value, selectedUnit) {
  return formatMetricValue(value, selectedUnit || "millions");
}

function createModule2TemplateContext() {
  return {
    activeAxis: "y",
    defaultExpandedPathsInitialized: false,
    expandedPaths: new Set(),
    scrollByAxis: {
      template: { left: 0, top: 0 },
      x: { left: 0, top: 0 },
      y: { left: 0, top: 0 },
      z: { left: 0, top: 0 }
    },
    searchByAxis: {
      template: "",
      x: "",
      y: "",
      z: ""
    },
    contributionBaseByAxis: {
      template: null,
      x: null,
      y: null,
      z: null
    },
    selectedXCode: "",
    selectedYCode: "",
    selectedZCode: ""
  };
}

function getActiveModule2Template() {
  const templates = getModule2Templates(latestState);
  return templates.find((template) => template.tableId === activeModule2TemplateId) ?? templates[0] ?? {
    tableId: activeModule2TemplateId || MODULE_2_TARGET.tableId,
    label: activeModule2TemplateId || MODULE_2_TARGET.tableId
  };
}

function getActiveModule2Context() {
  return getModule2ContextForTemplate(activeModule2TemplateId);
}

const MODULE_2_TEMPLATE_LABELS = {

  // ------------------------------------------------------------------
  // COREP
  // ------------------------------------------------------------------

  "C_01.00": "Own funds",
  "C_02.00": "Total risk exposure amount",
  "C_03.00": "Capital ratios",
  "C_04.00": "Memorandum items",
  "C_05.01": "Transitional provisions",
  "C_05.02": "Transitional provisions - details",

  "C_07.00": "Credit risk - Standardised approach",

  "C_08.01": "Credit risk - IRB approach",
  "C_08.02": "IRB - Exposure classes",
  "C_08.03": "IRB - Risk parameters",
  "C_08.04": "IRB - Specialised lending",
  "C_08.05": "IRB - Equity exposures",
  "C_08.06": "IRB - Slotting approach",
  "C_08.07": "IRB - Expected loss",

  "C_09.01": "SA geographical distribution",
  "C_09.02": "IRB geographical distribution",

  "C_10.00": "Equity exposures",
  "C_10.01": "Equity exposures - IRB",

  "C_11.00": "Settlement / delivery risk",

  "C_13.01": "Securitisation positions",
  "C_14.00": "Securitisation - Standardised approach",
  "C_15.00": "Securitisation - IRB approach",

  "C_16.00": "Operational risk",
  "C_17.01": "Operational losses",
  "C_17.02": "Operational loss events",

  "C_18.00": "Market risk",
  "C_19.00": "Position risk",
  "C_20.00": "Foreign exchange risk",
  "C_21.00": "Commodity risk",
  "C_22.00": "Options risk",
  "C_23.00": "CVA risk",
  "C_24.00": "Market risk - Internal models",
  "C_25.00": "Market risk summary",

  "C_26.00": "Large exposures",
  "C_27.00": "Large exposures - Groups of connected clients",
  "C_28.00": "Large exposures - Top exposures",
  "C_29.00": "Large exposures - Breakdown",

  "C_32.01": "Prudent valuation",
  "C_32.02": "Prudent valuation - AVAs",
  "C_32.03": "Prudent valuation - Summary",
  "C_32.04": "Prudent valuation - Details",

  "C_33.00": "Exposures to central governments",

  "C_34.01": "Counterparty credit risk",
  "C_34.02": "CCR - Standardised approach",
  "C_34.03": "CCR - IMM",
  "C_34.04": "CCR - CVA",
  "C_34.05": "CCR - Securities financing transactions",
  "C_34.06": "CCR - Cleared transactions",
  "C_34.07": "CCR - Margining",
  "C_34.08": "CCR - Netting sets",
  "C_34.09": "CCR - Exposures",
  "C_34.10": "CCR - Risk measures",
  "C_34.11": "CCR - Summary",

  "C_35.01": "Non-performing exposures (LC1)",
  "C_35.02": "Non-performing exposures (LC2)",
  "C_35.03": "Non-performing exposures (LC3)",

  "C_40.00": "Leverage ratio",

  "C_43.00": "Leverage ratio - Exposure measure",
  "C_44.00": "Leverage ratio - Breakdown",
  "C_45.00": "Leverage ratio - SFT",
  "C_46.00": "Leverage ratio - Derivatives",
  "C_47.00": "Leverage ratio - Off-balance sheet",
  "C_48.00": "Leverage ratio - Additional disclosures",

  "C_66.00": "Liquidity coverage ratio",
  "C_67.00": "LCR - Outflows",
  "C_68.00": "LCR - Inflows",
  "C_69.00": "LCR - Summary",
  "C_70.00": "LCR - Additional items",
  "C_71.00": "LCR - Currency breakdown",
  "C_72.00": "LCR - Concentration",
  "C_73.00": "LCR - Operational deposits",
  "C_74.00": "LCR - Secured lending",
  "C_75.00": "LCR - Collateral swaps",
  "C_76.00": "LCR - Liquidity buffer",
  "C_77.00": "LCR - Monitoring metrics",

  "C_80.00": "Net Stable Funding Ratio",
  "C_81.00": "Available Stable Funding",
  "C_82.00": "Required Stable Funding",
  "C_83.00": "NSFR - Additional information",
  "C_84.00": "NSFR summary",

  "C_90.00": "Threshold-based treatment",
  "C_91.00": "Alternative Standardised Approach",

  // ------------------------------------------------------------------
  // FINREP
  // ------------------------------------------------------------------

  "F_01.01": "Balance sheet - Assets",
  "F_01.02": "Balance sheet - Liabilities",
  "F_01.03": "Balance sheet - Equity",

  "F_02.00": "Statement of profit or loss",
  "F_03.00": "Statement of comprehensive income",

  "F_04.01": "Financial assets by instrument",
  "F_04.02": "Loans and advances",
  "F_04.03": "Debt securities",
  "F_04.04.1": "Financial assets at amortised cost",
  "F_04.04.2": "Impairment movements",
  "F_04.05": "Collateral and guarantees",
  "F_04.06": "Financial assets - Additional breakdown",
  "F_04.07": "Purchased or originated credit-impaired assets",
  "F_04.08": "Forborne exposures",
  "F_04.09": "Non-performing exposures",
  "F_04.10": "Financial assets - Summary",

  "F_05.01": "Loans and advances by product",

  "F_06.01": "Loans by NACE activity",

  "F_07.01": "Past-due exposures",
  "F_07.02": "Past-due exposures - Details",

  "F_08.01": "Financial liabilities",
  "F_08.02": "Financial liabilities - Details",

  "F_09.01": "Loan commitments",
  "F_09.02": "Financial guarantees",

  "F_10.00": "Derivatives",
  "F_11.01": "Hedge accounting",
  "F_11.02": "Hedging instruments",
  "F_11.03": "Hedged items",
  "F_11.04": "Hedge effectiveness",

  "F_12.00": "Movements in loss allowances",
  "F_12.01": "Stage transfers",
  "F_12.02": "Changes in gross carrying amount",

  "F_13.01": "Collateral and guarantees received",
  "F_13.02": "Collateral by type",
  "F_13.03": "Guarantees received",

  "F_14.00": "Fair value hierarchy",

  "F_15.00": "Derecognition and continuing involvement",
  "F_16.00": "Transferred financial assets",

  "F_17.01": "Reconciliation IFRS / CRR",
  "F_17.02": "Reconciliation of provisions",
  "F_17.03": "Reconciliation details",

  "F_18.00": "Performing and non-performing exposures",
  "F_18.01": "Performing / non-performing by instrument",
  "F_18.02": "Loans secured by immovable property",

  "F_19.00": "Forborne exposures",

  "F_20.01": "Geographical distribution by residence",
  "F_20.02": "Geographical distribution by location",
  "F_20.03": "Country breakdown",
  "F_20.04": "Geographical analysis",

  "F_21.00": "Leases",

  "F_22.00": "Fee and commission income",

  "F_23.01": "Number of instruments",
  "F_23.02": "Number of collateral items",
  "F_23.03": "Number of guarantees",

  "F_24.01": "Loan origination",
  "F_24.02": "Loan servicing",

  "F_25.01": "Collateral obtained",
  "F_25.02": "Collateral by asset type",
  "F_25.03": "Foreclosed assets",

  "F_41.00": "Fair value hierarchy",
  "F_42.00": "Financial guarantees received",
  "F_43.00": "Provisions",
  "F_44.00": "Commitments",
  "F_45.00": "Equity instruments",
  "F_46.00": "Statement of changes in equity",

  "F_47.00": "Average duration and recoveries"

};

function getModule2TemplateLabel(tableId) {
  const description = MODULE_2_TEMPLATE_LABELS[tableId];
  return description ? `${tableId} - ${description}` : tableId;
}

function getModule2Templates(state = latestState) {
  const tableIds = getModule2TableIds(state);

  return tableIds.map((tableId) => ({
    tableId,
    label: getModule2TemplateLabel(tableId)
  }));
}

function getModule2TableIds(state) {
  if (!state) return [];

  const indexedTableIds = getIndexedTableIds(state);
  if (indexedTableIds.length > 0 || state.dataIndexes) return indexedTableIds;

  const indexes = getModule2SourceIndexes(state.columns);
  if (!indexes || !state.selectedJst) return [];

  return [...new Set(state.rows
    .filter((row) => row[indexes.jstCode] === state.selectedJst)
    .map((row) => row[indexes.tableId])
    .filter(Boolean))]
    .sort((left, right) => left.localeCompare(right, "fr", { numeric: true }));
}

function ensureActiveModule2Template(state) {
  const templates = getModule2Templates(state);
  if (templates.length === 0) return;

  if (!hasAppliedUrlTemplate) {
    hasAppliedUrlTemplate = true;
    const urlTemplateId = findMatchingModule2TemplateId(templates, getUrlTemplateParam());
    if (urlTemplateId) {
      activeModule2TemplateId = urlTemplateId;
      return;
    }
  }

  if (templates.some((template) => template.tableId === activeModule2TemplateId)) return;

  activeModule2TemplateId = templates[0].tableId;
  updateUrlTemplateParam(activeModule2TemplateId);
}

function getUrlTemplateParam() {
  return new URLSearchParams(window.location.search).get(TEMPLATE_URL_PARAM) ?? "";
}

function updateUrlTemplateParam(templateId) {
  const url = new URL(window.location.href);
  if (templateId) {
    url.searchParams.set(TEMPLATE_URL_PARAM, templateId);
  } else {
    url.searchParams.delete(TEMPLATE_URL_PARAM);
  }
  window.history.replaceState({}, "", url);
}

function findMatchingModule2TemplateId(templates, requestedTemplateId) {
  if (!requestedTemplateId) return "";

  const exactMatch = templates.find((template) => template.tableId === requestedTemplateId);
  if (exactMatch) return exactMatch.tableId;

  const normalizedRequestedTemplateId = normalizeUrlTemplateValue(requestedTemplateId);
  return templates.find((template) => (
    normalizeUrlTemplateValue(template.tableId) === normalizedRequestedTemplateId
  ))?.tableId ?? "";
}

function normalizeUrlTemplateValue(value) {
  return String(value ?? "").replace(/[\s_.-]+/g, "").toUpperCase();
}

function getModule2ContextForTemplate(tableId) {
  const contextKey = tableId || MODULE_2_TARGET.tableId;

  if (!module2TemplateContexts.has(contextKey)) {
    module2TemplateContexts.set(contextKey, createModule2TemplateContext());
  }

  return module2TemplateContexts.get(contextKey);
}

function getActiveModule2Axis() {
  return getActiveModule2Context().activeAxis;
}

function getActiveModule2ExpandedPaths() {
  return getActiveModule2Context().expandedPaths;
}

function getModule2AxisOptions(state, tableId) {
  const templates = getModule2Templates(state);
  const configuredYCodes = getConfiguredModule2AxisCodes(state, tableId, "y");
  const configuredZCodes = getConfiguredModule2AxisCodes(state, tableId, "z");
  const availableXCodes = getAvailableModule2AxisCodes(state, tableId, "x");
  const availableYCodes = getAvailableModule2AxisCodes(state, tableId, "y");
  const availableZCodes = getAvailableModule2AxisCodes(state, tableId, "z");
  const yCodes = getPreferredModule2AxisCodes(configuredYCodes, availableYCodes);
  const zCodes = getPreferredModule2AxisCodes(configuredZCodes, availableZCodes);

  return {
    template: {
      codes: templates.map((template) => template.tableId),
      isVisible: templates.length > 1
    },
    x: {
      codes: availableXCodes,
      isVisible: availableXCodes.length > 1
    },
    y: {
      codes: yCodes,
      isVisible: yCodes.length > 1
    },
    z: {
      codes: zCodes,
      isVisible: zCodes.length > 1
    }
  };
}

function getPreferredModule2AxisCodes(configuredCodes, availableCodes) {
  if (configuredCodes.length === 0) return [];
  if (availableCodes.length === 0) return configuredCodes;

  const availableCodeSet = new Set(availableCodes);
  const matchingCodes = configuredCodes.filter((code) => availableCodeSet.has(code));

  return matchingCodes.length > 0 ? matchingCodes : availableCodes;
}

function getVisibleModule2Axes(axisOptions) {
  return ["template", "y", "x", "z"].filter((axis) => axisOptions[axis]?.isVisible);
}

function ensureModule2Selections(state) {
  const tableId = getActiveModule2Template()?.tableId ?? MODULE_2_TARGET.tableId;
  ensureModule2TemplateSelections(state, tableId);
}

function ensureModule2TemplateSelections(state, tableId) {
  const context = getModule2ContextForTemplate(tableId);
  const axisOptions = getModule2AxisOptions(state, tableId);
  const yCodes = axisOptions.y.codes;
  const zCodes = axisOptions.z.codes;
  const xCodes = axisOptions.x.codes;
  let selectionChanged = false;

  if (!context.selectedYCode || !yCodes.includes(context.selectedYCode)) {
    context.selectedYCode = yCodes[0] ?? "";
    selectionChanged = true;
  }

  if (!context.selectedXCode || !xCodes.includes(context.selectedXCode)) {
    context.selectedXCode = xCodes[0] ?? "";
    selectionChanged = true;
  }

  if (zCodes.length > 0 && (!context.selectedZCode || !zCodes.includes(context.selectedZCode))) {
    context.selectedZCode = zCodes[0] ?? "";
    selectionChanged = true;
  }

  if (zCodes.length === 0 && context.selectedZCode) {
    context.selectedZCode = "";
    selectionChanged = true;
  }

  if (selectionChanged) {
    ensureModule2SelectionUsesExistingRow(state, tableId, context, axisOptions);
  }

  const visibleAxes = getVisibleModule2Axes(axisOptions);
  if (visibleAxes.length > 0 && !visibleAxes.includes(context.activeAxis)) {
    context.activeAxis = visibleAxes[0];
  }
}

function ensureModule2SelectionUsesExistingRow(state, tableId, context, axisOptions) {
  const rows = getModule2RowsForTemplate(state, tableId);
  if (rows.length === 0 || hasModule2SelectedCombination(rows, state.columns, context)) return;

  const firstRow = rows[0];
  const indexes = getModule2SourceIndexes(state.columns);
  if (!indexes) return;

  if (axisOptions.x.codes.length > 0) {
    context.selectedXCode = normalizeAxisCode(firstRow[indexes.xAxisRcCode], "x");
  }
  if (axisOptions.y.codes.length > 0) {
    context.selectedYCode = normalizeAxisCode(firstRow[indexes.yAxisRcCode], "y");
  }
  if (axisOptions.z.codes.length > 0) {
    context.selectedZCode = normalizeAxisCode(firstRow[indexes.zAxisRcCode], "z");
  }
}

function hasModule2SelectedCombination(rows, columns, context) {
  const indexes = getModule2SourceIndexes(columns);
  if (!indexes) return true;

  return rows.some((row) => (
    (!context.selectedXCode || normalizeAxisCode(row[indexes.xAxisRcCode], "x") === context.selectedXCode)
    && (!context.selectedYCode || normalizeAxisCode(row[indexes.yAxisRcCode], "y") === context.selectedYCode)
    && (!context.selectedZCode || normalizeAxisCode(row[indexes.zAxisRcCode], "z") === context.selectedZCode)
  ));
}

function getModule2RowsForTemplate(state, tableId) {
  const indexedRows = getIndexedRowsByTableJst(state, tableId);
  if (indexedRows.length > 0 || state.dataIndexes) return indexedRows;

  const indexes = getModule2SourceIndexes(state.columns);
  if (!indexes || !state.selectedJst) return [];

  return state.rows.filter((row) => (
    row[indexes.jstCode] === state.selectedJst
    && row[indexes.tableId] === tableId
  ));
}

function getModule2SourceIndexes(columns) {
  const indexes = {
    jstCode: columns.indexOf("jst_code"),
    tableId: columns.indexOf("table_id"),
    xAxisRcCode: columns.indexOf("x_axis_rc_code"),
    yAxisRcCode: columns.indexOf("y_axis_rc_code"),
    zAxisRcCode: columns.indexOf("z_axis_rc_code")
  };

  return Object.values(indexes).every((index) => index !== -1) ? indexes : null;
}

function getConfiguredModule2AxisCodes(state, tableId, axis) {
  return (state.module2Points ?? [])
    .filter((point) => (
      point.tableId === tableId
      && point.coordinate === `${axis}_axis_rc_code`
    ))
    .map((point) => point.code)
    .filter(Boolean);
}

function getAvailableModule2AxisCodes(state, tableId, axis) {
  const indexedCodes = getIndexedAxisCodes(state, tableId, axis);
  if (indexedCodes.length > 0 || state.dataIndexes) return indexedCodes;

  const columnName = `${axis}_axis_rc_code`;
  const indexes = {
    jstCode: state.columns.indexOf("jst_code"),
    tableId: state.columns.indexOf("table_id"),
    axisCode: state.columns.indexOf(columnName)
  };

  if (Object.values(indexes).some((index) => index === -1) || !state.selectedJst) return [];

  return [...new Set(state.rows
    .filter((row) => (
      row[indexes.jstCode] === state.selectedJst
      && row[indexes.tableId] === tableId
    ))
    .map((row) => normalizeAxisCode(row[indexes.axisCode], axis))
    .filter(Boolean))]
    .sort((left, right) => left.localeCompare(right, "fr"));
}

function renderModule2(state) {
  ensureActiveModule2Template(state);
  const context = getActiveModule2Context();
  const template = getActiveModule2Template();
  const templates = getModule2Templates(state);
  ensureModule2Selections(state);
  if (context.activeAxis === "template") ensureAllModule2TemplateSelections(state);
  const tableSeries = buildModule2AxisSeries(state, {
    axis: context.activeAxis,
    selectedXCode: context.selectedXCode,
    selectedYCode: context.selectedYCode,
    selectedZCode: context.selectedZCode,
    tableId: template?.tableId,
    templateSelections: getModule2TemplateSelections(),
    templates
  });
  elements.module2Table.replaceChildren();
  elements.unitSelect.value = state.selectedUnit;

  elements.module2Empty.hidden = !tableSeries.status;
  elements.module2Empty.textContent = tableSeries.status;
  renderModule2AxisTabs();

  if (tableSeries.rows.length === 0 || tableSeries.dateColumns.length === 0) return;

  renderModule2Table(tableSeries, state.selectedUnit);
  applyModule2Selection();
  restoreModule2ScrollPosition();
}

function ensureAllModule2TemplateSelections(state) {
  getModule2Templates(state).forEach((template) => {
    ensureModule2TemplateSelections(state, template.tableId);
  });
}

function getModule2TemplateSelections(state = latestState) {
  return Object.fromEntries(getModule2Templates(state).map((template) => {
    const context = getModule2ContextForTemplate(template.tableId);
    return [template.tableId, {
      selectedXCode: context.selectedXCode,
      selectedYCode: context.selectedYCode,
      selectedZCode: context.selectedZCode
    }];
  }));
}

function formatLoadedAt(date) {
  if (!date) return "";
  return `à ${new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(date)}`;
}

function renderModule2Table(series, selectedUnit) {
  hideModule2ContextMenu();
  const activeAxis = getActiveModule2Axis();
  const orderedDates = [...series.dateColumns].reverse();
  const tableRows = series.rows.map(normalizeModule2SeriesRow);
  const displayRows = buildModule2DisplayRows(tableRows);
  const contributionBase = getModule2ContributionBase(displayRows, activeAxis);
  const propagatedContribution = getModule2PropagatedContribution(activeAxis);
  const parentPaths = getParentPaths(tableRows);
  const nodePaths = getExplicitPaths(displayRows);
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  const tbody = document.createElement("tbody");

  expandDefaultModule2Paths(displayRows, parentPaths);

  const descriptionHeader = document.createElement("th");
  descriptionHeader.scope = "col";
  descriptionHeader.className = "description-column";
  descriptionHeader.append(createModule2SearchInput());
  headerRow.append(descriptionHeader);

  orderedDates.forEach((dateColumn, index) => {
    const th = document.createElement("th");
    th.scope = "col";
    th.className = index === 0 ? "latest-column" : "";
    th.textContent = dateColumn.label;
    headerRow.append(th);
  });

  displayRows.forEach((seriesRow) => {
    const valueRow = document.createElement("tr");
    const normalizedPath = normalizeHierarchyPath(seriesRow.hierarchyPath);
    const isParent = parentPaths.has(normalizedPath);
    const contributionValues = getModule2ContributionBaseValues(seriesRow, normalizedPath, activeAxis, contributionBase, propagatedContribution);
    const isContributionChild = Boolean(contributionValues);

    if (!seriesRow.isVirtual) valueRow.dataset.pointCode = seriesRow.code;
    valueRow.dataset.axis = activeAxis;
    valueRow.dataset.hierarchyPath = seriesRow.hierarchyPath;
    valueRow.dataset.normalizedPath = normalizedPath;
    valueRow.dataset.searchText = createModule2SearchText(seriesRow);
    valueRow.dataset.isParent = String(isParent);
    valueRow.dataset.isVirtual = String(Boolean(seriesRow.isVirtual));
    valueRow.dataset.parentPath = seriesRow.parentPath;
    valueRow.dataset.indentLevel = String(seriesRow.indentLevel ?? 0);
    valueRow.classList.toggle("is-contribution-base", Boolean(contributionBase?.row) && normalizedPath === contributionBase.path);
    valueRow.classList.toggle("is-contribution-child", isContributionChild);
    if (!seriesRow.isVirtual) {
      valueRow.setAttribute("role", "button");
      valueRow.tabIndex = 0;
    }

    const description = document.createElement("th");
    description.scope = "row";
    description.className = "description-column";
    description.style.setProperty("--indent-level", seriesRow.indentLevel ?? 0);
    description.title = seriesRow.description;
    description.append(createDescriptionContent(seriesRow, normalizedPath, isParent, {
      isDenominatorBase: Boolean(contributionBase?.row) && normalizedPath === contributionBase.path,
      ratioAxis: activeAxis
    }));
    valueRow.append(description);

    const reversedValues = [...seriesRow.values].reverse();
    const reversedBaseValues = contributionValues ? [...contributionValues].reverse() : [];

    reversedValues.forEach((point, index) => {
      const td = document.createElement("td");
      td.className = index === 0 ? "latest-column" : "";
      const contributionValue = isContributionChild
        ? getModule2ContributionRatio(point.value, reversedBaseValues[index]?.value)
        : null;
      td.textContent = seriesRow.isVirtual || point.value === null
        ? "-"
        : contributionValue === null
          ? formatMetricValue(point.value, selectedUnit, seriesRow.format)
          : formatContributionPercentValue(contributionValue);
      valueRow.append(td);
    });

    tbody.append(valueRow);
  });

  thead.append(headerRow);
  elements.module2Table.append(thead, tbody);
  applyModule2TreeState(parentPaths, nodePaths);
}

function getModule2ContributionBase(rows, activeAxis) {
  const base = getActiveModule2Context().contributionBaseByAxis[activeAxis];
  if (!base?.path) return null;

  const path = normalizeHierarchyPath(base.path);
  const row = rows.find((item) => normalizeHierarchyPath(item.hierarchyPath) === path);
  if (!row && base.type !== "common") {
    getActiveModule2Context().contributionBaseByAxis[activeAxis] = null;
    return null;
  }

  return { ...base, path, row };
}

function isModule2ContributionChild(path, contributionBase) {
  if (!contributionBase?.path) return false;
  if (contributionBase.type === "common") return true;
  return path.startsWith(`${contributionBase.path} > `);
}

function getModule2ContributionRatio(value, baseValue) {
  if (value === null || baseValue === null || baseValue === 0) return null;
  return value / baseValue;
}

function getModule2ContributionBaseValues(seriesRow, normalizedPath, activeAxis, contributionBase, propagatedContribution) {
  if (contributionBase && isModule2ContributionChild(normalizedPath, contributionBase)) {
    return contributionBase.row?.values ?? getModule2DenominatorValues(contributionBase, activeAxis, seriesRow.code);
  }

  if (!propagatedContribution || seriesRow.isVirtual) return null;
  if (propagatedContribution.axis === activeAxis) return null;

  const state = latestState;
  const tableId = getActiveModule2Template()?.tableId ?? MODULE_2_TARGET.tableId;
  const indexes = getBenchmarkSourceIndexes(state?.columns ?? []);
  const dates = getBenchmarkReferenceColumns(state?.columns ?? []);
  if (!state || !indexes || dates.length === 0) return null;

  const denominatorTableId = propagatedContribution.tableId || tableId;
  const selections = propagatedContribution.selections
    ? { ...propagatedContribution.selections }
    : getModule2SelectionsForAxisCode(getActiveModule2Context(), activeAxis, seriesRow.code);
  if (!propagatedContribution.selections) {
    selections[`selected${propagatedContribution.axis.toUpperCase()}Code`] = propagatedContribution.baseCode;
  }

  const rows = getBenchmarkRows(state, indexes, denominatorTableId, selections, state.selectedJst);
  return dates.map((dateColumn) => ({
    date: dateColumn.date,
    label: dateColumn.label,
    value: rows.length === 0
      ? null
      : rows.reduce((total, row) => total + parseBenchmarkNumber(row[dateColumn.index]), 0)
  }));
}

function getModule2DenominatorValues(base, activeAxis, axisCode) {
  const state = latestState;
  const indexes = getBenchmarkSourceIndexes(state?.columns ?? []);
  const dates = getBenchmarkReferenceColumns(state?.columns ?? []);
  if (!state || !indexes || dates.length === 0 || !base?.selections) return [];

  const tableId = base.tableId || getActiveModule2Template()?.tableId || MODULE_2_TARGET.tableId;
  const rows = getBenchmarkRows(state, indexes, tableId, base.selections, state.selectedJst);

  return dates.map((dateColumn) => ({
    date: dateColumn.date,
    label: dateColumn.label,
    value: rows.length === 0
      ? null
      : rows.reduce((total, row) => total + parseBenchmarkNumber(row[dateColumn.index]), 0)
  }));
}

function getModule2PropagatedContribution(activeAxis) {
  const context = getActiveModule2Context();

  for (const axis of ["y", "x", "z"]) {
    const base = context.contributionBaseByAxis[axis];
    if (!base?.path || (!base.pointCode && !base.selections)) continue;

    const selectedCode = axis === activeAxis
      ? getSelectedModule2CodeForActiveAxis()
      : getSelectedModule2CodeForAxis(context, axis);
    const selectedPath = getModule2AxisCodePath(axis, selectedCode);
    const basePath = normalizeHierarchyPath(base.path);

    if (base.type !== "common" && !selectedPath.startsWith(`${basePath} > `)) continue;

    return {
      axis,
      baseCode: base.pointCode,
      basePath,
      label: String(base.label ?? "").replaceAll(">", "/"),
      selections: base.selections,
      tableId: base.tableId,
      type: base.type
    };
  }

  return null;
}

function getSelectedModule2CodeForAxis(context, axis) {
  if (axis === "x") return context.selectedXCode;
  if (axis === "z") return context.selectedZCode;
  return context.selectedYCode;
}

function getModule2AxisCodePath(axis, code) {
  const tableId = getActiveModule2Template()?.tableId ?? MODULE_2_TARGET.tableId;
  if (!code) return "";

  if (axis === "x") {
    const description = latestState?.dimensionMapping?.find(tableId, "x_axis_rc_code", code)?.description;
    return normalizeHierarchyPath(splitHierarchyPath(String(description ?? "").replaceAll("/", ">")).join(" > "));
  }

  const point = latestState?.module2Points?.find((item) => (
    item.tableId === tableId
    && item.coordinate === `${axis}_axis_rc_code`
    && item.code === code
  ));

  return normalizeHierarchyPath(point?.hierarchyPath || point?.description || "");
}

function showModule2ContextMenu(row, event) {
  hideModule2ContextMenu();

  module2ContextMenu = createModule2ContextMenu(row);
  document.body.append(module2ContextMenu);

  const { innerWidth, innerHeight } = window;
  const menuRect = module2ContextMenu.getBoundingClientRect();
  const left = Math.min(event.clientX, innerWidth - menuRect.width - 8);
  const top = Math.min(event.clientY, innerHeight - menuRect.height - 8);

  module2ContextMenu.style.left = `${Math.max(8, left)}px`;
  module2ContextMenu.style.top = `${Math.max(8, top)}px`;
}

function hideModule2ContextMenu() {
  module2ContextMenu?.remove();
  module2ContextMenu = null;
}

function createModule2ContextMenu(row) {
  const menu = document.createElement("div");
  menu.className = "context-menu";
  menu.setAttribute("role", "menu");

  const ratioBaseOptions = getModule2RatioBaseOptions(row);
  const commonDenominators = getCommonModule2DenominatorOptions(row);
  if (row.dataset.pointCode && (ratioBaseOptions.length > 0 || commonDenominators.length > 0)) {
    menu.append(createContextSubmenu("Display as ratio of", [
      {
        items: ratioBaseOptions.map((option) => ({
          indentLevel: option.indentLevel,
          label: option.label,
          title: option.fullLabel,
          action: () => setModule2ContributionBase(option.row)
        })),
        title: "In this template"
      },
      {
        items: commonDenominators.map((option) => ({
          label: option.label,
          action: () => setModule2ContributionBaseFromDenominator(option)
        })),
        title: "Commonly used denominators"
      }
    ]));
  }

  if (row.dataset.pointCode) {
    menu.append(createContextMenuButton("Benchmark", () => {
      showModule2BenchmarkDialog();
    }));
  }

  return menu;
}

function getCommonModule2DenominatorOptions(row) {
  if (!row.dataset.pointCode) return [];

  return COMMON_MODULE_2_DENOMINATORS.map((denominator) => ({
    ...denominator,
    scopePath: row.dataset.normalizedPath
  }));
}

function getModule2RatioBaseOptions(row) {
  const parts = splitHierarchyPath(row.dataset.hierarchyPath);
  const options = [];

  for (let index = 0; index < parts.length - 1; index += 1) {
    const path = parts.slice(0, index + 1).join(" > ");
    const normalizedPath = normalizeHierarchyPath(path);
    const parentRow = elements.module2Table.querySelector(`tbody tr[data-normalized-path="${CSS.escape(normalizedPath)}"][data-point-code]`);
    if (!parentRow) continue;

    options.push({
      fullLabel: path.replaceAll(">", "/"),
      indentLevel: index,
      label: parts[index],
      row: parentRow
    });
  }

  return options;
}

function createContextSubmenu(label, groups) {
  const wrapper = document.createElement("div");
  wrapper.className = "context-submenu";
  wrapper.setAttribute("role", "none");

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "context-submenu-trigger";
  trigger.setAttribute("aria-haspopup", "menu");
  trigger.textContent = label;

  const submenu = document.createElement("div");
  submenu.className = "context-submenu-panel";
  submenu.setAttribute("role", "menu");

  groups.filter((group) => group.items.length > 0).forEach((group) => {
    const heading = document.createElement("span");
    heading.className = "context-submenu-heading";
    heading.textContent = group.title;
    submenu.append(heading);

    group.items.forEach((item) => {
      submenu.append(createContextMenuButton(item.label, item.action, {
        indentLevel: item.indentLevel,
        title: item.title
      }));
    });
  });

  wrapper.append(trigger, submenu);
  return wrapper;
}

function createContextMenuButton(label, action, options = {}) {
  const button = document.createElement("button");
  button.type = "button";
  button.setAttribute("role", "menuitem");
  button.textContent = label;
  if (options.title) button.title = options.title;
  if (Number.isFinite(options.indentLevel)) {
    button.classList.add("context-menu-tree-item");
    button.style.setProperty("--context-menu-indent", options.indentLevel);
  }
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    hideModule2ContextMenu();
    action();
  });
  return button;
}

function copyModule2Label(label) {
  const text = String(label ?? "").replaceAll(">", "/");
  if (!text || !navigator.clipboard?.writeText) return;
  navigator.clipboard.writeText(text).catch(() => {});
}

function getActiveModule2ContributionSetting() {
  const context = getActiveModule2Context();
  return context.contributionBaseByAxis[context.activeAxis];
}

function setModule2ContributionBase(row) {
  const context = getActiveModule2Context();
  context.contributionBaseByAxis[context.activeAxis] = {
    label: row.dataset.hierarchyPath,
    path: row.dataset.normalizedPath,
    pointCode: row.dataset.pointCode,
    tableId: getActiveModule2Template()?.tableId ?? MODULE_2_TARGET.tableId,
    type: "axis"
  };

  saveModule2ScrollPosition();
  if (latestState) renderAppState(latestState);
}

function setModule2ContributionBaseFromDenominator(denominator) {
  const context = getActiveModule2Context();
  context.contributionBaseByAxis[context.activeAxis] = {
    label: denominator.label,
    path: denominator.scopePath,
    pointCode: "",
    selections: {
      selectedXCode: normalizeAxisCode(denominator.selectedXCode, "x"),
      selectedYCode: normalizeAxisCode(denominator.selectedYCode, "y"),
      selectedZCode: normalizeAxisCode(denominator.selectedZCode, "z")
    },
    tableId: denominator.tableId,
    type: "common"
  };

  saveModule2ScrollPosition();
  if (latestState) renderAppState(latestState);
}

function clearModule2ContributionBase(axis = getActiveModule2Context().activeAxis) {
  const context = getActiveModule2Context();
  context.contributionBaseByAxis[axis] = null;

  saveModule2ScrollPosition();
  if (latestState) renderAppState(latestState);
}

function showModule2BenchmarkDialog() {
  hideModule2BenchmarkDialog();

  const benchmark = buildModule2Benchmark();
  module2BenchmarkDialog = createModule2BenchmarkDialog(benchmark);
  document.body.append(module2BenchmarkDialog);
}

function hideModule2BenchmarkDialog() {
  module2BenchmarkDialog?.remove();
  module2BenchmarkDialog = null;
}

function createModule2BenchmarkDialog(benchmark) {
  const overlay = document.createElement("div");
  overlay.className = "benchmark-overlay";
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) hideModule2BenchmarkDialog();
  });

  const dialog = document.createElement("section");
  dialog.className = "benchmark-dialog";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-label", "Benchmark JST");

  const header = document.createElement("header");
  header.className = "benchmark-header";

  const title = document.createElement("div");
  const strong = document.createElement("strong");
  strong.textContent = "Benchmark JST";
  const subtitle = document.createElement("span");
  subtitle.textContent = benchmark.label;
  title.append(strong, subtitle);

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.textContent = "Fermer";
  closeButton.addEventListener("click", hideModule2BenchmarkDialog);
  header.append(title, closeButton);

  const body = document.createElement("div");
  body.className = "benchmark-body";

  if (benchmark.series.length === 0 || benchmark.dates.length === 0) {
    const empty = document.createElement("p");
    empty.className = "benchmark-empty";
    empty.textContent = "Aucune donnée disponible pour ce point.";
    body.append(empty);
  } else {
    body.append(createBenchmarkChart(benchmark));
    body.append(createBenchmarkLegend(benchmark));
  }

  dialog.append(header, body);
  overlay.append(dialog);
  return overlay;
}

function buildModule2Benchmark() {
  const state = latestState;
  const tableId = getActiveModule2Template()?.tableId ?? MODULE_2_TARGET.tableId;
  const context = getActiveModule2Context();
  const activeAxis = context.activeAxis;
  const selections = getCompleteModule2SelectionsForBenchmark(context, activeAxis);
  const contribution = getModule2BenchmarkContributionContext(context, activeAxis);
  const indexes = getBenchmarkSourceIndexes(state?.columns ?? []);
  const dates = getBenchmarkReferenceColumns(state?.columns ?? []);
  const format = getBenchmarkValueFormat(state, tableId, context, activeAxis);
  const label = getBenchmarkLabel(state, tableId, context, activeAxis);

  if (!state || !indexes || dates.length === 0) {
    return { dates: [], format, isContribution: false, label, series: [] };
  }

  const series = getPeerBenchmarkJstCodes(state).map((jstCode) => {
    const rows = getBenchmarkRows(state, indexes, tableId, selections, jstCode);
    const baseRows = contribution
      ? getBenchmarkRows(state, indexes, contribution.tableId || tableId, contribution.selections, jstCode)
      : [];

    return {
      jstCode,
      values: dates.map((dateColumn) => ({
        date: dateColumn.date,
        label: dateColumn.label,
        value: rows.length === 0
          ? null
          : getBenchmarkPointValue(rows, baseRows, dateColumn.index, Boolean(contribution))
      }))
    };
  }).filter((item) => item.values.some((point) => point.value !== null));

  return {
    dates,
    format,
    isContribution: Boolean(contribution),
    label: contribution ? `${label} / ${contribution.label}` : label,
    series
  };
}

function getCompleteModule2SelectionsForBenchmark(context, activeAxis) {
  const selectedCode = getSelectedModule2CodeForActiveAxis();
  return getModule2SelectionsForAxisCode(context, activeAxis, selectedCode);
}

function getModule2SelectionsForAxisCode(context, activeAxis, axisCode) {
  return {
    selectedXCode: normalizeAxisCode(activeAxis === "x" ? axisCode : context.selectedXCode, "x"),
    selectedYCode: normalizeAxisCode(activeAxis === "y" ? axisCode : context.selectedYCode, "y"),
    selectedZCode: normalizeAxisCode(activeAxis === "z" ? axisCode : context.selectedZCode, "z")
  };
}

function getPeerBenchmarkJstCodes(state) {
  const jstOptions = state?.jstOptions ?? [];
  const peers = state?.peerJstCodes?.length ? state.peerJstCodes : jstOptions;
  const requested = [state?.selectedJst, ...peers].filter(Boolean);

  return requested.filter((jstCode, index) => (
    jstOptions.includes(jstCode) && requested.indexOf(jstCode) === index
  ));
}

function getModule2BenchmarkContributionContext(context, activeAxis) {
  const contribution = getModule2PropagatedContribution(activeAxis);
  if (!contribution?.baseCode && !contribution?.selections) return null;

  const selections = contribution.selections
    ? { ...contribution.selections }
    : getCompleteModule2SelectionsForBenchmark(context, activeAxis);
  if (!contribution.selections) {
    selections[`selected${contribution.axis.toUpperCase()}Code`] = contribution.baseCode;
  }
  return {
    label: contribution.label,
    selections,
    tableId: contribution.tableId
  };
}

function getBenchmarkPointValue(rows, baseRows, dateColumnIndex, isContribution) {
  const value = rows.reduce((total, row) => total + parseBenchmarkNumber(row[dateColumnIndex]), 0);
  if (!isContribution) return value;

  const baseValue = baseRows.reduce((total, row) => total + parseBenchmarkNumber(row[dateColumnIndex]), 0);
  if (baseRows.length === 0 || baseValue === 0) return null;

  return value / baseValue;
}

function getBenchmarkRows(state, indexes, tableId, selections, jstCode) {
  if (hasCompleteBenchmarkSelection(selections)) {
    const indexedRows = getIndexedRowsByCoordinates(state, tableId, selections, jstCode);
    if (indexedRows.length > 0 || state.dataIndexes) return indexedRows;
  }

  return state.rows.filter((row) => (
    row[indexes.jstCode] === jstCode
    && row[indexes.tableId] === tableId
    && matchesBenchmarkSelection(row, indexes, "x", selections.selectedXCode)
    && matchesBenchmarkSelection(row, indexes, "y", selections.selectedYCode)
    && matchesBenchmarkSelection(row, indexes, "z", selections.selectedZCode)
  ));
}

function hasCompleteBenchmarkSelection(selections) {
  return Boolean(selections.selectedXCode && selections.selectedYCode && selections.selectedZCode);
}

function matchesBenchmarkSelection(row, indexes, axis, selectedCode) {
  if (!selectedCode) return true;
  return normalizeAxisCode(row[indexes[`${axis}AxisRcCode`]], axis) === selectedCode;
}

function getBenchmarkLabel(state, tableId, context, activeAxis) {
  if (activeAxis === "template") return getActiveModule2Template()?.label || tableId;
  if (activeAxis === "x") {
    return state?.dimensionMapping?.find(tableId, "x_axis_rc_code", context.selectedXCode)?.description
      || `Column ${context.selectedXCode}`;
  }
  if (activeAxis === "z") {
    return state?.module2Points?.find((point) => (
      point.tableId === tableId
      && point.coordinate === "z_axis_rc_code"
      && point.code === context.selectedZCode
    ))?.description || `Tab ${context.selectedZCode}`;
  }
  return state?.module2Points?.find((point) => (
    point.tableId === tableId
    && point.coordinate === "y_axis_rc_code"
    && point.code === context.selectedYCode
  ))?.description || `Row ${context.selectedYCode}`;
}

function getBenchmarkValueFormat(state, tableId, context, activeAxis) {
  const candidates = [
    { axis: "y", code: context.selectedYCode, coordinate: "y_axis_rc_code" },
    { axis: "z", code: context.selectedZCode, coordinate: "z_axis_rc_code" },
    { axis: "x", code: context.selectedXCode, coordinate: "x_axis_rc_code" }
  ];

  for (const candidate of candidates) {
    if (!candidate.code) continue;

    const configuredFormat = state?.module2Points?.find((point) => (
      point.tableId === tableId
      && point.coordinate === candidate.coordinate
      && point.code === candidate.code
    ))?.format;
    if (configuredFormat) return configuredFormat;

    const mappingFormat = state?.dimensionMapping?.find(tableId, candidate.coordinate, candidate.code)?.format;
    if (mappingFormat) return mappingFormat;
  }

  return activeAxis === "template" ? "" : "";
}

function createBenchmarkChart(benchmark) {
  const selectedJst = latestState?.selectedJst || "";
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "benchmark-chart");
  svg.setAttribute("viewBox", "0 0 760 360");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "Graphique benchmark par JST");

  const values = benchmark.series.flatMap((serie) => serie.values.map((point) => point.value).filter((value) => value !== null));
  const minValue = Math.min(0, ...values);
  const maxValue = Math.max(0, ...values);
  const range = maxValue - minValue || 1;
  const plot = { left: 58, top: 24, width: 660, height: 270 };

  appendBenchmarkGrid(svg, plot);
  appendBenchmarkAxes(svg, benchmark, plot, minValue, maxValue);

  const tooltip = createBenchmarkTooltip();
  svg.append(tooltip.group);

  benchmark.series.forEach((serie, index) => {
    const isSelectedJst = serie.jstCode === selectedJst;
    const color = getBenchmarkColor(index, isSelectedJst);
    const points = serie.values
      .map((point, pointIndex) => {
        if (point.value === null) return null;
        const x = plot.left + (benchmark.dates.length <= 1 ? plot.width / 2 : (pointIndex / (benchmark.dates.length - 1)) * plot.width);
        const y = plot.top + plot.height - (((point.value - minValue) / range) * plot.height);
        return { x, y, value: point.value, label: point.label };
      })
      .filter(Boolean);

    if (points.length === 0) return;

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", points.map((point, pointIndex) => `${pointIndex === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" "));
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", color);
    path.setAttribute("stroke-width", isSelectedJst ? "2.6" : "1.4");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    path.setAttribute("class", isSelectedJst ? "benchmark-line is-selected-jst" : "benchmark-line");
    if (!isSelectedJst) path.setAttribute("stroke-dasharray", "4 5");
    svg.append(path);

    points.forEach((point) => {
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", point.x);
      circle.setAttribute("cy", point.y);
      circle.setAttribute("r", isSelectedJst ? "4" : "3");
      circle.setAttribute("fill", color);
      circle.setAttribute("class", isSelectedJst ? "benchmark-point is-selected-jst" : "benchmark-point");
      circle.addEventListener("mouseenter", () => {
        showBenchmarkTooltip(tooltip, point.x, point.y, `${serie.jstCode} - ${point.label}`, formatBenchmarkValue(point.value, benchmark));
      });
      circle.addEventListener("focus", () => {
        showBenchmarkTooltip(tooltip, point.x, point.y, `${serie.jstCode} - ${point.label}`, formatBenchmarkValue(point.value, benchmark));
      });
      circle.addEventListener("mouseleave", () => hideBenchmarkTooltip(tooltip));
      circle.addEventListener("blur", () => hideBenchmarkTooltip(tooltip));
      circle.setAttribute("tabindex", "0");
      circle.append(createSvgTitle(`${serie.jstCode} - ${point.label}: ${formatBenchmarkValue(point.value, benchmark)}`));
      svg.append(circle);
    });
  });

  return svg;
}

function createBenchmarkTooltip() {
  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  const background = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
  const value = document.createElementNS("http://www.w3.org/2000/svg", "text");

  group.setAttribute("class", "benchmark-tooltip");
  group.setAttribute("opacity", "0");
  background.setAttribute("rx", "5");
  background.setAttribute("ry", "5");
  label.setAttribute("class", "benchmark-tooltip-label");
  value.setAttribute("class", "benchmark-tooltip-value");
  group.append(background, label, value);

  return { background, group, label, value };
}

function showBenchmarkTooltip(tooltip, x, y, label, value) {
  tooltip.label.textContent = label;
  tooltip.value.textContent = value;

  const tooltipWidth = 178;
  const tooltipHeight = 48;
  const left = Math.min(Math.max(8, x + 12), 760 - tooltipWidth - 8);
  const top = Math.max(8, y - tooltipHeight - 10);

  tooltip.background.setAttribute("x", left);
  tooltip.background.setAttribute("y", top);
  tooltip.background.setAttribute("width", tooltipWidth);
  tooltip.background.setAttribute("height", tooltipHeight);
  tooltip.label.setAttribute("x", left + 10);
  tooltip.label.setAttribute("y", top + 18);
  tooltip.value.setAttribute("x", left + 10);
  tooltip.value.setAttribute("y", top + 36);
  tooltip.group.setAttribute("opacity", "1");
}

function hideBenchmarkTooltip(tooltip) {
  tooltip.group.setAttribute("opacity", "0");
}

function appendBenchmarkGrid(svg, plot) {
  for (let index = 0; index <= 4; index += 1) {
    const y = plot.top + ((plot.height / 4) * index);
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", plot.left);
    line.setAttribute("x2", plot.left + plot.width);
    line.setAttribute("y1", y);
    line.setAttribute("y2", y);
    line.setAttribute("class", "benchmark-grid-line");
    svg.append(line);
  }
}

function appendBenchmarkAxes(svg, benchmark, plot, minValue, maxValue) {
  [maxValue, (maxValue + minValue) / 2, minValue].forEach((value, index) => {
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", plot.left - 10);
    text.setAttribute("y", plot.top + ((plot.height / 2) * index) + 4);
    text.setAttribute("text-anchor", "end");
    text.setAttribute("class", "benchmark-axis-label");
    text.textContent = formatBenchmarkValue(value, benchmark);
    svg.append(text);
  });

  benchmark.dates.forEach((dateColumn, index) => {
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", plot.left + (benchmark.dates.length <= 1 ? plot.width / 2 : (index / (benchmark.dates.length - 1)) * plot.width));
    text.setAttribute("y", plot.top + plot.height + 32);
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("class", "benchmark-axis-label");
    text.textContent = dateColumn.label;
    svg.append(text);
  });
}

function createBenchmarkLegend(benchmark) {
  const legend = document.createElement("div");
  legend.className = "benchmark-legend";
  const selectedJst = latestState?.selectedJst || "";

  benchmark.series.forEach((serie, index) => {
    const item = document.createElement("span");
    const swatch = document.createElement("i");
    const isSelectedJst = serie.jstCode === selectedJst;
    swatch.style.background = getBenchmarkColor(index, isSelectedJst);
    item.classList.toggle("is-selected-jst", isSelectedJst);
    item.append(swatch, document.createTextNode(serie.jstCode));
    legend.append(item);
  });

  return legend;
}

function formatBenchmarkValue(value, benchmark) {
  return benchmark.isContribution
    ? formatContributionPercentValue(value)
    : formatMetricValue(value, latestState.selectedUnit, benchmark.format);
}

function createSvgTitle(text) {
  const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
  title.textContent = text;
  return title;
}

function getBenchmarkColor(index, isSelectedJst = false) {
  if (isSelectedJst) return "#17483f";

  const grays = ["#8d9891", "#a1aaa5", "#b5bdb8", "#7c8781"];
  return grays[index % grays.length];
}

function getBenchmarkSourceIndexes(columns) {
  const indexes = {
    jstCode: columns.indexOf("jst_code"),
    tableId: columns.indexOf("table_id"),
    xAxisRcCode: columns.indexOf("x_axis_rc_code"),
    yAxisRcCode: columns.indexOf("y_axis_rc_code"),
    zAxisRcCode: columns.indexOf("z_axis_rc_code")
  };

  return Object.values(indexes).every((index) => index !== -1) ? indexes : null;
}

function getBenchmarkReferenceColumns(columns) {
  return columns
    .map((name, index) => {
      const match = String(name).match(/^ref_(\d{4})_(\d{2})_(\d{2})$/);
      if (!match) return null;

      const [, year, month, day] = match;
      const date = new Date(Number(year), Number(month) - 1, Number(day));
      return {
        date,
        index,
        label: new Intl.DateTimeFormat("fr-FR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric"
        }).format(date)
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.date - right.date);
}

function parseBenchmarkNumber(value) {
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function createModule2SearchInput() {
  const input = document.createElement("input");
  input.id = "module-2-search";
  input.className = "table-search-input";
  input.type = "search";
  input.placeholder = "search";
  input.setAttribute("aria-label", "Recherche");
  input.value = getActiveModule2SearchRawValue();
  input.addEventListener("input", updateModule2Search);
  input.addEventListener("search", updateModule2Search);
  return input;
}

function updateModule2Search(event) {
  const context = getActiveModule2Context();
  if (context.activeAxis === "template") {
    module2TemplateAxisState.search = event.target.value;
  } else {
    context.searchByAxis[context.activeAxis] = event.target.value;
  }
  applyModule2SearchFilter();
}

function renderModule2AxisTabs() {
  const captions = getModule2AxisCaptions();
  const ratioCaptions = getModule2AxisRatioCaptions();
  const activeAxis = getActiveModule2Axis();
  const tableId = getActiveModule2Template()?.tableId ?? MODULE_2_TARGET.tableId;
  const axisOptions = getModule2AxisOptions(latestState ?? { columns: [], rows: [], module2Points: [] }, tableId);

  elements.module2AxisButtons.forEach((button) => {
    const axis = button.getAttribute("data-module-2-axis");
    const isActive = axis === activeAxis;
    const isAvailable = Boolean(axisOptions[axis]?.isVisible);
    button.classList.toggle("is-active", isActive);
    button.hidden = !isAvailable;
    button.setAttribute("aria-selected", String(isActive));
  });

  Object.entries(elements.module2AxisCaptions).forEach(([axis, element]) => {
    if (!element) return;

    element.title = [captions[axis], ratioCaptions[axis]].filter(Boolean).join("\n");
    element.replaceChildren(createAxisCaptionLine(captions[axis], ratioCaptions[axis], axis));
  });
}

function createAxisCaptionLine(caption, ratioCaption = "", axis = "") {
  const parts = splitAxisCaption(caption);
  const wrapper = document.createElement("span");
  wrapper.className = "axis-tab-lines";
  const line = document.createElement("span");
  line.className = "axis-tab-line axis-tab-main";

  if (parts.length === 0) {
    line.textContent = "-";
  } else {
    line.textContent = parts.join(" - ");
  }

  wrapper.append(line);

  if (ratioCaption) {
    const ratioLine = document.createElement("span");
    ratioLine.className = "axis-tab-line axis-tab-ratio";
    const ratioText = document.createElement("span");
    ratioText.textContent = ratioCaption;
    ratioLine.append(ratioText, createAxisRatioClearButton(axis));
    wrapper.append(ratioLine);
  }

  return wrapper;
}

function createAxisRatioClearButton(axis) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "axis-ratio-clear";
  button.setAttribute("aria-label", "Remove ratio");
  button.textContent = "x";
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    clearModule2ContributionBase(axis);
  });
  return button;
}

function splitAxisCaption(caption) {
  return String(caption ?? "")
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);
}

function getModule2AxisCaptions() {
  const context = getActiveModule2Context();
  const tableId = getActiveModule2Template()?.tableId ?? MODULE_2_TARGET.tableId;
  const yPoint = latestState?.module2Points?.find((point) => (
    point.tableId === tableId
    && point.code === context.selectedYCode
    && point.coordinate === "y_axis_rc_code"
  ));
  const zPoint = latestState?.module2Points?.find((point) => (
    point.tableId === tableId
    && point.code === context.selectedZCode
    && point.coordinate === "z_axis_rc_code"
  ));
  const xDescription = latestState?.dimensionMapping
    ?.find(tableId, "x_axis_rc_code", context.selectedXCode)
    ?.description;

  return {
    template: getActiveModule2Template()?.label || activeModule2TemplateId,
    x: xDescription || (context.selectedXCode ? `X ${context.selectedXCode}` : ""),
    y: yPoint?.description || (context.selectedYCode ? `Y ${context.selectedYCode}` : ""),
    z: zPoint?.description || (context.selectedZCode ? `Z ${context.selectedZCode}` : "")
  };
}

function getModule2AxisRatioCaptions() {
  return Object.fromEntries(["template", "x", "y", "z"].map((axis) => {
    const contribution = ["x", "y", "z"].includes(axis)
      ? getModule2OwnAxisContribution(axis)
      : null;
    return [axis, contribution ? `as % of ${contribution.label}` : ""];
  }));
}

function getModule2OwnAxisContribution(axis) {
  const context = getActiveModule2Context();
  const base = context.contributionBaseByAxis[axis];
  if (!base?.path || (!base.pointCode && !base.selections)) return null;

  const selectedCode = getSelectedModule2CodeForAxis(context, axis);
  const selectedPath = getModule2AxisCodePath(axis, selectedCode);
  const basePath = normalizeHierarchyPath(base.path);

  if (base.type !== "common" && !selectedPath.startsWith(`${basePath} > `)) return null;

  return {
    axis,
    baseCode: base.pointCode,
    basePath,
    label: String(base.label ?? "").replaceAll(">", "/"),
    selections: base.selections,
    tableId: base.tableId,
    type: base.type
  };
}

function getSelectedModule2CodeForActiveAxis() {
  const context = getActiveModule2Context();
  if (context.activeAxis === "template") return activeModule2TemplateId;
  if (context.activeAxis === "x") return context.selectedXCode;
  if (context.activeAxis === "z") return context.selectedZCode;
  return context.selectedYCode;
}

function normalizeModule2SeriesRow(seriesRow) {
  return {
    ...seriesRow,
    format: seriesRow.format || "",
    hierarchyPath: seriesRow.hierarchyPath || seriesRow.description || "",
    parentPath: seriesRow.parentPath || splitHierarchyPath(seriesRow.description).slice(0, -1).join(" > ")
  };
}

function buildModule2DisplayRows(rows) {
  const explicitPaths = getExplicitPaths(rows);
  const displayedPaths = new Set();
  const displayRows = [];

  rows.forEach((row) => {
    const parts = splitHierarchyPath(row.hierarchyPath);

    for (let index = 0; index < parts.length - 1; index += 1) {
      const path = parts.slice(0, index + 1).join(" > ");
      const normalizedPath = normalizeHierarchyPath(path);
      if (explicitPaths.has(normalizedPath) || displayedPaths.has(normalizedPath)) continue;

      displayedPaths.add(normalizedPath);
      displayRows.push(createVirtualModule2Row(path, parts[index], index, row.values));
    }

    displayedPaths.add(normalizeHierarchyPath(row.hierarchyPath));
    displayRows.push(row);
  });

  return displayRows;
}

function createVirtualModule2Row(path, label, indentLevel, values) {
  return {
    code: `virtual:${normalizeHierarchyPath(path)}`,
    description: path,
    displayDescription: label,
    hierarchyPath: path,
    indentLevel,
    isVirtual: true,
    parentPath: splitHierarchyPath(path).slice(0, -1).join(" > "),
    values: values.map((point) => ({
      ...point,
      value: null
    }))
  };
}

function expandDefaultModule2Paths(rows, parentPaths) {
  const context = getActiveModule2Context();
  if (context.defaultExpandedPathsInitialized) return;

  const expandedPaths = context.expandedPaths;

  rows.forEach((row) => {
    const path = normalizeHierarchyPath(row.hierarchyPath);
    if (parentPaths.has(path) && (row.indentLevel ?? 0) < 1) {
      expandedPaths.add(path);
    }
  });

  context.defaultExpandedPathsInitialized = true;
}

function createDescriptionContent(seriesRow, normalizedPath, isParent, options = {}) {
  const fragment = document.createDocumentFragment();
  const content = document.createElement("span");
  content.className = "tree-cell-content";
  const expandedPaths = getActiveModule2ExpandedPaths();
  const parts = splitHierarchyPath(seriesRow.hierarchyPath);

  createTreeConnectors(parts, normalizedPath, isParent).forEach((connector) => {
    fragment.append(connector);
  });

  if (isParent) {
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "tree-toggle";
    toggle.dataset.togglePath = normalizedPath;
    toggle.setAttribute("aria-expanded", String(expandedPaths.has(normalizedPath)));
    toggle.textContent = expandedPaths.has(normalizedPath) ? "-" : "+";
    content.append(toggle);
  } else {
    const spacer = document.createElement("span");
    spacer.className = "tree-toggle-spacer";
    content.append(spacer);
  }

  const label = document.createElement("span");
  label.className = "tree-label";
  label.textContent = seriesRow.displayDescription || seriesRow.description;
  content.append(label);

  if (options.isDenominatorBase) {
    content.append(createDenominatorBadge(options.ratioAxis));
  }

  fragment.append(content);

  return fragment;
}

function createDenominatorBadge(axis) {
  const badge = document.createElement("span");
  badge.className = "denominator-badge";

  const label = document.createElement("span");
  label.textContent = "denominator";

  const clearButton = document.createElement("button");
  clearButton.type = "button";
  clearButton.className = "axis-ratio-clear denominator-clear";
  clearButton.setAttribute("aria-label", "Remove denominator");
  clearButton.textContent = "x";
  clearButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    clearModule2ContributionBase(axis);
  });

  badge.append(label, clearButton);
  return badge;
}

function createTreeConnectors(parts, normalizedPath, isParent) {
  const expandedPaths = getActiveModule2ExpandedPaths();
  const connectors = [];

  for (let index = 0; index < parts.length - 1; index += 1) {
    const ancestorPath = normalizeHierarchyPath(parts.slice(0, index + 1).join(" > "));
    if (!expandedPaths.has(ancestorPath)) continue;

    connectors.push(createTreeConnector(index));
  }

  if (isParent && expandedPaths.has(normalizedPath)) {
    connectors.push(createTreeConnector(Math.max(0, parts.length - 1), true));
  }

  return connectors;
}

function createTreeConnector(level, startsUnderToggle = false) {
  const connector = document.createElement("span");
  connector.className = startsUnderToggle
    ? "tree-connector starts-under-toggle"
    : "tree-connector";
  connector.style.setProperty("--connector-level", level);
  connector.setAttribute("aria-hidden", "true");
  return connector;
}

function getParentPaths(rows) {
  const parentPaths = new Set();

  rows.forEach((row) => {
    const parts = splitHierarchyPath(row.hierarchyPath);
    for (let index = 0; index < parts.length - 1; index += 1) {
      parentPaths.add(normalizeHierarchyPath(parts.slice(0, index + 1).join(" > ")));
    }
  });

  return parentPaths;
}

function getExplicitPaths(rows) {
  return new Set(rows.map((row) => normalizeHierarchyPath(row.hierarchyPath)).filter(Boolean));
}

function normalizeHierarchyPath(path) {
  return String(path ?? "").trim().toLocaleLowerCase("fr-FR");
}

function splitHierarchyPath(path) {
  return String(path ?? "")
    .split(">")
    .map((part) => part.trim())
    .filter(Boolean);
}

function toggleModule2Path(path) {
  const expandedPaths = getActiveModule2ExpandedPaths();
  saveModule2ScrollPosition();

  if (expandedPaths.has(path)) {
    collapseModule2Path(path);
  } else {
    expandedPaths.add(path);
  }

  if (latestState) {
    renderAppState(latestState);
    return;
  }

  const rows = [...elements.module2Table.querySelectorAll("tbody tr[data-normalized-path]")];
  applyModule2TreeState(getParentPathsFromRenderedRows(rows), getExplicitPathsFromRenderedRows(rows));
}

function collapseModule2Path(path) {
  const expandedPaths = getActiveModule2ExpandedPaths();

  expandedPaths.delete(path);
  [...expandedPaths].forEach((expandedPath) => {
    if (expandedPath.startsWith(`${path} > `)) expandedPaths.delete(expandedPath);
  });
}

function applyModule2TreeState(parentPaths, explicitPaths) {
  const rows = [...elements.module2Table.querySelectorAll("tbody tr[data-normalized-path]")];
  const expandedPaths = getActiveModule2ExpandedPaths();

  rows.forEach((row) => {
    const path = row.dataset.normalizedPath;
    const isParent = parentPaths.has(path);
    const isExpanded = expandedPaths.has(path);
    row.dataset.treeHidden = String(hasCollapsedExplicitAncestor(path, explicitPaths));
    row.classList.toggle("is-tree-parent", isParent);
    row.classList.remove("is-sticky-parent");
    row.classList.toggle("is-tree-expanded", isParent && isExpanded);
    row.classList.toggle("is-tree-collapsed", isParent && !isExpanded);
    setStickyParentPosition(row, isParent);

    const toggle = row.querySelector("[data-toggle-path]");
    if (toggle) {
      toggle.textContent = isExpanded ? "-" : "+";
      toggle.setAttribute("aria-expanded", String(isExpanded));
      toggle.setAttribute("aria-label", isExpanded ? "Replier" : "Déplier");
    }
  });

  applyModule2SearchFilter();
}

function applyModule2SearchFilter() {
  const rows = [...elements.module2Table.querySelectorAll("tbody tr[data-normalized-path]")];
  const query = getActiveModule2SearchQuery();

  if (!query) {
    rows.forEach((row) => {
      row.hidden = row.dataset.treeHidden === "true";
      row.classList.remove("is-search-match");
    });
    scheduleModule2StickyParentsUpdate();
    return;
  }

  const visiblePaths = new Set();
  const matchedPaths = new Set();

  rows.forEach((row) => {
    if (!row.dataset.searchText?.includes(query)) return;

    const path = row.dataset.normalizedPath;
    matchedPaths.add(path);
    getHierarchyAncestorPaths(row.dataset.hierarchyPath).forEach((ancestorPath) => {
      visiblePaths.add(ancestorPath);
    });
    visiblePaths.add(path);
  });

  rows.forEach((row) => {
    const path = row.dataset.normalizedPath;
    row.hidden = !visiblePaths.has(path);
    row.classList.toggle("is-search-match", matchedPaths.has(path));
  });

  scheduleModule2StickyParentsUpdate();
}

function getActiveModule2SearchQuery() {
  return getActiveModule2SearchRawValue()
    .trim()
    .toLocaleLowerCase("fr-FR");
}

function getActiveModule2SearchRawValue() {
  const context = getActiveModule2Context();
  return String(context.activeAxis === "template"
    ? module2TemplateAxisState.search
    : context.searchByAxis[context.activeAxis] ?? "");
}

function createModule2SearchText(seriesRow) {
  return [
    seriesRow.description,
    seriesRow.hierarchyPath,
    String(seriesRow.hierarchyPath ?? "").replaceAll(">", "/")
  ]
    .join(" ")
    .toLocaleLowerCase("fr-FR");
}

function getHierarchyAncestorPaths(path) {
  const parts = splitHierarchyPath(path);
  const paths = [];

  for (let index = 0; index < parts.length - 1; index += 1) {
    paths.push(normalizeHierarchyPath(parts.slice(0, index + 1).join(" > ")));
  }

  return paths;
}

function setStickyParentPosition(row, isParent) {
  if (!isParent) {
    row.style.removeProperty("--sticky-top");
    return;
  }

  const headerHeight = elements.module2Table.querySelector("thead")?.getBoundingClientRect().height ?? 0;
  const indentLevel = Number(row.dataset.indentLevel) || 0;
  row.style.setProperty("--sticky-top", `${headerHeight + (indentLevel * MODULE_2_STICKY_PARENT_ROW_HEIGHT)}px`);
}

function scheduleModule2StickyParentsUpdate() {
  if (module2StickyFrame) return;

  module2StickyFrame = requestAnimationFrame(() => {
    module2StickyFrame = 0;
    updateModule2StickyParents();
  });
}

function updateModule2StickyParents() {
  if (!elements.module2TableWrap) return;

  const rows = [...elements.module2Table.querySelectorAll("tbody tr[data-normalized-path]")];
  const headerHeight = elements.module2Table.querySelector("thead")?.getBoundingClientRect().height ?? 0;
  const scrollTop = elements.module2TableWrap.scrollTop;
  const stickyStack = new Map();

  rows.forEach((row) => {
    row.classList.remove("is-sticky-parent");

    if (!row.classList.contains("is-tree-parent") || row.hidden) return;

    const indentLevel = Number(row.dataset.indentLevel) || 0;
    const activationTop = scrollTop + headerHeight + (indentLevel * MODULE_2_STICKY_PARENT_ROW_HEIGHT);

    if (row.offsetTop > activationTop) return;

    stickyStack.set(indentLevel, row);
    [...stickyStack.keys()].forEach((level) => {
      if (level > indentLevel) stickyStack.delete(level);
    });
  });

  stickyStack.forEach((row) => {
    row.classList.add("is-sticky-parent");
  });
}

function hasCollapsedExplicitAncestor(path, explicitPaths) {
  const parts = splitHierarchyPath(path);
  const expandedPaths = getActiveModule2ExpandedPaths();

  for (let index = 0; index < parts.length - 1; index += 1) {
    const ancestor = normalizeHierarchyPath(parts.slice(0, index + 1).join(" > "));
    if (explicitPaths.has(ancestor) && !expandedPaths.has(ancestor)) return true;
  }

  return false;
}

function getParentPathsFromRenderedRows(rows) {
  return getParentPaths(rows.map((row) => ({
    hierarchyPath: row.dataset.hierarchyPath
  })));
}

function getExplicitPathsFromRenderedRows(rows) {
  return new Set(rows.map((row) => row.dataset.normalizedPath).filter(Boolean));
}

function selectModule2Row(pointCode, options = {}) {
  const { shouldFocus = false } = options;
  const context = getActiveModule2Context();
  const activeAxis = context.activeAxis;

  if (activeAxis === "template") {
    activeModule2TemplateId = pointCode || activeModule2TemplateId;
    updateUrlTemplateParam(activeModule2TemplateId);
    getActiveModule2Context().activeAxis = "template";
  } else if (activeAxis === "y") {
    context.selectedYCode = pointCode || context.selectedYCode;
  } else if (activeAxis === "z") {
    context.selectedZCode = pointCode || context.selectedZCode;
  } else {
    context.selectedXCode = pointCode || context.selectedXCode;
  }
  const selectedCode = getSelectedModule2CodeForActiveAxis();

  if (latestState) {
    saveModule2ScrollPosition();
    renderAppState(latestState);
    if (shouldFocus && selectedCode) focusSelectedModule2Row();
    return;
  }

  applyModule2Selection();
  if (shouldFocus && selectedCode) focusSelectedModule2Row();
}

function applyModule2Selection() {
  const rows = [...elements.module2Table.querySelectorAll("tbody tr")];

  rows.forEach((row) => {
    row.classList.remove(
      "is-selected",
      "is-ancestor",
      "is-family",
      "is-descendant",
      "is-selected-child",
      "is-leaf-parent-highlight",
      "is-leaf-sibling-highlight"
    );
    row.removeAttribute("aria-selected");
    row.style.removeProperty("--highlight-start");
    row.style.removeProperty("--parent-highlight-start");
  });

  const selectedCode = getSelectedModule2CodeForActiveAxis();
  if (!selectedCode) return;

  const selectedRow = rows.find((row) => row.dataset.pointCode === selectedCode);
  const selectedPath = selectedRow?.dataset.normalizedPath || "";
  const selectedIndentLevel = Number(selectedRow?.dataset.indentLevel) || 0;
  const highlightStart = getModule2HighlightStart(selectedIndentLevel);

  if (selectedPath) {
    const orderedAncestorPaths = getHierarchyAncestorPaths(selectedRow.dataset.hierarchyPath);
    const ancestorPaths = new Set(orderedAncestorPaths);
    const isSelectedLeaf = selectedRow.dataset.isParent !== "true";
    const parentPath = normalizeHierarchyPath(selectedRow.dataset.parentPath);

    rows.forEach((row) => {
      const path = row.dataset.normalizedPath || "";
      const isSelectedChild = path.startsWith(`${selectedPath} > `);
      row.classList.toggle("is-selected-child", isSelectedChild);
      row.classList.toggle("is-ancestor", ancestorPaths.has(path));
      if (isSelectedChild) row.style.setProperty("--highlight-start", highlightStart);
    });

    if (isSelectedLeaf && parentPath) {
      applyLeafFamilyHighlight(rows, selectedRow, parentPath);
    }
  }

  rows.forEach((row) => {
    if (row.dataset.pointCode === selectedCode) {
      row.classList.add("is-selected");
      row.setAttribute("aria-selected", "true");
      row.style.setProperty("--highlight-start", highlightStart);
    }
  });
}

function applyLeafFamilyHighlight(rows, selectedRow, parentPath) {
  const parentRow = rows.find((row) => row.dataset.normalizedPath === parentPath);
  const parentHighlightStart = getModule2HighlightStart(Number(parentRow?.dataset.indentLevel) || 0);

  selectedRow.style.setProperty("--parent-highlight-start", parentHighlightStart);

  rows.forEach((row) => {
    const path = row.dataset.normalizedPath || "";

    if (path === parentPath) {
      row.classList.add("is-leaf-parent-highlight");
      row.style.setProperty("--highlight-start", parentHighlightStart);
      return;
    }

    if (row !== selectedRow && path.startsWith(`${parentPath} > `)) {
      row.classList.add("is-leaf-sibling-highlight");
      row.style.setProperty("--highlight-start", parentHighlightStart);
    }
  });
}

function getModule2HighlightStart(indentLevel) {
  return `${18 + (indentLevel * 18)}px`;
}

function moveModule2Selection(direction) {
  const rows = getVisibleSelectableModule2Rows();
  if (rows.length === 0) return;

  const focusedRow = document.activeElement?.closest?.("tbody tr[data-point-code]");
  const currentCode = getSelectedModule2CodeForActiveAxis() || focusedRow?.dataset.pointCode || "";
  const currentIndex = rows.findIndex((row) => row.dataset.pointCode === currentCode);
  const fallbackIndex = direction > 0 ? 0 : rows.length - 1;
  const nextIndex = currentIndex === -1
    ? fallbackIndex
    : Math.min(Math.max(currentIndex + direction, 0), rows.length - 1);

  setSelectedModule2CodeForActiveAxis(rows[nextIndex].dataset.pointCode);
  applyModule2Selection();
  focusSelectedModule2Row();
}

function setSelectedModule2CodeForActiveAxis(pointCode) {
  const context = getActiveModule2Context();

  if (context.activeAxis === "template") {
    activeModule2TemplateId = pointCode || activeModule2TemplateId;
    updateUrlTemplateParam(activeModule2TemplateId);
    getActiveModule2Context().activeAxis = "template";
  } else if (context.activeAxis === "y") {
    context.selectedYCode = pointCode;
  } else if (context.activeAxis === "z") {
    context.selectedZCode = pointCode;
  } else {
    context.selectedXCode = pointCode || MODULE_2_TARGET.xAxisRcCode;
  }
}

function getVisibleSelectableModule2Rows() {
  return [...elements.module2Table.querySelectorAll("tbody tr[data-point-code]")]
    .filter((row) => !row.hidden);
}

function focusSelectedModule2Row() {
  const selectedCode = getSelectedModule2CodeForActiveAxis();
  const row = elements.module2Table.querySelector(`tbody tr[data-point-code="${CSS.escape(selectedCode)}"]`);
  if (!row || row.hidden) return;

  row.focus({ preventScroll: true });
  row.scrollIntoView({ block: "nearest", inline: "nearest" });
}

function saveModule2ScrollPosition() {
  if (!elements.module2TableWrap) return;

  const context = getActiveModule2Context();
  if (context.activeAxis === "template") {
    module2TemplateAxisState.scroll = {
      left: elements.module2TableWrap.scrollLeft,
      top: elements.module2TableWrap.scrollTop
    };
    return;
  }

  context.scrollByAxis[context.activeAxis] = {
    left: elements.module2TableWrap.scrollLeft,
    top: elements.module2TableWrap.scrollTop
  };
}

function restoreModule2ScrollPosition() {
  if (!elements.module2TableWrap) return;

  const context = getActiveModule2Context();
  const position = context.activeAxis === "template"
    ? module2TemplateAxisState.scroll
    : context.scrollByAxis[context.activeAxis] ?? { left: 0, top: 0 };
  elements.module2TableWrap.scrollLeft = position.left;
  elements.module2TableWrap.scrollTop = position.top;
  scheduleModule2StickyParentsUpdate();
}

function formatMetricValue(value, selectedUnit, valueFormat = "") {
  if (isPercentFormat(valueFormat)) return formatPercentValue(value);

  const unit = getUnitDefinition(selectedUnit);
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value / unit.divisor);
}

function formatSignedMetricValue(value, selectedUnit) {
  const unit = getUnitDefinition(selectedUnit);
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
    signDisplay: "exceptZero"
  }).format(value / unit.divisor);
}

function getCostOfRiskPointDisplayValue(point, displayMode) {
  return displayMode === "amount" ? point?.value : point?.ratioBasisPoints;
}

function formatCostOfRiskDisplayValue(value, displayMode, selectedUnit, signed = false) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "-";
  if (displayMode === "ratio") {
    const sign = signed && value > 0 ? "+" : "";
    return `${sign}${formatBasisPointsValue(value)}`;
  }
  return signed ? formatSignedMetricValue(value, selectedUnit) : formatMetricValue(value, selectedUnit);
}

function isPercentFormat(valueFormat) {
  const format = String(valueFormat ?? "").trim().toLocaleLowerCase("fr-FR");
  if (!format) return false;

  return ["%", "pct", "percent", "percentage", "pourcent", "pourcentage"]
    .some((keyword) => format.includes(keyword));
}

function formatPercentValue(value) {
  const percentValue = Math.abs(value) <= 1 ? value * 100 : value;

  return `${new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(percentValue)} %`;
}

function formatContributionPercentValue(value) {
  return `${new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(value * 100)} %`;
}

function getUnitDefinition(selectedUnit) {
  const units = {
    billions: { divisor: 1_000_000_000 },
    euros: { divisor: 1 },
    millions: { divisor: 1_000_000 },
    thousands: { divisor: 1_000 }
  };

  return units[selectedUnit] ?? units.millions;
}
