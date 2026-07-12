import {
  COST_OF_RISK_DEFAULT_RATIO_DENOMINATOR_ID,
  COST_OF_RISK_FILTER_ALL,
  COST_OF_RISK_RATIO_DENOMINATORS,
  COST_OF_RISK_WATERFALL_X_CODES,
  COST_OF_RISK_X_AXIS_CODE,
  buildCostOfRiskCounterpartyTreemapData,
  buildCostOfRiskF02ImpairmentRatio,
  buildCostOfRiskF02ImpairmentSeries,
  buildCostOfRiskF12ContributionSeries,
  buildCostOfRiskF2VsF12Audit,
  buildCostOfRiskFilteredSelectionValue,
  buildCostOfRiskRatioDenominatorDetail,
  buildCostOfRiskStageBoxTimeSeries,
  buildCostOfRiskStageTransferFlowAudit,
  buildCostOfRiskStageTransferFlowDiagram,
  buildCostOfRiskStageTransferFlowTimeSeries,
  buildCostOfRiskStageTransferWaterfall,
  buildCostOfRiskWaterfall,
  clampCostOfRiskSmoothingWindow,
  createCostOfRiskRatioChartData,
  formatCostOfRiskAuditValue,
  formatCostOfRiskDisplayValue,
  formatCostOfRiskSmoothingLabel,
  formatReferenceQuarterLabel,
  getCostOfRiskFilterOptions,
  getCostOfRiskPointDisplayValue,
  getCostOfRiskRatioDenominatorOption,
  getCostOfRiskWaterfallXAxisOptions,
  getCostOfRiskXAxisOptions,
  getCostOfRiskYAxisBounds,
  getSelectedSmoothedCostOfRiskPoint
} from "../data/costOfRisk.js?v=20260712-denominator-fix";
import {
  createStageTransferWaterfallData,
  getStageTransferAxisLabel,
  getStageTransferDisplayValue,
  renderCostOfRiskStageTransferFlowDiagram
} from "./costOfRiskStageTransfers.js?v=20260712-denominator-picker";
import {
  buildBenchmarkChartModel,
  clearPeerDistributionBands,
  formatAnonymisedTooltipPeerLines,
  getBenchmarkLinePlotOptions,
  getBenchmarkYAxisBoundsSeries,
  renderBenchmarkEndpointLabels,
  renderPeerDistributionBands
} from "./benchmarkLineChart.js?v=20260712-anonymised-peers";
import { showAuditTrailDialog } from "./auditTrailDialog.js?v=20260710-audit-trail";
import { showContextMenu } from "./contextMenu.js?v=20260710-audit-trail";
import { formatBasisPointsValue, formatContributionPercentValue, formatMetricValue, formatSignedMetricValue } from "../data/core/formatting.js?v=20260710-bp-format";
import { getLatestState } from "./appState.js";
import { flowArrowColor, primaryDark } from "./theme.js?v=20260709-flow-arrow-color";

// Shared by every temporal chart (Contribution, F2 vs F12, Stage transfers
// flow evolution) so quarterly reference dates always read "Q12026" on the
// x-axis instead of a raw date.
function formatCostOfRiskQuarterAxisLabel(timestamp) {
  const date = new Date(timestamp);
  const quarter = Math.floor(date.getMonth() / 3) + 1;
  return `Q${quarter}${date.getFullYear()}`;
}

// Stage box ratios are computed on the same internal bps-equivalent scale as
// every other ratio in this module, but shown as a percentage instead — they
// run in the tens of percent, so basis points would be unwieldy to read.
function formatCostOfRiskStageBoxRatioValue(bpsValue) {
  if (!Number.isFinite(bpsValue)) return "-";
  return formatContributionPercentValue(bpsValue / 10000);
}

// Reference dates are real calendar quarter-ends (31/03, 30/06, ...), which
// aren't evenly spaced in milliseconds. Highcharts' automatic datetime tick
// picker doesn't know that and lands ticks off the actual data points. Every
// temporal chart must pass its own reference dates here so one tick (and one
// "Q12026" label) lines up with every single point, not an approximation.
function getCostOfRiskAxisTickPositions(points) {
  return [...new Set(
    (points ?? [])
      .filter((point) => point.date instanceof Date)
      .map((point) => point.date.getTime())
  )].sort((left, right) => left - right);
}

let rerenderApp = () => {};
let updateSelectedJst = () => {};
let activeCostOfRiskXAxisCode = COST_OF_RISK_X_AXIS_CODE;
let activeCostOfRiskSmoothingWindow = 4;
let activeCostOfRiskReferenceDate = "";
let activeCostOfRiskTab = "f2-vs-f12";
let activeCostOfRiskCoreXCodes = new Set(COST_OF_RISK_WATERFALL_X_CODES);
let activeCostOfRiskAuditSeries = "f12";
let activeCostOfRiskDisplayMode = "ratio";
let activeCostOfRiskRatioDenominatorId = COST_OF_RISK_DEFAULT_RATIO_DENOMINATOR_ID;
let activeCostOfRiskChartTitleText = "Time evolution chart";
let activeCostOfRiskWaterfallTitleText = "F12 Contribution Breakdown";
const COST_OF_RISK_CHART_TITLE_POSITION = {
  margin: 10,
  x: 0,
  y: 5
};
let costOfRiskChart = null;
let costOfRiskF2VsF12Chart = null;
let costOfRiskStageTransferChart = null;
let costOfRiskStageTransferFlowChart = null;
const DEFAULT_COST_OF_RISK_STAGE_TRANSFER_FLOW_KEY = "transfer:1-2";
let activeCostOfRiskStageTransferFlowKey = DEFAULT_COST_OF_RISK_STAGE_TRANSFER_FLOW_KEY;
let costOfRiskWaterfallChart = null;
let costOfRiskTreemapChart = null;
const activeCostOfRiskFilters = {
  asset: "Loans and advances",
  counterparty: COST_OF_RISK_FILTER_ALL,
  stage: COST_OF_RISK_FILTER_ALL
};
let costOfRiskDenominatorPopover = null;

const elements = {
  costOfRiskAsset: document.querySelector("#cost-of-risk-asset"),
  costOfRiskAudit: document.querySelector("#cost-of-risk-audit"),
  costOfRiskCounterparty: document.querySelector("#cost-of-risk-counterparty"),
  costOfRiskCoreDefinition: document.querySelector("#cost-of-risk-core-definition"),
  costOfRiskF2VsF12CoreDefinition: document.querySelector("#cost-of-risk-f2-f12-core-definition"),
  costOfRiskContext: document.querySelector("#cost-of-risk-context"),
  costOfRiskChart: document.querySelector("#cost-of-risk-chart"),
  costOfRiskChartTitle: document.querySelector("#cost-of-risk-chart-title"),
  costOfRiskDashboard: document.querySelector("#cost-of-risk-dashboard"),
  costOfRiskDenominatorButton: document.querySelector("#cost-of-risk-denominator-button"),
  costOfRiskDenominatorButtonValue: document.querySelector("#cost-of-risk-denominator-button-value"),
  costOfRiskDenominatorContext: document.querySelector("#cost-of-risk-denominator-context"),
  costOfRiskDenominatorValue: document.querySelector("#cost-of-risk-denominator-value"),
  costOfRiskDisplayMode: document.querySelector("#cost-of-risk-display-mode"),
  costOfRiskEmpty: document.querySelector("#cost-of-risk-empty"),
  costOfRiskF2VsF12Chart: document.querySelector("#cost-of-risk-f2-f12-chart"),
  costOfRiskF02Context: document.querySelector("#cost-of-risk-f02-context"),
  costOfRiskF02Value: document.querySelector("#cost-of-risk-f02-value"),
  costOfRiskPoints: document.querySelector("#cost-of-risk-points"),
  costOfRiskRatioContext: document.querySelector("#cost-of-risk-ratio-context"),
  costOfRiskRatioInfo: document.querySelector("#cost-of-risk-ratio-info"),
  costOfRiskRatioTooltip: document.querySelector("#cost-of-risk-ratio-tooltip"),
  costOfRiskRatioValue: document.querySelector("#cost-of-risk-ratio-value"),
  costOfRiskSmoothing: document.querySelector("#cost-of-risk-smoothing"),
  costOfRiskSmoothingValue: document.querySelector("#cost-of-risk-smoothing-value"),
  costOfRiskStage: document.querySelector("#cost-of-risk-stage"),
  costOfRiskStageTransferChart: document.querySelector("#cost-of-risk-stage-transfer-chart"),
  costOfRiskStageTransferFlowChart: document.querySelector("#cost-of-risk-stage-transfer-flow-chart"),
  costOfRiskStageTransferFlowChartTitle: document.querySelector("#cost-of-risk-stage-transfer-flow-chart-title"),
  costOfRiskStageTransferFlowChartWrap: document.querySelector("#cost-of-risk-stage-transfer-flow-chart-wrap"),
  costOfRiskStageTransferTitle: document.querySelector("#cost-of-risk-stage-transfer-title"),
  costOfRiskTabButtons: [...document.querySelectorAll("[data-cost-of-risk-tab]")],
  costOfRiskTabPanels: [...document.querySelectorAll("[data-cost-of-risk-panel]")],
  costOfRiskTreemap: document.querySelector("#cost-of-risk-treemap"),
  costOfRiskValue: document.querySelector("#cost-of-risk-value"),
  costOfRiskWaterfall: document.querySelector("#cost-of-risk-waterfall"),
  costOfRiskWaterfallTitle: document.querySelector("#cost-of-risk-waterfall-title"),
  costOfRiskXAxis: document.querySelector("#cost-of-risk-x-axis")
};

// Sidebar denominator picker: visible only in ratio mode, shows the active
// denominator's short label and updates the info tooltip. The popover
// itself is built on demand (showCostOfRiskDenominatorPopover) and torn
// down on close - only one instance can exist at a time.
function renderCostOfRiskRatioDenominatorControls() {
  const isRatioMode = activeCostOfRiskDisplayMode === "ratio";
  const activeDenominator = getCostOfRiskRatioDenominatorOption(activeCostOfRiskRatioDenominatorId);

  if (elements.costOfRiskRatioInfo) elements.costOfRiskRatioInfo.hidden = !isRatioMode;
  if (elements.costOfRiskRatioTooltip) elements.costOfRiskRatioTooltip.textContent = activeDenominator.tooltip;
  if (elements.costOfRiskDenominatorButton) elements.costOfRiskDenominatorButton.hidden = !isRatioMode;
  if (elements.costOfRiskDenominatorButtonValue) elements.costOfRiskDenominatorButtonValue.textContent = activeDenominator.shortLabel;

  if (!isRatioMode) hideCostOfRiskDenominatorPopover();
}

function showCostOfRiskDenominatorPopover(actions, rerender) {
  hideCostOfRiskDenominatorPopover();
  const anchor = elements.costOfRiskDenominatorButton;
  if (!anchor) return;

  const popover = document.createElement("div");
  popover.className = "cost-of-risk-denominator-popover";
  popover.setAttribute("role", "menu");

  COST_OF_RISK_RATIO_DENOMINATORS.forEach((option) => {
    const row = document.createElement("label");
    row.className = "cost-of-risk-denominator-option";

    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "cost-of-risk-denominator";
    radio.value = option.id;
    radio.checked = option.id === activeCostOfRiskRatioDenominatorId;
    radio.addEventListener("change", () => {
      activeCostOfRiskRatioDenominatorId = option.id;
      hideCostOfRiskDenominatorPopover();
      anchor.focus();
      rerender(actions.getState());
    });

    const text = document.createElement("div");
    const title = document.createElement("div");
    title.className = "cost-of-risk-denominator-option-title";
    title.textContent = option.label;
    if (option.isDefault) {
      const defaultTag = document.createElement("span");
      defaultTag.className = "cost-of-risk-denominator-option-default";
      defaultTag.textContent = " · Default";
      title.append(defaultTag);
    }
    const description = document.createElement("div");
    description.className = "cost-of-risk-denominator-option-description";
    description.textContent = option.description;
    const calculation = document.createElement("div");
    calculation.className = "cost-of-risk-denominator-option-calculation";
    calculation.textContent = `Calculation: ${option.calculation}`;
    text.append(title, description, calculation);

    row.append(radio, text);
    popover.append(row);
  });

  document.body.append(popover);
  costOfRiskDenominatorPopover = popover;
  anchor.setAttribute("aria-expanded", "true");

  const anchorRect = anchor.getBoundingClientRect();
  const popoverRect = popover.getBoundingClientRect();
  const left = Math.min(anchorRect.left, window.innerWidth - popoverRect.width - 8);
  const top = Math.min(anchorRect.bottom + 6, window.innerHeight - popoverRect.height - 8);
  popover.style.left = `${Math.max(8, left)}px`;
  popover.style.top = `${Math.max(8, top)}px`;

  document.addEventListener("click", handleCostOfRiskDenominatorPopoverOutsideClick);
}

function handleCostOfRiskDenominatorPopoverOutsideClick(event) {
  if (!costOfRiskDenominatorPopover) return;
  if (costOfRiskDenominatorPopover.contains(event.target) || event.target === elements.costOfRiskDenominatorButton) return;
  hideCostOfRiskDenominatorPopover();
}

function hideCostOfRiskDenominatorPopover() {
  if (!costOfRiskDenominatorPopover) return;
  costOfRiskDenominatorPopover.remove();
  costOfRiskDenominatorPopover = null;
  document.removeEventListener("click", handleCostOfRiskDenominatorPopoverOutsideClick);
  elements.costOfRiskDenominatorButton?.setAttribute("aria-expanded", "false");
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && costOfRiskDenominatorPopover) {
    hideCostOfRiskDenominatorPopover();
    elements.costOfRiskDenominatorButton?.focus();
  }
});

export function wireCostOfRiskUi(actions, rerender) {
  rerenderApp = rerender;
  updateSelectedJst = actions.updateSelectedJst;
  elements.costOfRiskAsset?.addEventListener("change", (event) => {
    activeCostOfRiskFilters.asset = event.target.value;
    rerenderApp(actions.getState());
  });
  elements.costOfRiskCounterparty?.addEventListener("change", (event) => {
    activeCostOfRiskFilters.counterparty = event.target.value;
    rerenderApp(actions.getState());
  });
  elements.costOfRiskStage?.addEventListener("change", (event) => {
    activeCostOfRiskFilters.stage = event.target.value;
    rerenderApp(actions.getState());
  });
  elements.costOfRiskDisplayMode?.addEventListener("change", (event) => {
    activeCostOfRiskDisplayMode = event.target.value === "amount" ? "amount" : "ratio";
    rerenderApp(actions.getState());
  });
  elements.costOfRiskXAxis?.addEventListener("change", (event) => {
    activeCostOfRiskXAxisCode = event.target.value;
    rerenderApp(actions.getState());
  });
  elements.costOfRiskSmoothing?.addEventListener("input", (event) => {
    activeCostOfRiskSmoothingWindow = clampCostOfRiskSmoothingWindow(event.target.value);
    rerenderApp(actions.getState());
  });
  elements.costOfRiskDashboard?.addEventListener("change", (event) => {
    const checkbox = event.target.closest?.("[data-cost-of-risk-core-code]");
    if (!checkbox) return;

    updateCostOfRiskCoreDefinition(checkbox.dataset.costOfRiskCoreCode, checkbox.checked);
    rerenderApp(actions.getState());
  });
  elements.costOfRiskTabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      activeCostOfRiskTab = button.dataset.costOfRiskTab || "contributions";
      rerenderApp(actions.getState());
    });
  });
  elements.costOfRiskDenominatorButton?.addEventListener("click", (event) => {
    event.stopPropagation();
    if (costOfRiskDenominatorPopover) {
      hideCostOfRiskDenominatorPopover();
    } else {
      showCostOfRiskDenominatorPopover(actions, rerender);
    }
  });
}

export function renderCostOfRisk(state) {
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
    activeCostOfRiskReferenceDate,
    activeCostOfRiskRatioDenominatorId
  );
  activeCostOfRiskReferenceDate = selection.referenceDate || activeCostOfRiskReferenceDate;
  const f02Ratio = buildCostOfRiskF02ImpairmentRatio(state, activeCostOfRiskReferenceDate, activeCostOfRiskRatioDenominatorId);
  const f02Series = buildCostOfRiskF02ImpairmentSeries(state, activeCostOfRiskRatioDenominatorId);
  const waterfall = buildCostOfRiskWaterfall(state, activeCostOfRiskFilters, activeCostOfRiskReferenceDate, selectedCoreXCodes, activeCostOfRiskRatioDenominatorId);

  renderCostOfRiskFilterSelect(elements.costOfRiskAsset, filterOptions.assets, activeCostOfRiskFilters.asset);
  renderCostOfRiskFilterSelect(elements.costOfRiskCounterparty, filterOptions.counterparties, activeCostOfRiskFilters.counterparty);
  renderCostOfRiskFilterSelect(elements.costOfRiskStage, filterOptions.stages, activeCostOfRiskFilters.stage);
  if (elements.costOfRiskDisplayMode) elements.costOfRiskDisplayMode.value = activeCostOfRiskDisplayMode;
  renderCostOfRiskRatioDenominatorControls();
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
    leaveCostOfRiskStageTransferTab();
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
  const isRatioModeMissingDenominator = activeCostOfRiskDisplayMode === "ratio" && !selection.denominator;
  elements.costOfRiskRatioValue.textContent = formatCostOfRiskDisplayValue(
    activeCostOfRiskDisplayMode === "ratio"
      ? selectedSmoothedPoint?.smoothedRatioBasisPoints ?? selection.ratioBasisPoints
      : selectedSmoothedPoint?.smoothedValue ?? selection.value,
    activeCostOfRiskDisplayMode,
    state.selectedUnit
  );
  elements.costOfRiskRatioContext.textContent = isRatioModeMissingDenominator
    ? `Ratio unavailable: ${getCostOfRiskRatioDenominatorOption(activeCostOfRiskRatioDenominatorId).description.toLowerCase().replace(/\.$/, "")} is not available.`
    : `${state.selectedJst} - ${selection.referenceDate} - ${activeCostOfRiskDisplayMode === "ratio" ? formatCostOfRiskSmoothingLabel(activeCostOfRiskSmoothingWindow) : "amount"}`;
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
      state.selectedUnit,
      state.peerDisplayMode
    );
    destroyCostOfRiskTreemapChart();
    destroyCostOfRiskF2VsF12Chart();
    leaveCostOfRiskStageTransferTab();
  } else if (activeCostOfRiskTab === "f2-vs-f12") {
    destroyCostOfRiskWaterfallChart();
    destroyCostOfRiskChart();
    destroyCostOfRiskTreemapChart();
    leaveCostOfRiskStageTransferTab();
    renderCostOfRiskF2VsF12Chart(
      f02Series,
      buildCostOfRiskF12ContributionSeries(state, activeCostOfRiskFilters, selectedCoreXCodes, activeCostOfRiskRatioDenominatorId),
      activeCostOfRiskDisplayMode,
      state.selectedUnit
    );
    renderCostOfRiskAuditTable(
      buildCostOfRiskF2VsF12Audit(state, activeCostOfRiskFilters, selectedCoreXCodes, activeCostOfRiskRatioDenominatorId),
      state.selectedUnit
    );
  } else if (activeCostOfRiskTab === "stage-transfers") {
    destroyCostOfRiskWaterfallChart();
    destroyCostOfRiskChart();
    destroyCostOfRiskF2VsF12Chart();
    destroyCostOfRiskTreemapChart();
    clearCostOfRiskAuditTable();
    renderCostOfRiskStageTransferView(state);
  } else if (activeCostOfRiskTab === "analysis") {
    destroyCostOfRiskWaterfallChart();
    destroyCostOfRiskChart();
    destroyCostOfRiskF2VsF12Chart();
    leaveCostOfRiskStageTransferTab();
    clearCostOfRiskAuditTable();
    renderCostOfRiskTreemap(
      buildCostOfRiskCounterpartyTreemapData(state, activeCostOfRiskFilters, activeCostOfRiskReferenceDate),
      activeCostOfRiskDisplayMode,
      state.selectedUnit
    );
  } else {
    destroyCostOfRiskWaterfallChart();
    destroyCostOfRiskChart();
    destroyCostOfRiskF2VsF12Chart();
    leaveCostOfRiskStageTransferTab();
    destroyCostOfRiskTreemapChart();
    clearCostOfRiskAuditTable();
  }
  scheduleCostOfRiskChartReflow();
}

function scheduleCostOfRiskChartReflow() {
  window.requestAnimationFrame?.(() => {
    [
      costOfRiskChart,
      costOfRiskWaterfallChart,
      costOfRiskStageTransferFlowChart,
      costOfRiskF2VsF12Chart,
      costOfRiskTreemapChart
    ].forEach((chart) => chart?.reflow?.());
  });
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
  const fallbackLabel = xAxisOptions.find((option) => option.code === selectedCode)?.label ?? selectedCode;
  const label = selectedPoint?.label ?? fallbackLabel;
  const cleanLabel = String(label || "").replace(new RegExp(`^${selectedCode}\\s*-\\s*`), "");
  activeCostOfRiskChartTitleText = `${selectedCode} - ${cleanLabel}`;
  if (elements.costOfRiskChartTitle) elements.costOfRiskChartTitle.textContent = activeCostOfRiskChartTitleText;
}

function renderCostOfRiskWaterfallTitle(referenceDate) {
  const dateLabel = referenceDate ? ` - ${formatReferenceQuarterLabel(referenceDate)}` : "";
  activeCostOfRiskWaterfallTitleText = `F12 Contribution Breakdown${dateLabel}`;
  if (elements.costOfRiskWaterfallTitle) elements.costOfRiskWaterfallTitle.textContent = activeCostOfRiskWaterfallTitleText;
}

function createCostOfRiskHighchartsTitle(text) {
  return {
    align: "left",
    margin: COST_OF_RISK_CHART_TITLE_POSITION.margin,
    text: text || "",
    x: COST_OF_RISK_CHART_TITLE_POSITION.x,
    y: COST_OF_RISK_CHART_TITLE_POSITION.y,
    style: {
      color: "#26332d",
      fontSize: "12px",
      fontWeight: "600"
    }
  };
}

function renderCostOfRiskChart(selection, jstCode, smoothingWindow, selectedContribution, displayMode = "ratio", selectedUnit = "millions", peerDisplayMode = "explicit") {
  if (!elements.costOfRiskChart || !window.Highcharts) return;

  const chartModel = buildBenchmarkChartModel(selection.benchmarkSeries, jstCode, primaryDark, { displayMode, peerDisplayMode, smoothingWindow });
  const series = chartModel.series;
  const isAnonymised = chartModel.peerDisplayMode === "anonymised";
  const yBounds = getCostOfRiskYAxisBounds(getBenchmarkYAxisBoundsSeries(series, chartModel.distribution));
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
          if (isAnonymised) {
            renderPeerDistributionBands(this, chartModel.distribution);
          } else {
            clearPeerDistributionBands(this);
          }
          renderBenchmarkEndpointLabels(this, jstCode, selectCostOfRiskChartJst);
        }
      },
      spacingRight: 128,
      type: "line"
    },
    credits: { enabled: false },
    legend: { enabled: false },
    plotOptions: getBenchmarkLinePlotOptions((referenceLabel, seriesName) => {
      selectCostOfRiskReferenceDate(referenceLabel);
      selectCostOfRiskChartJst(seriesName);
    }, jstCode),
    series,
    subtitle: isAnonymised && chartModel.status ? { text: chartModel.status, style: { color: "#8a7248", fontSize: "10px" } } : { text: "" },
    title: createCostOfRiskHighchartsTitle(activeCostOfRiskChartTitleText),
    tooltip: {
      headerFormat: "<span style=\"font-size:11px\">{point.key:%d/%m/%Y}</span><br/>",
      pointFormatter() {
        const peerLines = isAnonymised
          ? formatAnonymisedTooltipPeerLines(chartModel.distribution, this.x, (value) => formatCostOfRiskDisplayValue(value, displayMode, selectedUnit))
          : "";
        return `<span style="color:${this.series.color}">\u25cf</span> <b>${escapeHtml(this.series.name)}</b>: ${formatCostOfRiskDisplayValue(this.y, displayMode, selectedUnit)}<br/><span style="color:#6f7974">${formatCostOfRiskSmoothingLabel(smoothingWindow)}</span>${peerLines ? `<br/>${peerLines}` : ""}`;
      },
      shared: false,
      split: false,
      stickOnContact: true,
      xDateFormat: "%d/%m/%Y"
    },
    xAxis: {
      labels: {
        formatter() {
          return formatCostOfRiskQuarterAxisLabel(this.value);
        },
        rotation: -45,
        style: { color: "#5f6b65" }
      },
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
      tickPositions: getCostOfRiskAxisTickPositions(selection.series),
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
        fillColor: primaryDark,
        lineColor: primaryDark,
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
      labels: {
        formatter() {
          return formatCostOfRiskQuarterAxisLabel(this.value);
        },
        rotation: -45,
        style: { color: "#5f6b65" }
      },
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
      tickPositions: getCostOfRiskAxisTickPositions([...(f02Series.points ?? []), ...(f12Series.points ?? [])]),
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

function leaveCostOfRiskStageTransferTab() {
  destroyCostOfRiskStageTransferChart();
  destroyCostOfRiskStageTransferFlowChart();
  if (elements.costOfRiskStageTransferFlowChartWrap) elements.costOfRiskStageTransferFlowChartWrap.hidden = true;
}

function renderCostOfRiskWaterfallChart(waterfall, jstCode, displayMode = "ratio", selectedUnit = "millions") {
  if (!elements.costOfRiskWaterfall || !window.Highcharts) return;

  const contributions = (waterfall.points ?? [])
    .filter((point) => Number.isFinite(getCostOfRiskPointDisplayValue(point, displayMode)))
    .map((point) => ({
      color: flowArrowColor,
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
  waterfallData.axisLabelFontSize = "9px";
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
      marginBottom: 65,
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
    title: createCostOfRiskHighchartsTitle(activeCostOfRiskWaterfallTitleText),
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

// The per-stage waterfall (renderCostOfRiskStageTransferWaterfallChart) is
// intentionally kept in the codebase but no longer displayed here: the
// "Stage" filter no longer changes this view — the global inter-stage flow
// diagram is always shown regardless of its value.
function renderCostOfRiskStageTransferView(state) {
  ensureCostOfRiskStageTransferFlowSelection();
  renderCostOfRiskStageTransferFlowChart(
    state,
    buildCostOfRiskStageTransferFlowDiagram(state, activeCostOfRiskReferenceDate, activeCostOfRiskFilters, activeCostOfRiskRatioDenominatorId),
    state.selectedUnit,
    activeCostOfRiskDisplayMode
  );
}

function renderCostOfRiskStageTransferFlowChart(state, flowDiagram, selectedUnit, displayMode = "amount") {
  if (!elements.costOfRiskStageTransferChart) return;
  destroyCostOfRiskStageTransferChart();

  const dateLabel = flowDiagram.referenceDate ? ` - ${formatReferenceQuarterLabel(flowDiagram.referenceDate)}` : "";
  const titleText = `F12.02 Stage transfer flows - ${flowDiagram.assetLabel} - All stages${dateLabel}`;
  if (elements.costOfRiskStageTransferTitle) elements.costOfRiskStageTransferTitle.textContent = titleText;

  renderCostOfRiskStageTransferFlowDiagram({
    container: elements.costOfRiskStageTransferChart,
    displayMode,
    flowArrowColor,
    flowDiagram,
    formatValue: formatCostOfRiskDisplayValue,
    onContextMenu: (flowKey, event) => handleCostOfRiskStageTransferFlowContextMenu(state, flowKey, event),
    onSelectFlow: selectCostOfRiskStageTransferFlow,
    primaryDark,
    selectedFlowKey: activeCostOfRiskStageTransferFlowKey,
    selectedUnit,
    titlePosition: COST_OF_RISK_CHART_TITLE_POSITION,
    titleText
  });

  renderCostOfRiskStageTransferFlowTimeSeriesChart(state, displayMode, selectedUnit);
}

function ensureCostOfRiskStageTransferFlowSelection() {
  if (!activeCostOfRiskStageTransferFlowKey) {
    activeCostOfRiskStageTransferFlowKey = DEFAULT_COST_OF_RISK_STAGE_TRANSFER_FLOW_KEY;
  }
}

// One flow is always selected. Clicking the current flow keeps it active;
// clicking another flow moves the selection.
function selectCostOfRiskStageTransferFlow(flowKey) {
  if (!flowKey || flowKey === activeCostOfRiskStageTransferFlowKey) return;
  activeCostOfRiskStageTransferFlowKey = flowKey;
  if (getLatestState()) rerenderApp(getLatestState());
}

// "Where does it come from?" audit trail - right-clicking any part of a flow
// (arrow, label or value) reconstructs, from the raw underlying data points,
// exactly how the displayed value was computed. Reuses the generic
// contextMenu.js / auditTrailDialog.js modules so the same pattern can be
// wired onto any other chart later.
function handleCostOfRiskStageTransferFlowContextMenu(state, flowKey, event) {
  const audit = buildCostOfRiskStageTransferFlowAudit(state, activeCostOfRiskFilters, flowKey, activeCostOfRiskReferenceDate);
  if (!audit) return;

  showContextMenu([{
    action: () => showAuditTrailDialog(createCostOfRiskStageTransferFlowAuditTrail(state, audit)),
    label: "Where does it come from?"
  }], event);
}

function createCostOfRiskStageTransferFlowAuditTrail(state, audit) {
  const selectedUnit = state.selectedUnit;
  const view = buildCostOfRiskStageTransferFlowAuditTrailView(audit, selectedUnit);
  if (activeCostOfRiskDisplayMode === "ratio") {
    appendCostOfRiskRatioDenominatorSection(view, audit, state, selectedUnit);
  }
  return view;
}

// Appends a "Ratio denominator" section (with the same per-term breakdown
// as the sidebar popover) and turns the headline value into the displayed
// ratio, since the flow diagram itself shows ratio-mode values divided by
// the user-selected denominator - the audit trail must explain that
// division, not just the raw movement amount.
function appendCostOfRiskRatioDenominatorSection(view, audit, state, selectedUnit) {
  const denominatorOption = getCostOfRiskRatioDenominatorOption(activeCostOfRiskRatioDenominatorId);
  const denominatorDetail = buildCostOfRiskRatioDenominatorDetail(state, activeCostOfRiskRatioDenominatorId, audit.referenceLabel, state.selectedJst);
  const formatAmount = (value) => formatCostOfRiskAuditValue(value, "amount", selectedUnit);
  const isRatioAvailable = denominatorDetail.status === "available" && Number.isFinite(denominatorDetail.value) && denominatorDetail.value !== 0;
  const ratioBasisPoints = isRatioAvailable ? (audit.value / denominatorDetail.value) * 10000 : null;
  const rawValueLabel = view.valueLabel;

  view.definition = `${view.definition} Shown in ratio mode as this amount divided by the selected ratio denominator (${denominatorOption.label}).`;
  view.valueLabel = isRatioAvailable
    ? `${formatCostOfRiskAuditValue(ratioBasisPoints, "bp")} (${rawValueLabel} raw)`
    : `Ratio unavailable (${rawValueLabel} raw)`;

  view.sections.push({
    columns: [
      { header: "Component", key: "label" },
      { align: "right", header: "Value", key: "value" }
    ],
    description: `${denominatorOption.description} Calculation: ${denominatorOption.calculation}`,
    rows: denominatorDetail.components.map((component) => ({
      label: `${component.operator === "subtract" ? "− " : ""}${component.label}`,
      value: Number.isFinite(component.value) ? formatAmount(component.value) : "-"
    })),
    title: `Ratio denominator - ${denominatorOption.label} (F_18.00)`,
    totalRow: {
      label: isRatioAvailable ? "Total" : "Total (unavailable)",
      value: isRatioAvailable ? formatAmount(denominatorDetail.value) : "-"
    }
  });

  if (isRatioAvailable) {
    const ratioFormula = `${rawValueLabel} / ${formatAmount(denominatorDetail.value)} = ${formatCostOfRiskAuditValue(ratioBasisPoints, "bp")}`;
    view.formula = view.formula ? `${view.formula}\n${ratioFormula}` : ratioFormula;
  }
}

function buildCostOfRiskStageTransferFlowAuditTrailView(audit, selectedUnit) {
  const subtitle = `Reference date - ${formatReferenceQuarterLabel(audit.referenceLabel)}`;
  const previousLabel = audit.previousReferenceLabel ? formatReferenceQuarterLabel(audit.previousReferenceLabel) : "previous quarter";
  const currentLabel = formatReferenceQuarterLabel(audit.referenceLabel);
  const formatAmount = (value) => formatCostOfRiskAuditValue(value, "amount", selectedUnit);

  if (audit.type === "transfer") {
    return {
      definition: `Sum, over every matching F_12.02 y-axis point, of the quarter-on-quarter change in x=${audit.xCode} (${audit.xLabel}) - the gross carrying amount reported as transferred by this movement during the reference quarter.`,
      sections: [{
        columns: [
          { header: "Code", key: "code" },
          { header: "Description", key: "description" },
          { align: "right", header: `Cumulative @ ${previousLabel}`, key: "previous" },
          { align: "right", header: `Cumulative @ ${currentLabel}`, key: "current" },
          { align: "right", header: "Quarterly movement", key: "quarterly" }
        ],
        rows: audit.components.map((item) => ({
          code: item.code,
          current: formatAmount(item.currentCumulative),
          description: item.description,
          previous: formatAmount(item.previousCumulative),
          quarterly: formatAmount(item.quarterly)
        })),
        title: `F_12.02 - x=${audit.xCode} (${audit.xLabel}) - ${audit.assetLabel}`,
        totalRow: { description: "Total", quarterly: formatAmount(audit.value) }
      }],
      subtitle,
      title: `Stage ${audit.descriptor.from} → Stage ${audit.descriptor.to}`,
      valueLabel: formatAmount(audit.value)
    };
  }

  if (audit.type === "writeoff") {
    return {
      definition: `Sum of absolute quarter-on-quarter movements in F_12.01 x=0080/x=0120 (write-offs), over every matching y-axis point, for Stage ${audit.stage}.`,
      sections: [{
        columns: [
          { header: "x code", key: "xCode" },
          { header: "y code", key: "yCode" },
          { header: "Description", key: "description" },
          { align: "right", header: `Cumulative @ ${previousLabel}`, key: "previous" },
          { align: "right", header: `Cumulative @ ${currentLabel}`, key: "current" },
          { align: "right", header: "Quarterly movement", key: "quarterly" }
        ],
        rows: audit.components.map((item) => ({
          current: formatAmount(item.currentCumulative),
          description: item.description,
          previous: formatAmount(item.previousCumulative),
          quarterly: formatAmount(item.quarterly),
          xCode: `${item.xCode} (${item.xLabel})`,
          yCode: item.yCode
        })),
        title: `F_12.01 - write-off codes - Stage ${audit.stage}`,
        totalRow: { description: "Total write-off", quarterly: formatAmount(audit.value) }
      }],
      subtitle,
      title: `Write-Off - Stage ${audit.stage}`,
      valueLabel: formatAmount(audit.value)
    };
  }

  const exposureSection = {
    columns: [
      { header: "Code", key: "code" },
      { header: "Description", key: "description" },
      { align: "right", header: `Balance @ ${previousLabel}`, key: "previous" },
      { align: "right", header: `Balance @ ${currentLabel}`, key: "current" },
      { align: "right", header: "Delta", key: "delta" }
    ],
    description: "Total exposure balance for this stage (F_04.04.1).",
    rows: audit.exposureComponents.map((item) => ({
      code: item.code,
      current: formatAmount(item.currentValue),
      delta: formatAmount(item.delta),
      description: item.description,
      previous: formatAmount(item.previousValue)
    })),
    title: "Exposure variation (F_04.04.1)",
    totalRow: { description: "Total delta", delta: formatAmount(audit.exposureDelta) }
  };

  const transfersSection = {
    columns: [
      { header: "Code", key: "code" },
      { header: "Movement", key: "label" },
      { header: "Direction", key: "direction" },
      { align: "right", header: "Quarterly amount", key: "quarterly" },
      { align: "right", header: "Contribution to stage", key: "signed" }
    ],
    description: "Transfers already explained by the arrows leaving/entering this stage - subtracted so only the unexplained residual remains.",
    rows: audit.transferComponents.map((item) => ({
      code: item.code,
      direction: item.direction === "in" ? `From Stage ${item.from}` : `To Stage ${item.to}`,
      label: item.label,
      quarterly: formatAmount(item.quarterly),
      signed: formatAmount(item.signedContribution)
    })),
    title: "Net transfers (F_12.02)",
    totalRow: { direction: "Net transfers", signed: formatAmount(audit.netTransfers) }
  };

  const writeOffSection = {
    columns: [
      { header: "x code", key: "xCode" },
      { header: "y code", key: "yCode" },
      { header: "Description", key: "description" },
      { align: "right", header: "Quarterly movement", key: "quarterly" }
    ],
    description: "Write-offs already explained by the write-off arrow for this stage - added back since they reduce the balance without being a stage transfer.",
    rows: audit.writeOffComponents.map((item) => ({
      description: item.description,
      quarterly: formatAmount(item.quarterly),
      xCode: `${item.xCode} (${item.xLabel})`,
      yCode: item.yCode
    })),
    title: "Write-offs (F_12.01)",
    totalRow: { description: "Total write-off", quarterly: formatAmount(audit.writeOffMagnitude) }
  };

  return {
    definition: "The residual stage variation not already explained by inter-stage transfers or write-offs: (exposure delta) − (net transfers) + (write-offs).",
    formula: `${formatAmount(audit.exposureDelta)} − (${formatAmount(audit.netTransfers)}) + ${formatAmount(audit.writeOffMagnitude)} = ${formatAmount(audit.value)}`,
    sections: [exposureSection, transfersSection, writeOffSection],
    subtitle,
    title: `Other movements - Stage ${audit.stage}`,
    valueLabel: formatAmount(audit.value)
  };
}

function renderCostOfRiskStageTransferFlowTimeSeriesChart(state, displayMode, selectedUnit) {
  if (!elements.costOfRiskStageTransferFlowChart) return;

  if (!activeCostOfRiskStageTransferFlowKey) {
    destroyCostOfRiskStageTransferFlowChart();
    if (elements.costOfRiskStageTransferFlowChartWrap) elements.costOfRiskStageTransferFlowChartWrap.hidden = true;
    return;
  }

  const isStageBoxSelection = activeCostOfRiskStageTransferFlowKey.startsWith("stagebox:");
  const flowSeries = isStageBoxSelection
    ? buildCostOfRiskStageBoxTimeSeries(state, activeCostOfRiskFilters, activeCostOfRiskStageTransferFlowKey.split(":")[1], activeCostOfRiskRatioDenominatorId)
    : buildCostOfRiskStageTransferFlowTimeSeries(state, activeCostOfRiskFilters, activeCostOfRiskStageTransferFlowKey, activeCostOfRiskRatioDenominatorId);
  if (elements.costOfRiskStageTransferFlowChartWrap) elements.costOfRiskStageTransferFlowChartWrap.hidden = false;
  const titleText = `${flowSeries.label} - time evolution`;
  if (elements.costOfRiskStageTransferFlowChartTitle) elements.costOfRiskStageTransferFlowChartTitle.textContent = titleText;

  if (!window.Highcharts || flowSeries.benchmarkSeries.length === 0) {
    destroyCostOfRiskStageTransferFlowChart();
    elements.costOfRiskStageTransferFlowChart.textContent = flowSeries.status || "";
    return;
  }

  const chartModel = buildBenchmarkChartModel(flowSeries.benchmarkSeries, state.selectedJst, primaryDark, {
    displayMode,
    peerDisplayMode: state.peerDisplayMode,
    smoothingWindow: activeCostOfRiskSmoothingWindow
  });
  const series = chartModel.series;
  const isAnonymised = chartModel.peerDisplayMode === "anonymised";
  if (series.length === 0) {
    destroyCostOfRiskStageTransferFlowChart();
    elements.costOfRiskStageTransferFlowChart.textContent = "";
    return;
  }

  const yBounds = getCostOfRiskYAxisBounds(getBenchmarkYAxisBoundsSeries(series, chartModel.distribution));
  const selectedReferencePoint = flowSeries.benchmarkSeries
    .find((benchmark) => benchmark.jstCode === state.selectedJst)
    ?.points?.find((point) => point.label === activeCostOfRiskReferenceDate);

  const options = {
    chart: {
      animation: false,
      backgroundColor: "transparent",
      events: {
        render() {
          if (isAnonymised) {
            renderPeerDistributionBands(this, chartModel.distribution);
          } else {
            clearPeerDistributionBands(this);
          }
          renderBenchmarkEndpointLabels(this, state.selectedJst, selectCostOfRiskChartJst);
        }
      },
      spacingRight: 128,
      type: "line"
    },
    credits: { enabled: false },
    legend: { enabled: false },
    plotOptions: getBenchmarkLinePlotOptions((referenceLabel, seriesName) => {
      selectCostOfRiskReferenceDate(referenceLabel);
      selectCostOfRiskChartJst(seriesName);
    }, state.selectedJst),
    series,
    subtitle: isAnonymised && chartModel.status ? { text: chartModel.status, style: { color: "#8a7248", fontSize: "10px" } } : { text: "" },
    title: createCostOfRiskHighchartsTitle(titleText),
    tooltip: {
      headerFormat: "<span style=\"font-size:11px\">{point.key:%d/%m/%Y}</span><br/>",
      pointFormatter() {
        const valueFormatter = (value) => (isStageBoxSelection && displayMode === "ratio"
          ? formatCostOfRiskStageBoxRatioValue(value)
          : formatCostOfRiskDisplayValue(value, displayMode, selectedUnit));
        const peerLines = isAnonymised ? formatAnonymisedTooltipPeerLines(chartModel.distribution, this.x, valueFormatter) : "";
        return `<span style="color:${this.series.color}">●</span> <b>${escapeHtml(this.series.name)}</b>: ${valueFormatter(this.y)}<br/><span style="color:#6f7974">${formatCostOfRiskSmoothingLabel(activeCostOfRiskSmoothingWindow)}</span>${peerLines ? `<br/>${peerLines}` : ""}`;
      },
      shared: false,
      split: false,
      stickOnContact: true,
      xDateFormat: "%d/%m/%Y"
    },
    xAxis: {
      labels: {
        formatter() {
          return formatCostOfRiskQuarterAxisLabel(this.value);
        },
        rotation: -45,
        style: { color: "#5f6b65" }
      },
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
      tickPositions: getCostOfRiskAxisTickPositions(flowSeries.benchmarkSeries[0]?.points),
      type: "datetime"
    },
    yAxis: {
      gridLineColor: "#edf0ee",
      labels: {
        formatter() {
          if (isStageBoxSelection && displayMode === "ratio") return formatCostOfRiskStageBoxRatioValue(this.value);
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
      tickAmount: 6,
      title: { text: displayMode === "ratio" ? (isStageBoxSelection ? "Percent" : "Basis points") : "Amount" }
    }
  };

  if (costOfRiskStageTransferFlowChart) {
    costOfRiskStageTransferFlowChart.update(options, true, true, false);
  } else {
    costOfRiskStageTransferFlowChart = window.Highcharts.chart(elements.costOfRiskStageTransferFlowChart, options);
  }
}

function destroyCostOfRiskStageTransferFlowChart() {
  if (!costOfRiskStageTransferFlowChart) return;
  costOfRiskStageTransferFlowChart.destroy();
  costOfRiskStageTransferFlowChart = null;
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

// Extra horizontal gap (in item-slot units, where 1 unit = one item's normal
// spacing) inserted at each of the two group boundaries in the Contribution
// waterfall: between "Total contribution" and the "Allowances variation"
// items, and between "Other adjustments" and the "Direct P&L impact" items.
// Starting value — tune to taste.
const COST_OF_RISK_WATERFALL_GROUP_GAP_UNITS = 1;

function createManualWaterfallData(contributions) {
  const total = contributions.reduce((sum, point) => sum + point.y, 0);
  let runningTotal = 0;
  const items = [];
  const values = [0, total];

  items.push({
    color: flowArrowColor,
    contribution: total,
    end: total,
    groupIndex: 0,
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
      groupIndex: getCostOfRiskCoreSectionLabel(point.code) === "Direct P&L impact" ? 2 : 1,
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
    compactGroups: true,
    groupGapUnits: COST_OF_RISK_WATERFALL_GROUP_GAP_UNITS,
    itemGapUnits: 1,
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
        fill: isSelected ? primaryDark : item.color,
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

    const axisLabel = renderCostOfRiskWaterfallAxisLabel(chart, item, xCenter, slotWidth);
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
  return `${value > 0 ? "+" : ""}${formatBasisPointsValue(value)}`;
}

// Display-only shortenings of the standard COREP F_12.01 x-axis (0020-0125)
// descriptions, so the waterfall's axis labels read at a glance instead of
// wrapping/truncating the full regulatory wording. Falls back to the real
// label (from the loaded CSV's dimension mapping) for any code not listed
// here — no business logic or underlying data is affected.
const COST_OF_RISK_WATERFALL_SHORT_LABELS = {
  "0020": "Origination and acquisition",
  "0030": "Derecognition or repayment",
  "0040": "Changes in credit risk",
  "0050": "Modifications w/o derecognition",
  "0070": "Methodology update",
  "0080": "Write-offs",
  "0090": "Other adjustments",
  "0110": "Recoveries of write-offs",
  "0120": "Amounts written off",
  "0125": "Gains/losses on derecognition"
};

function renderCostOfRiskWaterfallAxisLabel(chart, item, xCenter, slotWidth) {
  const isSelected = item.code && item.code === activeCostOfRiskXAxisCode;
  const waterfallData = chart.customCostOfRiskWaterfallData ?? {};
  const textStyle = {
    color: waterfallData.axisLabelColor || (isSelected ? "#24352d" : "#5f6b65"),
    fontSize: waterfallData.axisLabelFontSize || "9px",
    fontWeight: isSelected ? "700" : "500"
  };
  // Hard cap, on top of the word-wrap heuristic: whatever the content and
  // font size, a label line is truncated with an ellipsis rather than ever
  // spilling into its neighbor's slot.
  const maxLineWidth = Number.isFinite(slotWidth) ? Math.max(20, slotWidth - 6) : null;
  const rawLabel = COST_OF_RISK_WATERFALL_SHORT_LABELS[item.code] ?? (item.axisLabel || item.name);
  const lines = getCostOfRiskWaterfallLabelLines(rawLabel)
    .map((line) => fitCostOfRiskWaterfallLabelLineWidth(chart, line, textStyle, maxLineWidth));
  if (lines.length === 0) return null;

  const label = chart.renderer
    .text(lines.map(escapeHtml).join("<br/>"), xCenter, chart.plotTop + chart.plotHeight + 24)
    .css({
      ...textStyle,
      cursor: item.code ? "pointer" : "default",
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

function fitCostOfRiskWaterfallLabelLineWidth(chart, text, textStyle, maxWidth) {
  if (!maxWidth || !text) return text;

  const measurer = chart.renderer.text(text, -9999, -9999).css(textStyle).add();
  let result = text;

  if (measurer.getBBox().width > maxWidth) {
    while (result.length > 1 && measurer.getBBox().width > maxWidth) {
      result = result.slice(0, -1);
      measurer.attr({ text: `${result}…` });
    }
    result = `${result}…`;
  }

  measurer.destroy();
  return result;
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
  if (getLatestState()) rerenderApp(getLatestState());
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
    if (candidate.length > 12 && currentLine) {
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

function selectCostOfRiskReferenceDate(referenceDate) {
  if (!referenceDate || referenceDate === activeCostOfRiskReferenceDate) return;

  activeCostOfRiskReferenceDate = referenceDate;
  if (getLatestState()) rerenderApp(getLatestState());
}

// Reuses the same global JST_CODE update entry point as the header dropdown
// (actions.updateSelectedJst), so selecting a series here behaves exactly
// like a manual header selection: same store update, same URL sync, same
// full app re-render. Any other chart/table can call updateSelectedJst the
// same way to gain this behavior.
function selectCostOfRiskChartJst(jstCode) {
  if (!jstCode || jstCode === getLatestState()?.selectedJst) return;

  updateSelectedJst(jstCode);
}

function selectCostOfRiskAuditSeries(seriesName, referenceDate) {
  if (seriesName) activeCostOfRiskAuditSeries = seriesName;
  if (referenceDate) activeCostOfRiskReferenceDate = referenceDate;
  if (getLatestState()) rerenderApp(getLatestState());
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
