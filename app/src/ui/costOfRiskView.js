import {
  COST_OF_RISK_FILTER_ALL,
  COST_OF_RISK_BALANCE_SCOPE_IN_BALANCE,
  COST_OF_RISK_DEFINITION_CUSTOM_X_CODES,
  COST_OF_RISK_DEFINITION_OPTIONS,
  DEFAULT_COST_OF_RISK_COLLATERAL_RATIO_CELL,
  DEFAULT_COST_OF_RISK_COVERAGE_RATIO_CELL,
  DEFAULT_COST_OF_RISK_COUNTERPARTY_SUMMARY_CELL,
  DEFAULT_COST_OF_RISK_STAGE_RATIO_CELL,
  DEFAULT_COST_OF_RISK_STAGE_SUMMARY_CELL,
  COST_OF_RISK_F12_RECONCILIATION_X_CODES,
  COST_OF_RISK_TOTAL_CONTRIBUTION_X_CODE,
  COST_OF_RISK_WATERFALL_X_CODES,
  COST_OF_RISK_X_AXIS_CODE,
  buildCostOfRiskCollateralRatioModel,
  buildCostOfRiskCoverageRatioModel,
  buildCostOfRiskCounterpartySummaryModel,
  buildCostOfRiskCounterpartyTreemapData,
  buildCostOfRiskDefinitionModel,
  buildCostOfRiskF02ImpairmentRatio,
  buildCostOfRiskF02ImpairmentSeries,
  buildCostOfRiskF12ContributionSeries,
  buildCostOfRiskF2VsF12Audit,
  buildCostOfRiskFilteredSelectionValue,
  buildCostOfRiskMovementContributionAudit,
  buildCostOfRiskStageBoxTimeSeries,
  buildCostOfRiskStageRatioModel,
  buildCostOfRiskStageReconciliationModel,
  buildCostOfRiskStageSummaryModel,
  buildCostOfRiskStageTransferFlowDiagram,
  buildCostOfRiskStageTransferPanelAudit,
  buildCostOfRiskStageTransferFlowTimeSeries,
  buildCostOfRiskStageTransferWaterfall,
  buildCostOfRiskWaterfall,
  clampCostOfRiskSmoothingWindow,
  formatCostOfRiskDisplayValue,
  formatCostOfRiskSmoothingLabel,
  formatReferenceQuarterLabel,
  getCostOfRiskFilterOptions,
  getCostOfRiskF12ReconciliationXAxisOptions,
  getCostOfRiskPointDisplayValue,
  getCostOfRiskWaterfallXAxisOptions,
  getCostOfRiskXAxisOptions,
  getSelectedSmoothedCostOfRiskPoint
} from "../data/costOfRisk.js?v=20260719-context-panel-filter-fixes";
import {
  createStageTransferWaterfallData,
  getStageTransferAxisLabel,
  getStageTransferDisplayValue
} from "./costOfRiskStageTransfers.js?v=20260719-context-panel-filter-fixes";
import {
  destroyCostOfRiskStageReconciliationChart,
  getCostOfRiskStageReconciliationChart,
  renderCostOfRiskStageReconciliationView
} from "./costOfRiskStageReconciliationView.js?v=20260719-context-panel-filter-fixes";
import {
  createCostOfRiskHighchartsTitle,
  escapeHtml
} from "./costOfRiskChartUtils.js?v=20260719-context-panel-filter-fixes";
import {
  getCostOfRiskCounterpartySummaryValue,
  getCostOfRiskStageSummaryFilterValue,
  getCostOfRiskSummaryCellColumnKey,
  getCostOfRiskSummaryCellRowKey,
  renderCostOfRiskCounterpartySummaryTable as renderCounterpartySummaryTable,
  renderCostOfRiskStageSummaryTable as renderStageSummaryTable
} from "./costOfRiskSummaryTablesView.js?v=20260719-context-panel-filter-fixes";
import {
  destroyCostOfRiskCounterpartySummaryChart,
  destroyCostOfRiskStageSummaryChart,
  getCostOfRiskCounterpartySummaryChart,
  getCostOfRiskStageSummaryChart,
  renderCostOfRiskCounterpartySummaryChart as renderCounterpartySummaryTimeChart,
  renderCostOfRiskStageSummaryChart as renderStageSummaryTimeChart
} from "./costOfRiskSummaryChartsView.js?v=20260719-context-panel-filter-fixes";
import { renderCostOfRiskStageTransferFlowView } from "./costOfRiskStageTransferFlowView.js?v=20260719-context-panel-filter-fixes";
import {
  destroyCostOfRiskStageTransferFlowChart,
  getCostOfRiskStageTransferFlowChart,
  renderCostOfRiskStageTransferFlowTimeSeriesChart as renderStageTransferFlowTimeSeriesChart
} from "./costOfRiskStageTransferTimeSeriesView.js?v=20260719-context-panel-filter-fixes";
import {
  destroyCostOfRiskStageRatioChart,
  formatCostOfRiskStageRatioCellValue,
  getCostOfRiskStageRatioChart,
  getCostOfRiskStageRatioMetricLabel,
  renderCostOfRiskStageRatioChart,
  renderCostOfRiskStageRatioTable
} from "./costOfRiskStageRatioView.js?v=20260719-context-panel-filter-fixes";
import {
  destroyCostOfRiskCoverageRatioChart,
  formatCostOfRiskCoverageRatioCellValue,
  getCostOfRiskCoverageRatioChart,
  getCostOfRiskCoverageRatioMetricLabel,
  renderCostOfRiskCoverageRatioChart,
  renderCostOfRiskCoverageRatioTable
} from "./costOfRiskCoverageRatioView.js?v=20260719-context-panel-filter-fixes";
import {
  destroyCostOfRiskCollateralRatioChart,
  formatCostOfRiskCollateralRatioCellValue,
  getCostOfRiskCollateralRatioChart,
  getCostOfRiskCollateralRatioMetricLabel,
  renderCostOfRiskCollateralRatioChart,
  renderCostOfRiskCollateralRatioTable
} from "./costOfRiskCollateralRatioView.js?v=20260719-context-panel-filter-fixes";
import {
  destroyCostOfRiskF2VsF12Chart,
  getCostOfRiskF2VsF12Chart,
  renderCostOfRiskF2VsF12Chart as renderF2VsF12Chart
} from "./costOfRiskF2VsF12ChartView.js?v=20260719-context-panel-filter-fixes";
import {
  getCostOfRiskTreemapChart,
  renderCostOfRiskTreemap as renderTreemapChart
} from "./costOfRiskTreemapView.js?v=20260719-context-panel-filter-fixes";
import {
  destroyCostOfRiskMovementChart,
  getCostOfRiskMovementChart,
  renderCostOfRiskMovementTimeSeriesChart as renderMovementTimeSeriesChart
} from "./costOfRiskMovementTimeSeriesView.js?v=20260719-context-panel-filter-fixes";
import {
  getCostOfRiskCoreSectionLabel,
  renderCostOfRiskCoreDefinitionTables
} from "./costOfRiskCoreDefinitionView.js?v=20260719-context-panel-filter-fixes";
import { renderCostOfRiskActiveFiltersView } from "./costOfRiskActiveFiltersView.js?v=20260719-context-panel-filter-fixes";
import {
  renderCostOfRiskFilterSelect as renderFilterSelect,
  renderCostOfRiskSmoothingControl as renderSmoothingControl,
  renderCostOfRiskXAxisOptions as renderXAxisOptions
} from "./costOfRiskControlsView.js?v=20260719-context-panel-filter-fixes";
import {
  clearCostOfRiskAuditTableView,
  renderCostOfRiskAuditTableView
} from "./costOfRiskAuditTableView.js?v=20260719-context-panel-filter-fixes";
import { openExplorerPoint } from "./explorerView.js?v=20260719-context-panel-filter-fixes";
import { renderCostOfRiskRatioDenominatorControls as renderRatioDenominatorControls } from "./costOfRiskRatioDenominatorView.js?v=20260719-context-panel-filter-fixes";
import {
  clearCostOfRiskEmptyPanelsView,
  renderCostOfRiskTabEmptyView,
  renderCostOfRiskTabsView
} from "./costOfRiskTabsView.js?v=20260719-context-panel-filter-fixes";
import {
  createCostOfRiskModelCacheKey,
  getCostOfRiskCachedModel
} from "./costOfRiskModelCache.js?v=20260719-context-panel-filter-fixes";
import {
  getCostOfRiskFilterParentValue as getFilterParentValue,
  getCostOfRiskUnavailableMessage as getUnavailableMessage
} from "./costOfRiskFilterRules.js?v=20260719-context-panel-filter-fixes";
import { getReferenceColumns } from "../data/core/referenceColumns.js";
import {
  DEFAULT_COST_OF_RISK_STAGE_TRANSFER_FLOW_KEY,
  getCostOfRiskStageTransferStage,
  getCostOfRiskStageFilterForStageTransferFlowKey,
  getSyncedCostOfRiskStageTransferFlowKey,
  isCostOfRiskAllStageValue,
  normalizeCostOfRiskStageFilterValue
} from "./costOfRiskStageTransferSelection.js?v=20260719-context-panel-filter-fixes";
import {
  getActiveCostOfRiskCoreXCodes as getActiveCoreXCodes,
  normalizeCostOfRiskCoreSelection,
  updateCostOfRiskCoreSelection
} from "./costOfRiskCoreSelection.js?v=20260719-context-panel-filter-fixes";
import { showContextMenu } from "./contextMenu.js?v=20260710-audit-trail";
import { formatBasisPointsValue, formatContributionPercentValue, formatMetricValue, formatSignedMetricValue } from "../data/core/formatting.js?v=20260710-bp-format";
import { getLatestState } from "./appState.js";
import { flowArrowColor, primaryDark } from "./theme.js?v=20260709-flow-arrow-color";

let rerenderApp = () => {};
let setActiveModule = () => {};
let updateSelectedJst = () => {};
let activeCostOfRiskXAxisCode = COST_OF_RISK_X_AXIS_CODE;
let activeCostOfRiskSmoothingWindow = 4;
let activeCostOfRiskReferenceDate = "";
let activeCostOfRiskFocusSelectedYAxis = false;
let activeCostOfRiskTab = "summary";
let activeCostOfRiskSummaryBreakdown = "stage";
let activeCostOfRiskMovementXCodes = new Set(COST_OF_RISK_WATERFALL_X_CODES);
let activeCostOfRiskF2F12XCodes = new Set(COST_OF_RISK_F12_RECONCILIATION_X_CODES);
let activeCostOfRiskAuditSeries = "f12";
let activeCostOfRiskDisplayMode = "ratio";
let activeCostOfRiskDefinitionDisplayMode = "ratio";
let activeCostOfRiskDefinitionId = "f12-selected-components";
let activeCostOfRiskDefinitionDriverCode = "";
let activeCostOfRiskDefinitionPanelTab = "components";
let activeCostOfRiskCustomDefinitionXCodes = new Set(COST_OF_RISK_DEFINITION_CUSTOM_X_CODES);
let activeCostOfRiskMovementDisplayMode = "ratio";
let activeCostOfRiskStageTransferDisplayMode = "ratio";
let activeCostOfRiskSummaryDisplayMode = "ratio";
let activeCostOfRiskCounterpartySummaryCellKey = DEFAULT_COST_OF_RISK_COUNTERPARTY_SUMMARY_CELL;
let activeCostOfRiskCounterpartySummaryOtherOpen = false;
let activeCostOfRiskContributionDisplayMenuOpen = false;
let activeCostOfRiskStageTransferDisplayMenuOpen = false;
let activeCostOfRiskSummaryDisplayMenuOpen = false;
let activeCostOfRiskStageSummaryCellKey = DEFAULT_COST_OF_RISK_STAGE_SUMMARY_CELL;
let activeCostOfRiskStageRatioCellKey = DEFAULT_COST_OF_RISK_STAGE_RATIO_CELL;
let activeCostOfRiskCoverageRatioCellKey = DEFAULT_COST_OF_RISK_COVERAGE_RATIO_CELL;
let activeCostOfRiskCollateralRatioCellKey = DEFAULT_COST_OF_RISK_COLLATERAL_RATIO_CELL;
let activeCostOfRiskChartTitleText = "Time evolution chart";
let activeCostOfRiskAuditIntroTab = "";
let activeCostOfRiskHelpTopic = "";
let activeCostOfRiskDataAuditRequested = false;
let activeCostOfRiskMovementAuditXCode = "";
let activeCostOfRiskWaterfallTitleText = "F12 Contribution Breakdown";
let costOfRiskStageTransferChart = null;
let activeCostOfRiskStageTransferFlowKey = DEFAULT_COST_OF_RISK_STAGE_TRANSFER_FLOW_KEY;
let costOfRiskWaterfallChart = null;
let costOfRiskPeerSelectionActions = null;
let costOfRiskDatasetInfoActions = null;
let latestCostOfRiskFilterOptions = null;
let costOfRiskHelpTopicHistory = [""];
let costOfRiskHelpTopicHistoryIndex = 0;

// Filter chips (instrument/counterparty/stage/definition) no longer open an
// inline dropdown: clicking a chip shows its options as a "filter-selection"
// help topic in the context panel, so selection stays visible
// instead of covering the rows below it.
const COST_OF_RISK_FILTER_SELECTION_TOPIC_PREFIX = "filter-selection:";

function isCostOfRiskFilterSelectionTopicOpen(kind) {
  return activeCostOfRiskHelpTopic === `${COST_OF_RISK_FILTER_SELECTION_TOPIC_PREFIX}${kind}`;
}

function toggleCostOfRiskFilterSelectionTopic(kind) {
  const topic = `${COST_OF_RISK_FILTER_SELECTION_TOPIC_PREFIX}${kind}`;
  setCostOfRiskHelpTopic(activeCostOfRiskHelpTopic === topic ? "" : topic);
}

function getActiveCostOfRiskCustomDefinitionXCodes() {
  const allowedCodes = new Set(COST_OF_RISK_DEFINITION_CUSTOM_X_CODES);
  return COST_OF_RISK_DEFINITION_CUSTOM_X_CODES.filter((code) => (
    allowedCodes.has(code) && activeCostOfRiskCustomDefinitionXCodes.has(code)
  ));
}

function toggleCostOfRiskCustomDefinitionComponent(xCode) {
  const normalizedCode = String(xCode ?? "").padStart(4, "0");
  if (!COST_OF_RISK_DEFINITION_CUSTOM_X_CODES.includes(normalizedCode)) return;
  if (activeCostOfRiskCustomDefinitionXCodes.has(normalizedCode)) {
    activeCostOfRiskCustomDefinitionXCodes.delete(normalizedCode);
  } else {
    activeCostOfRiskCustomDefinitionXCodes.add(normalizedCode);
  }
}

function pulseCostOfRiskContextPanel() {
  const panel = elements.costOfRiskAuditPanel;
  if (!panel) return;
  panel.classList.remove("is-attention-pulse");
  void panel.offsetWidth;
  panel.classList.add("is-attention-pulse");
  window.setTimeout(() => {
    panel.classList.remove("is-attention-pulse");
  }, 280);
}

// URL persistence: for the tabs listed in COST_OF_RISK_URL_TABS, the active
// tab, reference date, and the "selected benchmark element" (the clicked
// cell/driver/flow that drives the benchmark chart on that tab) round-trip
// through the URL, so a page refresh restores exactly what the user was
// looking at. Other tabs (F2 vs F12, Stage Reconciliation, Core Definition,
// Analysis) are intentionally out of scope and never read from or written
// to the URL.
const COST_OF_RISK_TAB_URL_PARAM = "cor_tab";
const COST_OF_RISK_DATE_URL_PARAM = "cor_date";
const COST_OF_RISK_VIEW_URL_PARAM = "cor_view";
const COST_OF_RISK_CELL_URL_PARAM = "cor_cell";
const COST_OF_RISK_URL_TABS = new Set(["summary", "cost-of-risk", "stage-transfers", "contributions"]);
const COST_OF_RISK_DISABLED_TABS = new Set(["f2-vs-f12", "stage-reconciliation", "core-definition", "analysis"]);

applyCostOfRiskUrlState();
const COST_OF_RISK_STAGE_BOX_FILL = "#f7f8f7";
const activeCostOfRiskFilters = {
  asset: COST_OF_RISK_FILTER_ALL,
  balanceScope: COST_OF_RISK_BALANCE_SCOPE_IN_BALANCE,
  counterparty: COST_OF_RISK_FILTER_ALL,
  stage: COST_OF_RISK_FILTER_ALL
};

const elements = {
  costOfRiskActiveFilters: document.querySelector("#cost-of-risk-active-filters"),
  costOfRiskAsset: document.querySelector("#cost-of-risk-asset"),
  costOfRiskAudit: document.querySelector("#cost-of-risk-audit"),
  costOfRiskAuditPanel: document.querySelector("#cost-of-risk-audit-panel"),
  costOfRiskCounterparty: document.querySelector("#cost-of-risk-counterparty"),
  costOfRiskCounterpartySummaryChart: document.querySelector("#cost-of-risk-counterparty-summary-chart"),
  costOfRiskCounterpartySummaryTable: document.querySelector("#cost-of-risk-counterparty-summary-table"),
  costOfRiskCoreDefinition: document.querySelector("#cost-of-risk-core-definition"),
  costOfRiskF2VsF12CoreDefinition: document.querySelector("#cost-of-risk-f2-f12-core-definition"),
  costOfRiskContext: document.querySelector("#cost-of-risk-context"),
  costOfRiskChart: document.querySelector("#cost-of-risk-chart"),
  costOfRiskChartTitle: document.querySelector("#cost-of-risk-chart-title"),
  costOfRiskDashboard: document.querySelector("#cost-of-risk-dashboard"),
  costOfRiskDenominatorContext: document.querySelector("#cost-of-risk-denominator-context"),
  costOfRiskDenominatorValue: document.querySelector("#cost-of-risk-denominator-value"),
  costOfRiskDefinitionChart: document.querySelector("#cost-of-risk-definition-chart"),
  costOfRiskDefinitionPanel: document.querySelector("#cost-of-risk-definition-panel"),
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
  costOfRiskStageReconciliationChart: document.querySelector("#cost-of-risk-stage-reconciliation-chart"),
  costOfRiskStageReconciliationSummary: document.querySelector("#cost-of-risk-stage-reconciliation-summary"),
  costOfRiskCollateralRatioChart: document.querySelector("#cost-of-risk-collateral-ratio-chart"),
  costOfRiskCollateralRatioTable: document.querySelector("#cost-of-risk-collateral-ratio-table"),
  costOfRiskCoverageRatioChart: document.querySelector("#cost-of-risk-coverage-ratio-chart"),
  costOfRiskCoverageRatioTable: document.querySelector("#cost-of-risk-coverage-ratio-table"),
  costOfRiskStageRatioChart: document.querySelector("#cost-of-risk-stage-ratio-chart"),
  costOfRiskStageRatioTable: document.querySelector("#cost-of-risk-stage-ratio-table"),
  costOfRiskSummaryDisplayControl: document.querySelector("#cost-of-risk-summary-display-control"),
  costOfRiskStageSummaryChart: document.querySelector("#cost-of-risk-stage-summary-chart"),
  costOfRiskStageSummaryTable: document.querySelector("#cost-of-risk-stage-summary-table"),
  costOfRiskStageTransferChart: document.querySelector("#cost-of-risk-stage-transfer-chart"),
  costOfRiskStageTransferFlowChart: document.querySelector("#cost-of-risk-stage-transfer-flow-chart"),
  costOfRiskStageTransferFlowChartTitle: document.querySelector("#cost-of-risk-stage-transfer-flow-chart-title"),
  costOfRiskStageTransferFlowChartWrap: document.querySelector("#cost-of-risk-stage-transfer-flow-chart-wrap"),
  costOfRiskStageTransferTitle: document.querySelector("#cost-of-risk-stage-transfer-title"),
  costOfRiskTabs: document.querySelector(".cost-of-risk-tabs"),
  costOfRiskTabButtons: [...document.querySelectorAll("[data-cost-of-risk-tab]")],
  costOfRiskTabPanels: [...document.querySelectorAll("[data-cost-of-risk-panel]")],
  costOfRiskTreemap: document.querySelector("#cost-of-risk-treemap"),
  costOfRiskValue: document.querySelector("#cost-of-risk-value"),
  costOfRiskWaterfall: document.querySelector("#cost-of-risk-waterfall"),
  costOfRiskWaterfallTitle: document.querySelector("#cost-of-risk-waterfall-title"),
  costOfRiskXAxis: document.querySelector("#cost-of-risk-x-axis")
};

function renderCostOfRiskRatioDenominatorControls(state) {
  renderRatioDenominatorControls({
    activeTab: activeCostOfRiskTab,
    displayMode: getActiveCostOfRiskDisplayMode(),
    filters: activeCostOfRiskFilters,
    infoElement: elements.costOfRiskRatioInfo,
    referenceDate: activeCostOfRiskReferenceDate,
    state,
    tooltipElement: elements.costOfRiskRatioTooltip
  });
}

// Reads cor_tab/cor_date/cor_view/cor_cell from the URL once, at module
// load time, and uses them to override the hardcoded defaults above. Runs
// before any data is loaded, so it only ever sets opaque string state -
// anything stale or invalid (e.g. a cell key from a filter combination that
// no longer applies) is harmless: the render-time normalizers already used
// throughout this module simply won't find a matching row/option.
function applyCostOfRiskUrlState() {
  const params = new URLSearchParams(window.location.search);
  const tab = params.get(COST_OF_RISK_TAB_URL_PARAM);
  if (tab && COST_OF_RISK_URL_TABS.has(tab)) {
    activeCostOfRiskTab = tab;
  }

  const date = params.get(COST_OF_RISK_DATE_URL_PARAM);
  if (date) activeCostOfRiskReferenceDate = date;

  const view = params.get(COST_OF_RISK_VIEW_URL_PARAM);
  if (view === "counterparty" || view === "stage") activeCostOfRiskSummaryBreakdown = view;

  const cell = params.get(COST_OF_RISK_CELL_URL_PARAM);
  if (cell) applyCostOfRiskUrlSelection(activeCostOfRiskTab, cell);
}

function normalizeActiveCostOfRiskTab() {
  if (!COST_OF_RISK_DISABLED_TABS.has(activeCostOfRiskTab)) return;
  activeCostOfRiskTab = "summary";
}

// The "selected benchmark element" concept is different per tab (a summary
// grid cell, a cost-of-risk definition + driver, a stage-ratio/coverage-
// ratio cell, or a stage-transfer flow); these two functions are the single
// place that knows how to read/write that element for whichever tab is
// active, so the URL only ever needs one generic cor_cell param.
function getCostOfRiskUrlSelectionValue() {
  switch (activeCostOfRiskTab) {
    case "summary":
      return activeCostOfRiskStageSummaryCellKey;
    case "cost-of-risk":
      return activeCostOfRiskDefinitionDriverCode
        ? `${activeCostOfRiskDefinitionId}|${activeCostOfRiskDefinitionDriverCode}`
        : activeCostOfRiskDefinitionId;
    case "stage-ratio":
      return activeCostOfRiskStageRatioCellKey;
    case "stage-transfers":
      return activeCostOfRiskStageTransferFlowKey;
    case "coverage-ratio":
      return activeCostOfRiskCoverageRatioCellKey;
    case "collateral-ratio":
      return activeCostOfRiskCollateralRatioCellKey;
    case "contributions":
      return activeCostOfRiskMovementAuditXCode;
    default:
      return "";
  }
}

function applyCostOfRiskUrlSelection(tab, value) {
  switch (tab) {
    case "summary":
      activeCostOfRiskStageSummaryCellKey = value;
      return;
    case "cost-of-risk": {
      const [definitionId, driverCode] = value.split("|");
      if (definitionId) activeCostOfRiskDefinitionId = definitionId;
      activeCostOfRiskDefinitionDriverCode = driverCode ?? "";
      return;
    }
    case "stage-ratio":
      activeCostOfRiskStageRatioCellKey = value;
      return;
    case "stage-transfers":
      activeCostOfRiskStageTransferFlowKey = value;
      return;
    case "coverage-ratio":
      activeCostOfRiskCoverageRatioCellKey = value;
      return;
    case "collateral-ratio":
      activeCostOfRiskCollateralRatioCellKey = value;
      return;
    case "contributions":
      activeCostOfRiskMovementAuditXCode = value;
      return;
    default:
  }
}

// Called once per render (from dataScreen.js, right after renderCostOfRisk
// returns) so the URL always reflects whatever is currently on screen,
// regardless of which internal branch/early-return produced it.
export function syncCostOfRiskUrlParams() {
  const url = new URL(window.location.href);

  if (!COST_OF_RISK_URL_TABS.has(activeCostOfRiskTab)) {
    url.searchParams.delete(COST_OF_RISK_TAB_URL_PARAM);
    url.searchParams.delete(COST_OF_RISK_DATE_URL_PARAM);
    url.searchParams.delete(COST_OF_RISK_VIEW_URL_PARAM);
    url.searchParams.delete(COST_OF_RISK_CELL_URL_PARAM);
    window.history.replaceState({}, "", url);
    return;
  }

  url.searchParams.set(COST_OF_RISK_TAB_URL_PARAM, activeCostOfRiskTab);

  if (activeCostOfRiskReferenceDate) {
    url.searchParams.set(COST_OF_RISK_DATE_URL_PARAM, activeCostOfRiskReferenceDate);
  } else {
    url.searchParams.delete(COST_OF_RISK_DATE_URL_PARAM);
  }

  if (activeCostOfRiskTab === "summary") {
    url.searchParams.set(COST_OF_RISK_VIEW_URL_PARAM, activeCostOfRiskSummaryBreakdown);
  } else {
    url.searchParams.delete(COST_OF_RISK_VIEW_URL_PARAM);
  }

  const selection = getCostOfRiskUrlSelectionValue();
  if (selection) {
    url.searchParams.set(COST_OF_RISK_CELL_URL_PARAM, selection);
  } else {
    url.searchParams.delete(COST_OF_RISK_CELL_URL_PARAM);
  }

  window.history.replaceState({}, "", url);
}

export function wireCostOfRiskUi(actions, rerender) {
  rerenderApp = rerender;
  setActiveModule = actions.setActiveModule;
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
    setActiveCostOfRiskStageFilter(event.target.value);
    rerenderApp(actions.getState());
  });
  elements.costOfRiskDisplayMode?.addEventListener("change", (event) => {
    if (["contributions", "coverage-ratio", "collateral-ratio", "stage-ratio", "stage-transfers", "summary"].includes(activeCostOfRiskTab)) return;
    activeCostOfRiskDisplayMode = event.target.value === "amount" ? "amount" : "ratio";
    rerenderApp(actions.getState());
  });
  elements.costOfRiskXAxis?.addEventListener("change", (event) => {
    activeCostOfRiskXAxisCode = event.target.value;
    rerenderApp(actions.getState());
  });
  elements.costOfRiskSmoothing?.addEventListener("input", (event) => {
    updateCostOfRiskSmoothingWindow(event.target.value);
  });
  elements.costOfRiskTabs?.addEventListener("scroll", updateCostOfRiskTabsFade, { passive: true });
  window.addEventListener("resize", updateCostOfRiskTabsFade);
  elements.costOfRiskActiveFilters?.addEventListener("click", (event) => {
    const referenceDateHelp = event.target.closest?.("[data-cost-of-risk-reference-date-help]");
    if (referenceDateHelp) {
      event.preventDefault();
      event.stopPropagation();
      closeCostOfRiskFilterMenus();
      setCostOfRiskHelpTopic("reference-date");
      pulseCostOfRiskContextPanel();
      rerenderApp(actions.getState());
      return;
    }

    const displayModeOption = event.target.closest?.("[data-cost-of-risk-display-mode-option]");
    if (displayModeOption) {
      event.preventDefault();
      event.stopPropagation();
      closeCostOfRiskFilterMenus();
      const [scope, value] = String(displayModeOption.dataset.costOfRiskDisplayModeOption ?? "").split(":");
      const nextMode = value === "ratio" ? "ratio" : "amount";
      if (scope === "stageTransfer") {
        activeCostOfRiskStageTransferDisplayMode = nextMode;
      } else if (scope === "summaryVariation") {
        activeCostOfRiskSummaryDisplayMode = nextMode;
      } else if (scope === "costOfRiskDefinition") {
        activeCostOfRiskDefinitionDisplayMode = nextMode;
      } else {
        activeCostOfRiskMovementDisplayMode = nextMode;
      }
      setCostOfRiskHelpTopic(getCostOfRiskDisplayModeHelpTopic(scope, nextMode));
      if (elements.costOfRiskDisplayMode) elements.costOfRiskDisplayMode.value = getActiveCostOfRiskDisplayMode();
      pulseCostOfRiskContextPanel();
      rerenderApp(actions.getState());
      return;
    }

    const displayModeToggle = event.target.closest?.("[data-cost-of-risk-display-mode-toggle]");
    if (displayModeToggle) {
      event.preventDefault();
      event.stopPropagation();
      const scope = displayModeToggle.dataset.costOfRiskDisplayModeToggle;
      activeCostOfRiskContributionDisplayMenuOpen = scope === "contribution" || scope === "costOfRiskDefinition"
        ? !activeCostOfRiskContributionDisplayMenuOpen
        : false;
      activeCostOfRiskStageTransferDisplayMenuOpen = scope === "stageTransfer"
        ? !activeCostOfRiskStageTransferDisplayMenuOpen
        : false;
      activeCostOfRiskSummaryDisplayMenuOpen = scope === "summaryVariation"
        ? !activeCostOfRiskSummaryDisplayMenuOpen
        : false;
      const currentMode = scope === "stageTransfer"
        ? activeCostOfRiskStageTransferDisplayMode
        : scope === "summaryVariation"
          ? activeCostOfRiskSummaryDisplayMode
          : scope === "costOfRiskDefinition"
            ? activeCostOfRiskDefinitionDisplayMode
            : activeCostOfRiskMovementDisplayMode;
      setCostOfRiskHelpTopic(getCostOfRiskDisplayModeHelpTopic(scope, currentMode));
      pulseCostOfRiskContextPanel();
      rerenderApp(actions.getState());
      return;
    }

    const definitionToggle = event.target.closest?.("[data-cost-of-risk-definition-filter-toggle]");
    if (definitionToggle) {
      event.preventDefault();
      event.stopPropagation();
      closeCostOfRiskFilterMenus();
      toggleCostOfRiskFilterSelectionTopic("definition");
      pulseCostOfRiskContextPanel();
      rerenderApp(actions.getState());
      return;
    }

    const instrumentToggle = event.target.closest?.("[data-cost-of-risk-instrument-filter-toggle]");
    if (instrumentToggle) {
      event.preventDefault();
      event.stopPropagation();
      closeCostOfRiskFilterMenus();
      toggleCostOfRiskFilterSelectionTopic("instrument");
      pulseCostOfRiskContextPanel();
      rerenderApp(actions.getState());
      return;
    }

    const counterpartyToggle = event.target.closest?.("[data-cost-of-risk-counterparty-filter-toggle]");
    if (counterpartyToggle) {
      event.preventDefault();
      event.stopPropagation();
      closeCostOfRiskFilterMenus();
      toggleCostOfRiskFilterSelectionTopic("counterparty");
      pulseCostOfRiskContextPanel();
      rerenderApp(actions.getState());
      return;
    }

    const balanceScopeToggle = event.target.closest?.("[data-cost-of-risk-balance-scope-filter-toggle]");
    if (balanceScopeToggle) {
      event.preventDefault();
      event.stopPropagation();
      closeCostOfRiskFilterMenus();
      toggleCostOfRiskFilterSelectionTopic("balanceScope");
      pulseCostOfRiskContextPanel();
      rerenderApp(actions.getState());
      return;
    }

    const stageToggle = event.target.closest?.("[data-cost-of-risk-stage-filter-toggle]");
    if (stageToggle) {
      event.preventDefault();
      event.stopPropagation();
      closeCostOfRiskFilterMenus();
      toggleCostOfRiskFilterSelectionTopic("stage");
      pulseCostOfRiskContextPanel();
      rerenderApp(actions.getState());
      return;
    }

    const button = event.target.closest?.("[data-cost-of-risk-clear-filter]");
    if (!button) return;

    closeCostOfRiskFilterMenus();
    clearActiveCostOfRiskFilter(button.dataset.costOfRiskClearFilter);
    setCostOfRiskHelpTopic(getCostOfRiskFilterSelectionTopicForFilter(button.dataset.costOfRiskClearFilter));
    pulseCostOfRiskContextPanel();
    rerenderApp(actions.getState());
  });
  document.addEventListener("click", (event) => {
    if (!hasOpenCostOfRiskFilterMenu()) return;
    if (elements.costOfRiskActiveFilters?.contains(event.target)) return;
    if (closeCostOfRiskFilterMenus()) rerenderApp(actions.getState());
  });
  document.addEventListener("pointerdown", (event) => {
    if (!hasOpenCostOfRiskFilterMenu()) return;
    if (elements.costOfRiskActiveFilters?.contains(event.target)) return;
    window.setTimeout(() => {
      if (closeCostOfRiskFilterMenus()) rerenderApp(actions.getState());
    }, 0);
  }, true);
  elements.costOfRiskDashboard?.addEventListener("click", (event) => {
    const definitionToggle = event.target.closest?.("[data-cost-of-risk-definition-filter-toggle]");
    if (definitionToggle) {
      event.preventDefault();
      event.stopPropagation();
      closeCostOfRiskFilterMenus();
      toggleCostOfRiskFilterSelectionTopic("definition");
      pulseCostOfRiskContextPanel();
      rerenderApp(actions.getState());
      return;
    }

    const definitionButton = event.target.closest?.("[data-cost-of-risk-definition]");
    if (definitionButton) {
      event.preventDefault();
      activeCostOfRiskDefinitionId = definitionButton.dataset.costOfRiskDefinition || "f12-selected-components";
      activeCostOfRiskDefinitionDriverCode = "";
      rerenderApp(actions.getState());
      return;
    }

    const customComponentToggle = event.target.closest?.("[data-cost-of-risk-custom-definition-component]");
    if (customComponentToggle) {
      event.preventDefault();
      event.stopPropagation();
      toggleCostOfRiskCustomDefinitionComponent(customComponentToggle.dataset.costOfRiskCustomDefinitionComponent || "");
      activeCostOfRiskDefinitionDriverCode = "";
      rerenderApp(actions.getState());
      return;
    }

    const definitionDriverButton = event.target.closest?.("[data-cost-of-risk-definition-driver]");
    if (definitionDriverButton) {
      event.preventDefault();
      const nextDriverCode = definitionDriverButton.dataset.costOfRiskDefinitionDriver || "";
      activeCostOfRiskDefinitionDriverCode = activeCostOfRiskDefinitionDriverCode === nextDriverCode ? "" : nextDriverCode;
      rerenderApp(actions.getState());
      return;
    }

    const definitionPanelTabButton = event.target.closest?.("[data-cost-of-risk-definition-panel-tab]");
    if (definitionPanelTabButton) {
      event.preventDefault();
      activeCostOfRiskDefinitionPanelTab = definitionPanelTabButton.dataset.costOfRiskDefinitionPanelTab === "components"
        ? "components"
        : "drivers";
      const isComponentSelection = String(activeCostOfRiskDefinitionDriverCode).startsWith("component:");
      if ((activeCostOfRiskDefinitionPanelTab === "drivers" && isComponentSelection)
        || (activeCostOfRiskDefinitionPanelTab === "components" && activeCostOfRiskDefinitionDriverCode && !isComponentSelection)) {
        activeCostOfRiskDefinitionDriverCode = "";
      }
      rerenderApp(actions.getState());
      return;
    }

    const definitionBenchmarkTarget = event.target.closest?.("[data-cost-of-risk-definition-benchmark-target]");
    if (definitionBenchmarkTarget) {
      event.preventDefault();
      activeCostOfRiskDefinitionDriverCode = "";
      rerenderApp(actions.getState());
      return;
    }

    const definitionDisplayButton = event.target.closest?.("[data-cost-of-risk-definition-display]");
    if (definitionDisplayButton) {
      event.preventDefault();
      activeCostOfRiskDefinitionDisplayMode = definitionDisplayButton.dataset.costOfRiskDefinitionDisplay === "amount"
        ? "amount"
        : "ratio";
      rerenderApp(actions.getState());
      return;
    }

    const button = event.target.closest?.("[data-cost-of-risk-summary-breakdown]");
    if (!button) return;

    event.preventDefault();
    event.stopPropagation();
    selectCostOfRiskSummaryBreakdown(button.dataset.costOfRiskSummaryBreakdown);
  });
  elements.costOfRiskDashboard?.addEventListener("contextmenu", (event) => {
    const target = event.target.closest?.("[data-cost-of-risk-calculation-detail]");
    if (!target) return;

    const scope = target.dataset.costOfRiskCalculationDetail || "";
    const value = target.dataset.costOfRiskCalculationValue || "";
    showCostOfRiskCalculationDetailsMenu(event, () => {
      showCostOfRiskCalculationDetails(scope, value);
    });
  });
  elements.costOfRiskDashboard?.addEventListener("change", (event) => {
    const checkbox = event.target.closest?.("[data-cost-of-risk-core-code]");
    if (!checkbox) return;

    updateCostOfRiskCoreDefinition(checkbox.dataset.costOfRiskCoreCode, checkbox.checked, checkbox.dataset.costOfRiskCoreScope);
    rerenderApp(actions.getState());
  });
  elements.costOfRiskTabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const nextTab = button.dataset.costOfRiskTab || "summary";
      if (COST_OF_RISK_DISABLED_TABS.has(nextTab)) return;
      activeCostOfRiskTab = nextTab;
      closeCostOfRiskFilterMenus();
      rerenderApp(actions.getState());
    });
  });
}

export function renderCostOfRisk(state) {
  if (!elements.costOfRiskEmpty || !elements.costOfRiskDashboard) return;
  normalizeActiveCostOfRiskTab();
  renderCostOfRiskTabs();
  clearCostOfRiskEmptyPanels();

  const filterOptions = getCostOfRiskFilterOptions(state);
  latestCostOfRiskFilterOptions = filterOptions;
  const xAxisOptions = getCostOfRiskXAxisOptions(state);
  const waterfallXAxisOptions = getCostOfRiskWaterfallXAxisOptions(state);
  const f2F12XAxisOptions = getCostOfRiskF12ReconciliationXAxisOptions(state);
  normalizeActiveCostOfRiskCoreDefinition(waterfallXAxisOptions, "movement");
  normalizeActiveCostOfRiskCoreDefinition(f2F12XAxisOptions, "f2-f12");
  normalizeActiveCostOfRiskFilter("asset", filterOptions.assets);
  normalizeActiveCostOfRiskFilter("balanceScope", filterOptions.balanceScopes);
  normalizeActiveCostOfRiskFilter("counterparty", filterOptions.counterparties);
  normalizeActiveCostOfRiskFilter("stage", filterOptions.stages);
  const selectedMovementXCodes = getActiveCostOfRiskCoreXCodes(waterfallXAxisOptions, "movement");
  const selectedF2F12XCodes = getActiveCostOfRiskCoreXCodes(f2F12XAxisOptions, "f2-f12");
  if (
    selectedMovementXCodes.length > 0
    && activeCostOfRiskXAxisCode !== COST_OF_RISK_TOTAL_CONTRIBUTION_X_CODE
    && !selectedMovementXCodes.includes(activeCostOfRiskXAxisCode)
  ) {
    activeCostOfRiskXAxisCode = selectedMovementXCodes[0];
  }
  if (!xAxisOptions.some((option) => option.code === activeCostOfRiskXAxisCode)) {
    activeCostOfRiskXAxisCode = xAxisOptions.some((option) => option.code === COST_OF_RISK_X_AXIS_CODE)
      ? COST_OF_RISK_X_AXIS_CODE
      : xAxisOptions[0]?.code ?? COST_OF_RISK_X_AXIS_CODE;
  }
  let selection = null;
  let waterfall = null;

  const getSelection = () => {
    if (!selection) {
      selection = getCostOfRiskCachedModel(
        state,
        createCostOfRiskModelCacheKey(state, "selection", activeCostOfRiskFilters, activeCostOfRiskXAxisCode, activeCostOfRiskReferenceDate),
        () => buildCostOfRiskFilteredSelectionValue(
          state,
          activeCostOfRiskFilters,
          activeCostOfRiskXAxisCode,
          activeCostOfRiskReferenceDate
        )
      );
      activeCostOfRiskReferenceDate = selection.referenceDate || activeCostOfRiskReferenceDate;
    }
    return selection;
  };

  const getWaterfall = () => {
    if (!waterfall) {
      waterfall = getCostOfRiskCachedModel(
        state,
        createCostOfRiskModelCacheKey(state, "waterfall", activeCostOfRiskFilters, activeCostOfRiskReferenceDate, selectedMovementXCodes),
        () => buildCostOfRiskWaterfall(state, activeCostOfRiskFilters, activeCostOfRiskReferenceDate, selectedMovementXCodes)
      );
    }
    return waterfall;
  };

  renderFilterSelect(elements.costOfRiskAsset, filterOptions.assets, activeCostOfRiskFilters.asset);
  renderFilterSelect(elements.costOfRiskCounterparty, filterOptions.counterparties, activeCostOfRiskFilters.counterparty);
  renderFilterSelect(elements.costOfRiskStage, filterOptions.stages, activeCostOfRiskFilters.stage);
  renderCostOfRiskActiveFilters(filterOptions);
  if (!["contributions", "cost-of-risk", "coverage-ratio", "collateral-ratio", "stage-ratio", "stage-transfers", "summary"].includes(activeCostOfRiskTab)) renderCostOfRiskHelpPanel();
  const displayMode = getActiveCostOfRiskDisplayMode();
  if (elements.costOfRiskDisplayMode) elements.costOfRiskDisplayMode.value = displayMode;
  if (elements.costOfRiskDisplayMode) {
    elements.costOfRiskDisplayMode.disabled = activeCostOfRiskTab === "contributions"
      || activeCostOfRiskTab === "cost-of-risk"
      || activeCostOfRiskTab === "coverage-ratio"
      || activeCostOfRiskTab === "collateral-ratio"
      || activeCostOfRiskTab === "stage-ratio"
      || activeCostOfRiskTab === "stage-transfers"
      || activeCostOfRiskTab === "summary";
  }
  renderCostOfRiskRatioDenominatorControls(state);
  renderXAxisOptions(
    elements.costOfRiskXAxis,
    selectedMovementXCodes.length > 0 ? xAxisOptions.filter((option) => selectedMovementXCodes.includes(option.code)) : xAxisOptions,
    activeCostOfRiskXAxisCode
  );
  renderSmoothingControl({
    output: elements.costOfRiskSmoothingValue,
    slider: elements.costOfRiskSmoothing,
    windowSize: activeCostOfRiskSmoothingWindow
  });
  renderCostOfRiskCoreDefinition(waterfallXAxisOptions, f2F12XAxisOptions);

  if (activeCostOfRiskTab === "cost-of-risk") {
    const customDefinitionCodes = getActiveCostOfRiskCustomDefinitionXCodes();
    const definitionModel = getCostOfRiskCachedModel(
      state,
      createCostOfRiskModelCacheKey(state, "cost-of-risk-definition", activeCostOfRiskFilters, activeCostOfRiskReferenceDate, activeCostOfRiskDefinitionId, activeCostOfRiskDefinitionDriverCode, customDefinitionCodes.join(",")),
      () => buildCostOfRiskDefinitionModel(
        state,
        activeCostOfRiskDefinitionId,
        activeCostOfRiskFilters,
        activeCostOfRiskReferenceDate,
        activeCostOfRiskDefinitionDriverCode,
        customDefinitionCodes
      )
    );
    activeCostOfRiskReferenceDate = definitionModel.referenceDate || activeCostOfRiskReferenceDate;
    renderCostOfRiskActiveFilters(filterOptions);
    elements.costOfRiskEmpty.hidden = true;
    elements.costOfRiskEmpty.textContent = "";
    elements.costOfRiskDashboard.hidden = false;
    renderCostOfRiskDefinitionView(definitionModel, state);
    renderCostOfRiskDefinitionAuditPanel(definitionModel, { allowDefaultRender: consumeCostOfRiskDataAuditRequest() });
    leaveCostOfRiskStageTransferTab();
    clearCostOfRiskAuditTable();
    scheduleCostOfRiskChartReflow();
    return;
  }

  if (activeCostOfRiskTab === "summary") {
    const summary = getCostOfRiskCachedModel(
      state,
      createCostOfRiskModelCacheKey(state, "summary-ratios", activeCostOfRiskFilters, activeCostOfRiskReferenceDate, activeCostOfRiskStageSummaryCellKey),
      () => buildCostOfRiskStageSummaryModel(
        state,
        activeCostOfRiskFilters,
        activeCostOfRiskReferenceDate,
        activeCostOfRiskStageSummaryCellKey
      )
    );
    activeCostOfRiskReferenceDate = summary.referenceDate || activeCostOfRiskReferenceDate;
    renderCostOfRiskActiveFilters(filterOptions);
    if (elements.costOfRiskSummaryDisplayControl) elements.costOfRiskSummaryDisplayControl.replaceChildren();
    elements.costOfRiskEmpty.hidden = true;
    elements.costOfRiskEmpty.textContent = "";
    elements.costOfRiskDashboard.hidden = false;
    renderCostOfRiskF18SummaryOnlyView(summary, state);
    renderCostOfRiskSummaryAuditPanel(summary, state, { allowDataAudit: consumeCostOfRiskDataAuditRequest() });
    scheduleCostOfRiskChartReflow();
    return;
  }

  if (activeCostOfRiskTab === "stage-ratio") {
    const stageRatio = applyCostOfRiskUnavailableCounterpartyGuidance(getCostOfRiskCachedModel(
      state,
      createCostOfRiskModelCacheKey(state, "stage-ratio", activeCostOfRiskFilters, activeCostOfRiskReferenceDate, activeCostOfRiskStageRatioCellKey),
      () => buildCostOfRiskStageRatioModel(
        state,
        activeCostOfRiskFilters,
        activeCostOfRiskReferenceDate,
        activeCostOfRiskStageRatioCellKey
      )
    ));
    activeCostOfRiskReferenceDate = stageRatio.referenceDate || activeCostOfRiskReferenceDate;
    renderCostOfRiskActiveFilters(filterOptions);
    elements.costOfRiskEmpty.hidden = true;
    elements.costOfRiskEmpty.textContent = "";
    elements.costOfRiskDashboard.hidden = false;
    elements.costOfRiskValue.textContent = "-";
    elements.costOfRiskContext.textContent = "-";
    elements.costOfRiskDenominatorValue.textContent = "-";
    elements.costOfRiskDenominatorContext.textContent = "-";
    elements.costOfRiskRatioValue.textContent = "-";
    elements.costOfRiskRatioContext.textContent = "F_18.00 exposure ratios";
    elements.costOfRiskF02Value.textContent = "-";
    elements.costOfRiskF02Context.textContent = "-";
    elements.costOfRiskPoints.textContent = "-";
    leaveCostOfRiskStageTransferTab();
    clearCostOfRiskAuditTable();
    renderCostOfRiskStageRatioView(stageRatio, state);
    renderCostOfRiskStageRatioAuditPanel(stageRatio, state, { allowDataAudit: consumeCostOfRiskDataAuditRequest() });
    scheduleCostOfRiskChartReflow();
    return;
  }

  if (activeCostOfRiskTab === "coverage-ratio") {
    const coverageRatio = applyCostOfRiskUnavailableCounterpartyGuidance(getCostOfRiskCachedModel(
      state,
      createCostOfRiskModelCacheKey(state, "coverage-ratio", activeCostOfRiskFilters, activeCostOfRiskReferenceDate, activeCostOfRiskCoverageRatioCellKey),
      () => buildCostOfRiskCoverageRatioModel(
        state,
        activeCostOfRiskFilters,
        activeCostOfRiskReferenceDate,
        activeCostOfRiskCoverageRatioCellKey
      )
    ));
    activeCostOfRiskReferenceDate = coverageRatio.referenceDate || activeCostOfRiskReferenceDate;
    renderCostOfRiskActiveFilters(filterOptions);
    elements.costOfRiskEmpty.hidden = true;
    elements.costOfRiskEmpty.textContent = "";
    elements.costOfRiskDashboard.hidden = false;
    elements.costOfRiskValue.textContent = "-";
    elements.costOfRiskContext.textContent = "-";
    elements.costOfRiskDenominatorValue.textContent = "-";
    elements.costOfRiskDenominatorContext.textContent = "-";
    elements.costOfRiskRatioValue.textContent = "-";
    elements.costOfRiskRatioContext.textContent = "F_18.00 coverage ratios";
    elements.costOfRiskF02Value.textContent = "-";
    elements.costOfRiskF02Context.textContent = "-";
    elements.costOfRiskPoints.textContent = "-";
    leaveCostOfRiskStageTransferTab();
    clearCostOfRiskAuditTable();
    renderCostOfRiskCoverageRatioView(coverageRatio, state);
    renderCostOfRiskCoverageRatioAuditPanel(coverageRatio, state, { allowDataAudit: consumeCostOfRiskDataAuditRequest() });
    scheduleCostOfRiskChartReflow();
    return;
  }

  if (activeCostOfRiskTab === "collateral-ratio") {
    const collateralRatio = applyCostOfRiskUnavailableCounterpartyGuidance(getCostOfRiskCachedModel(
      state,
      createCostOfRiskModelCacheKey(state, "collateral-ratio", activeCostOfRiskFilters, activeCostOfRiskReferenceDate, activeCostOfRiskCollateralRatioCellKey),
      () => buildCostOfRiskCollateralRatioModel(
        state,
        activeCostOfRiskFilters,
        activeCostOfRiskReferenceDate,
        activeCostOfRiskCollateralRatioCellKey
      )
    ));
    activeCostOfRiskReferenceDate = collateralRatio.referenceDate || activeCostOfRiskReferenceDate;
    renderCostOfRiskActiveFilters(filterOptions);
    elements.costOfRiskEmpty.hidden = true;
    elements.costOfRiskEmpty.textContent = "";
    elements.costOfRiskDashboard.hidden = false;
    elements.costOfRiskValue.textContent = "-";
    elements.costOfRiskContext.textContent = "-";
    elements.costOfRiskDenominatorValue.textContent = "-";
    elements.costOfRiskDenominatorContext.textContent = "-";
    elements.costOfRiskRatioValue.textContent = "-";
    elements.costOfRiskRatioContext.textContent = "F_18.00 collateral ratios";
    elements.costOfRiskF02Value.textContent = "-";
    elements.costOfRiskF02Context.textContent = "-";
    elements.costOfRiskPoints.textContent = "-";
    leaveCostOfRiskStageTransferTab();
    clearCostOfRiskAuditTable();
    renderCostOfRiskCollateralRatioView(collateralRatio, state);
    renderCostOfRiskCollateralRatioAuditPanel(collateralRatio, state, { allowDataAudit: consumeCostOfRiskDataAuditRequest() });
    scheduleCostOfRiskChartReflow();
    return;
  }

  if (activeCostOfRiskTab === "stage-transfers") {
    elements.costOfRiskEmpty.hidden = true;
    elements.costOfRiskEmpty.textContent = "";
    elements.costOfRiskDashboard.hidden = false;
    clearCostOfRiskAuditTable();
    if (isCostOfRiskPerformanceStatusFilterValue(activeCostOfRiskFilters.stage)) {
      destroyCostOfRiskStageTransferChart();
      destroyCostOfRiskStageTransferFlowChart();
      if (elements.costOfRiskStageTransferChart) elements.costOfRiskStageTransferChart.replaceChildren();
      if (elements.costOfRiskStageTransferFlowChartWrap) elements.costOfRiskStageTransferFlowChartWrap.hidden = true;
      renderCostOfRiskTabEmpty("FINREP data does not support this level of detail with a breakdown by performing status. Remove this filter.");
      renderCostOfRiskHelpPanel();
      scheduleCostOfRiskChartReflow();
      return;
    }
    renderCostOfRiskStageTransferView(state);
    renderCostOfRiskStageTransferAuditPanel(state, { allowDataAudit: consumeCostOfRiskDataAuditRequest() });
    scheduleCostOfRiskChartReflow();
    return;
  }

  if (activeCostOfRiskTab === "stage-reconciliation") {
    const stageReconciliation = getCostOfRiskCachedModel(
      state,
      createCostOfRiskModelCacheKey(state, "stage-reconciliation", activeCostOfRiskFilters, activeCostOfRiskReferenceDate),
      () => buildCostOfRiskStageReconciliationModel(
        state,
        activeCostOfRiskFilters,
        activeCostOfRiskReferenceDate
      )
    );
    activeCostOfRiskReferenceDate = stageReconciliation.referenceDate || activeCostOfRiskReferenceDate;
    renderCostOfRiskActiveFilters(filterOptions);
    elements.costOfRiskEmpty.hidden = true;
    elements.costOfRiskEmpty.textContent = "";
    elements.costOfRiskDashboard.hidden = false;
    elements.costOfRiskValue.textContent = "-";
    elements.costOfRiskContext.textContent = "-";
    elements.costOfRiskDenominatorValue.textContent = "-";
    elements.costOfRiskDenominatorContext.textContent = "-";
    elements.costOfRiskRatioValue.textContent = "-";
    elements.costOfRiskRatioContext.textContent = "Stage reconciliation";
    elements.costOfRiskF02Value.textContent = "-";
    elements.costOfRiskF02Context.textContent = "-";
    elements.costOfRiskPoints.textContent = "-";
    leaveCostOfRiskStageTransferTab();
    clearCostOfRiskAuditTable();
    renderCostOfRiskHelpPanel();
    renderCostOfRiskStageReconciliationView({
      activeReferenceDate: activeCostOfRiskReferenceDate,
      clearEmptyPanels: clearCostOfRiskEmptyPanels,
      elements,
      focusSelectedYAxis: activeCostOfRiskFocusSelectedYAxis,
      formatReferenceQuarterLabel,
      model: stageReconciliation,
      onClearSmoothing: clearCostOfRiskSmoothing,
      onChangeSmoothing: updateCostOfRiskSmoothingWindow,
      onSelectJst: selectCostOfRiskChartJst,
      onSelectReferenceDate: selectCostOfRiskReferenceDate,
      onToggleYAxisFocus: toggleCostOfRiskFocusedYAxis,
      renderTabEmpty: renderCostOfRiskTabEmpty,
      selectedUnit: state.selectedUnit,
      smoothingWindow: activeCostOfRiskSmoothingWindow,
      state
    });
    scheduleCostOfRiskChartReflow();
    return;
  }

  const activeSelection = getSelection();
  renderCostOfRiskActiveFilters(filterOptions);

  if (activeSelection.status) {
    const guidedSelection = applyCostOfRiskUnavailableCounterpartyGuidance(activeSelection);
    elements.costOfRiskEmpty.hidden = true;
    elements.costOfRiskEmpty.textContent = "";
    elements.costOfRiskDashboard.hidden = false;
    renderCostOfRiskTabEmpty(guidedSelection.status);
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
    destroyCostOfRiskMovementChart();
    destroyCostOfRiskWaterfallChart();
    destroyCostOfRiskF2VsF12Chart();
    destroyCostOfRiskStageRatioChart();
    destroyCostOfRiskStageReconciliationChart();
    leaveCostOfRiskStageTransferTab();
    renderCostOfRiskHelpPanel();
    return;
  }

  elements.costOfRiskEmpty.hidden = true;
  elements.costOfRiskEmpty.textContent = "";
  elements.costOfRiskDashboard.hidden = false;
  const f02Ratio = activeCostOfRiskTab === "f2-vs-f12" || activeCostOfRiskTab === "analysis"
    ? getCostOfRiskCachedModel(
      state,
      createCostOfRiskModelCacheKey(state, "f02-ratio", activeCostOfRiskFilters, activeCostOfRiskReferenceDate),
      () => buildCostOfRiskF02ImpairmentRatio(state, activeCostOfRiskReferenceDate, activeCostOfRiskFilters)
    )
    : null;
  elements.costOfRiskValue.textContent = formatMetricValue(activeSelection.value, state.selectedUnit);
  elements.costOfRiskContext.textContent = `${state.selectedJst} - x_axis ${activeCostOfRiskXAxisCode} - ${activeSelection.referenceDate}`;
  elements.costOfRiskDenominatorValue.textContent = formatMetricValue(activeSelection.denominator, state.selectedUnit);
  elements.costOfRiskDenominatorContext.textContent = activeSelection.denominatorLabel;
  const selectedSmoothedPoint = getSelectedSmoothedCostOfRiskPoint(
    activeSelection.series,
    activeCostOfRiskSmoothingWindow,
    activeCostOfRiskReferenceDate
  );
  const isGrowthRateModeMissingDenominator = displayMode === "ratio" && !activeSelection.denominator;
  elements.costOfRiskRatioValue.textContent = formatCostOfRiskDisplayValue(
    displayMode === "ratio"
      ? selectedSmoothedPoint?.smoothedRatioBasisPoints ?? activeSelection.ratioBasisPoints
      : selectedSmoothedPoint?.smoothedValue ?? activeSelection.value,
    displayMode,
    state.selectedUnit
  );
  elements.costOfRiskRatioContext.textContent = isGrowthRateModeMissingDenominator
    ? `Growth rate unavailable: ${activeSelection.denominatorLabel.toLowerCase()} is not available.`
    : `${state.selectedJst} - ${activeSelection.referenceDate} - ${displayMode === "ratio" ? `${formatCostOfRiskSmoothingLabel(activeCostOfRiskSmoothingWindow)} growth rate` : "amount"}`;
  if (f02Ratio) {
    elements.costOfRiskF02Value.textContent = formatCostOfRiskDisplayValue(
      displayMode === "ratio" ? f02Ratio.ratioBasisPoints : f02Ratio.value,
      displayMode,
      state.selectedUnit
    );
    elements.costOfRiskF02Context.textContent = `${state.selectedJst} - ${f02Ratio.referenceDate || "-"} - quarterly`;
  } else {
    elements.costOfRiskF02Value.textContent = "-";
    elements.costOfRiskF02Context.textContent = "-";
  }
  elements.costOfRiskPoints.textContent = activeSelection.option.points.length === 0
    ? "-"
    : activeSelection.option.points.join(", ");
  if (activeCostOfRiskTab === "contributions") {
    const activeWaterfall = getWaterfall();
    const selectedWaterfallPoint = (activeWaterfall.points ?? []).find((point) => point.code === activeCostOfRiskXAxisCode);
    renderCostOfRiskWaterfallTitle(displayMode, activeWaterfall.denominator, state.selectedUnit);
    renderCostOfRiskChartTitle(selectedWaterfallPoint, xAxisOptions, activeCostOfRiskXAxisCode);
    renderCostOfRiskWaterfallChart(activeWaterfall, state.selectedJst, displayMode, state.selectedUnit);
    renderCostOfRiskMovementAuditPanel(state, { allowDataAudit: consumeCostOfRiskDataAuditRequest() });
    if (getCostOfRiskMovementChart()?.renderTo !== elements.costOfRiskChart) {
      destroyCostOfRiskMovementChart();
    }
    renderMovementTimeSeriesChart({
      activeReferenceDate: activeCostOfRiskReferenceDate,
      container: elements.costOfRiskChart,
      displayMode,
      focusSelectedYAxis: activeCostOfRiskFocusSelectedYAxis,
      jstCode: state.selectedJst,
      onClearSmoothing: clearCostOfRiskSmoothing,
      onChangeSmoothing: updateCostOfRiskSmoothingWindow,
      onSelectJst: selectCostOfRiskChartJst,
      onSelectReferenceDate: selectCostOfRiskReferenceDate,
      onToggleYAxisFocus: toggleCostOfRiskFocusedYAxis,
      peerDisplayMode: state.peerDisplayMode,
      renderTabEmpty: renderCostOfRiskTabEmpty,
      selectedUnit: state.selectedUnit,
      selection: activeSelection,
      smoothingWindow: activeCostOfRiskSmoothingWindow,
      titleText: activeCostOfRiskChartTitleText
    });
    leaveCostOfRiskStageTransferTab();
  } else if (activeCostOfRiskTab === "f2-vs-f12") {
    leaveCostOfRiskStageTransferTab();
    renderF2VsF12Chart({
      activeReferenceDate: activeCostOfRiskReferenceDate,
      container: elements.costOfRiskF2VsF12Chart,
      displayMode,
      f02Series: getCostOfRiskCachedModel(
        state,
        createCostOfRiskModelCacheKey(state, "f02-series", activeCostOfRiskFilters),
        () => buildCostOfRiskF02ImpairmentSeries(state, activeCostOfRiskFilters)
      ),
      f12Series: getCostOfRiskCachedModel(
        state,
        createCostOfRiskModelCacheKey(state, "f12-contribution-series", activeCostOfRiskFilters, selectedF2F12XCodes),
        () => buildCostOfRiskF12ContributionSeries(state, activeCostOfRiskFilters, selectedF2F12XCodes)
      ),
      onClearSmoothing: clearCostOfRiskSmoothing,
      onChangeSmoothing: updateCostOfRiskSmoothingWindow,
      onSelectAuditSeries: selectCostOfRiskAuditSeries,
      renderTabEmpty: renderCostOfRiskTabEmpty,
      selectedUnit: state.selectedUnit,
      smoothingWindow: activeCostOfRiskSmoothingWindow
    });
    renderCostOfRiskAuditTable(
      getCostOfRiskCachedModel(
        state,
        createCostOfRiskModelCacheKey(state, "f2-vs-f12-audit", activeCostOfRiskFilters, selectedF2F12XCodes),
        () => buildCostOfRiskF2VsF12Audit(state, activeCostOfRiskFilters, selectedF2F12XCodes)
      ),
      state.selectedUnit
    );
  } else if (activeCostOfRiskTab === "analysis") {
    leaveCostOfRiskStageTransferTab();
    clearCostOfRiskAuditTable();
    renderTreemapChart({
      container: elements.costOfRiskTreemap,
      displayMode: activeCostOfRiskDisplayMode,
      onSelectXAxis: selectCostOfRiskXAxisFromWaterfall,
      selectedUnit: state.selectedUnit,
      treemapData: getCostOfRiskCachedModel(
        state,
        createCostOfRiskModelCacheKey(state, "counterparty-treemap", activeCostOfRiskFilters, activeCostOfRiskReferenceDate),
        () => buildCostOfRiskCounterpartyTreemapData(state, activeCostOfRiskFilters, activeCostOfRiskReferenceDate)
      )
    });
  } else {
    leaveCostOfRiskStageTransferTab();
    clearCostOfRiskAuditTable();
  }
  scheduleCostOfRiskChartReflow();
}

function scheduleCostOfRiskChartReflow() {
  window.requestAnimationFrame?.(() => {
    getActiveCostOfRiskCharts().forEach((chart) => chart?.reflow?.());
  });
}

function getActiveCostOfRiskCharts() {
  if (activeCostOfRiskTab === "summary") {
    return [getCostOfRiskStageSummaryChart()];
  }
  if (activeCostOfRiskTab === "cost-of-risk") return [getCostOfRiskMovementChart()];
  if (activeCostOfRiskTab === "stage-ratio") return [getCostOfRiskStageRatioChart()];
  if (activeCostOfRiskTab === "coverage-ratio") return [getCostOfRiskCoverageRatioChart()];
  if (activeCostOfRiskTab === "collateral-ratio") return [getCostOfRiskCollateralRatioChart()];
  if (activeCostOfRiskTab === "contributions") return [costOfRiskWaterfallChart, getCostOfRiskMovementChart()];
  if (activeCostOfRiskTab === "f2-vs-f12") return [getCostOfRiskF2VsF12Chart()];
  if (activeCostOfRiskTab === "stage-transfers") return [costOfRiskStageTransferChart, getCostOfRiskStageTransferFlowChart()];
  if (activeCostOfRiskTab === "stage-reconciliation") return [getCostOfRiskStageReconciliationChart()];
  if (activeCostOfRiskTab === "analysis") return [getCostOfRiskTreemapChart()];
  return [];
}

function renderCostOfRiskTabs() {
  renderCostOfRiskTabsView({
    activeTab: activeCostOfRiskTab,
    panels: elements.costOfRiskTabPanels,
    tabButtons: elements.costOfRiskTabButtons
  });
  window.requestAnimationFrame?.(updateCostOfRiskTabsFade);
}

function updateCostOfRiskTabsFade() {
  const tabs = elements.costOfRiskTabs;
  if (!tabs) return;

  const maxScrollLeft = Math.max(0, tabs.scrollWidth - tabs.clientWidth);
  tabs.classList.toggle("can-scroll-left", tabs.scrollLeft > 1);
  tabs.classList.toggle("can-scroll-right", tabs.scrollLeft < maxScrollLeft - 1);
}

export function showCostOfRiskPeerDisplayHelp(peerDisplayMode) {
  setCostOfRiskHelpTopic(peerDisplayMode === "anonymised" ? "peer-anonymised" : "peer-explicit");
  renderCostOfRiskHelpPanel();
}

export function showCostOfRiskPeerSelection(actions) {
  costOfRiskPeerSelectionActions = actions;
  setCostOfRiskHelpTopic("peer-selection");
  renderCostOfRiskHelpPanel();
}

export function showCostOfRiskDatasetInfo(actions) {
  costOfRiskDatasetInfoActions = actions;
  setCostOfRiskHelpTopic("dataset-info");
  renderCostOfRiskHelpPanel();
}

function renderCostOfRiskTabEmpty(message) {
  renderCostOfRiskTabEmptyView({
    activeTab: activeCostOfRiskTab,
    message,
    panels: elements.costOfRiskTabPanels,
    resolveMessage: resolveCostOfRiskTabEmptyMessage
  });
}

function resolveCostOfRiskTabEmptyMessage(message) {
  const resolvedMessage = !message
    || String(message).startsWith("No matching F")
    || String(message).startsWith("No F_")
    ? getCostOfRiskUnavailableMessage()
    : message;

  if (String(resolvedMessage).startsWith("FINREP data does not support this level of detail with a breakdown by performing status")) {
    return createCostOfRiskRemoveStatusFilterMessage();
  }
  if (
    String(resolvedMessage).startsWith("FINREP data does not support this level of detail for off-balance")
    || String(resolvedMessage).startsWith("FINREP data does not support this level of detail for the combined")
    || String(resolvedMessage).startsWith("FINREP data does not support this level of detail for collateral analysis outside")
  ) {
    return createCostOfRiskSelectInBalanceMessage(resolvedMessage);
  }
  if (String(resolvedMessage).startsWith("FINREP data does not support this level of detail for")) {
    const counterpartyAction = createCostOfRiskFineCounterpartyMessage(resolvedMessage);
    if (counterpartyAction) return counterpartyAction;
  }
  if (
    activeCostOfRiskTab === "collateral-ratio"
    && String(resolvedMessage).startsWith("Collateral information in F_18.00")
  ) {
    return createCostOfRiskCollateralStatusSelectionEmpty(resolvedMessage);
  }
  if (
    (activeCostOfRiskTab === "stage-ratio" || activeCostOfRiskTab === "coverage-ratio")
    && String(resolvedMessage).startsWith("This tab is stage or performing status specific")
  ) {
    return createCostOfRiskRatioStatusSelectionEmpty(resolvedMessage);
  }
  return resolvedMessage;
}

function createCostOfRiskSelectInBalanceMessage(message) {
  const wrap = document.createElement("span");
  wrap.className = "cost-of-risk-tab-empty-inline-action";
  wrap.append(document.createTextNode(`${message.replace(/ Select In-balance\\.?$/i, "")} `));
  wrap.append(createCostOfRiskTabEmptyActionButton("Select In-balance", () => {
    applyCostOfRiskEmptyMessageFilterSelection("balanceScope", COST_OF_RISK_BALANCE_SCOPE_IN_BALANCE);
  }));
  wrap.append(document.createTextNode("."));
  return wrap;
}

function createCostOfRiskFineCounterpartyMessage(message) {
  const counterparty = activeCostOfRiskFilters.counterparty;
  const parent = getFilterParentValue("counterparty", counterparty);
  if (!counterparty || counterparty === COST_OF_RISK_FILTER_ALL || parent === COST_OF_RISK_FILTER_ALL) return null;

  const counterpartyLabel = getCostOfRiskCounterpartyFilterLabel(counterparty);
  const parentLabel = getCostOfRiskCounterpartyFilterLabel(parent);
  const wrap = document.createElement("span");
  wrap.className = "cost-of-risk-tab-empty-inline-action";
  wrap.append(document.createTextNode(`${message.replace(/ Select .*$/i, "")} `));

  const removeButton = createCostOfRiskTabEmptyActionButton(`Remove ${counterpartyLabel} filter`, () => {
    applyCostOfRiskEmptyMessageFilterSelection("counterparty", COST_OF_RISK_FILTER_ALL);
  });
  const parentButton = createCostOfRiskTabEmptyActionButton(`Select ${parentLabel}`, () => {
    applyCostOfRiskEmptyMessageFilterSelection("counterparty", parent);
  });

  wrap.append(removeButton, document.createTextNode(" or "), parentButton, document.createTextNode("."));
  return wrap;
}

function createCostOfRiskRemoveStatusFilterMessage() {
  const wrap = document.createElement("span");
  wrap.className = "cost-of-risk-tab-empty-inline-action";
  wrap.append(document.createTextNode("FINREP data does not support this level of detail with a breakdown by performing status. "));

  const button = createCostOfRiskTabEmptyActionButton("Remove this filter", () => {
    applyCostOfRiskEmptyMessageFilterSelection("stage", COST_OF_RISK_FILTER_ALL);
  });
  wrap.append(button);
  wrap.append(document.createTextNode("."));
  return wrap;
}

function createCostOfRiskTabEmptyActionButton(label, onClick) {
  const button = document.createElement("button");
  button.className = "cost-of-risk-tab-empty-action";
  button.type = "button";
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
}

function applyCostOfRiskEmptyMessageFilterSelection(filterKey, value) {
  clearCostOfRiskHelpTopic();
  applyCostOfRiskFilterSelection(filterKey, value);
}

function getCostOfRiskCounterpartyFilterLabel(value) {
  const option = latestCostOfRiskFilterOptions?.counterparties?.find((candidate) => candidate.value === value);
  return formatCostOfRiskCounterpartySelectionLabel(option?.label ?? value);
}

function createCostOfRiskRatioStatusSelectionEmpty(message) {
  const wrap = document.createElement("div");
  wrap.className = "cost-of-risk-ratio-status-empty";

  const text = document.createElement("p");
  text.className = "cost-of-risk-ratio-status-empty-text";
  text.textContent = message;
  wrap.append(text);

  const options = latestCostOfRiskFilterOptions?.stages ?? [];
  wrap.append(createCostOfRiskRatioStatusOptionGroup(
    "Staging status",
    options.filter((option) => isCostOfRiskIfrsStageFilterValue(option.value))
  ));
  wrap.append(createCostOfRiskRatioStatusOptionGroup(
    "Performance status",
    options.filter((option) => isCostOfRiskPerformanceStatusFilterValue(option.value))
  ));

  return wrap;
}

function createCostOfRiskCollateralStatusSelectionEmpty(message) {
  const wrap = document.createElement("div");
  wrap.className = "cost-of-risk-ratio-status-empty";

  const text = document.createElement("p");
  text.className = "cost-of-risk-ratio-status-empty-text";
  text.textContent = message;
  wrap.append(text);

  const options = latestCostOfRiskFilterOptions?.stages ?? [];
  wrap.append(createCostOfRiskRatioStatusOptionGroup(
    "Collateral status",
    options.filter((option) => option.value === COST_OF_RISK_FILTER_ALL || isCostOfRiskPerformanceStatusFilterValue(option.value))
  ));

  return wrap;
}

function createCostOfRiskRatioStatusOptionGroup(titleText, options) {
  const group = document.createElement("section");
  group.className = "cost-of-risk-ratio-status-empty-group";

  const title = document.createElement("h3");
  title.className = "cost-of-risk-ratio-status-empty-title";
  title.textContent = titleText;
  group.append(title);

  const optionWrap = document.createElement("div");
  optionWrap.className = "cost-of-risk-ratio-status-empty-options";
  options.forEach((option) => {
    const button = document.createElement("button");
    button.className = "cost-of-risk-ratio-status-empty-option";
    button.type = "button";
    button.textContent = option.label;
    button.addEventListener("click", () => {
      applyCostOfRiskFilterSelection("stage", option.value);
    });
    optionWrap.append(button);
  });
  group.append(optionWrap);
  return group;
}

function clearCostOfRiskEmptyPanels() {
  clearCostOfRiskEmptyPanelsView(elements.costOfRiskTabPanels);
}

function renderCostOfRiskF18SummaryOnlyView(summary, state) {
  if (elements.costOfRiskSummaryDisplayControl) elements.costOfRiskSummaryDisplayControl.replaceChildren();
  elements.costOfRiskValue.textContent = "-";
  elements.costOfRiskContext.textContent = "-";
  elements.costOfRiskDenominatorValue.textContent = "-";
  elements.costOfRiskDenominatorContext.textContent = "-";
  elements.costOfRiskRatioValue.textContent = "-";
  elements.costOfRiskRatioContext.textContent = "F_18.00 summary";
  elements.costOfRiskF02Value.textContent = "-";
  elements.costOfRiskF02Context.textContent = "-";
  elements.costOfRiskPoints.textContent = "-";

  leaveCostOfRiskStageTransferTab();
  clearCostOfRiskAuditTable();
  renderCostOfRiskStageSummaryView(summary, state);
}

function renderCostOfRiskStageRatioView(stageRatio, state) {
  renderCostOfRiskStageRatioTable({
    activeCellKey: stageRatio.selectedCell?.key ?? activeCostOfRiskStageRatioCellKey,
    container: elements.costOfRiskStageRatioTable,
    onBackToSummary: returnToCostOfRiskSummary,
    onCellSelect: selectCostOfRiskStageRatioCell,
    selectedUnit: state.selectedUnit,
    stageRatio
  });
  renderCostOfRiskStageRatioChart({
    activeReferenceDate: activeCostOfRiskReferenceDate,
    container: elements.costOfRiskStageRatioChart,
    focusSelectedYAxis: activeCostOfRiskFocusSelectedYAxis,
    model: stageRatio,
    onClearSmoothing: clearCostOfRiskSmoothing,
    onChangeSmoothing: updateCostOfRiskSmoothingWindow,
    onSelectJst: selectCostOfRiskChartJst,
    onSelectReferenceDate: selectCostOfRiskReferenceDate,
    onToggleYAxisFocus: toggleCostOfRiskFocusedYAxis,
    renderTabEmpty: renderCostOfRiskTabEmpty,
    smoothingWindow: activeCostOfRiskSmoothingWindow,
    state
  });
}

function renderCostOfRiskCoverageRatioView(coverageRatio, state) {
  renderCostOfRiskCoverageRatioTable({
    activeCellKey: coverageRatio.selectedCell?.key ?? activeCostOfRiskCoverageRatioCellKey,
    container: elements.costOfRiskCoverageRatioTable,
    onBackToSummary: returnToCostOfRiskSummary,
    onCellSelect: selectCostOfRiskCoverageRatioCell,
    selectedUnit: state.selectedUnit,
    coverageRatio
  });
  renderCostOfRiskCoverageRatioChart({
    activeReferenceDate: activeCostOfRiskReferenceDate,
    container: elements.costOfRiskCoverageRatioChart,
    focusSelectedYAxis: activeCostOfRiskFocusSelectedYAxis,
    model: coverageRatio,
    onClearSmoothing: clearCostOfRiskSmoothing,
    onChangeSmoothing: updateCostOfRiskSmoothingWindow,
    onSelectJst: selectCostOfRiskChartJst,
    onSelectReferenceDate: selectCostOfRiskReferenceDate,
    onToggleYAxisFocus: toggleCostOfRiskFocusedYAxis,
    renderTabEmpty: renderCostOfRiskTabEmpty,
    smoothingWindow: activeCostOfRiskSmoothingWindow,
    state
  });
}

function renderCostOfRiskCollateralRatioView(collateralRatio, state) {
  renderCostOfRiskCollateralRatioTable({
    activeCellKey: collateralRatio.selectedCell?.key ?? activeCostOfRiskCollateralRatioCellKey,
    collateralRatio,
    container: elements.costOfRiskCollateralRatioTable,
    onBackToSummary: returnToCostOfRiskSummary,
    onCellSelect: selectCostOfRiskCollateralRatioCell,
    selectedUnit: state.selectedUnit
  });
  renderCostOfRiskCollateralRatioChart({
    activeReferenceDate: activeCostOfRiskReferenceDate,
    container: elements.costOfRiskCollateralRatioChart,
    focusSelectedYAxis: activeCostOfRiskFocusSelectedYAxis,
    model: collateralRatio,
    onClearSmoothing: clearCostOfRiskSmoothing,
    onChangeSmoothing: updateCostOfRiskSmoothingWindow,
    onSelectJst: selectCostOfRiskChartJst,
    onSelectReferenceDate: selectCostOfRiskReferenceDate,
    onToggleYAxisFocus: toggleCostOfRiskFocusedYAxis,
    renderTabEmpty: renderCostOfRiskTabEmpty,
    smoothingWindow: activeCostOfRiskSmoothingWindow,
    state
  });
}

function renderCostOfRiskDefinitionView(definitionModel, state) {
  renderCostOfRiskDefinitionPanel(definitionModel, state.selectedUnit);
  if (getCostOfRiskMovementChart()?.renderTo !== elements.costOfRiskDefinitionChart) {
    destroyCostOfRiskMovementChart();
  }
  renderMovementTimeSeriesChart({
    activeReferenceDate: activeCostOfRiskReferenceDate,
    container: elements.costOfRiskDefinitionChart,
    displayMode: activeCostOfRiskDefinitionDisplayMode,
    focusSelectedYAxis: activeCostOfRiskFocusSelectedYAxis,
    jstCode: state.selectedJst,
    onClearSmoothing: clearCostOfRiskSmoothing,
    onChangeSmoothing: updateCostOfRiskSmoothingWindow,
    onSelectJst: selectCostOfRiskChartJst,
    onSelectReferenceDate: selectCostOfRiskReferenceDate,
    onToggleYAxisFocus: toggleCostOfRiskFocusedYAxis,
    peerDisplayMode: state.peerDisplayMode,
    renderTabEmpty: renderCostOfRiskTabEmpty,
    selectedUnit: state.selectedUnit,
    selection: {
      ...definitionModel,
      series: definitionModel.chartSeries ?? definitionModel.series
    },
    smoothingWindow: activeCostOfRiskSmoothingWindow,
    titleText: "Cost of Risk - Time Evolution"
  });
}

function renderCostOfRiskDefinitionPanel(definitionModel, selectedUnit = "millions") {
  if (!elements.costOfRiskDefinitionPanel) return;
  if (definitionModel.status) {
    elements.costOfRiskDefinitionPanel.replaceChildren(createCostOfRiskDefinitionEmpty(definitionModel.status));
    return;
  }

  const root = document.createElement("div");
  root.className = "cost-of-risk-definition-grid cost-of-risk-definition-grid--compact";
  root.append(createCostOfRiskDefinitionHeader(definitionModel, selectedUnit));

  const detail = document.createElement("div");
  detail.className = "cost-of-risk-definition-drivers";
  detail.append(createCostOfRiskDefinitionPanelTabs());
  const activeItems = activeCostOfRiskDefinitionPanelTab === "components"
    ? definitionModel.components ?? []
    : definitionModel.drivers ?? [];
  if (activeItems.length === 0) {
    const empty = document.createElement("div");
    empty.className = "cost-of-risk-definition-driver-empty";
    empty.textContent = activeCostOfRiskDefinitionPanelTab === "components"
      ? "No F12 component is available for the selected definition."
      : "No significant driver is available for the selected definition.";
    detail.append(empty);
  } else {
    activeItems.forEach((item) => {
      detail.append(createCostOfRiskDefinitionDetailRow(item, selectedUnit, activeCostOfRiskDefinitionPanelTab));
    });
  }

  root.append(detail);
  elements.costOfRiskDefinitionPanel.replaceChildren(root);
}

function createCostOfRiskDefinitionHeader(definitionModel, selectedUnit) {
  const header = document.createElement("div");
  header.className = "cost-of-risk-definition-header";

  const definition = COST_OF_RISK_DEFINITION_OPTIONS.find((option) => option.id === activeCostOfRiskDefinitionId)
    ?? definitionModel.definition
    ?? COST_OF_RISK_DEFINITION_OPTIONS[0];
  const definitionButton = document.createElement("button");
  definitionButton.type = "button";
  definitionButton.className = "cost-of-risk-definition-local-chip";
  definitionButton.dataset.costOfRiskDefinitionFilterToggle = "true";
  definitionButton.setAttribute("aria-label", "Change cost of risk definition");
  const definitionPrefix = document.createElement("span");
  definitionPrefix.className = "cost-of-risk-definition-local-chip-prefix";
  definitionPrefix.textContent = "Cost of risk:";
  const definitionValue = document.createElement("span");
  definitionValue.className = "cost-of-risk-definition-local-chip-value";
  definitionValue.textContent = definition?.label ?? "Definition";
  definitionButton.append(definitionPrefix, definitionValue);

  const valueButton = document.createElement("button");
  valueButton.type = "button";
  valueButton.className = "cost-of-risk-definition-headline-value";
  valueButton.classList.toggle("is-active", !activeCostOfRiskDefinitionDriverCode);
  valueButton.dataset.costOfRiskDefinitionBenchmarkTarget = "total";
  valueButton.dataset.costOfRiskCalculationDetail = "cost-of-risk-total";
  valueButton.textContent = formatCostOfRiskDisplayValue(
    activeCostOfRiskDefinitionDisplayMode === "ratio"
      ? definitionModel.ratioBasisPoints
      : definitionModel.value,
    activeCostOfRiskDefinitionDisplayMode,
    selectedUnit,
    true
  );

  header.append(definitionButton, valueButton);
  return header;
}

function createCostOfRiskDefinitionPanelTabs() {
  const tabs = document.createElement("div");
  tabs.className = "cost-of-risk-definition-detail-tabs";
  [
    { key: "components", label: "Components" },
    { key: "drivers", label: "Main drivers" }
  ].forEach((tab) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "cost-of-risk-definition-detail-tab";
    button.classList.toggle("is-active", activeCostOfRiskDefinitionPanelTab === tab.key);
    button.dataset.costOfRiskDefinitionPanelTab = tab.key;
    button.textContent = tab.label;
    tabs.append(button);
  });
  return tabs;
}

function createCostOfRiskDefinitionDetailRow(item, selectedUnit, panelTab) {
  const row = document.createElement("button");
  row.type = "button";
  row.className = "cost-of-risk-definition-driver";
  const showsCustomCheckbox = panelTab === "components" && activeCostOfRiskDefinitionId === "f12-custom-components";
  row.classList.toggle("has-checkbox", showsCustomCheckbox);
  row.classList.toggle("is-active", item.code === activeCostOfRiskDefinitionDriverCode);
  row.dataset.costOfRiskDefinitionDriver = item.code;
  row.dataset.costOfRiskCalculationDetail = "cost-of-risk-driver";
  row.dataset.costOfRiskCalculationValue = item.code;

  if (showsCustomCheckbox) {
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "cost-of-risk-definition-component-checkbox";
    checkbox.checked = item.included !== false;
    checkbox.dataset.costOfRiskCustomDefinitionComponent = String(item.code ?? "").replace(/^component:/, "");
    checkbox.setAttribute("aria-label", `${checkbox.checked ? "Remove" : "Include"} ${item.label}`);
    row.append(checkbox);
  }

  const label = document.createElement("div");
  label.className = "cost-of-risk-definition-driver-label";
  label.textContent = item.label;
  label.title = item.source;

  const value = document.createElement("div");
  value.className = "cost-of-risk-definition-driver-value";
  value.textContent = formatCostOfRiskDisplayValue(
    activeCostOfRiskDefinitionDisplayMode === "ratio" ? item.ratioBasisPoints : item.value,
    activeCostOfRiskDefinitionDisplayMode,
    selectedUnit,
    true
  );

  row.append(label, value);
  return row;
}

function createCostOfRiskDefinitionEmpty(message) {
  const empty = document.createElement("div");
  empty.className = "cost-of-risk-definition-empty";
  empty.textContent = resolveCostOfRiskTabEmptyMessage(message);
  return empty;
}

function renderCostOfRiskDefinitionAuditPanel(definitionModel, options = {}) {
  if (!elements.costOfRiskAuditPanel) return;
  if (renderCostOfRiskHelpPanel()) return;
  if (!options.allowDefaultRender) return;

  const article = document.createElement("article");
  article.className = "cost-of-risk-audit-intro";

  const eyebrow = document.createElement("div");
  eyebrow.className = "cost-of-risk-audit-intro-eyebrow";
  eyebrow.textContent = "Cost of risk method";

  const title = document.createElement("h2");
  title.className = "cost-of-risk-audit-intro-title";
  title.textContent = definitionModel.definition?.label ?? "Cost of risk definition";

  const lead = document.createElement("p");
  lead.className = "cost-of-risk-audit-intro-lead";
  lead.textContent = definitionModel.definition?.description ?? "";

  article.append(eyebrow, title, lead);
  article.append(createCostOfRiskAuditInfoSection("Regulatory source", [
    definitionModel.definition?.source ?? "-"
  ]));
  article.append(createCostOfRiskAuditInfoSection("Selected components", definitionModel.definition?.components ?? [
    "No component detail is available for this definition."
  ]));
  article.append(createCostOfRiskAuditInfoSection("Interpretation", [
    definitionModel.definition?.id === "f02-impairment"
      ? "This method reads the cost of risk directly from the income statement. It is compact and close to the reported P&L measure, but it does not expose the underlying allowance movement components."
      : "This method reconstructs cost of risk from the selected F_12.01 movement columns. It is more analytical because the same definition can be decomposed by movement component, stage, counterparty and instrument when FINREP provides the detail."
  ]));

  const hint = document.createElement("p");
  hint.className = "cost-of-risk-audit-intro-hint";
  hint.textContent = "Use the method selector to switch definition. The value and time chart are recomputed immediately.";
  article.append(hint);

  replaceCostOfRiskAuditPanelContent(article);
}

function selectCostOfRiskStageRatioCell(cellKey) {
  activeCostOfRiskStageRatioCellKey = cellKey;
  if (getLatestState()) rerenderApp(getLatestState());
}

function selectCostOfRiskCoverageRatioCell(cellKey) {
  activeCostOfRiskCoverageRatioCellKey = cellKey;
  if (getLatestState()) rerenderApp(getLatestState());
}

function returnToCostOfRiskSummary() {
  activeCostOfRiskTab = "summary";
  closeCostOfRiskFilterMenus();
  clearCostOfRiskHelpTopic();
  if (getLatestState()) rerenderApp(getLatestState());
}

function selectCostOfRiskCollateralRatioCell(cellKey) {
  activeCostOfRiskCollateralRatioCellKey = cellKey;
  if (getLatestState()) rerenderApp(getLatestState());
}

function normalizeActiveCostOfRiskFilter(name, options) {
  if (!options.some((option) => option.value === activeCostOfRiskFilters[name])) {
    if (name === "stage") {
      setActiveCostOfRiskStageFilter(COST_OF_RISK_FILTER_ALL);
      return;
    }
    activeCostOfRiskFilters[name] = COST_OF_RISK_FILTER_ALL;
  }
}

function getActiveCostOfRiskStageTransferStage() {
  return getCostOfRiskStageTransferStage(activeCostOfRiskFilters.stage);
}

function syncCostOfRiskStageTransferSelectionFromStageFilter() {
  activeCostOfRiskStageTransferFlowKey = getSyncedCostOfRiskStageTransferFlowKey(
    activeCostOfRiskFilters.stage,
    activeCostOfRiskStageTransferFlowKey
  );
}

function setActiveCostOfRiskStageFilter(stageValue) {
  const nextStage = normalizeCostOfRiskStageFilterValue(stageValue);
  const changed = activeCostOfRiskFilters.stage !== nextStage;
  activeCostOfRiskFilters.stage = nextStage;
  if (elements.costOfRiskStage && elements.costOfRiskStage.value !== nextStage) {
    elements.costOfRiskStage.value = nextStage;
  }
  syncCostOfRiskStageTransferSelectionFromStageFilter();
  return changed;
}

function isCostOfRiskAllStageSelected() {
  return isCostOfRiskAllStageValue(activeCostOfRiskFilters.stage);
}

function getCostOfRiskCoreSelection(scope = "movement") {
  return scope === "f2-f12" ? activeCostOfRiskF2F12XCodes : activeCostOfRiskMovementXCodes;
}

function setCostOfRiskCoreSelection(scope, nextSelection) {
  if (scope === "f2-f12") {
    activeCostOfRiskF2F12XCodes = nextSelection;
    return;
  }
  activeCostOfRiskMovementXCodes = nextSelection;
}

function normalizeActiveCostOfRiskCoreDefinition(options, scope = "movement") {
  setCostOfRiskCoreSelection(
    scope,
    normalizeCostOfRiskCoreSelection(options, getCostOfRiskCoreSelection(scope))
  );
}

function getActiveCostOfRiskCoreXCodes(options, scope = "movement") {
  return getActiveCoreXCodes(options, getCostOfRiskCoreSelection(scope));
}

function updateCostOfRiskCoreDefinition(code, isSelected, scope = "movement") {
  const previousCodes = getCostOfRiskCoreSelection(scope);
  const selectedCodes = updateCostOfRiskCoreSelection(previousCodes, code, isSelected);
  if (selectedCodes === previousCodes) return;
  setCostOfRiskCoreSelection(scope, selectedCodes);

  if (scope !== "f2-f12" && !selectedCodes.has(activeCostOfRiskXAxisCode) && selectedCodes.size > 0) {
    activeCostOfRiskXAxisCode = [...selectedCodes][0];
  }
}

function renderCostOfRiskActiveFilters(filterOptions) {
  const displayedFilters = activeCostOfRiskFilters;
  renderCostOfRiskActiveFiltersView({
    activeTab: activeCostOfRiskTab,
    balanceScopeMenuOpen: isCostOfRiskFilterSelectionTopicOpen("balanceScope"),
    contributionDisplayMenuOpen: activeCostOfRiskContributionDisplayMenuOpen,
    container: elements.costOfRiskActiveFilters,
    counterpartyMenuOpen: isCostOfRiskFilterSelectionTopicOpen("counterparty"),
    costOfRiskDefinitionId: activeCostOfRiskDefinitionId,
    costOfRiskDefinitionMenuOpen: isCostOfRiskFilterSelectionTopicOpen("definition"),
    displayMode: getActiveCostOfRiskDisplayMode(),
    instrumentMenuOpen: isCostOfRiskFilterSelectionTopicOpen("instrument"),
    filterOptions,
    filters: displayedFilters,
    referenceDate: activeCostOfRiskReferenceDate,
    stageMenuOpen: isCostOfRiskFilterSelectionTopicOpen("stage"),
    summaryDisplayMenuOpen: activeCostOfRiskSummaryDisplayMenuOpen,
    stageTransferDisplayMenuOpen: activeCostOfRiskStageTransferDisplayMenuOpen
  });
}

function getActiveCostOfRiskDisplayMode() {
  if (activeCostOfRiskTab === "summary") return activeCostOfRiskSummaryDisplayMode;
  if (activeCostOfRiskTab === "cost-of-risk") return activeCostOfRiskDefinitionDisplayMode;
  if (activeCostOfRiskTab === "contributions") return activeCostOfRiskMovementDisplayMode;
  if (activeCostOfRiskTab === "stage-transfers") return activeCostOfRiskStageTransferDisplayMode;
  return activeCostOfRiskDisplayMode;
}

function hasOpenCostOfRiskFilterMenu() {
  return activeCostOfRiskContributionDisplayMenuOpen
    || activeCostOfRiskStageTransferDisplayMenuOpen
    || activeCostOfRiskSummaryDisplayMenuOpen;
}

function closeCostOfRiskFilterMenus() {
  const changed = hasOpenCostOfRiskFilterMenu();
  activeCostOfRiskContributionDisplayMenuOpen = false;
  activeCostOfRiskStageTransferDisplayMenuOpen = false;
  activeCostOfRiskSummaryDisplayMenuOpen = false;
  return changed;
}

function renderCostOfRiskSummaryDisplayControl() {
  if (!elements.costOfRiskSummaryDisplayControl) return;

  const prefix = document.createElement("span");
  prefix.className = "cost-of-risk-filter-chip-prefix";
  prefix.textContent = "Display: ";

  const switcher = document.createElement("div");
  switcher.className = "cost-of-risk-summary-switch";
  switcher.setAttribute("aria-label", "Summary breakdown");
  switcher.setAttribute("role", "group");

  [
    { label: "by stage", value: "stage" },
    { label: "by counterparty", value: "counterparty" }
  ].forEach((option) => {
    const button = document.createElement("button");
    const isActive = activeCostOfRiskSummaryBreakdown === option.value;
    button.className = "cost-of-risk-summary-switch-button";
    button.classList.toggle("is-active", isActive);
    button.type = "button";
    button.dataset.costOfRiskSummaryBreakdown = option.value;
    button.setAttribute("aria-pressed", String(isActive));
    button.textContent = option.label;
    switcher.append(button);
  });

  elements.costOfRiskSummaryDisplayControl.replaceChildren(prefix, switcher);
  renderCostOfRiskSummaryBreakdownSwitch();
}

function clearActiveCostOfRiskFilter(filterName) {
  if (!Object.prototype.hasOwnProperty.call(activeCostOfRiskFilters, filterName)) return;

  if (filterName === "stage") {
    setActiveCostOfRiskStageFilter(getCostOfRiskFilterParentValue(filterName, activeCostOfRiskFilters[filterName]));
    return;
  }
  activeCostOfRiskFilters[filterName] = getCostOfRiskFilterParentValue(filterName, activeCostOfRiskFilters[filterName]);
  if (filterName === "asset" && elements.costOfRiskAsset) elements.costOfRiskAsset.value = activeCostOfRiskFilters[filterName];
  if (filterName === "counterparty" && elements.costOfRiskCounterparty) elements.costOfRiskCounterparty.value = activeCostOfRiskFilters[filterName];
}

function getCostOfRiskFilterSelectionTopicForFilter(filterName) {
  if (filterName === "asset") return `${COST_OF_RISK_FILTER_SELECTION_TOPIC_PREFIX}instrument`;
  if (filterName === "balanceScope") return `${COST_OF_RISK_FILTER_SELECTION_TOPIC_PREFIX}balanceScope`;
  if (filterName === "counterparty") return `${COST_OF_RISK_FILTER_SELECTION_TOPIC_PREFIX}counterparty`;
  if (filterName === "stage") return `${COST_OF_RISK_FILTER_SELECTION_TOPIC_PREFIX}stage`;
  return "";
}

function getCostOfRiskFilterParentValue(filterName, value) {
  return getFilterParentValue(filterName, value);
}

function getCostOfRiskUnavailableMessage() {
  return getUnavailableMessage(activeCostOfRiskFilters);
}

function isCostOfRiskFineCounterpartySelected() {
  const counterparty = activeCostOfRiskFilters.counterparty;
  return Boolean(counterparty)
    && counterparty !== COST_OF_RISK_FILTER_ALL
    && getFilterParentValue("counterparty", counterparty) !== COST_OF_RISK_FILTER_ALL;
}

function shouldGuideCostOfRiskUnavailableCounterparty(model) {
  return Boolean(model?.status)
    && !model?.needsStageSelection
    && isCostOfRiskFineCounterpartySelected()
    && COST_OF_RISK_FINE_COUNTERPARTY_UNSUPPORTED_TABS.has(activeCostOfRiskTab);
}

function applyCostOfRiskUnavailableCounterpartyGuidance(model) {
  if (!shouldGuideCostOfRiskUnavailableCounterparty(model)) return model;
  setCostOfRiskHelpTopic(getCostOfRiskFilterSelectionTopicForFilter("counterparty"));
  return {
    ...model,
    status: getCostOfRiskUnavailableMessage()
  };
}

function renderCostOfRiskCoreDefinition(movementOptions, f2F12Options) {
  renderCostOfRiskCoreDefinitionTables({
    f2F12Container: elements.costOfRiskF2VsF12CoreDefinition,
    f2F12Options,
    f2F12SelectedCodes: getActiveCostOfRiskCoreXCodes(f2F12Options, "f2-f12"),
    movementContainer: elements.costOfRiskCoreDefinition,
    movementOptions,
    movementSelectedCodes: getActiveCostOfRiskCoreXCodes(movementOptions, "movement")
  });
}

function renderCostOfRiskChartTitle(selectedPoint, xAxisOptions, selectedCode) {
  if (selectedCode === COST_OF_RISK_TOTAL_CONTRIBUTION_X_CODE) {
    activeCostOfRiskChartTitleText = "Total contribution";
    if (elements.costOfRiskChartTitle) elements.costOfRiskChartTitle.textContent = activeCostOfRiskChartTitleText;
    return;
  }

  const fallbackLabel = xAxisOptions.find((option) => option.code === selectedCode)?.label ?? selectedCode;
  const label = selectedPoint?.label ?? fallbackLabel;
  const cleanLabel = String(label || "").replace(new RegExp(`^${selectedCode}\\s*-\\s*`), "");
  activeCostOfRiskChartTitleText = `${selectedCode} - ${cleanLabel}`;
  if (elements.costOfRiskChartTitle) elements.costOfRiskChartTitle.textContent = activeCostOfRiskChartTitleText;
}

function renderCostOfRiskWaterfallTitle(displayMode = "amount", denominator = null, selectedUnit = "millions") {
  const baseTitle = "Movement in the stock of allowances and provisions";
  activeCostOfRiskWaterfallTitleText = displayMode === "ratio" && Number.isFinite(denominator)
    ? `${baseTitle} over a previous-quarter exposure base of ${formatMetricValue(denominator, selectedUnit)} ${getCostOfRiskUnitLongLabel(selectedUnit)}`
    : baseTitle;
  if (elements.costOfRiskWaterfallTitle) elements.costOfRiskWaterfallTitle.textContent = activeCostOfRiskWaterfallTitleText;
}

function getCostOfRiskUnitLongLabel(selectedUnit) {
  return {
    billions: "EUR billion",
    euros: "EUR",
    millions: "EUR million",
    thousands: "EUR thousand"
  }[selectedUnit] ?? "EUR million";
}

function renderCostOfRiskMovementAuditPanel(state, options = {}) {
  if (!elements.costOfRiskAuditPanel) return;

  if (renderCostOfRiskHelpPanel()) return;
  if (!options.allowDataAudit) return;

  if (isCostOfRiskAuditIntroVisible()) {
    renderCostOfRiskAuditPanelIntro();
    return;
  }

  if (activeCostOfRiskTab !== "contributions" || !activeCostOfRiskMovementAuditXCode) {
    renderCostOfRiskAuditPanelIntro();
    return;
  }

  const audit = buildCostOfRiskMovementContributionAudit(
    state,
    activeCostOfRiskFilters,
    activeCostOfRiskMovementAuditXCode
  );
  renderCostOfRiskAuditTableView({
    activeDateLabel: activeCostOfRiskReferenceDate,
    activeSeries: "movement",
    audit,
    container: elements.costOfRiskAuditPanel,
    displayMode: activeCostOfRiskMovementDisplayMode,
    onOpenSourcePoint: openCostOfRiskAuditSourceInExplorer,
    selectedUnit: state.selectedUnit
  });
}

function renderCostOfRiskStageTransferAuditPanel(state, options = {}) {
  if (!elements.costOfRiskAuditPanel) return;

  if (renderCostOfRiskHelpPanel()) return;
  if (!options.allowDataAudit) return;

  if (isCostOfRiskAuditIntroVisible()) {
    renderCostOfRiskAuditPanelIntro();
    return;
  }

  if (activeCostOfRiskTab !== "stage-transfers" || !activeCostOfRiskStageTransferFlowKey) {
    renderCostOfRiskAuditPanelIntro();
    return;
  }

  const panelDisplayMode = activeCostOfRiskStageTransferFlowKey.startsWith("stagebox:")
    ? "amount"
    : activeCostOfRiskStageTransferDisplayMode;
  const audit = buildCostOfRiskStageTransferPanelAudit(
    state,
    activeCostOfRiskFilters,
    activeCostOfRiskStageTransferFlowKey,
    activeCostOfRiskReferenceDate
  );

  renderCostOfRiskAuditTableView({
    activeDateLabel: activeCostOfRiskReferenceDate,
    activeSeries: "stage-transfer",
    audit,
    container: elements.costOfRiskAuditPanel,
    displayMode: panelDisplayMode,
    onOpenSourcePoint: openCostOfRiskAuditSourceInExplorer,
    selectedUnit: state.selectedUnit
  });
}

function renderCostOfRiskStageRatioAuditPanel(stageRatio, state, options = {}) {
  if (!elements.costOfRiskAuditPanel) return;

  if (renderCostOfRiskHelpPanel()) return;
  if (!options.allowDataAudit) return;

  if (isCostOfRiskAuditIntroVisible()) {
    renderCostOfRiskAuditPanelIntro();
    return;
  }

  const selectedCell = stageRatio.selectedCell;
  const row = (stageRatio.rows ?? []).find((candidate) => candidate.key === selectedCell?.stageKey);
  if (activeCostOfRiskTab !== "stage-ratio" || !selectedCell || !row) {
    renderCostOfRiskAuditPanelIntro();
    return;
  }

  const selectedValue = row.cells?.[selectedCell.metric]?.value ?? null;
  const article = document.createElement("article");
  article.className = "cost-of-risk-audit-intro";

  const eyebrow = document.createElement("div");
  eyebrow.className = "cost-of-risk-audit-intro-eyebrow";
  eyebrow.textContent = "Exposure ratio audit trail";

  const title = document.createElement("h2");
  title.className = "cost-of-risk-audit-intro-title";
  title.textContent = `${getCostOfRiskStageRatioMetricLabel(selectedCell.metric)} - ${row.label}`;

  const lead = document.createElement("p");
  lead.className = "cost-of-risk-audit-intro-lead";
  lead.textContent = `Selected value: ${formatCostOfRiskStageRatioCellValue(selectedValue, selectedCell.metric, state.selectedUnit)}.`;

  article.append(eyebrow, title, lead);
  article.append(createCostOfRiskAuditInfoSection("Selected scope", [
    `Reference date: ${formatReferenceQuarterLabel(stageRatio.referenceDate)}`,
    `JST: ${state.selectedJst}`,
    `Perimeter: ${stageRatio.filterLabel || "selected instruments and counterparties"}`,
    `${isCostOfRiskPerformanceStatusFilterValue(activeCostOfRiskFilters.stage) ? "Selected status" : "Selected stage"}: ${row.label}`
  ]));
  article.append(createCostOfRiskAuditInfoSection("Ratio components", [
    `Current numerator: ${formatMetricValue(row.currentNumerator, state.selectedUnit)}`,
    `Current denominator: ${formatMetricValue(row.currentDenominator, state.selectedUnit)}`,
    `Previous numerator: ${formatMetricValue(row.previousNumerator, state.selectedUnit)}`,
    `Previous denominator: ${formatMetricValue(row.previousDenominator, state.selectedUnit)}`
  ]));
  article.append(createCostOfRiskAuditInfoSection("Decomposition method", [
    "The change in the ratio is decomposed with a two-factor Shapley method.",
    "One path changes the numerator first and then the denominator; the other path changes the denominator first and then the numerator.",
    "The displayed numerator and denominator effects are the average of these two paths, so their sum equals the total ratio variation."
  ]));

  const hint = document.createElement("p");
  hint.className = "cost-of-risk-audit-intro-hint";
  hint.textContent = "Click another value in the upper panel to benchmark and explain that exposure-ratio component.";
  article.append(hint);

  replaceCostOfRiskAuditPanelContent(article);
}

function renderCostOfRiskCoverageRatioAuditPanel(coverageRatio, state, options = {}) {
  if (!elements.costOfRiskAuditPanel) return;

  if (renderCostOfRiskHelpPanel()) return;
  if (!options.allowDataAudit) return;

  if (isCostOfRiskAuditIntroVisible()) {
    renderCostOfRiskAuditPanelIntro();
    return;
  }

  const selectedCell = coverageRatio.selectedCell;
  const row = (coverageRatio.rows ?? []).find((candidate) => candidate.key === selectedCell?.stageKey);
  if (activeCostOfRiskTab !== "coverage-ratio" || !selectedCell || !row) {
    renderCostOfRiskAuditPanelIntro();
    return;
  }

  const selectedValue = row.cells?.[selectedCell.metric]?.value ?? null;
  const article = document.createElement("article");
  article.className = "cost-of-risk-audit-intro";

  const eyebrow = document.createElement("div");
  eyebrow.className = "cost-of-risk-audit-intro-eyebrow";
  eyebrow.textContent = "Coverage ratio audit trail";

  const title = document.createElement("h2");
  title.className = "cost-of-risk-audit-intro-title";
  title.textContent = `${getCostOfRiskCoverageRatioMetricLabel(selectedCell.metric)} - ${row.label}`;

  const lead = document.createElement("p");
  lead.className = "cost-of-risk-audit-intro-lead";
  lead.textContent = `Selected value: ${formatCostOfRiskCoverageRatioCellValue(selectedValue, selectedCell.metric, state.selectedUnit)}.`;

  article.append(eyebrow, title, lead);
  article.append(createCostOfRiskAuditInfoSection("Selected scope", [
    `Reference date: ${formatReferenceQuarterLabel(coverageRatio.referenceDate)}`,
    `JST: ${state.selectedJst}`,
    `Perimeter: ${coverageRatio.filterLabel || "selected instruments and counterparties"}`,
    `${isCostOfRiskPerformanceStatusFilterValue(activeCostOfRiskFilters.stage) ? "Selected status" : "Selected stage"}: ${row.label}`
  ]));
  article.append(createCostOfRiskAuditInfoSection("Ratio components", [
    `Current numerator, allowances: ${formatMetricValue(row.currentNumerator, state.selectedUnit)}`,
    `Current denominator, gross carrying amount: ${formatMetricValue(row.currentDenominator, state.selectedUnit)}`,
    `Previous numerator, allowances: ${formatMetricValue(row.previousNumerator, state.selectedUnit)}`,
    `Previous denominator, gross carrying amount: ${formatMetricValue(row.previousDenominator, state.selectedUnit)}`
  ]));
  article.append(createCostOfRiskAuditInfoSection("Decomposition method", [
    "Coverage ratio = allowances for the stage divided by gross carrying amount for the same stage.",
    "The change in the ratio is decomposed with a two-factor Shapley method.",
    "The displayed numerator and denominator effects are the average of the numerator-first and denominator-first paths, so their sum equals the total ratio variation."
  ]));

  const hint = document.createElement("p");
  hint.className = "cost-of-risk-audit-intro-hint";
  hint.textContent = "Click another value in the upper panel to benchmark and explain that coverage-ratio component.";
  article.append(hint);

  replaceCostOfRiskAuditPanelContent(article);
}

function renderCostOfRiskCollateralRatioAuditPanel(collateralRatio, state, options = {}) {
  if (!elements.costOfRiskAuditPanel) return;

  if (renderCostOfRiskHelpPanel()) return;
  if (!options.allowDataAudit) return;

  if (isCostOfRiskAuditIntroVisible()) {
    renderCostOfRiskAuditPanelIntro();
    return;
  }

  const selectedCell = collateralRatio.selectedCell;
  const row = (collateralRatio.rows ?? []).find((candidate) => candidate.key === selectedCell?.stageKey);
  if (activeCostOfRiskTab !== "collateral-ratio" || !selectedCell || !row) {
    renderCostOfRiskAuditPanelIntro();
    return;
  }

  const selectedValue = row.cells?.[selectedCell.metric]?.value ?? null;
  const article = document.createElement("article");
  article.className = "cost-of-risk-audit-intro";

  const eyebrow = document.createElement("div");
  eyebrow.className = "cost-of-risk-audit-intro-eyebrow";
  eyebrow.textContent = "Collateral ratio audit trail";

  const title = document.createElement("h2");
  title.className = "cost-of-risk-audit-intro-title";
  title.textContent = `${getCostOfRiskCollateralRatioMetricLabel(selectedCell.metric)} - ${row.label}`;

  const lead = document.createElement("p");
  lead.className = "cost-of-risk-audit-intro-lead";
  lead.textContent = `Selected value: ${formatCostOfRiskCollateralRatioCellValue(selectedValue, selectedCell.metric, state.selectedUnit)}.`;

  article.append(eyebrow, title, lead);
  article.append(createCostOfRiskAuditInfoSection("Selected scope", [
    `Reference date: ${formatReferenceQuarterLabel(collateralRatio.referenceDate)}`,
    `JST: ${state.selectedJst}`,
    `Perimeter: ${collateralRatio.filterLabel || "selected instruments and counterparties"}`,
    `Selected status: ${row.label}`
  ]));
  article.append(createCostOfRiskAuditInfoSection("Ratio components", [
    `Current numerator, collateral received: ${formatMetricValue(row.currentNumerator, state.selectedUnit)}`,
    `Current denominator, gross carrying amount: ${formatMetricValue(row.currentDenominator, state.selectedUnit)}`,
    `Previous numerator, collateral received: ${formatMetricValue(row.previousNumerator, state.selectedUnit)}`,
    `Previous denominator, gross carrying amount: ${formatMetricValue(row.previousDenominator, state.selectedUnit)}`
  ]));
  article.append(createCostOfRiskAuditInfoSection("Decomposition method", [
    "Collateral ratio = maximum amount of collateral received that can be considered divided by gross carrying amount.",
    "F_18.00 reports collateral on performing and non-performing exposures, so Stage 1 / Stage 2 / Stage 3 detail is not used here.",
    "The change in the ratio is decomposed with the same two-factor Shapley method used in the exposure and coverage ratio tabs."
  ]));

  const hint = document.createElement("p");
  hint.className = "cost-of-risk-audit-intro-hint";
  hint.textContent = "Right-click another collateral value and choose calculation details to replace this audit trail.";
  article.append(hint);

  replaceCostOfRiskAuditPanelContent(article);
}

function renderCostOfRiskSummaryAuditPanel(summary, state, options = {}) {
  if (!elements.costOfRiskAuditPanel) return;

  if (renderCostOfRiskHelpPanel()) return;
  if (!options.allowDataAudit) return;

  const selectedCell = summary.selectedCell;
  const isCounterpartyCell = Boolean(selectedCell?.rowKey);
  const rowKey = isCounterpartyCell ? selectedCell?.rowKey : selectedCell?.stageKey;
  const rowSource = isCounterpartyCell ? summary.counterpartyRows : summary.rows;
  const row = (rowSource ?? []).find((candidate) => candidate.key === rowKey);
  if (activeCostOfRiskTab !== "summary" || !selectedCell || !row) {
    renderCostOfRiskAuditPanelIntro();
    return;
  }

  const cell = row.cells?.[selectedCell.metric] ?? {};
  const rawValue = selectedCell.kind === "mom" ? cell.mom : cell.value;
  const selectedValue = formatCostOfRiskSummaryAuditValue(cell, selectedCell, state.selectedUnit);
  const article = document.createElement("article");
  article.className = "cost-of-risk-audit-intro";

  const eyebrow = document.createElement("div");
  eyebrow.className = "cost-of-risk-audit-intro-eyebrow";
  eyebrow.textContent = "Summary calculation detail";

  const title = document.createElement("h2");
  title.className = "cost-of-risk-audit-intro-title";
  title.textContent = `${getCostOfRiskSummaryAuditMetricLabel(selectedCell)} - ${row.label}`;

  const lead = document.createElement("p");
  lead.className = "cost-of-risk-audit-intro-lead";
  lead.textContent = `Selected value: ${selectedValue}.`;

  article.append(eyebrow, title, lead);
  article.append(createCostOfRiskAuditInfoSection("Selected scope", [
    `Reference date: ${formatReferenceQuarterLabel(summary.referenceDate)}`,
    `JST: ${state.selectedJst}`,
    `Breakdown: ${isCounterpartyCell ? "counterparty" : "staging status"}`,
    `Selected row: ${row.label}`,
    `Perimeter: ${summary.filterLabel || "selected instruments, counterparties and status"}`
  ]));
  article.append(createCostOfRiskAuditInfoSection("Calculation", [
    getCostOfRiskSummaryAuditDefinition(selectedCell),
    `Raw selected amount: ${Number.isFinite(rawValue) ? formatMetricValue(rawValue, state.selectedUnit) : "-"}`
  ]));

  const hint = document.createElement("p");
  hint.className = "cost-of-risk-audit-intro-hint";
  hint.textContent = "Right-click another value and choose calculation details to replace this audit trail.";
  article.append(hint);

  replaceCostOfRiskAuditPanelContent(article);
}

function formatCostOfRiskSummaryAuditValue(cell, selectedCell, selectedUnit) {
  if (selectedCell.metric === "coverage" || selectedCell.metric === "collateral") {
    return selectedCell.kind === "mom"
      ? formatBasisPointsValue(cell.momRatioBasisPoints)
      : formatContributionPercentValue(cell.value);
  }
  if (selectedCell.kind === "ratio") {
    return formatContributionPercentValue(cell.ratio);
  }
  if (selectedCell.kind === "mom") {
    return formatCostOfRiskDisplayValue(cell.momRatioBasisPoints, "ratio", selectedUnit, true);
  }
  return formatMetricValue(cell.value, selectedUnit);
}

function getCostOfRiskSummaryAuditMetricLabel(selectedCell) {
  const metricLabels = {
    allowances: "Allowances",
    collateral: "Collateral",
    coverage: "Coverage",
    gca: "Gross carrying amount"
  };
  const kindLabel = selectedCell.kind === "mom"
    ? "variation"
    : selectedCell.kind === "ratio"
      ? "ratio"
      : "stock";
  return `${metricLabels[selectedCell.metric] ?? selectedCell.metric} ${kindLabel}`;
}

function getCostOfRiskSummaryAuditDefinition(selectedCell) {
  if (selectedCell.metric === "coverage" || selectedCell.metric === "collateral") {
    const label = selectedCell.metric === "collateral" ? "Collateral ratio" : "Coverage ratio";
    return selectedCell.kind === "mom"
      ? `Variation is the quarter-on-quarter change in the ${label.toLowerCase()}, expressed in basis points.`
      : `${label} equals ${selectedCell.metric === "collateral" ? "collateral received" : "allowances"} divided by gross carrying amount for the selected row.`;
  }
  if (selectedCell.kind === "ratio") {
    return "Exposure ratio equals gross carrying amount for the selected row divided by total gross carrying amount for the perimeter.";
  }
  if (selectedCell.kind === "mom") {
    return "Variation is the quarter-on-quarter change in the selected stock, expressed as a growth rate versus the previous quarter when relative mode is active.";
  }
  return "Stock value is read from F_18.00 for the selected row and perimeter.";
}

function createCostOfRiskAuditInfoSection(titleText, lines) {
  const section = document.createElement("section");
  section.className = "cost-of-risk-audit-intro-section";

  const title = document.createElement("h3");
  title.textContent = titleText;

  const body = document.createElement("p");
  body.textContent = lines.filter(Boolean).join("\n");

  section.append(title, body);
  return section;
}

function openCostOfRiskAuditSourceInExplorer(sourcePoint) {
  if (!openExplorerPoint({
    ...sourcePoint,
    returnTarget: {
      label: "Cost of risk",
      module: "cost-of-risk"
    }
  })) return;

  setActiveModule("explorer");
}

function renderCostOfRiskAuditPanelPlaceholder() {
  if (!elements.costOfRiskAuditPanel) return;
  const placeholder = document.createElement("div");
  placeholder.className = "cost-of-risk-audit-placeholder";
  placeholder.textContent = "Select a data point to display its audit trail.";
  replaceCostOfRiskAuditPanelContent(placeholder);
}

function showCostOfRiskCalculationDetailsMenu(event, action) {
  const sourceEvent = event?.browserEvent ?? event;
  if (!sourceEvent || typeof sourceEvent.preventDefault !== "function") return;
  showContextMenu([{
    label: "Show calculation details",
    action
  }], sourceEvent);
}

function showCostOfRiskCalculationDetails(scope, value) {
  activeCostOfRiskDataAuditRequested = true;
  hideCostOfRiskAuditIntro();
  clearCostOfRiskHelpTopic();

  if (scope === "movement" && value) {
    selectCostOfRiskXAxisFromWaterfall(value);
    return;
  }

  if (scope === "stage-transfer" && value) {
    selectCostOfRiskStageTransferFlow(value);
    return;
  }

  if (scope === "stage-ratio" && value) {
    selectCostOfRiskStageRatioCell(value);
    return;
  }

  if (scope === "coverage-ratio" && value) {
    selectCostOfRiskCoverageRatioCell(value);
    return;
  }

  if (scope === "collateral-ratio" && value) {
    selectCostOfRiskCollateralRatioCell(value);
    return;
  }

  if (scope === "summary-cell" && value) {
    const rowKey = getCostOfRiskSummaryCellRowKey(value);
    const counterpartyValue = getCostOfRiskCounterpartySummaryValue(rowKey);
    if (counterpartyValue) {
      selectCostOfRiskSummaryCounterpartyFilter(counterpartyValue, rowKey);
    } else {
      selectCostOfRiskStageSummaryCell(value, rowKey);
    }
    return;
  }

  if (scope === "cost-of-risk-total") {
    activeCostOfRiskDefinitionDriverCode = "";
    if (getLatestState()) rerenderApp(getLatestState());
    return;
  }

  if (scope === "cost-of-risk-driver" && value) {
    activeCostOfRiskDefinitionDriverCode = value;
    if (getLatestState()) rerenderApp(getLatestState());
  }
}

function consumeCostOfRiskDataAuditRequest() {
  const requested = activeCostOfRiskDataAuditRequested;
  activeCostOfRiskDataAuditRequested = false;
  return requested;
}

function isCostOfRiskAuditIntroVisible() {
  return activeCostOfRiskAuditIntroTab === activeCostOfRiskTab
    && Boolean(getCostOfRiskAuditPanelIntroContent(activeCostOfRiskTab));
}

function isCostOfRiskHelpVisible() {
  return Boolean(getCostOfRiskHelpPanelContent(activeCostOfRiskHelpTopic));
}

function hideCostOfRiskAuditIntro() {
  activeCostOfRiskAuditIntroTab = "";
}

function clearCostOfRiskHelpTopic() {
  setCostOfRiskHelpTopic("");
}

function setCostOfRiskHelpTopic(topic) {
  const nextTopic = topic || "";
  if (nextTopic) activeCostOfRiskDataAuditRequested = false;
  activeCostOfRiskHelpTopic = nextTopic;
  recordCostOfRiskHelpTopic(nextTopic);
}

function recordCostOfRiskHelpTopic(topic) {
  if (costOfRiskHelpTopicHistory[costOfRiskHelpTopicHistoryIndex] === topic) return;
  costOfRiskHelpTopicHistory = costOfRiskHelpTopicHistory.slice(0, costOfRiskHelpTopicHistoryIndex + 1);
  costOfRiskHelpTopicHistory.push(topic);
  costOfRiskHelpTopicHistoryIndex = costOfRiskHelpTopicHistory.length - 1;
}

function navigateCostOfRiskHelpTopicHistory(delta) {
  const nextIndex = costOfRiskHelpTopicHistoryIndex + delta;
  if (nextIndex < 0 || nextIndex >= costOfRiskHelpTopicHistory.length) return;
  costOfRiskHelpTopicHistoryIndex = nextIndex;
  activeCostOfRiskHelpTopic = costOfRiskHelpTopicHistory[costOfRiskHelpTopicHistoryIndex] || "";
  if (!renderCostOfRiskHelpPanel()) renderCostOfRiskAuditPanelIntro();
}

function replaceCostOfRiskAuditPanelContent(...nodes) {
  if (!elements.costOfRiskAuditPanel) return;
  elements.costOfRiskAuditPanel.replaceChildren(createCostOfRiskContextPanelNavigation(), ...nodes);
}

function createCostOfRiskContextPanelNavigation() {
  const nav = document.createElement("nav");
  nav.className = "cost-of-risk-context-panel-nav";
  nav.setAttribute("aria-label", "Context panel navigation");

  const previous = createCostOfRiskContextPanelNavigationButton("previous", "‹", "Previous context panel", () => {
    navigateCostOfRiskHelpTopicHistory(-1);
  });
  previous.disabled = costOfRiskHelpTopicHistoryIndex <= 0;

  const next = createCostOfRiskContextPanelNavigationButton("next", "›", "Next context panel", () => {
    navigateCostOfRiskHelpTopicHistory(1);
  });
  next.disabled = costOfRiskHelpTopicHistoryIndex >= costOfRiskHelpTopicHistory.length - 1;

  nav.append(previous, next);
  return nav;
}

function createCostOfRiskContextPanelNavigationButton(direction, label, ariaLabel, onClick) {
  const button = document.createElement("button");
  button.className = `cost-of-risk-context-panel-nav-button cost-of-risk-context-panel-nav-button--${direction}`;
  button.type = "button";
  button.textContent = label;
  button.setAttribute("aria-label", ariaLabel);
  button.addEventListener("click", onClick);
  return button;
}

function renderCostOfRiskAuditPanelIntro() {
  if (!elements.costOfRiskAuditPanel) return;

  if (renderCostOfRiskHelpPanel()) return;

  const content = getCostOfRiskAuditPanelIntroContent(activeCostOfRiskTab);
  if (!content) {
    renderCostOfRiskAuditPanelPlaceholder();
    return;
  }

  const intro = document.createElement("article");
  intro.className = "cost-of-risk-audit-intro";

  const eyebrow = document.createElement("div");
  eyebrow.className = "cost-of-risk-audit-intro-eyebrow";
  eyebrow.textContent = content.eyebrow;

  const title = document.createElement("h2");
  title.className = "cost-of-risk-audit-intro-title";
  title.textContent = content.title;

  const summary = document.createElement("p");
  summary.className = "cost-of-risk-audit-intro-lead";
  summary.textContent = content.lead;

  intro.append(eyebrow, title, summary);

  if (content.control?.type === "smoothing") {
    intro.append(renderCostOfRiskSmoothingHelpControl(content.control.windowSize));
  }

  content.sections.forEach((section) => {
    const block = document.createElement("section");
    block.className = "cost-of-risk-audit-intro-section";

    const heading = document.createElement("h3");
    heading.textContent = section.title;

    const body = document.createElement("p");
    body.textContent = section.body;

    block.append(heading, body);
    intro.append(block);
  });

  const hint = document.createElement("p");
  hint.className = "cost-of-risk-audit-intro-hint";
  hint.textContent = content.hint;
  intro.append(hint);

  replaceCostOfRiskAuditPanelContent(intro);
}

function renderCostOfRiskHelpPanel() {
  if (!elements.costOfRiskAuditPanel) return false;

  if (activeCostOfRiskHelpTopic === "reference-date") {
    renderCostOfRiskReferenceDateSelectionPanel();
    return true;
  }

  if (activeCostOfRiskHelpTopic === "peer-selection") {
    renderCostOfRiskPeerSelectionPanel();
    return true;
  }

  if (activeCostOfRiskHelpTopic === "dataset-info") {
    renderCostOfRiskDatasetInfoPanel();
    return true;
  }

  if (activeCostOfRiskHelpTopic.startsWith(COST_OF_RISK_FILTER_SELECTION_TOPIC_PREFIX)) {
    renderCostOfRiskFilterSelectionPanel(
      activeCostOfRiskHelpTopic.slice(COST_OF_RISK_FILTER_SELECTION_TOPIC_PREFIX.length)
    );
    return true;
  }

  const content = getCostOfRiskHelpPanelContent(activeCostOfRiskHelpTopic);
  if (!content) return false;

  renderCostOfRiskPanelArticle(content);
  return true;
}

function renderCostOfRiskPanelArticle(content) {
  const intro = document.createElement("article");
  intro.className = "cost-of-risk-audit-intro";

  const eyebrow = document.createElement("div");
  eyebrow.className = "cost-of-risk-audit-intro-eyebrow";
  eyebrow.textContent = content.eyebrow;

  const title = document.createElement("h2");
  title.className = "cost-of-risk-audit-intro-title";
  title.textContent = content.title;

  const summary = document.createElement("p");
  summary.className = "cost-of-risk-audit-intro-lead";
  summary.textContent = content.lead;

  intro.append(eyebrow, title, summary);

  if (content.control?.type === "smoothing") {
    intro.append(renderCostOfRiskSmoothingHelpControl(content.control.windowSize));
  }

  content.sections.forEach((section) => {
    const block = document.createElement("section");
    block.className = "cost-of-risk-audit-intro-section";

    const heading = document.createElement("h3");
    heading.textContent = section.title;

    const body = document.createElement("p");
    body.textContent = section.body;

    block.append(heading, body);
    intro.append(block);
  });

  const hint = document.createElement("p");
  hint.className = "cost-of-risk-audit-intro-hint";
  hint.textContent = content.hint;
  intro.append(hint);

  replaceCostOfRiskAuditPanelContent(intro);
}

function renderCostOfRiskReferenceDateSelectionPanel() {
  const state = getLatestState();
  const referenceColumns = getReferenceColumns(state?.columns ?? []);

  const intro = document.createElement("article");
  intro.className = "cost-of-risk-audit-intro cost-of-risk-reference-date-panel";

  const eyebrow = document.createElement("div");
  eyebrow.className = "cost-of-risk-audit-intro-eyebrow";
  eyebrow.textContent = "Reference date";

  const title = document.createElement("h2");
  title.className = "cost-of-risk-audit-intro-title";
  title.textContent = "Reference quarter";

  const summary = document.createElement("p");
  summary.className = "cost-of-risk-audit-intro-lead";
  summary.textContent = referenceColumns.length > 0
    ? "Choose the reporting quarter used by the upper view. This is synchronized with point selection on the temporal chart."
    : "No reference date is available in the loaded dataset.";

  intro.append(eyebrow, title, summary);

  if (referenceColumns.length > 0) {
    const table = document.createElement("table");
    table.className = "cost-of-risk-filter-selection-table cost-of-risk-reference-date-table";
    const tbody = document.createElement("tbody");

    [...referenceColumns].reverse().forEach((column) => {
      const isActive = column.label === activeCostOfRiskReferenceDate;
      const row = document.createElement("tr");
      row.className = "cost-of-risk-filter-selection-row";
      row.classList.toggle("is-active", isActive);

      const cell = document.createElement("td");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "cost-of-risk-filter-selection-option cost-of-risk-reference-date-option";
      button.setAttribute("role", "option");
      button.setAttribute("aria-selected", String(isActive));
      button.addEventListener("click", () => selectCostOfRiskReferenceDate(column.label));

      const label = document.createElement("span");
      label.className = "cost-of-risk-filter-selection-option-label";
      label.textContent = formatReferenceQuarterLabel(column.label);
      button.append(label);
      cell.append(button);
      row.append(cell);
      tbody.append(row);
    });

    table.append(tbody);
    intro.append(table);
  }

  const hint = document.createElement("p");
  hint.className = "cost-of-risk-audit-intro-hint";
  hint.textContent = "You can also change the same reference quarter by clicking a point in any temporal chart.";
  intro.append(hint);

  replaceCostOfRiskAuditPanelContent(intro);
}

function renderCostOfRiskPeerSelectionPanel() {
  const state = costOfRiskPeerSelectionActions?.getState?.() ?? getLatestState();
  const jstOptions = state?.jstOptions ?? [];
  const selectedPeers = new Set((state?.peerJstCodes ?? jstOptions) ?? []);
  const selectedCount = jstOptions.filter((jstCode) => selectedPeers.has(jstCode)).length;

  const intro = document.createElement("article");
  intro.className = "cost-of-risk-audit-intro cost-of-risk-peer-selection-panel";

  const eyebrow = document.createElement("div");
  eyebrow.className = "cost-of-risk-audit-intro-eyebrow";
  eyebrow.textContent = "Benchmark peers";

  const title = document.createElement("h2");
  title.className = "cost-of-risk-audit-intro-title";
  title.textContent = "Peers";

  const summary = document.createElement("p");
  summary.className = "cost-of-risk-audit-intro-lead";
  summary.textContent = jstOptions.length > 0
    ? `${selectedCount} of ${jstOptions.length} JST selected for benchmark views. Changes are applied immediately.`
    : "Load a dataset to choose the JST included in benchmark views.";

  intro.append(eyebrow, title, summary);

  if (jstOptions.length > 0) {
    intro.append(renderCostOfRiskPeerDisplayControl(state));

    const actions = document.createElement("div");
    actions.className = "cost-of-risk-peer-selection-actions";
    actions.append(
      createCostOfRiskPeerSelectionButton("Select all", () => updateCostOfRiskPeerSelection(jstOptions)),
      createCostOfRiskPeerSelectionButton("Deselect all", () => updateCostOfRiskPeerSelection([]))
    );

    const list = document.createElement("div");
    list.className = "cost-of-risk-peer-selection-list";
    jstOptions.forEach((jstCode) => {
      const row = document.createElement("label");
      row.className = "cost-of-risk-peer-selection-row";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = jstCode;
      checkbox.checked = selectedPeers.has(jstCode);
      checkbox.addEventListener("change", (event) => {
        const nextPeers = new Set(selectedPeers);
        if (event.target.checked) {
          nextPeers.add(jstCode);
        } else {
          nextPeers.delete(jstCode);
        }
        updateCostOfRiskPeerSelection([...nextPeers]);
      });

      const label = document.createElement("span");
      label.textContent = jstCode;
      row.append(checkbox, label);
      list.append(row);
    });

    intro.append(actions, list);
  }

  intro.append(createCostOfRiskAuditInfoSection("How it is used", [
    "The selected JST always remains visible in benchmark charts.",
    "The peers selected here define the comparison population for explicit peer curves and anonymized percentile distributions.",
    "Leaving no peer selected means the benchmark population is empty until peers are selected again."
  ]));

  const hint = document.createElement("p");
  hint.className = "cost-of-risk-audit-intro-hint";
  hint.textContent = "Use Select all or individual checkboxes to adjust the peer set; charts refresh as soon as the selection changes.";
  intro.append(hint);

  replaceCostOfRiskAuditPanelContent(intro);
}

function renderCostOfRiskPeerDisplayControl(state) {
  const activeMode = state?.peerDisplayMode === "anonymised" ? "anonymised" : "explicit";
  const block = document.createElement("section");
  block.className = "cost-of-risk-peer-display-panel";

  const label = document.createElement("div");
  label.className = "cost-of-risk-peer-display-label";
  label.textContent = "Display";

  const group = document.createElement("div");
  group.className = "cost-of-risk-peer-display-group";
  group.setAttribute("role", "radiogroup");
  group.setAttribute("aria-label", "Peer display mode");
  group.append(
    createCostOfRiskPeerDisplayOption("Explicit", "explicit", activeMode),
    createCostOfRiskPeerDisplayOption("Anonymized", "anonymised", activeMode)
  );

  block.append(label, group);
  return block;
}

function createCostOfRiskPeerDisplayOption(label, mode, activeMode) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "cost-of-risk-peer-display-option";
  button.classList.toggle("is-active", mode === activeMode);
  button.dataset.peerDisplayMode = mode;
  button.setAttribute("role", "radio");
  button.setAttribute("aria-checked", String(mode === activeMode));
  button.textContent = label;
  button.addEventListener("click", () => updateCostOfRiskPeerDisplayMode(mode));
  return button;
}

function updateCostOfRiskPeerDisplayMode(peerDisplayMode) {
  if (!costOfRiskPeerSelectionActions?.updatePeerDisplayMode) return;
  costOfRiskPeerSelectionActions.updatePeerDisplayMode(peerDisplayMode);
}

function createCostOfRiskPeerSelectionButton(label, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "cost-of-risk-peer-selection-button";
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
}

function updateCostOfRiskPeerSelection(peerJstCodes) {
  if (!costOfRiskPeerSelectionActions?.updatePeerJstCodes) return;
  costOfRiskPeerSelectionActions.updatePeerJstCodes(peerJstCodes);
}

const COST_OF_RISK_FILTER_SELECTION_META = {
  balanceScope: { allLabel: "In-balance", filterKey: "balanceScope", label: "Perimeter", optionsKey: "balanceScopes" },
  counterparty: { allLabel: "All Counterparties", filterKey: "counterparty", label: "Counterparty", optionsKey: "counterparties" },
  instrument: { allLabel: "All Instruments", filterKey: "asset", label: "Instruments", optionsKey: "assets" },
  stage: { allLabel: "All Stage", filterKey: "stage", label: "Stage", optionsKey: "stages" }
};
const COST_OF_RISK_FINE_COUNTERPARTY_UNSUPPORTED_TABS = new Set([
  "analysis",
  "contributions",
  "cost-of-risk",
  "f2-vs-f12",
  "stage-reconciliation",
  "stage-transfers"
]);

function renderCostOfRiskFilterSelectionPanel(kind) {
  if (kind === "definition") {
    renderCostOfRiskDefinitionSelectionPanel();
    return;
  }

  if (kind === "stage") {
    renderCostOfRiskStageSelectionPanel();
    return;
  }

  if (kind === "balanceScope") {
    renderCostOfRiskBalanceScopeSelectionPanel();
    return;
  }

  const meta = COST_OF_RISK_FILTER_SELECTION_META[kind];
  if (!meta) {
    renderCostOfRiskAuditPanelPlaceholder();
    return;
  }

  const options = latestCostOfRiskFilterOptions?.[meta.optionsKey] ?? [];
  const activeValue = activeCostOfRiskFilters[meta.filterKey];

  const intro = document.createElement("article");
  intro.className = "cost-of-risk-audit-intro cost-of-risk-filter-selection-panel";

  const eyebrow = document.createElement("div");
  eyebrow.className = "cost-of-risk-audit-intro-eyebrow";
  eyebrow.textContent = "Filter";

  const title = document.createElement("h2");
  title.className = "cost-of-risk-audit-intro-title";
  title.textContent = meta.label;

  const summary = document.createElement("p");
  summary.className = "cost-of-risk-audit-intro-lead";
  summary.textContent = `Choose the ${meta.label.toLowerCase()} perimeter applied to this view. The change applies immediately.`;

  intro.append(eyebrow, title, summary);

  const table = document.createElement("table");
  table.className = "cost-of-risk-filter-selection-table";
  const tbody = document.createElement("tbody");

  const isAllActive = !activeValue || activeValue === COST_OF_RISK_FILTER_ALL;
  tbody.append(createCostOfRiskFilterSelectionRow(meta.allLabel, isAllActive, () => {
    applyCostOfRiskFilterSelection(meta.filterKey, COST_OF_RISK_FILTER_ALL);
  }));
  options.filter((option) => option.value !== COST_OF_RISK_FILTER_ALL).forEach((option) => {
    const optionState = getCostOfRiskFilterSelectionOptionState(kind, option);
    tbody.append(createCostOfRiskFilterSelectionRow(optionState.label, option.value === activeValue, () => {
      applyCostOfRiskFilterSelection(meta.filterKey, option.value);
    }, optionState));
  });

  table.append(tbody);
  intro.append(table);

  const hint = document.createElement("p");
  hint.className = "cost-of-risk-audit-intro-hint";
  hint.textContent = "Selecting a row updates the perimeter across every chart on this tab right away.";
  intro.append(hint);

  replaceCostOfRiskAuditPanelContent(intro);
}

function renderCostOfRiskBalanceScopeSelectionPanel() {
  const meta = COST_OF_RISK_FILTER_SELECTION_META.balanceScope;
  const options = latestCostOfRiskFilterOptions?.[meta.optionsKey] ?? [];
  const activeValue = activeCostOfRiskFilters.balanceScope || COST_OF_RISK_BALANCE_SCOPE_IN_BALANCE;

  const intro = document.createElement("article");
  intro.className = "cost-of-risk-audit-intro cost-of-risk-filter-selection-panel";

  const eyebrow = document.createElement("div");
  eyebrow.className = "cost-of-risk-audit-intro-eyebrow";
  eyebrow.textContent = "Filter";

  const title = document.createElement("h2");
  title.className = "cost-of-risk-audit-intro-title";
  title.textContent = "Perimeter";

  const summary = document.createElement("p");
  summary.className = "cost-of-risk-audit-intro-lead";
  summary.textContent = "Choose whether the view focuses on in-balance sheet exposures, off-balance sheet commitments and guarantees, or both where FINREP provides that detail.";
  intro.append(eyebrow, title, summary);

  const table = document.createElement("table");
  table.className = "cost-of-risk-filter-selection-table";
  const tbody = document.createElement("tbody");
  options.forEach((option) => {
    tbody.append(createCostOfRiskFilterSelectionRow(option.label, option.value === activeValue, () => {
      applyCostOfRiskFilterSelection("balanceScope", option.value);
    }));
  });
  table.append(tbody);
  intro.append(table);

  const hint = document.createElement("p");
  hint.className = "cost-of-risk-audit-intro-hint";
  hint.textContent = "In-balance is the default perimeter. Some tabs cannot reproduce the same granularity for off-balance exposures.";
  intro.append(hint);

  replaceCostOfRiskAuditPanelContent(intro);
}

function renderCostOfRiskStageSelectionPanel() {
  const meta = COST_OF_RISK_FILTER_SELECTION_META.stage;
  const options = latestCostOfRiskFilterOptions?.[meta.optionsKey] ?? [];
  const activeValue = activeCostOfRiskFilters[meta.filterKey];

  const intro = document.createElement("article");
  intro.className = "cost-of-risk-audit-intro cost-of-risk-filter-selection-panel";

  const eyebrow = document.createElement("div");
  eyebrow.className = "cost-of-risk-audit-intro-eyebrow";
  eyebrow.textContent = "Filter";

  const title = document.createElement("h2");
  title.className = "cost-of-risk-audit-intro-title";
  title.textContent = meta.label;

  const summary = document.createElement("p");
  summary.className = "cost-of-risk-audit-intro-lead";
  summary.textContent = "Choose either an IFRS stage perimeter or the F_18.00 performing / non-performing breakdown. The change applies immediately.";

  intro.append(eyebrow, title, summary);

  const allTable = document.createElement("table");
  allTable.className = "cost-of-risk-filter-selection-table";
  const allBody = document.createElement("tbody");
  const isAllActive = !activeValue || activeValue === COST_OF_RISK_FILTER_ALL;
  allBody.append(createCostOfRiskFilterSelectionRow(meta.allLabel, isAllActive, () => {
    applyCostOfRiskFilterSelection(meta.filterKey, COST_OF_RISK_FILTER_ALL);
  }));
  allTable.append(allBody);
  intro.append(allTable);

  intro.append(createCostOfRiskStageSelectionGroup("Staging status", options.filter((option) => isCostOfRiskIfrsStageFilterValue(option.value)), activeValue));
  intro.append(createCostOfRiskStageSelectionGroup("Performance status", options.filter((option) => isCostOfRiskPerformanceStatusFilterValue(option.value)), activeValue));

  const hint = document.createElement("p");
  hint.className = "cost-of-risk-audit-intro-hint";
  hint.textContent = "The performance status breakdown is an alternative F_18.00 view, not an additional stage.";
  intro.append(hint);

  replaceCostOfRiskAuditPanelContent(intro);
}

function createCostOfRiskStageSelectionGroup(titleText, options, activeValue) {
  const group = document.createElement("section");
  group.className = "cost-of-risk-filter-selection-group";

  const title = document.createElement("h3");
  title.className = "cost-of-risk-filter-selection-group-title";
  title.textContent = titleText;
  group.append(title);

  const table = document.createElement("table");
  table.className = "cost-of-risk-filter-selection-table";
  const tbody = document.createElement("tbody");
  options.forEach((option) => {
    tbody.append(createCostOfRiskFilterSelectionRow(option.label, option.value === activeValue, () => {
      applyCostOfRiskFilterSelection("stage", option.value);
    }));
  });
  table.append(tbody);
  group.append(table);
  return group;
}

function isCostOfRiskPerformanceStatusFilterValue(value) {
  return value === "Performing" || value === "Non-performing";
}

function isCostOfRiskIfrsStageFilterValue(value) {
  return ["Stage 1", "Stage 2", "Stage 3", "POCI"].includes(value);
}

function getCostOfRiskFilterSelectionOptionState(kind, option) {
  if (kind !== "counterparty") {
    return { disabled: false, indent: false, label: option.label };
  }

  const parent = getFilterParentValue("counterparty", option.value);
  const isFineCounterparty = parent !== COST_OF_RISK_FILTER_ALL;
  const isDisabled = isFineCounterparty && COST_OF_RISK_FINE_COUNTERPARTY_UNSUPPORTED_TABS.has(activeCostOfRiskTab);
  return {
    disabled: isDisabled,
    disabledReason: isDisabled ? "This counterparty breakdown is not available in this tab." : "",
    indent: isFineCounterparty,
    label: formatCostOfRiskCounterpartySelectionLabel(option.label)
  };
}

function formatCostOfRiskCounterpartySelectionLabel(label) {
  return String(label ?? "")
    .replace(/^o\/w\s+/i, "")
    .replace(/^of which[:\s]+/i, "")
    .trim();
}

function createCostOfRiskFilterSelectionRow(label, isActive, onSelect, options = {}) {
  const row = document.createElement("tr");
  row.className = "cost-of-risk-filter-selection-row";
  row.classList.toggle("is-active", isActive);
  row.classList.toggle("is-disabled", Boolean(options.disabled));
  row.classList.toggle("is-indented", Boolean(options.indent));

  const cell = document.createElement("td");
  if (options.disabledReason) {
    row.title = options.disabledReason;
    cell.title = options.disabledReason;
  }
  const button = document.createElement("button");
  button.type = "button";
  button.className = "cost-of-risk-filter-selection-option";
  button.setAttribute("role", "option");
  button.setAttribute("aria-selected", String(isActive));
  if (options.disabled) {
    button.setAttribute("aria-disabled", "true");
    button.tabIndex = -1;
    if (options.disabledReason) button.title = options.disabledReason;
  }
  const labelNode = document.createElement("span");
  labelNode.className = "cost-of-risk-filter-selection-option-label";
  labelNode.textContent = label;
  button.append(labelNode);
  if (!options.disabled) button.addEventListener("click", onSelect);
  cell.append(button);
  row.append(cell);
  return row;
}

function applyCostOfRiskFilterSelection(filterKey, value) {
  if (filterKey === "stage") {
    setActiveCostOfRiskStageFilter(value);
  } else {
    activeCostOfRiskFilters[filterKey] = value;
    if (filterKey === "asset" && elements.costOfRiskAsset) elements.costOfRiskAsset.value = value;
    if (filterKey === "counterparty" && elements.costOfRiskCounterparty) elements.costOfRiskCounterparty.value = value;
  }
  if (getLatestState()) rerenderApp(getLatestState());
}

function renderCostOfRiskDefinitionSelectionPanel() {
  const intro = document.createElement("article");
  intro.className = "cost-of-risk-audit-intro cost-of-risk-filter-selection-panel";

  const eyebrow = document.createElement("div");
  eyebrow.className = "cost-of-risk-audit-intro-eyebrow";
  eyebrow.textContent = "Filter";

  const title = document.createElement("h2");
  title.className = "cost-of-risk-audit-intro-title";
  title.textContent = "Cost of risk definition";

  const summary = document.createElement("p");
  summary.className = "cost-of-risk-audit-intro-lead";
  summary.textContent = "Choose the calculation method used for the cost of risk ratio. The change applies immediately.";

  intro.append(eyebrow, title, summary);

  const table = document.createElement("table");
  table.className = "cost-of-risk-filter-selection-table cost-of-risk-filter-selection-table--definition";
  const tbody = document.createElement("tbody");

  COST_OF_RISK_DEFINITION_OPTIONS.forEach((definition) => {
    const isActive = definition.id === activeCostOfRiskDefinitionId;
    const row = document.createElement("tr");
    row.className = "cost-of-risk-filter-selection-row";
    row.classList.toggle("is-active", isActive);

    const cell = document.createElement("td");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "cost-of-risk-filter-selection-option cost-of-risk-filter-selection-option--definition";
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", String(isActive));
    button.title = definition.description;

    const optionTitle = document.createElement("span");
    optionTitle.className = "cost-of-risk-filter-selection-option-title";
    optionTitle.textContent = definition.label;
    const optionDescription = document.createElement("span");
    optionDescription.className = "cost-of-risk-filter-selection-option-description";
    optionDescription.textContent = definition.description;
    const optionSource = document.createElement("span");
    optionSource.className = "cost-of-risk-filter-selection-option-source";
    optionSource.textContent = definition.source;
    button.append(optionTitle, optionDescription, optionSource);

    button.addEventListener("click", () => {
      activeCostOfRiskDefinitionId = definition.id;
      activeCostOfRiskDefinitionDriverCode = "";
      if (getLatestState()) rerenderApp(getLatestState());
    });

    cell.append(button);
    row.append(cell);
    tbody.append(row);
  });

  table.append(tbody);
  intro.append(table);

  const hint = document.createElement("p");
  hint.className = "cost-of-risk-audit-intro-hint";
  hint.textContent = "Selecting a definition updates the ratio, driver breakdown, and audit trail right away.";
  intro.append(hint);

  replaceCostOfRiskAuditPanelContent(intro);
}

function renderCostOfRiskDatasetInfoPanel() {
  const state = costOfRiskDatasetInfoActions?.getState?.() ?? getLatestState();
  const activeDataset = state?.datasets?.find((dataset) => dataset.id === state.activeDatasetId) ?? null;
  const extractionDate = formatCostOfRiskExtractionDate(state?.extractionTimestamp);

  const intro = document.createElement("article");
  intro.className = "cost-of-risk-audit-intro";

  const eyebrow = document.createElement("div");
  eyebrow.className = "cost-of-risk-audit-intro-eyebrow";
  eyebrow.textContent = "Dataset metadata";

  const title = document.createElement("h2");
  title.className = "cost-of-risk-audit-intro-title";
  title.textContent = "Dataset";

  const summary = document.createElement("p");
  summary.className = "cost-of-risk-audit-intro-lead";
  summary.textContent = activeDataset
    ? "This panel summarises the dataset currently loaded in the application."
    : "No dataset is currently loaded.";

  intro.append(eyebrow, title, summary);
  intro.append(createCostOfRiskAuditInfoSection("Loaded file", [
    activeDataset?.label || state?.fileName || "No dataset",
    `Source: ${formatCostOfRiskDatasetSource(activeDataset?.source || state?.source)}`,
    `Rows: ${Number(state?.rows?.length ?? 0).toLocaleString("fr-FR")}`,
    `Columns: ${Number(state?.columns?.length ?? 0).toLocaleString("fr-FR")}`
  ]));
  intro.append(createCostOfRiskAuditInfoSection("Extraction", [
    extractionDate
      ? `Extraction date: ${extractionDate}`
      : "Extraction date not available",
    state?.extractionTimestamp ? `Raw timestamp: ${state.extractionTimestamp}` : ""
  ]));

  const hint = document.createElement("p");
  hint.className = "cost-of-risk-audit-intro-hint";
  hint.textContent = "Use the Dataset dropdown in the header to switch to another loaded dataset or add a new one.";
  intro.append(hint);

  replaceCostOfRiskAuditPanelContent(intro);
}

function formatCostOfRiskDatasetSource(source) {
  if (source === "embedded") return "portable embedded dataset";
  if (source === "local") return "local file";
  if (source === "session") return "session file";
  return source || "not available";
}

function formatCostOfRiskExtractionDate(extractionTimestamp) {
  const value = String(extractionTimestamp ?? "").trim();
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    return new Intl.DateTimeFormat("fr-FR", { dateStyle: "short" }).format(date);
  }
  return value;
}

function renderCostOfRiskSmoothingHelpControl(windowSize) {
  const normalizedWindow = clampCostOfRiskSmoothingWindow(windowSize);
  const control = document.createElement("div");
  control.className = "cost-of-risk-help-smoothing-control";

  const label = document.createElement("label");
  label.className = "cost-of-risk-help-smoothing-label";
  label.htmlFor = "cost-of-risk-help-smoothing-slider";
  label.textContent = "Smoothing window";

  const value = document.createElement("output");
  value.className = "cost-of-risk-help-smoothing-value";
  value.htmlFor = "cost-of-risk-help-smoothing-slider";
  value.textContent = formatCostOfRiskSmoothingLabel(normalizedWindow);

  const slider = document.createElement("input");
  slider.id = "cost-of-risk-help-smoothing-slider";
  slider.type = "range";
  slider.min = "1";
  slider.max = "4";
  slider.step = "1";
  slider.value = String(normalizedWindow);
  slider.setAttribute("aria-label", "Smoothing window");
  const applySliderWindow = (nextWindow) => {
    const normalizedNextWindow = clampCostOfRiskSmoothingWindow(nextWindow);
    slider.value = String(normalizedNextWindow);
    value.textContent = formatCostOfRiskSmoothingLabel(normalizedNextWindow);
    updateCostOfRiskSmoothingWindow(normalizedNextWindow);
  };
  slider.addEventListener("input", (event) => {
    const nextWindow = clampCostOfRiskSmoothingWindow(event.target.value);
    value.textContent = formatCostOfRiskSmoothingLabel(nextWindow);
    updateCostOfRiskSmoothingWindow(nextWindow);
  });
  slider.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const rect = slider.getBoundingClientRect();
    let lastWindow = Number(slider.value);
    const getWindowFromClientX = (clientX) => {
      const ratio = rect.width > 0 ? (clientX - rect.left) / rect.width : 0;
      return Math.max(1, Math.min(4, Math.round(1 + ratio * 3)));
    };
    const applyClientX = (clientX) => {
      const nextWindow = getWindowFromClientX(clientX);
      if (nextWindow === lastWindow) return;
      lastWindow = nextWindow;
      applySliderWindow(nextWindow);
    };
    const handlePointerMove = (moveEvent) => {
      moveEvent.preventDefault();
      applyClientX(moveEvent.clientX);
    };
    const handlePointerUp = (upEvent) => {
      upEvent.preventDefault();
      applyClientX(upEvent.clientX);
      document.removeEventListener("pointermove", handlePointerMove, true);
      document.removeEventListener("pointerup", handlePointerUp, true);
      document.removeEventListener("pointercancel", handlePointerUp, true);
    };
    document.addEventListener("pointermove", handlePointerMove, true);
    document.addEventListener("pointerup", handlePointerUp, true);
    document.addEventListener("pointercancel", handlePointerUp, true);
    applyClientX(event.clientX);
  });

  const header = document.createElement("div");
  header.className = "cost-of-risk-help-smoothing-header";
  header.append(label, value);
  control.append(header, slider);

  return control;
}

function getCostOfRiskDisplayModeHelpTopic(scope, mode) {
  const normalizedMode = mode === "ratio" ? "relative" : "absolute";
  if (scope === "stageTransfer") return `stage-transfer-${normalizedMode}`;
  if (scope === "summaryVariation") return `summary-${normalizedMode}`;
  if (scope === "costOfRiskDefinition") return `cost-risk-${normalizedMode}`;
  return `movement-${normalizedMode}`;
}

function getCostOfRiskHelpPanelContent(topic) {
  if (!topic) return null;

  if (topic.startsWith("cost-risk-definition:")) {
    const definitionId = topic.split(":")[1] || activeCostOfRiskDefinitionId;
    const definition = COST_OF_RISK_DEFINITION_OPTIONS.find((option) => option.id === definitionId)
      ?? COST_OF_RISK_DEFINITION_OPTIONS[0];
    const isF02Definition = definition.id === "f02-impairment";
    return {
      eyebrow: "Cost of risk method",
      title: definition.label,
      lead: definition.description,
      sections: [
        {
          title: "Regulatory source",
          body: definition.source
        },
        {
          title: "Selected components",
          body: (definition.components ?? []).join("\n")
        },
        {
          title: "What it represents",
          body: isF02Definition
            ? "This method reads cost of risk directly from the FINREP income statement. It is close to the reported P&L impairment measure, but it does not expose the underlying allowance movement components."
            : "This method reconstructs cost of risk from selected F_12.01 movements. It is designed for analysis because the same definition can be decomposed by component, stage, counterparty and instrument where FINREP provides the detail."
        }
      ],
      hint: "Changing the method immediately recomputes the selected value, the drivers and the time series."
    };
  }

  if (topic.startsWith("smoothing:")) {
    const windowSize = Math.max(1, Math.min(4, Number(topic.split(":")[1]) || 1));
    return {
      eyebrow: "Time series option",
      title: windowSize > 1 ? `Smoothing ${windowSize}Q` : "Raw figures",
      lead: windowSize > 1
        ? `The time chart is displayed as a rolling ${windowSize}-quarter average.`
        : "The time chart is displayed without smoothing.",
      sections: [
        {
          title: "How it is calculated",
          body: windowSize > 1
            ? `For each point, the chart averages the current quarter and up to ${windowSize - 1} preceding quarters when they are available. This reduces short-term volatility while preserving the direction of the selected series.`
            : "Each point corresponds to the reported quarterly value, without any rolling average."
        },
        {
          title: "Scope",
          body: "Smoothing affects the temporal chart only. It does not change the underlying FINREP data or the selected perimeter."
        }
      ],
      control: {
        type: "smoothing",
        windowSize
      },
      hint: windowSize > 1
        ? "The chart badge shows the active smoothing window. Use its cross to return to raw figures."
        : "Move the slider to apply smoothing to the temporal chart."
    };
  }

  const content = {
    "reference-date": {
      eyebrow: "Reference date",
      title: "Reference Date",
      lead: "The reference date is the quarter currently used to populate the upper view and the audit trail.",
      sections: [
        {
          title: "What it controls",
          body: "Tables, flow diagrams and selected values use this quarter as their current observation date. When a metric is a variation, the calculation may also use the previous quarter where the methodology requires it."
        },
        {
          title: "How to change it",
          body: "Click any point on the temporal chart in the lower part of the tab to set a new reference quarter. You can change it as often as needed while exploring the same perimeter."
        }
      ],
      hint: "The date chip always shows the active reference quarter."
    },
    "stage-transfer-absolute": {
      eyebrow: "Transfer display",
      title: "Absolute Transfer",
      lead: "Absolute transfer shows the amount of exposure that moved through the selected stage-transfer flow.",
      sections: [
        {
          title: "Numerator",
          body: "The numerator is the quarterly transfer amount reported in F_12.02 for the selected flow and perimeter."
        },
        {
          title: "Unit",
          body: "Values are displayed in the selected monetary unit. No denominator is applied."
        }
      ],
      hint: "Switch to Relative Transfer to express the same flow against the exposure base."
    },
    "stage-transfer-relative": {
      eyebrow: "Transfer display",
      title: "Relative Transfer",
      lead: "Relative transfer expresses a stage-transfer flow as a contribution relative to the exposure base.",
      sections: [
        {
          title: "Numerator",
          body: "The numerator is the quarterly transfer amount from F_12.02 for the selected flow."
        },
        {
          title: "Denominator",
          body: "The denominator is the previous-quarter gross carrying amount from F_18.00 on the selected instruments and counterparty perimeter, taken across all stages and excluding central bank cash where relevant."
        },
        {
          title: "Formula",
          body: "Relative transfer = transfer amount divided by previous-quarter exposure denominator, displayed in basis points."
        }
      ],
      hint: "Use this mode to compare transfer intensity across JSTs and across time."
    },
    "movement-absolute": {
      eyebrow: "Allowance movement display",
      title: "Absolute Contribution",
      lead: "Absolute contribution shows the amount by which a selected FINREP component changes the stock of allowances.",
      sections: [
        {
          title: "Numerator",
          body: "The value is the selected movement component from F_12.01, on the current perimeter."
        },
        {
          title: "Unit",
          body: "Values are displayed in the selected monetary unit. No denominator is applied."
        }
      ],
      hint: "Switch to Relative Contribution to compare allowance movements against the exposure base."
    },
    "movement-relative": {
      eyebrow: "Allowance movement display",
      title: "Relative Contribution",
      lead: "Relative contribution expresses an allowance movement against the corresponding exposure base.",
      sections: [
        {
          title: "Numerator",
          body: "The numerator is the selected F_12.01 allowance movement component."
        },
        {
          title: "Denominator",
          body: "The denominator is the previous-quarter exposure base from F_18.00, filtered by the selected instruments, counterparty and stage where available."
        },
        {
          title: "Formula",
          body: "Relative contribution = allowance movement divided by previous-quarter exposure denominator, displayed in basis points."
        }
      ],
      hint: "This is a contribution-to-exposure measure, not a growth rate of allowances."
    },
    "cost-risk-absolute": {
      eyebrow: "Cost of risk display",
      title: "Absolute Value",
      lead: "Absolute value shows the selected cost of risk definition as a quarterly amount.",
      sections: [
        {
          title: "Numerator",
          body: "The value is either the direct F_02.00 impairment line or the selected sum of F_12.01 components, depending on the active cost of risk definition."
        },
        {
          title: "Unit",
          body: "Values are displayed in the selected monetary unit. No exposure denominator is applied."
        }
      ],
      hint: "Switch to Basis points to compare the intensity of cost of risk across JSTs and over time."
    },
    "cost-risk-relative": {
      eyebrow: "Cost of risk display",
      title: "Basis Points",
      lead: "Basis points express the selected cost of risk definition relative to the exposure base.",
      sections: [
        {
          title: "Numerator",
          body: "The numerator is the selected quarterly cost of risk amount, after applying the active definition and perimeter filters."
        },
        {
          title: "Denominator",
          body: "The denominator is the previous-quarter exposure base used elsewhere in this module for movement-style measures."
        },
        {
          title: "Formula",
          body: "Cost of risk in basis points = selected cost of risk amount divided by the exposure denominator."
        }
      ],
      hint: "This mode is generally better suited for benchmarking."
    },
    "summary-absolute": {
      eyebrow: "Summary display",
      title: "Absolute Value",
      lead: "Absolute value shows the underlying amount behind each Summary ratio.",
      sections: [
        {
          title: "Displayed values",
          body: "Exposure ratio is shown as gross carrying amount, coverage as allowances, and collateral as collateral received."
        },
        {
          title: "Unit",
          body: "Values are displayed in the unit selected in the application header."
        }
      ],
      hint: "Switch to Ratio to read the same cells as percentages."
    },
    "summary-relative": {
      eyebrow: "Summary display",
      title: "Ratio",
      lead: "Ratio displays the Summary cells as percentages.",
      sections: [
        {
          title: "Exposure ratio",
          body: "Gross carrying amount for the selected row is divided by the gross carrying amount of the selected perimeter."
        },
        {
          title: "Coverage and collateral",
          body: "Coverage is allowances divided by gross carrying amount. Collateral is collateral received divided by gross carrying amount."
        },
        {
          title: "Format",
          body: "Values are displayed as percentages for quick cross-sectional reading."
        }
      ],
      hint: "Switch to Absolute Value to see the underlying amounts."
    },
    "y-focus-on": {
      eyebrow: "Chart scale",
      title: "Focused JST axis",
      lead: "The Y-axis is now driven by the selected JST curve.",
      sections: [
        {
          title: "What changes",
          body: "The chart chooses its vertical bounds from the selected JST series, with a small margin so that its movements are easier to read."
        },
        {
          title: "What may happen",
          body: "Peer curves or percentile lines can move partly outside the visible area if they take more extreme values."
        }
      ],
      hint: "Turn the button off to return to a global scale that includes the full benchmark range."
    },
    "y-focus-off": {
      eyebrow: "Chart scale",
      title: "Global benchmark axis",
      lead: "The Y-axis is sized to include the benchmark range.",
      sections: [
        {
          title: "What changes",
          body: "The selected JST, peers and anonymised percentile lines are all considered when setting the vertical bounds."
        },
        {
          title: "Trade-off",
          body: "This makes comparison easier, but the selected JST curve may look flatter when benchmark dispersion is large."
        }
      ],
      hint: "Turn on Focus JST axis when the selected JST curve needs to be read more precisely."
    },
    "peer-explicit": {
      eyebrow: "Peer display",
      title: "Explicit peer display",
      lead: "Benchmark charts show each peer JST as an individual labelled curve.",
      sections: [
        {
          title: "What changes",
          body: "The selected JST remains highlighted, while the peer institutions selected through the Peers control are displayed as separate time series."
        },
        {
          title: "How to read it",
          body: "This mode is useful when the identity and trajectory of each peer matter. Endpoint labels show JST codes directly on the right-hand side of the chart."
        },
        {
          title: "Confidentiality",
          body: "Because peer JST codes are visible, this mode is best suited to internal analysis where explicit peer identification is acceptable."
        }
      ],
      hint: "Switch to Anonymized when the benchmark should be read as a distribution rather than as named peer curves."
    },
    "peer-anonymised": {
      eyebrow: "Peer display",
      title: "Anonymized peer display",
      lead: "Benchmark charts replace named peer curves with an anonymized peer distribution.",
      sections: [
        {
          title: "What changes",
          body: "The selected JST remains visible, but individual peer JST codes are hidden. The chart displays percentile curves and quantile areas instead."
        },
        {
          title: "How to read it",
          body: "Use this mode to compare the selected JST against the peer distribution without focusing on the identity of any individual peer."
        },
        {
          title: "Distribution",
          body: "The anonymized view shows indicators such as median and percentile bands when enough peer observations are available for the selected date."
        }
      ],
      hint: "Switch to Explicit when you need to inspect the trajectory of individual peer JSTs."
    }
  };

  return content[topic] ?? null;
}

function getCostOfRiskAuditPanelIntroContent(tab) {
  const content = {
    summary: {
      eyebrow: "Overview",
      title: "Summary",
      lead: "This view gives a compact reading of the selected perimeter using FINREP F_18.00. It is designed as a first checkpoint before moving into the more analytical tabs.",
      sections: [
        {
          title: "What you see",
          body: "The upper panel is a mosaic of key ratios for the selected reference date: exposure mix by stage and performing status, coverage ratios, and collateralisation ratios."
        },
        {
          title: "How to use it",
          body: "Click a card to benchmark that ratio in the time chart below. Each card shows the current ratio and its quarter-on-quarter variation."
        },
        {
          title: "Source",
          body: "Figures are built from F_18.00, with the active instruments, counterparty, staging status and balance-scope filters applied where the regulatory template supports that level of detail."
        }
      ],
      hint: "The Summary is designed as a quick cross-sectional reading before moving into the specialised tabs."
    },
    "cost-of-risk": {
      eyebrow: "Risk charge",
      title: "Cost of Risk",
      lead: "This view focuses on the actual cost of risk measure. It lets you compare a direct F02 definition with a selected F12 component-based definition.",
      sections: [
        {
          title: "Definitions",
          body: "F02 impairment uses F_02.00 row 460. EBA definition sums F_12.01 columns 020, 040, 050, 070, 090, 110 and 120 on the selected perimeter."
        },
        {
          title: "Display",
          body: "Absolute value mode shows the quarterly amount. Basis-points mode divides that amount by the previous-quarter exposure denominator, consistent with the other variation views."
        },
        {
          title: "Drivers",
          body: "The upper panel ranks the largest F12 component × detailed FINREP row combinations for the selected quarter, so drivers can point to stage, counterparty and instrument type when that granularity is available."
        }
      ],
      hint: "Use the definition switch to compare F02 and F12 views, then use the time chart for benchmark context."
    },
    "stage-ratio": {
      eyebrow: "Stage mix",
      title: "Exposure Ratio",
      lead: "This view measures the share of the selected exposure perimeter that sits in a selected IFRS stage or in the F_18.00 performing / non-performing breakdown.",
      sections: [
        {
          title: "What you see",
          body: "The upper panel focuses on the selected category. It shows the exposure ratio, its quarter-on-quarter change, and the numerator and denominator components that explain the movement."
        },
        {
          title: "How it is calculated",
          body: "Exposure ratio = gross carrying amount of the selected category divided by total gross carrying amount of the perimeter. The variation is decomposed with a two-factor Shapley method, averaging the numerator-first and denominator-first paths."
        },
        {
          title: "Source",
          body: "Figures are built from FINREP F_18.00. Instruments and counterparty filters define the perimeter; the stage selector can target either an IFRS stage or the performing / non-performing status."
        }
      ],
      hint: "Click any value in the upper panel to benchmark the selected ratio or decomposition effect over time."
    },
    "coverage-ratio": {
      eyebrow: "Allowance coverage",
      title: "Coverage Ratio",
      lead: "This view measures allowances as a share of gross carrying amount for the selected stage or performing status.",
      sections: [
        {
          title: "What you see",
          body: "The upper panel focuses on the selected category. It shows the coverage ratio, its quarter-on-quarter change, and the allowance and GCA components that explain the movement."
        },
        {
          title: "How it is calculated",
          body: "Coverage ratio = allowances for the stage divided by gross carrying amount for the same stage. The variation is decomposed with a two-factor Shapley method, averaging the numerator-first and denominator-first paths."
        },
        {
          title: "Source",
          body: "Figures are built from FINREP F_18.00. Instruments and counterparty filters define the perimeter; the stage selector can target either an IFRS stage or the performing / non-performing status."
        }
      ],
      hint: "Click any value in the upper panel to benchmark the selected coverage ratio or decomposition effect over time."
    },
    "collateral-ratio": {
      eyebrow: "Collateralisation",
      title: "Collateral",
      lead: "This view measures the share of the selected in-balance exposure perimeter covered by collateral received in FINREP F_18.00.",
      sections: [
        {
          title: "What you see",
          body: "The upper panel focuses on total, performing or non-performing exposures. It shows the collateral ratio, its quarter-on-quarter change, and the numerator and denominator components that explain the movement."
        },
        {
          title: "How it is calculated",
          body: "Collateral ratio = maximum amount of collateral received that can be considered divided by gross carrying amount. The variation is decomposed with the same two-factor Shapley method used in the ratio tabs."
        },
        {
          title: "Source",
          body: "Figures are built from FINREP F_18.00 columns 200 and 201. F_18.00 reports collateral for performing and non-performing exposures, not for Stage 1, Stage 2, Stage 3 or POCI."
        }
      ],
      hint: "Click any value in the upper panel to benchmark the selected collateral ratio or decomposition effect over time."
    },
    "stage-transfers": {
      eyebrow: "Flow analysis",
      title: "Stage Transfer",
      lead: "This view explains how exposures move between IFRS 9 stages over the selected quarter. It focuses on the mechanics of migration, while keeping the surrounding exposure movements visible.",
      sections: [
        {
          title: "What you see",
          body: "The flow chart shows transfers between Stage 1, Stage 2 and Stage 3, together with write-offs and other residual movements. Stage blocks display the current stock on the selected perimeter."
        },
        {
          title: "How to read it",
          body: "Click a stage block or a flow to select it. The time chart tracks the same measure across reporting dates and peer institutions. Relative transfer mode expresses flows against the previous-quarter exposure denominator."
        },
        {
          title: "Source",
          body: "Transfer flows come mainly from F_12.02. Stage stocks and denominator controls rely on F_18.00, excluding central bank cash where it should not be part of the credit-risk exposure base."
        }
      ],
      hint: "Click any flow or stage block to replace this introduction with a detailed audit trail."
    },
    contributions: {
      eyebrow: "ECL movements",
      title: "ECL movements",
      lead: "This view reconciles movements in expected credit loss allowances and provisions, covering both in-balance exposures and off-balance commitments when that perimeter is selected.",
      sections: [
        {
          title: "What you see",
          body: "The waterfall decomposes the selected allowance movement into the relevant F_12.01 components. Direct P&L impacts that do not move the allowance stock are intentionally kept outside this view."
        },
        {
          title: "How to read it",
          body: "Absolute contribution mode shows the movement in amount. Relative contribution mode divides the selected contribution by the exposure denominator of the same perimeter, using the previous quarter for variation measures."
        },
        {
          title: "Source",
          body: "The waterfall is built from F_12.01 and reconciled with the selected instruments, counterparty and stage filters whenever FINREP provides the required granularity."
        }
      ],
      hint: "Click a waterfall component to display its selected scope and, in relative mode, its denominator."
    }
  };

  return content[tab] ?? null;
}

function renderCostOfRiskStageSummaryView(stageSummary, state) {
  setCostOfRiskSummaryBreakdownVisibility("stage");
  destroyCostOfRiskCounterpartySummaryChart();
  renderCostOfRiskStageSummaryTable(stageSummary, state.selectedUnit);
  renderCostOfRiskStageSummaryChart(stageSummary, state);
}

function renderCostOfRiskStageSummaryTable(stageSummary, selectedUnit = "millions") {
  if (!elements.costOfRiskStageSummaryTable) return;

  if (stageSummary.status) {
    destroyCostOfRiskStageSummaryChart();
    renderCostOfRiskTabEmpty(stageSummary.status);
    return;
  }

  renderStageSummaryTable({
    activeCellKey: activeCostOfRiskStageSummaryCellKey,
    container: elements.costOfRiskStageSummaryTable,
    displayMode: getActiveCostOfRiskDisplayMode(),
    filters: activeCostOfRiskFilters,
    formatReferenceQuarterLabel,
    onCellSelect: selectCostOfRiskStageSummaryCell,
    onColumnSelect: selectCostOfRiskStageSummaryColumn,
    onCounterpartySelect: selectCostOfRiskSummaryCounterpartyFilter,
    onOpenDetailTab: openCostOfRiskSummaryDetailTab,
    onRowSelect: selectCostOfRiskStageSummaryRow,
    referenceDate: activeCostOfRiskReferenceDate,
    selectedUnit,
    stageSummary
  });
}

function selectCostOfRiskSummaryCounterpartyFilter(counterpartyValue = "", rowKey = "") {
  let shouldRerender = false;
  if (rowKey) {
    const columnKey = getCostOfRiskSummaryCellColumnKey(activeCostOfRiskStageSummaryCellKey) || "gca:ratio";
    activeCostOfRiskCounterpartySummaryCellKey = `counterparty:${columnKey}:${rowKey}`;
  }
  activeCostOfRiskSummaryBreakdown = "stage";
  if (updateCostOfRiskCounterpartyFromSummaryRow(counterpartyValue)) shouldRerender = true;
  if (!shouldRerender) return;
  clearCostOfRiskHelpTopic();
  if (getLatestState()) rerenderApp(getLatestState());
}

function openCostOfRiskSummaryDetailTab(tab, rowKey) {
  if (!["stage-ratio", "coverage-ratio", "collateral-ratio"].includes(tab) || !rowKey) return;
  if (!isCostOfRiskSummaryDetailTabAvailable(tab, rowKey)) return;
  const stageValue = getCostOfRiskStageSummaryFilterValue(rowKey);
  if (stageValue) setActiveCostOfRiskStageFilter(stageValue);
  if (tab === "stage-ratio") activeCostOfRiskStageRatioCellKey = `${rowKey}:ratio`;
  if (tab === "coverage-ratio") activeCostOfRiskCoverageRatioCellKey = `${rowKey}:ratio`;
  if (tab === "collateral-ratio") activeCostOfRiskCollateralRatioCellKey = `${rowKey}:ratio`;
  activeCostOfRiskTab = tab;
  activeCostOfRiskDataAuditRequested = true;
  hideCostOfRiskAuditIntro();
  closeCostOfRiskFilterMenus();
  clearCostOfRiskHelpTopic();
  if (getLatestState()) rerenderApp(getLatestState());
}

function isCostOfRiskSummaryDetailTabAvailable(tab, rowKey) {
  if (tab === "stage-ratio" || tab === "coverage-ratio") {
    return ["stage1", "stage2", "stage3", "poci", "performing", "nonperforming"].includes(rowKey);
  }
  if (tab === "collateral-ratio") {
    return ["all", "performing", "nonperforming"].includes(rowKey);
  }
  return false;
}

function renderCostOfRiskStageSummaryChart(stageSummary, state) {
  renderStageSummaryTimeChart({
    activeReferenceDate: activeCostOfRiskReferenceDate,
    container: elements.costOfRiskStageSummaryChart,
    displayMode: getActiveCostOfRiskDisplayMode(),
    focusSelectedYAxis: activeCostOfRiskFocusSelectedYAxis,
    model: stageSummary,
    onClearSmoothing: clearCostOfRiskSmoothing,
    onChangeSmoothing: updateCostOfRiskSmoothingWindow,
    onSelectJst: selectCostOfRiskChartJst,
    onSelectReferenceDate: selectCostOfRiskReferenceDate,
    onToggleYAxisFocus: toggleCostOfRiskFocusedYAxis,
    renderTabEmpty: renderCostOfRiskTabEmpty,
    selectedUnit: state.selectedUnit,
    smoothingWindow: activeCostOfRiskSmoothingWindow,
    state
  });
}

function selectCostOfRiskStageSummaryColumn(metric, kind) {
  const rowKey = getCostOfRiskSummaryCellRowKey(activeCostOfRiskStageSummaryCellKey) || "all";
  selectCostOfRiskStageSummaryCell(`${metric}:${kind}:${rowKey}`, rowKey);
}

function selectCostOfRiskStageSummaryCell(cellKey, rowKey = "") {
  let shouldRerender = false;
  if (cellKey && cellKey !== activeCostOfRiskStageSummaryCellKey) {
    activeCostOfRiskStageSummaryCellKey = cellKey;
    activeCostOfRiskSummaryBreakdown = "stage";
    shouldRerender = true;
  }
  if (updateCostOfRiskStageFromSummaryRow(rowKey)) shouldRerender = true;
  if (!shouldRerender && !activeCostOfRiskDataAuditRequested) return;
  if (getLatestState()) rerenderApp(getLatestState());
}

function selectCostOfRiskStageSummaryRow(rowKey) {
  const columnKey = getCostOfRiskSummaryCellColumnKey(activeCostOfRiskStageSummaryCellKey) || "gca:level";
  selectCostOfRiskStageSummaryCell(`${columnKey}:${rowKey}`, rowKey);
}

function updateCostOfRiskStageFromSummaryRow(rowKey) {
  const stageValue = getCostOfRiskStageSummaryFilterValue(rowKey);
  if (!stageValue) return false;
  return setActiveCostOfRiskStageFilter(stageValue);
}

function renderCostOfRiskCounterpartySummaryView(counterpartySummary, state) {
  setCostOfRiskSummaryBreakdownVisibility("counterparty");
  destroyCostOfRiskStageSummaryChart();
  renderCostOfRiskCounterpartySummaryTable(counterpartySummary, state.selectedUnit);
  renderCostOfRiskCounterpartySummaryChart(counterpartySummary, state);
}

function renderCostOfRiskCounterpartySummaryTable(counterpartySummary, selectedUnit = "millions") {
  if (!elements.costOfRiskCounterpartySummaryTable) return;

  if (counterpartySummary.status) {
    destroyCostOfRiskCounterpartySummaryChart();
    renderCostOfRiskTabEmpty(counterpartySummary.status);
    return;
  }

  renderCounterpartySummaryTable({
    activeCellKey: activeCostOfRiskCounterpartySummaryCellKey,
    container: elements.costOfRiskCounterpartySummaryTable,
    counterpartySummary,
    displayMode: getActiveCostOfRiskDisplayMode(),
    filters: activeCostOfRiskFilters,
    formatReferenceQuarterLabel,
    onCellSelect: selectCostOfRiskCounterpartySummaryCell,
    onColumnSelect: selectCostOfRiskCounterpartySummaryColumn,
    onRowSelect: selectCostOfRiskCounterpartySummaryRow,
    onToggleOther: () => {
      activeCostOfRiskCounterpartySummaryOtherOpen = !activeCostOfRiskCounterpartySummaryOtherOpen;
      if (getLatestState()) rerenderApp(getLatestState());
    },
    otherOpen: activeCostOfRiskCounterpartySummaryOtherOpen,
    referenceDate: activeCostOfRiskReferenceDate,
    selectedUnit
  });
}

function renderCostOfRiskSummaryBreakdownSwitch() {
  document.querySelectorAll("[data-cost-of-risk-summary-breakdown]").forEach((button) => {
    const isActive = button.dataset.costOfRiskSummaryBreakdown === activeCostOfRiskSummaryBreakdown;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function setCostOfRiskSummaryBreakdownVisibility(breakdown) {
  setElementHidden(elements.costOfRiskStageSummaryTable, breakdown !== "stage");
  setElementHidden(elements.costOfRiskStageSummaryChart, breakdown !== "stage");
  setElementHidden(elements.costOfRiskCounterpartySummaryTable, breakdown !== "counterparty");
  setElementHidden(elements.costOfRiskCounterpartySummaryChart, breakdown !== "counterparty");
}

function setElementHidden(element, isHidden) {
  if (!element) return;
  element.hidden = isHidden;
  element.style.display = isHidden ? "none" : "";
}

function selectCostOfRiskSummaryBreakdown(breakdown) {
  const nextBreakdown = breakdown === "counterparty" ? "counterparty" : "stage";
  if (activeCostOfRiskSummaryBreakdown === nextBreakdown) return;
  activeCostOfRiskSummaryBreakdown = nextBreakdown;
  if (getLatestState()) rerenderApp(getLatestState());
}

function renderCostOfRiskCounterpartySummaryChart(counterpartySummary, state) {
  renderCounterpartySummaryTimeChart({
    activeReferenceDate: activeCostOfRiskReferenceDate,
    container: elements.costOfRiskCounterpartySummaryChart,
    displayMode: getActiveCostOfRiskDisplayMode(),
    focusSelectedYAxis: activeCostOfRiskFocusSelectedYAxis,
    model: counterpartySummary,
    onClearSmoothing: clearCostOfRiskSmoothing,
    onChangeSmoothing: updateCostOfRiskSmoothingWindow,
    onSelectJst: selectCostOfRiskChartJst,
    onSelectReferenceDate: selectCostOfRiskReferenceDate,
    onToggleYAxisFocus: toggleCostOfRiskFocusedYAxis,
    renderTabEmpty: renderCostOfRiskTabEmpty,
    selectedUnit: state.selectedUnit,
    smoothingWindow: activeCostOfRiskSmoothingWindow,
    state
  });
}

function selectCostOfRiskCounterpartySummaryColumn(metric, kind) {
  const rowKey = getCostOfRiskSummaryCellRowKey(activeCostOfRiskCounterpartySummaryCellKey) || "nfc";
  selectCostOfRiskCounterpartySummaryCell(`${metric}:${kind}:${rowKey}`, getCostOfRiskCounterpartySummaryValue(rowKey));
}

function selectCostOfRiskCounterpartySummaryCell(cellKey, counterpartyValue = "") {
  let shouldRerender = false;
  if (cellKey && cellKey !== activeCostOfRiskCounterpartySummaryCellKey) {
    activeCostOfRiskCounterpartySummaryCellKey = cellKey;
    shouldRerender = true;
  }
  if (updateCostOfRiskCounterpartyFromSummaryRow(counterpartyValue)) shouldRerender = true;
  if (!shouldRerender && !activeCostOfRiskDataAuditRequested) return;
  if (getLatestState()) rerenderApp(getLatestState());
}

function selectCostOfRiskCounterpartySummaryRow(rowKey, counterpartyValue) {
  if (!rowKey) return;
  const columnKey = getCostOfRiskSummaryCellColumnKey(activeCostOfRiskCounterpartySummaryCellKey) || "gca:level";
  selectCostOfRiskCounterpartySummaryCell(`${columnKey}:${rowKey}`, counterpartyValue);
}

function updateCostOfRiskCounterpartyFromSummaryRow(counterpartyValue) {
  if (!counterpartyValue || counterpartyValue === activeCostOfRiskFilters.counterparty) return false;

  activeCostOfRiskFilters.counterparty = counterpartyValue;
  if (elements.costOfRiskCounterparty) elements.costOfRiskCounterparty.value = counterpartyValue;
  return true;
}

function destroyCostOfRiskStageTransferChart() {
  if (!costOfRiskStageTransferChart) return;
  costOfRiskStageTransferChart.destroy();
  costOfRiskStageTransferChart = null;
}

function leaveCostOfRiskStageTransferTab() {
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
    renderCostOfRiskTabEmpty("No contribution breakdown is available for the current selection.");
    return;
  }

  const waterfallData = createManualWaterfallData(contributions);
  waterfallData.valueFormatter = (value) => formatCostOfRiskDisplayValue(value, displayMode, selectedUnit, true);
  waterfallData.selectedCode = activeCostOfRiskXAxisCode;
  waterfallData.axisLabelFontSize = "11px";
  waterfallData.axisLabelLineHeight = "13px";
  waterfallData.valueLabelFontSize = "12px";
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
      marginBottom: 112,
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
    title: createCostOfRiskHighchartsTitle(activeCostOfRiskWaterfallTitleText, undefined, { color: "#7c8580" }),
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
      title: { text: displayMode === "ratio" ? "Growth rate (bp)" : "Amount" }
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
  const flowDiagram = applyCostOfRiskUnavailableCounterpartyGuidance(getCostOfRiskCachedModel(
    state,
    createCostOfRiskModelCacheKey(state, "stage-transfer-flow-diagram", activeCostOfRiskFilters, activeCostOfRiskReferenceDate),
    () => buildCostOfRiskStageTransferFlowDiagram(state, activeCostOfRiskReferenceDate, activeCostOfRiskFilters)
  ));
  renderCostOfRiskStageTransferFlowChart(
    state,
    flowDiagram,
    state.selectedUnit,
    getActiveCostOfRiskDisplayMode()
  );
}

function renderCostOfRiskStageTransferFlowChart(state, flowDiagram, selectedUnit, displayMode = "amount") {
  if (!elements.costOfRiskStageTransferChart) return;
  destroyCostOfRiskStageTransferChart();

  if (flowDiagram?.status) {
    elements.costOfRiskStageTransferChart.replaceChildren();
    if (elements.costOfRiskStageTransferTitle) elements.costOfRiskStageTransferTitle.textContent = "Stage Transfer Flows";
    destroyCostOfRiskStageTransferFlowChart();
    if (elements.costOfRiskStageTransferFlowChartWrap) elements.costOfRiskStageTransferFlowChartWrap.hidden = true;
    renderCostOfRiskTabEmpty(flowDiagram.status);
    return;
  }

  renderCostOfRiskStageTransferFlowView({
    container: elements.costOfRiskStageTransferChart,
    displayMode,
    flowDiagram,
    onShowCalculationDetails: (event, flowKey) => {
      showCostOfRiskCalculationDetailsMenu(event, () => {
        showCostOfRiskCalculationDetails("stage-transfer", flowKey);
      });
    },
    onSelectFlow: selectCostOfRiskStageTransferFlow,
    selectedFlowKey: activeCostOfRiskStageTransferFlowKey,
    selectedUnit,
    titleElement: elements.costOfRiskStageTransferTitle
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
  if (!flowKey) return;

  let shouldRerender = flowKey !== activeCostOfRiskStageTransferFlowKey;
  activeCostOfRiskStageTransferFlowKey = flowKey;

  const stageFilter = getCostOfRiskStageFilterForStageTransferFlowKey(flowKey);
  if (stageFilter && activeCostOfRiskFilters.stage !== stageFilter) {
    setActiveCostOfRiskStageFilter(stageFilter);
    shouldRerender = true;
  }

  if (!shouldRerender && !activeCostOfRiskDataAuditRequested) return;
  if (getLatestState()) rerenderApp(getLatestState());
}

function renderCostOfRiskStageTransferFlowTimeSeriesChart(state, displayMode, selectedUnit) {
  if (!elements.costOfRiskStageTransferFlowChart) return;

  if (!activeCostOfRiskStageTransferFlowKey) {
    destroyCostOfRiskStageTransferFlowChart();
    if (elements.costOfRiskStageTransferFlowChartWrap) elements.costOfRiskStageTransferFlowChartWrap.hidden = true;
    return;
  }

  const isStageBoxSelection = activeCostOfRiskStageTransferFlowKey.startsWith("stagebox:");
  const chartDisplayMode = displayMode;
  const flowSeries = isStageBoxSelection
    ? getCostOfRiskCachedModel(
      state,
      createCostOfRiskModelCacheKey(state, "stage-box-time-series", activeCostOfRiskFilters, activeCostOfRiskStageTransferFlowKey),
      () => buildCostOfRiskStageBoxTimeSeries(state, activeCostOfRiskFilters, activeCostOfRiskStageTransferFlowKey.split(":")[1])
    )
    : getCostOfRiskCachedModel(
      state,
      createCostOfRiskModelCacheKey(state, "stage-transfer-flow-time-series", activeCostOfRiskFilters, activeCostOfRiskStageTransferFlowKey),
      () => buildCostOfRiskStageTransferFlowTimeSeries(state, activeCostOfRiskFilters, activeCostOfRiskStageTransferFlowKey)
    );
  renderStageTransferFlowTimeSeriesChart({
    activeReferenceDate: activeCostOfRiskReferenceDate,
    chartDisplayMode,
    container: elements.costOfRiskStageTransferFlowChart,
    focusSelectedYAxis: activeCostOfRiskFocusSelectedYAxis,
    flowSeries,
    isStageBoxSelection,
    onClearSmoothing: clearCostOfRiskSmoothing,
    onChangeSmoothing: updateCostOfRiskSmoothingWindow,
    onSelectJst: selectCostOfRiskChartJst,
    onSelectReferenceDate: selectCostOfRiskReferenceDate,
    onToggleYAxisFocus: toggleCostOfRiskFocusedYAxis,
    renderTabEmpty: renderCostOfRiskTabEmpty,
    selectedUnit,
    smoothingWindow: activeCostOfRiskSmoothingWindow,
    state,
    titleElement: elements.costOfRiskStageTransferFlowChartTitle,
    wrapElement: elements.costOfRiskStageTransferFlowChartWrap
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
    renderCostOfRiskTabEmpty(waterfall.status || "No stage transfer data is available for the current selection.");
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
      title: { text: displayMode === "ratio" ? "Growth rate (bp)" : "Amount" }
    }
  };

  if (costOfRiskStageTransferChart) {
    costOfRiskStageTransferChart.update(options, true, true, false);
  } else {
    costOfRiskStageTransferChart = window.Highcharts.chart(elements.costOfRiskStageTransferChart, options);
  }
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
    code: COST_OF_RISK_TOTAL_CONTRIBUTION_X_CODE,
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
    const bottom = top + height;
    const labelY = getCostOfRiskWaterfallValueLabelY(chart, top, bottom, item.contribution);

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
        fill: isSelected ? primaryDark : COST_OF_RISK_STAGE_BOX_FILL,
        stroke: primaryDark,
        "stroke-width": isSelected ? 2 : 1,
        zIndex: isSelected ? 8 : 6
      })
      .add();
    const label = chart.renderer
      .text(formatManualWaterfallValue(item.contribution, waterfallData), xCenter, labelY)
      .css({
        color: primaryDark,
        fontSize: waterfallData.valueLabelFontSize || "10px",
        fontWeight: isSelected ? "700" : "500"
      })
      .attr({
        align: "center",
        zIndex: 9
      })
      .add();

    elements.push(shape, label);

    if (item.code) {
      [shape, label].forEach((element) => {
        element.css({ cursor: "pointer" });
        element.on("click", () => selectCostOfRiskXAxisFromWaterfall(item.code));
        element.on("contextmenu", (event) => {
          if (event?.stopPropagation) event.stopPropagation();
          showCostOfRiskCalculationDetailsMenu(event, () => {
            showCostOfRiskCalculationDetails("movement", item.code);
          });
        });
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

function getCostOfRiskWaterfallValueLabelY(chart, top, bottom, contribution) {
  const minY = chart.plotTop + 12;
  const maxY = chart.plotTop + chart.plotHeight - 4;
  const aboveY = top - 8;
  const belowY = bottom + 16;

  if (contribution >= 0) {
    return aboveY >= minY ? aboveY : Math.min(maxY, belowY);
  }

  return belowY <= maxY ? belowY : Math.max(minY, aboveY);
}

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
  const rawLabel = item.axisLabel || item.name;
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
    label.on("contextmenu", (event) => {
      if (event?.stopPropagation) event.stopPropagation();
      showCostOfRiskCalculationDetailsMenu(event, () => {
        showCostOfRiskCalculationDetails("movement", item.code);
      });
    });
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
  const isPositive = contribution >= 0;
  const bottom = top + height;
  const center = x + width / 2;

  if (height < 8) {
    return isPositive
      ? [
        ["M", center, top],
        ["L", x + width, bottom],
        ["L", x, bottom],
        ["Z"]
      ]
      : [
        ["M", x, top],
        ["L", x + width, top],
        ["L", center, bottom],
        ["Z"]
      ];
  }

  const headHeight = Math.min(18, Math.max(7, height * 0.48));
  const bodyInset = width * 0.18;
  const leftBody = x + bodyInset;
  const rightBody = x + width - bodyInset;

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
  if (!code) return;

  activeCostOfRiskMovementAuditXCode = code;
  if (code === activeCostOfRiskXAxisCode) {
    if (activeCostOfRiskDataAuditRequested && getLatestState()) rerenderApp(getLatestState());
    return;
  }
  activeCostOfRiskXAxisCode = code;
  if (elements.costOfRiskXAxis && code !== COST_OF_RISK_TOTAL_CONTRIBUTION_X_CODE) {
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
  if (explicitLines.length > 1) return explicitLines.slice(0, 6);

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
  return lines.slice(0, 6);
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

function selectCostOfRiskReferenceDate(referenceDate) {
  if (!referenceDate || referenceDate === activeCostOfRiskReferenceDate) return;

  activeCostOfRiskReferenceDate = referenceDate;
  if (getLatestState()) rerenderApp(getLatestState());
}

function updateCostOfRiskSmoothingWindow(value) {
  const nextWindow = clampCostOfRiskSmoothingWindow(value);
  setCostOfRiskHelpTopic(`smoothing:${nextWindow}`);
  if (activeCostOfRiskSmoothingWindow === nextWindow) {
    renderCostOfRiskHelpPanel();
    return;
  }
  activeCostOfRiskSmoothingWindow = nextWindow;
  if (elements.costOfRiskSmoothing) elements.costOfRiskSmoothing.value = String(nextWindow);
  if (elements.costOfRiskSmoothingValue) elements.costOfRiskSmoothingValue.textContent = formatCostOfRiskSmoothingLabel(nextWindow);
  if (getLatestState()) rerenderApp(getLatestState());
}

function clearCostOfRiskSmoothing() {
  if (activeCostOfRiskSmoothingWindow <= 1) return;
  updateCostOfRiskSmoothingWindow(1);
}

function toggleCostOfRiskFocusedYAxis() {
  activeCostOfRiskFocusSelectedYAxis = !activeCostOfRiskFocusSelectedYAxis;
  setCostOfRiskHelpTopic(activeCostOfRiskFocusSelectedYAxis ? "y-focus-on" : "y-focus-off");
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
  renderCostOfRiskAuditTableView({
    activeDateLabel: activeCostOfRiskReferenceDate,
    activeSeries: activeCostOfRiskAuditSeries,
    audit,
    container: elements.costOfRiskAudit,
    onOpenSourcePoint: openCostOfRiskAuditSourceInExplorer,
    selectedUnit
  });
}

function clearCostOfRiskAuditTable() {
  clearCostOfRiskAuditTableView(elements.costOfRiskAudit);
}
