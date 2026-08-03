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
  buildCostOfRiskNplFlowsModel,
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
  createCostOfRiskChartData,
  formatCostOfRiskDisplayValue,
  formatCostOfRiskSmoothingLabel,
  formatReferenceQuarterLabel,
  getCostOfRiskFilterOptions,
  getCostOfRiskF12ReconciliationXAxisOptions,
  getCostOfRiskPointDisplayValue,
  getCostOfRiskWaterfallXAxisOptions,
  getCostOfRiskXAxisOptions,
  getCostOfRiskYAxisBounds,
  getSelectedSmoothedCostOfRiskPoint,
  smoothCostOfRiskPoints
} from "../data/costOfRisk.js?v=20260802-readable-selection-phrases";
import {
  createStageTransferWaterfallData,
  getStageTransferAxisLabel,
  getStageTransferDisplayValue
} from "./costOfRiskStageTransfers.js?v=20260802-readable-selection-phrases";
import {
  destroyCostOfRiskStageReconciliationChart,
  getCostOfRiskStageReconciliationChart,
  renderCostOfRiskStageReconciliationView
} from "./costOfRiskStageReconciliationView.js?v=20260802-readable-selection-phrases";
import {
  createCostOfRiskHighchartsTitle,
  escapeHtml,
  formatCostOfRiskQuarterAxisLabel,
  getCostOfRiskAxisTickPositions
} from "./costOfRiskChartUtils.js?v=20260802-readable-selection-phrases";
import {
  getCostOfRiskCounterpartySummaryValue,
  getCostOfRiskStageSummaryFilterValue,
  getCostOfRiskSummaryCellColumnKey,
  getCostOfRiskSummaryCellRowKey,
  renderCostOfRiskCounterpartySummaryTable as renderCounterpartySummaryTable,
  renderCostOfRiskStageSummaryTable as renderStageSummaryTable
} from "./costOfRiskSummaryTablesView.js?v=20260802-readable-selection-phrases";
import {
  destroyCostOfRiskCounterpartySummaryChart,
  destroyCostOfRiskStageSummaryChart,
  getCostOfRiskCounterpartySummaryChart,
  getCostOfRiskStageSummaryChart,
  renderCostOfRiskCounterpartySummaryChart as renderCounterpartySummaryTimeChart,
  renderCostOfRiskStageSummaryChart as renderStageSummaryTimeChart
} from "./costOfRiskSummaryChartsView.js?v=20260802-readable-selection-phrases";
import { renderCostOfRiskStageTransferFlowView } from "./costOfRiskStageTransferFlowView.js?v=20260802-readable-selection-phrases";
import {
  destroyCostOfRiskStageTransferFlowChart,
  getCostOfRiskStageTransferFlowChart,
  renderCostOfRiskStageTransferFlowTimeSeriesChart as renderStageTransferFlowTimeSeriesChart
} from "./costOfRiskStageTransferTimeSeriesView.js?v=20260802-readable-selection-phrases";
import {
  destroyCostOfRiskStageRatioChart,
  formatCostOfRiskStageRatioCellValue,
  getCostOfRiskStageRatioChart,
  getCostOfRiskStageRatioMetricLabel,
  renderCostOfRiskStageRatioChart,
  renderCostOfRiskStageRatioTable
} from "./costOfRiskStageRatioView.js?v=20260802-readable-selection-phrases";
import {
  destroyCostOfRiskCoverageRatioChart,
  formatCostOfRiskCoverageRatioCellValue,
  getCostOfRiskCoverageRatioChart,
  getCostOfRiskCoverageRatioMetricLabel,
  renderCostOfRiskCoverageRatioChart,
  renderCostOfRiskCoverageRatioTable
} from "./costOfRiskCoverageRatioView.js?v=20260802-readable-selection-phrases";
import {
  destroyCostOfRiskCollateralRatioChart,
  formatCostOfRiskCollateralRatioCellValue,
  getCostOfRiskCollateralRatioChart,
  getCostOfRiskCollateralRatioMetricLabel,
  renderCostOfRiskCollateralRatioChart,
  renderCostOfRiskCollateralRatioTable
} from "./costOfRiskCollateralRatioView.js?v=20260802-readable-selection-phrases";
import {
  destroyCostOfRiskF2VsF12Chart,
  getCostOfRiskF2VsF12Chart,
  renderCostOfRiskF2VsF12Chart as renderF2VsF12Chart
} from "./costOfRiskF2VsF12ChartView.js?v=20260802-readable-selection-phrases";
import {
  getCostOfRiskTreemapChart,
  renderCostOfRiskTreemap as renderTreemapChart
} from "./costOfRiskTreemapView.js?v=20260802-readable-selection-phrases";
import {
  destroyCostOfRiskMovementChart,
  getCostOfRiskMovementChart,
  renderCostOfRiskMovementTimeSeriesChart as renderMovementTimeSeriesChart
} from "./costOfRiskMovementTimeSeriesView.js?v=20260802-readable-selection-phrases";
import {
  renderBenchmarkEndpointLabels,
  scheduleBenchmarkEndpointLabels
} from "./benchmarkLineChart.js?v=20260802-readable-selection-phrases";
import {
  renderCostOfRiskCoreDefinitionTables
} from "./costOfRiskCoreDefinitionView.js?v=20260802-readable-selection-phrases";
import { renderCostOfRiskActiveFiltersView } from "./costOfRiskActiveFiltersView.js?v=20260802-readable-selection-phrases";
import {
  renderCostOfRiskFilterSelect as renderFilterSelect,
  renderCostOfRiskSmoothingControl as renderSmoothingControl,
  renderCostOfRiskXAxisOptions as renderXAxisOptions
} from "./costOfRiskControlsView.js?v=20260802-readable-selection-phrases";
import {
  clearCostOfRiskAuditTableView,
  renderCostOfRiskAuditTableView
} from "./costOfRiskAuditTableView.js?v=20260802-readable-selection-phrases";
import { openExplorerPoint } from "./explorerView.js?v=20260802-readable-selection-phrases";
import { renderCostOfRiskRatioDenominatorControls as renderRatioDenominatorControls } from "./costOfRiskRatioDenominatorView.js?v=20260802-readable-selection-phrases";
import {
  clearCostOfRiskEmptyPanelsView,
  renderCostOfRiskTabEmptyView,
  renderCostOfRiskTabsView
} from "./costOfRiskTabsView.js?v=20260802-readable-selection-phrases";
import {
  createCostOfRiskModelCacheKey,
  getCostOfRiskCachedModel
} from "./costOfRiskModelCache.js?v=20260802-readable-selection-phrases";
import {
  getCostOfRiskFilterParentValue as getFilterParentValue,
  getCostOfRiskUnavailableMessage as getUnavailableMessage
} from "./costOfRiskFilterRules.js?v=20260802-readable-selection-phrases";
import { getReferenceColumns } from "../data/core/referenceColumns.js";
import {
  DEFAULT_COST_OF_RISK_STAGE_TRANSFER_FLOW_KEY,
  getCostOfRiskStageTransferFlowKeyForStageFilter,
  getCostOfRiskStageTransferStage,
  getCostOfRiskStageFilterForStageTransferFlowKey,
  getSyncedCostOfRiskStageTransferFlowKey,
  isCostOfRiskAllStageValue,
  normalizeCostOfRiskStageFilterValue
} from "./costOfRiskStageTransferSelection.js?v=20260802-readable-selection-phrases";
import {
  getActiveCostOfRiskCoreXCodes as getActiveCoreXCodes,
  normalizeCostOfRiskCoreSelection,
  updateCostOfRiskCoreSelection
} from "./costOfRiskCoreSelection.js?v=20260802-readable-selection-phrases";
import { showContextMenu } from "./contextMenu.js?v=20260710-audit-trail";
import { formatBasisPointsValue, formatContributionPercentValue, formatMetricValue, formatSignedMetricValue } from "../data/core/formatting.js?v=20260710-bp-format";
import { getLatestState } from "./appState.js";
import { costOfRiskElements as elements } from "./costOfRiskElements.js";
import {
  COST_OF_RISK_FILTER_SELECTION_META,
  COST_OF_RISK_FINE_COUNTERPARTY_UNSUPPORTED_TABS
} from "./costOfRiskFilterSelectionConfig.js";
import {
  createCostOfRiskFilterPreviewCacheKey,
  createCostOfRiskFilterPreviewRenderer
} from "./costOfRiskFilterPreviewRenderer.js";
import { createCostOfRiskDatasetInfoPanel } from "./costOfRiskDatasetInfoPanel.js";
import {
  COST_OF_RISK_DISABLED_TABS,
  readCostOfRiskUrlState,
  writeCostOfRiskUrlState
} from "./costOfRiskUrlState.js";
import {
  COST_OF_RISK_COMPARISON_DEFINITION_ID,
  COST_OF_RISK_COMPARISON_METHOD_IDS,
  COST_OF_RISK_FILTER_SELECTION_TOPIC_PREFIX,
  COST_OF_RISK_TABS_WITH_CONTEXT_RENDERER,
  COST_OF_RISK_TABS_WITH_DEDICATED_DISPLAY_MODE
} from "./costOfRiskTabConfig.js";
import {
  getCostOfRiskAuditPanelIntroContent,
  getCostOfRiskHelpPanelContent
} from "./costOfRiskPanelContent.js";
import {
  createManualWaterfallData,
  renderManualCostOfRiskWaterfall,
  wireCostOfRiskWaterfallAxisLabels
} from "./costOfRiskManualWaterfall.js";
import {
  appendCostOfRiskHighlightedSelectionText,
  createCostOfRiskAuditInfoSection,
  createCostOfRiskSelectedDataDescription,
  createCostOfRiskSelectedDataDescriptionWithDetail,
  createCostOfRiskSelectedDataPlaceholder
} from "./costOfRiskAuditPanelNodes.js";
import { flowArrowColor, primaryDark } from "./theme.js?v=20260709-flow-arrow-color";

let rerenderApp = () => {};
let setActiveModule = () => {};
let updateSelectedJst = () => {};
let activeCostOfRiskXAxisCode = COST_OF_RISK_X_AXIS_CODE;
let activeCostOfRiskSmoothingWindow = 4;
let activeCostOfRiskLastSmoothingWindow = 4;
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
let activeCostOfRiskComparisonBenchmarkDefinitionId = "f12-selected-components";
let activeCostOfRiskDefinitionBenchmarkMode = "benchmark";
let activeCostOfRiskMovementDisplayMode = "ratio";
let activeCostOfRiskStageTransferDisplayMode = "ratio";
let activeCostOfRiskNplFlowsDisplayMode = "ratio";
let activeCostOfRiskSummaryDisplayMode = "ratio";
let activeCostOfRiskCounterpartySummaryCellKey = DEFAULT_COST_OF_RISK_COUNTERPARTY_SUMMARY_CELL;
let activeCostOfRiskCounterpartySummaryOtherOpen = false;
let activeCostOfRiskContributionDisplayMenuOpen = false;
let activeCostOfRiskStageTransferDisplayMenuOpen = false;
let activeCostOfRiskNplFlowsDisplayMenuOpen = false;
let activeCostOfRiskSummaryDisplayMenuOpen = false;
let activeCostOfRiskStageSummaryCellKey = DEFAULT_COST_OF_RISK_STAGE_SUMMARY_CELL;
let activeCostOfRiskStageRatioCellKey = DEFAULT_COST_OF_RISK_STAGE_RATIO_CELL;
let activeCostOfRiskCoverageRatioCellKey = DEFAULT_COST_OF_RISK_COVERAGE_RATIO_CELL;
let activeCostOfRiskCollateralRatioCellKey = DEFAULT_COST_OF_RISK_COLLATERAL_RATIO_CELL;
let activeCostOfRiskChartTitleText = "Time evolution chart";
let activeCostOfRiskAuditIntroTab = "";
let activeCostOfRiskHelpTopic = "";
let activeCostOfRiskSelectedDataSummaryNode = null;
let activeCostOfRiskDataAuditRequested = false;
let activeCostOfRiskMovementAuditXCode = "";
let activeCostOfRiskWaterfallTitleText = "F12 Contribution Breakdown";
let costOfRiskStageTransferChart = null;
let activeCostOfRiskStageTransferFlowKey = DEFAULT_COST_OF_RISK_STAGE_TRANSFER_FLOW_KEY;
let activeCostOfRiskNplFlowKey = "net";
let costOfRiskDefinitionComparisonChart = null;
let costOfRiskWaterfallChart = null;
let costOfRiskPeerSelectionActions = null;
let costOfRiskDatasetInfoActions = null;
let latestCostOfRiskFilterOptions = null;
let costOfRiskHelpTopicHistory = [""];
let costOfRiskHelpTopicHistoryIndex = 0;
const costOfRiskFilterPreviewRenderer = createCostOfRiskFilterPreviewRenderer({
  getPreviewValue: (kind, value) => getCostOfRiskFilterSelectionPreviewValue(kind, value)
});

// Filter chips (instrument/counterparty/stage/definition) no longer open an
// inline dropdown: clicking a chip shows its options as a "filter-selection"
// help topic in the context panel, so selection stays visible
// instead of covering the rows below it.
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

function setCostOfRiskGlobalDisplayMode(mode) {
  const nextMode = mode === "amount" ? "amount" : "ratio";
  activeCostOfRiskDisplayMode = nextMode;
  activeCostOfRiskDefinitionDisplayMode = nextMode;
  activeCostOfRiskMovementDisplayMode = nextMode;
  activeCostOfRiskStageTransferDisplayMode = nextMode;
  activeCostOfRiskNplFlowsDisplayMode = nextMode;
  activeCostOfRiskSummaryDisplayMode = nextMode;
  closeCostOfRiskFilterMenus();
}

function pulseCostOfRiskContextPanel() {
}

applyCostOfRiskUrlState();
const COST_OF_RISK_STAGE_BOX_FILL = "#f7f8f7";
const activeCostOfRiskFilters = {
  asset: COST_OF_RISK_FILTER_ALL,
  balanceScope: COST_OF_RISK_BALANCE_SCOPE_IN_BALANCE,
  counterparty: COST_OF_RISK_FILTER_ALL,
  stage: COST_OF_RISK_FILTER_ALL
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
  const urlState = readCostOfRiskUrlState();
  if (urlState.tab) activeCostOfRiskTab = urlState.tab;
  if (urlState.referenceDate) activeCostOfRiskReferenceDate = urlState.referenceDate;
  if (urlState.summaryBreakdown) activeCostOfRiskSummaryBreakdown = urlState.summaryBreakdown;
  if (urlState.selection) applyCostOfRiskUrlSelection(activeCostOfRiskTab, urlState.selection);
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
    case "npl-flows":
      return activeCostOfRiskNplFlowKey;
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
    case "npl-flows":
      activeCostOfRiskNplFlowKey = ["inflow", "outflow", "net"].includes(value) ? value : "net";
      return;
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
  writeCostOfRiskUrlState({
    activeTab: activeCostOfRiskTab,
    referenceDate: activeCostOfRiskReferenceDate,
    selection: getCostOfRiskUrlSelectionValue(),
    summaryBreakdown: activeCostOfRiskSummaryBreakdown
  });
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
    if (COST_OF_RISK_TABS_WITH_DEDICATED_DISPLAY_MODE.has(activeCostOfRiskTab)) return;
    setCostOfRiskGlobalDisplayMode(event.target.value === "amount" ? "amount" : "ratio");
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
      const [, value] = String(displayModeOption.dataset.costOfRiskDisplayModeOption ?? "").split(":");
      const nextMode = value === "ratio" ? "ratio" : "amount";
      setCostOfRiskGlobalDisplayMode(nextMode);
      if (elements.costOfRiskDisplayMode) elements.costOfRiskDisplayMode.value = getActiveCostOfRiskDisplayMode();
      rerenderApp(actions.getState());
      return;
    }

    const displayModeToggle = event.target.closest?.("[data-cost-of-risk-display-mode-toggle]");
    if (displayModeToggle) {
      event.preventDefault();
      event.stopPropagation();
      const displayModeScope = displayModeToggle.dataset.costOfRiskDisplayModeToggle;
      const currentMode = displayModeScope === "stageTransfer"
        ? activeCostOfRiskStageTransferDisplayMode
        : displayModeScope === "nplFlows"
          ? activeCostOfRiskNplFlowsDisplayMode
          : displayModeScope === "summaryVariation"
            ? activeCostOfRiskSummaryDisplayMode
            : displayModeScope === "costOfRiskDefinition"
              ? activeCostOfRiskDefinitionDisplayMode
              : activeCostOfRiskMovementDisplayMode;
      const nextMode = currentMode === "ratio" ? "amount" : "ratio";
      setCostOfRiskGlobalDisplayMode(nextMode);
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
      setCostOfRiskGlobalDisplayMode(definitionDisplayButton.dataset.costOfRiskDefinitionDisplay === "amount"
        ? "amount"
        : "ratio");
      rerenderApp(actions.getState());
      return;
    }

    const nplFlowButton = event.target.closest?.("[data-cost-of-risk-npl-flow]");
    if (nplFlowButton) {
      event.preventDefault();
      activeCostOfRiskNplFlowKey = ["inflow", "outflow", "net"].includes(nplFlowButton.dataset.costOfRiskNplFlow)
        ? nplFlowButton.dataset.costOfRiskNplFlow
        : "net";
      rerenderApp(actions.getState());
      return;
    }

    const nplCounterpartyButton = event.target.closest?.("[data-cost-of-risk-npl-counterparty]");
    if (nplCounterpartyButton) {
      event.preventDefault();
      applyCostOfRiskFilterSelection("counterparty", nplCounterpartyButton.dataset.costOfRiskNplCounterparty || COST_OF_RISK_FILTER_ALL);
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
  if (!COST_OF_RISK_TABS_WITH_CONTEXT_RENDERER.has(activeCostOfRiskTab)) renderCostOfRiskHelpPanel();
  const displayMode = getActiveCostOfRiskDisplayMode();
  if (elements.costOfRiskDisplayMode) elements.costOfRiskDisplayMode.value = displayMode;
  if (elements.costOfRiskDisplayMode) {
    elements.costOfRiskDisplayMode.disabled = COST_OF_RISK_TABS_WITH_CONTEXT_RENDERER.has(activeCostOfRiskTab);
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

  if (activeCostOfRiskTab === "npl-flows") {
    const nplFlows = getCostOfRiskCachedModel(
      state,
      createCostOfRiskModelCacheKey(state, "npl-flows", activeCostOfRiskFilters, activeCostOfRiskReferenceDate, activeCostOfRiskNplFlowKey),
      () => buildCostOfRiskNplFlowsModel(
        state,
        activeCostOfRiskFilters,
        activeCostOfRiskReferenceDate,
        activeCostOfRiskNplFlowKey
      )
    );
    activeCostOfRiskReferenceDate = nplFlows.referenceDate || activeCostOfRiskReferenceDate;
    renderCostOfRiskActiveFilters(filterOptions);
    elements.costOfRiskEmpty.hidden = true;
    elements.costOfRiskEmpty.textContent = "";
    elements.costOfRiskDashboard.hidden = false;
    leaveCostOfRiskStageTransferTab();
    clearCostOfRiskAuditTable();
    if (nplFlows.status) {
      clearCostOfRiskSelectedDataSummary();
      if (elements.costOfRiskNplFlowsPanel) elements.costOfRiskNplFlowsPanel.replaceChildren();
      if (elements.costOfRiskNplFlowsChart) elements.costOfRiskNplFlowsChart.replaceChildren();
      destroyCostOfRiskMovementChart();
      renderCostOfRiskTabEmpty(nplFlows.status);
      renderCostOfRiskHelpPanel();
      scheduleCostOfRiskChartReflow();
      return;
    }
    renderCostOfRiskNplFlowsView(nplFlows, state);
    setCostOfRiskNplFlowsSelectedDataSummary(nplFlows, state);
    renderCostOfRiskHelpPanel();
    scheduleCostOfRiskChartReflow();
    return;
  }

  if (activeCostOfRiskTab === "cost-of-risk") {
    const customDefinitionCodes = getActiveCostOfRiskCustomDefinitionXCodes();
    const isComparisonDefinition = activeCostOfRiskDefinitionId === COST_OF_RISK_COMPARISON_DEFINITION_ID;
    const benchmarkDefinitionId = isComparisonDefinition
      ? activeCostOfRiskComparisonBenchmarkDefinitionId
      : activeCostOfRiskDefinitionId;
    const definitionModelOptions = isComparisonDefinition
      ? {
        includeBenchmarkSeries: true,
        includeComponents: false,
        includeDrivers: false
      }
      : getCostOfRiskDefinitionModelOptions();
    const definitionModel = getCostOfRiskDefinitionModelForId(
      state,
      benchmarkDefinitionId,
      activeCostOfRiskDefinitionDriverCode,
      customDefinitionCodes,
      definitionModelOptions
    );
    activeCostOfRiskReferenceDate = definitionModel.referenceDate || activeCostOfRiskReferenceDate;
    renderCostOfRiskActiveFilters(filterOptions);
    elements.costOfRiskEmpty.hidden = true;
    elements.costOfRiskEmpty.textContent = "";
    elements.costOfRiskDashboard.hidden = false;
    if (isComparisonDefinition) {
      const comparisonModels = COST_OF_RISK_COMPARISON_METHOD_IDS.map((definitionId) => (
        getCostOfRiskDefinitionModelForId(state, definitionId, "", customDefinitionCodes, {
          includeBenchmarkSeries: false,
          includeComponents: false,
          includeDrivers: false
        })
      ));
      renderCostOfRiskDefinitionComparisonView(comparisonModels, definitionModel, state);
    } else {
      renderCostOfRiskDefinitionView(definitionModel, state);
    }
    setCostOfRiskDefinitionSelectedDataSummary(definitionModel, state);
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
        activeCostOfRiskStageSummaryCellKey,
        { includeCounterpartyRows: false }
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
    setCostOfRiskRatioSelectedDataSummary(stageRatio, state, {
      formatter: formatCostOfRiskStageRatioCellValue,
      metricLabel: getCostOfRiskStageRatioMetricLabel,
      ratioName: "exposure ratio",
      numeratorName: "selected exposure",
      denominatorName: "total GCA"
    });
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
    setCostOfRiskRatioSelectedDataSummary(coverageRatio, state, {
      formatter: formatCostOfRiskCoverageRatioCellValue,
      metricLabel: getCostOfRiskCoverageRatioMetricLabel,
      ratioName: "coverage ratio",
      numeratorName: "allowances and provisions",
      denominatorName: "GCA"
    });
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
    setCostOfRiskRatioSelectedDataSummary(collateralRatio, state, {
      formatter: formatCostOfRiskCollateralRatioCellValue,
      metricLabel: getCostOfRiskCollateralRatioMetricLabel,
      ratioName: "collateralisation ratio",
      numeratorName: "eligible collateral received",
      denominatorName: "GCA"
    });
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
      clearCostOfRiskSelectedDataSummary();
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
    clearCostOfRiskSelectedDataSummary();
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
  if (activeCostOfRiskTab === "npl-flows") return [getCostOfRiskMovementChart()];
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

function renderCostOfRiskNplFlowsView(model, state) {
  renderCostOfRiskNplFlowsPanel(model, state.selectedUnit);
  if (getCostOfRiskMovementChart()?.renderTo !== elements.costOfRiskNplFlowsChart) {
    destroyCostOfRiskMovementChart();
  }
  renderMovementTimeSeriesChart({
    activeReferenceDate: activeCostOfRiskReferenceDate,
    container: elements.costOfRiskNplFlowsChart,
    displayMode: activeCostOfRiskNplFlowsDisplayMode,
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
    selection: model,
    smoothingWindow: activeCostOfRiskSmoothingWindow,
    titleText: `NPL ${model.flow?.shortLabel ?? "Flow"} - Time Evolution`
  });
}

function renderCostOfRiskNplFlowsPanel(model, selectedUnit = "millions") {
  if (!elements.costOfRiskNplFlowsPanel) return;

  const root = document.createElement("div");
  root.className = "cost-of-risk-npl-flows-grid";

  const metrics = document.createElement("section");
  metrics.className = "cost-of-risk-npl-flow-metrics";
  const metricsTitle = document.createElement("h3");
  metricsTitle.className = "cost-of-risk-npl-flow-title";
  metricsTitle.textContent = "NPL flows";
  metrics.append(metricsTitle);

  (model.metrics ?? []).forEach((metric) => {
    const button = document.createElement("button");
    button.className = "cost-of-risk-npl-flow-card";
    button.classList.toggle("is-active", metric.key === model.flow?.key);
    button.type = "button";
    button.dataset.costOfRiskNplFlow = metric.key;

    const label = document.createElement("span");
    label.className = "cost-of-risk-npl-flow-card-label";
    label.textContent = metric.label;
    const value = document.createElement("span");
    value.className = "cost-of-risk-npl-flow-card-value";
    value.textContent = formatCostOfRiskDisplayValue(
      activeCostOfRiskNplFlowsDisplayMode === "ratio" ? metric.ratioBasisPoints : metric.value,
      activeCostOfRiskNplFlowsDisplayMode,
      selectedUnit,
      true
    );
    button.append(label, value);
    metrics.append(button);
  });

  const context = document.createElement("p");
  context.className = "cost-of-risk-npl-flow-context";
  context.textContent = activeCostOfRiskNplFlowsDisplayMode === "ratio"
    ? `Relative flow over previous-quarter loans and advances exposure denominator (${model.denominatorLabel}).`
    : "Absolute quarterly movement in GCA of non-performing loans and advances.";
  metrics.append(context);

  const drivers = document.createElement("section");
  drivers.className = "cost-of-risk-npl-flow-drivers";
  const driversTitle = document.createElement("h3");
  driversTitle.className = "cost-of-risk-npl-flow-title";
  driversTitle.textContent = `${model.flow?.label ?? "Net flow"} by counterparty`;
  drivers.append(driversTitle);

  const list = document.createElement("div");
  list.className = "cost-of-risk-npl-flow-driver-list";
  (model.drivers ?? []).forEach((driver) => {
    const row = document.createElement("button");
    row.className = "cost-of-risk-npl-flow-driver";
    row.disabled = String(driver.value ?? "").startsWith("__");
    row.type = "button";
    if (!row.disabled) row.dataset.costOfRiskNplCounterparty = driver.value;

    const label = document.createElement("span");
    label.className = "cost-of-risk-npl-flow-driver-label";
    label.textContent = driver.label;
    const value = document.createElement("span");
    value.className = "cost-of-risk-npl-flow-driver-value";
    value.textContent = formatCostOfRiskDisplayValue(
      activeCostOfRiskNplFlowsDisplayMode === "ratio" ? driver.ratioBasisPoints : driver.value,
      activeCostOfRiskNplFlowsDisplayMode,
      selectedUnit,
      true
    );
    row.append(label, value);
    list.append(row);
  });
  drivers.append(list);

  root.append(metrics, drivers);
  elements.costOfRiskNplFlowsPanel.replaceChildren(root);
}

function renderCostOfRiskDefinitionView(definitionModel, state) {
  destroyCostOfRiskDefinitionComparisonChart();
  renderCostOfRiskDefinitionPanel(definitionModel, state.selectedUnit);
  if (getCostOfRiskMovementChart()?.renderTo !== elements.costOfRiskDefinitionChart) {
    destroyCostOfRiskMovementChart();
  }
  const isTotalDefinitionSelected = !activeCostOfRiskDefinitionDriverCode;
  const chartSelection = isTotalDefinitionSelected && activeCostOfRiskDefinitionBenchmarkMode === "f02"
    ? buildCostOfRiskDefinitionVsF02ChartSelection(definitionModel, state)
    : {
        ...definitionModel,
        series: definitionModel.chartSeries ?? definitionModel.series
      };
  const chartSelectedSeriesName = isTotalDefinitionSelected && activeCostOfRiskDefinitionBenchmarkMode === "f02"
    ? getCostOfRiskDefinitionVsF02CurrentSeriesName(definitionModel)
    : state.selectedJst;
  renderMovementTimeSeriesChart({
    activeReferenceDate: activeCostOfRiskReferenceDate,
    container: elements.costOfRiskDefinitionChart,
    displayMode: activeCostOfRiskDefinitionDisplayMode,
    focusSelectedYAxis: activeCostOfRiskFocusSelectedYAxis,
    jstCode: chartSelectedSeriesName,
    benchmarkMode: activeCostOfRiskDefinitionBenchmarkMode,
    onClearSmoothing: clearCostOfRiskSmoothing,
    onChangeSmoothing: updateCostOfRiskSmoothingWindow,
    onSelectJst: isTotalDefinitionSelected && activeCostOfRiskDefinitionBenchmarkMode === "f02"
      ? () => {}
      : selectCostOfRiskChartJst,
    onSelectReferenceDate: selectCostOfRiskReferenceDate,
    onToggleBenchmarkMode: setCostOfRiskDefinitionBenchmarkMode,
    onToggleYAxisFocus: toggleCostOfRiskFocusedYAxis,
    peerDisplayMode: isTotalDefinitionSelected && activeCostOfRiskDefinitionBenchmarkMode === "f02"
      ? "explicit"
      : state.peerDisplayMode,
    renderTabEmpty: renderCostOfRiskTabEmpty,
    selectedUnit: state.selectedUnit,
    selection: chartSelection,
    showBenchmarkModeToggle: isTotalDefinitionSelected,
    smoothingWindow: activeCostOfRiskSmoothingWindow,
    titleText: "Cost of Risk - Time Evolution"
  });
}

function buildCostOfRiskDefinitionVsF02ChartSelection(definitionModel, state) {
  const f02Model = getCostOfRiskDefinitionModelForId(
    state,
    "f02-impairment",
    "",
    getActiveCostOfRiskCustomDefinitionXCodes(),
    {
      includeBenchmarkSeries: false,
      includeComponents: false,
      includeDrivers: false
    }
  );
  const currentSeriesName = getCostOfRiskDefinitionVsF02CurrentSeriesName(definitionModel);
  return {
    ...definitionModel,
    benchmarkSeries: [
      {
        jstCode: currentSeriesName,
        points: definitionModel.series ?? []
      },
      {
        jstCode: "F02",
        points: f02Model.series ?? []
      }
    ],
    selectedAreaSeriesName: "F02",
    series: definitionModel.series ?? []
  };
}

function getCostOfRiskDefinitionVsF02CurrentSeriesName(definitionModel) {
  return definitionModel.definition?.label ?? "Current definition";
}

function getCostOfRiskDefinitionModelForId(
  state,
  definitionId,
  selectedDriverCode = "",
  customDefinitionCodes = getActiveCostOfRiskCustomDefinitionXCodes(),
  options = {}
) {
  return getCostOfRiskCachedModel(
    state,
    createCostOfRiskModelCacheKey(
      state,
      "cost-of-risk-definition",
      activeCostOfRiskFilters,
      activeCostOfRiskReferenceDate,
      definitionId,
      selectedDriverCode,
      customDefinitionCodes.join(","),
      options
    ),
    () => buildCostOfRiskDefinitionModel(
      state,
      definitionId,
      activeCostOfRiskFilters,
      activeCostOfRiskReferenceDate,
      selectedDriverCode,
      customDefinitionCodes,
      options
    )
  );
}

function getCostOfRiskDefinitionModelOptions() {
  const selectedCode = String(activeCostOfRiskDefinitionDriverCode ?? "");
  const selectedComponent = selectedCode.startsWith("component:");
  return {
    includeBenchmarkSeries: true,
    includeComponents: activeCostOfRiskDefinitionPanelTab === "components" || selectedComponent,
    includeDrivers: activeCostOfRiskDefinitionPanelTab === "drivers" || (Boolean(selectedCode) && !selectedComponent)
  };
}

function renderCostOfRiskDefinitionComparisonView(comparisonModels, benchmarkModel, state) {
  renderCostOfRiskDefinitionComparisonPanel(comparisonModels, benchmarkModel, state);
  if (getCostOfRiskMovementChart()?.renderTo !== elements.costOfRiskDefinitionChart) {
    destroyCostOfRiskMovementChart();
  }
  const chartSelection = activeCostOfRiskDefinitionBenchmarkMode === "f02"
    ? buildCostOfRiskDefinitionVsF02ChartSelection(benchmarkModel, state)
    : benchmarkModel;
  const chartSelectedSeriesName = activeCostOfRiskDefinitionBenchmarkMode === "f02"
    ? getCostOfRiskDefinitionVsF02CurrentSeriesName(benchmarkModel)
    : state.selectedJst;
  renderMovementTimeSeriesChart({
    activeReferenceDate: activeCostOfRiskReferenceDate,
    container: elements.costOfRiskDefinitionChart,
    displayMode: activeCostOfRiskDefinitionDisplayMode,
    focusSelectedYAxis: activeCostOfRiskFocusSelectedYAxis,
    jstCode: chartSelectedSeriesName,
    benchmarkMode: activeCostOfRiskDefinitionBenchmarkMode,
    onClearSmoothing: clearCostOfRiskSmoothing,
    onChangeSmoothing: updateCostOfRiskSmoothingWindow,
    onSelectJst: activeCostOfRiskDefinitionBenchmarkMode === "f02" ? () => {} : selectCostOfRiskChartJst,
    onSelectReferenceDate: selectCostOfRiskReferenceDate,
    onToggleBenchmarkMode: setCostOfRiskDefinitionBenchmarkMode,
    onToggleYAxisFocus: toggleCostOfRiskFocusedYAxis,
    peerDisplayMode: activeCostOfRiskDefinitionBenchmarkMode === "f02" ? "explicit" : state.peerDisplayMode,
    renderTabEmpty: renderCostOfRiskTabEmpty,
    selectedUnit: state.selectedUnit,
    selection: chartSelection,
    showBenchmarkModeToggle: true,
    smoothingWindow: activeCostOfRiskSmoothingWindow,
    titleText: `Cost of Risk - ${benchmarkModel.definition?.label ?? "Selected definition"} Benchmark`
  });
}

function renderCostOfRiskDefinitionPanel(definitionModel, selectedUnit = "millions") {
  if (!elements.costOfRiskDefinitionPanel) return;
  if (definitionModel.status) {
    elements.costOfRiskDefinitionPanel.replaceChildren(createCostOfRiskDefinitionEmpty(definitionModel.status));
    return;
  }

  const root = document.createElement("div");
  root.className = "cost-of-risk-definition-grid cost-of-risk-definition-grid--side";
  root.append(createCostOfRiskDefinitionSummary(definitionModel, selectedUnit));

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

function createCostOfRiskDefinitionSummary(definitionModel, selectedUnit) {
  const summary = document.createElement("div");
  summary.className = "cost-of-risk-definition-summary";
  summary.append(
    createCostOfRiskDefinitionButton(definitionModel),
    createCostOfRiskDefinitionValueButton(definitionModel, selectedUnit),
    createCostOfRiskDefinitionScopeDetails(definitionModel, selectedUnit)
  );
  return summary;
}

function renderCostOfRiskDefinitionComparisonPanel(comparisonModels, benchmarkModel, state) {
  if (!elements.costOfRiskDefinitionPanel) return;
  if (!window.Highcharts) return;
  destroyCostOfRiskDefinitionComparisonChart();

  const root = document.createElement("div");
  root.className = "cost-of-risk-definition-comparison";
  root.append(createCostOfRiskDefinitionHeader(benchmarkModel, state.selectedUnit));
  const chartContainer = document.createElement("div");
  chartContainer.className = "cost-of-risk-definition-comparison-chart";
  root.append(chartContainer);
  elements.costOfRiskDefinitionPanel.replaceChildren(root);

  const palette = ["#8f9893", "#a2aaa6", "#b4bbb8", "#7f8984"];
  const dashStyles = ["ShortDash", "ShortDot", "Dash", "Dot"];
  const series = comparisonModels.map((model, index) => {
    const definitionId = model.definition?.id ?? "";
    const isActive = definitionId === activeCostOfRiskComparisonBenchmarkDefinitionId;
    const color = isActive ? primaryDark : palette[index % palette.length];
    const chartData = createCostOfRiskChartData(smoothCostOfRiskPoints(model.series ?? [], activeCostOfRiskSmoothingWindow), activeCostOfRiskDefinitionDisplayMode);
    return {
      clip: false,
      color,
      custom: {
        benchmarkLabel: model.definition?.label ?? definitionId,
        definitionId
      },
      dashStyle: isActive ? "Solid" : dashStyles[index % dashStyles.length],
      data: chartData,
      fillColor: isActive ? "rgba(140, 148, 144, 0.12)" : "transparent",
      lineWidth: isActive ? 3.6 : 1.45,
      marker: {
        fillColor: isActive ? "#ffffff" : color,
        enabled: isActive,
        lineColor: color,
        lineWidth: isActive ? 1.5 : 0,
        radius: isActive ? 5 : 0,
        symbol: "circle"
      },
      name: definitionId,
      opacity: isActive ? 1 : 0.78,
      states: {
        hover: {
          enabled: true,
          halo: { size: isActive ? 9 : 0 },
          lineWidth: isActive ? 4 : 2.1,
          lineWidthPlus: 0
        },
        inactive: {
          opacity: isActive ? 1 : 0.42
        }
      },
      threshold: 0,
      type: isActive ? "area" : "line",
      zIndex: isActive ? 100 : 1
    };
  }).filter((serie) => serie.data.length > 0);
  if (series.length === 0) {
    chartContainer.textContent = "No cost of risk definition time series is available for the current selection.";
    return;
  }
  const yBounds = getCostOfRiskYAxisBounds(series);
  const selectedReferencePoint = benchmarkModel.series?.find((point) => point.label === activeCostOfRiskReferenceDate);

  const options = {
    chart: {
      animation: false,
      backgroundColor: "transparent",
      events: {
        render() {
          renderBenchmarkEndpointLabels(this, activeCostOfRiskComparisonBenchmarkDefinitionId, selectCostOfRiskComparisonDefinition);
        }
      },
      spacingRight: 128,
      type: "line",
      zooming: { type: "xy" },
      zoomType: "xy"
    },
    credits: { enabled: false },
    legend: { enabled: false },
    plotOptions: {
      series: {
        animation: false,
        cursor: "pointer",
        events: {
          click() {
            const definitionId = this.userOptions?.custom?.definitionId ?? "";
            selectCostOfRiskComparisonDefinition(definitionId);
          }
        },
        point: {
          events: {
            click() {
              const definitionId = this.series?.userOptions?.custom?.definitionId ?? "";
              setTimeout(() => selectCostOfRiskComparisonDefinition(definitionId, this.referenceLabel), 0);
            }
          }
        }
      }
    },
    series,
    title: { text: "" },
    tooltip: {
      headerFormat: "<span style=\"font-size:11px\">{point.key:%d/%m/%Y}</span><br/>",
      pointFormatter() {
          const label = this.series.userOptions?.custom?.benchmarkLabel ?? this.series.name;
          return `<span style="color:${this.series.color}">●</span> <b>${escapeHtml(label)}</b>: ${formatCostOfRiskDisplayValue(this.y, activeCostOfRiskDefinitionDisplayMode, state.selectedUnit)}`;
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
      tickPositions: getCostOfRiskAxisTickPositions(comparisonModels.flatMap((model) => model.series ?? [])),
      type: "datetime"
    },
    yAxis: {
      gridLineColor: "#edf0ee",
      labels: {
        formatter() {
          return activeCostOfRiskDefinitionDisplayMode === "ratio"
            ? new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(this.value)
            : formatMetricValue(this.value, state.selectedUnit);
        },
        style: { color: "#5f6b65" }
      },
      max: yBounds.max,
      min: yBounds.min,
      lineColor: "#aeb8b2",
      lineWidth: 1,
      startOnTick: false,
      endOnTick: false,
      tickAmount: 6,
      title: { text: activeCostOfRiskDefinitionDisplayMode === "ratio" ? "Cost of risk (bp)" : "Amount" }
    }
  };

  costOfRiskDefinitionComparisonChart = window.Highcharts.chart(chartContainer, options);
  scheduleBenchmarkEndpointLabels(
    costOfRiskDefinitionComparisonChart,
    activeCostOfRiskComparisonBenchmarkDefinitionId,
    selectCostOfRiskComparisonDefinition
  );
}

function destroyCostOfRiskDefinitionComparisonChart() {
  if (!costOfRiskDefinitionComparisonChart) return;
  costOfRiskDefinitionComparisonChart.destroy();
  costOfRiskDefinitionComparisonChart = null;
}

function selectCostOfRiskComparisonDefinition(definitionId, referenceLabel = "") {
  if (!COST_OF_RISK_COMPARISON_METHOD_IDS.includes(definitionId)) return;
  activeCostOfRiskComparisonBenchmarkDefinitionId = definitionId;
  activeCostOfRiskDefinitionDriverCode = "";
  if (referenceLabel) activeCostOfRiskReferenceDate = referenceLabel;
  if (getLatestState()) rerenderApp(getLatestState());
}

function createCostOfRiskDefinitionHeader(definitionModel, selectedUnit) {
  const header = document.createElement("div");
  header.className = "cost-of-risk-definition-header";
  header.append(
    createCostOfRiskDefinitionButton(definitionModel),
    createCostOfRiskDefinitionValueButton(definitionModel, selectedUnit)
  );
  return header;
}

function createCostOfRiskDefinitionButton(definitionModel) {
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
  return definitionButton;
}

function createCostOfRiskDefinitionValueButton(definitionModel, selectedUnit) {
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

  return valueButton;
}

function createCostOfRiskDefinitionScopeDetails(definitionModel, selectedUnit) {
  const details = document.createElement("div");
  details.className = "cost-of-risk-definition-scope-details";
  [
    {
      label: "Numerator",
      value: formatMetricValue(definitionModel.value, selectedUnit)
    },
    {
      label: "Denominator",
      value: formatMetricValue(definitionModel.denominator, selectedUnit)
    }
  ].forEach((item) => {
    const row = document.createElement("div");
    row.className = "cost-of-risk-definition-scope-row";

    const label = document.createElement("span");
    label.className = "cost-of-risk-definition-scope-label";
    label.textContent = `${item.label}:`;

    const value = document.createElement("span");
    value.className = "cost-of-risk-definition-scope-value";
    value.textContent = item.value;

    row.append(label, value);
    details.append(row);
  });

  return details;
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

function setCostOfRiskDefinitionSelectedDataSummary(definitionModel, state) {
  if (definitionModel?.status) {
    clearCostOfRiskSelectedDataSummary();
    return;
  }

  const referenceLabel = formatReferenceQuarterLabel(definitionModel.referenceDate || activeCostOfRiskReferenceDate);
  const scopePhrase = getCostOfRiskSelectedPerimeterPhrase();
  const selectedItem = activeCostOfRiskDefinitionDriverCode
    ? (definitionModel.components ?? []).find((item) => item.code === activeCostOfRiskDefinitionDriverCode)
      ?? (definitionModel.drivers ?? []).find((item) => item.code === activeCostOfRiskDefinitionDriverCode)
      ?? null
    : null;
  const itemLabel = selectedItem?.label ?? definitionModel.definition?.label ?? "the selected cost of risk definition";
  const value = selectedItem ? selectedItem.value : definitionModel.value;
  const ratio = selectedItem ? selectedItem.ratioBasisPoints : definitionModel.ratioBasisPoints;
  const displayValue = activeCostOfRiskDefinitionDisplayMode === "ratio" ? ratio : value;
  const formattedValue = formatCostOfRiskSelectedDisplayValue(
    displayValue,
    activeCostOfRiskDefinitionDisplayMode,
    state.selectedUnit,
    true
  );
  const amountLabel = formatCostOfRiskSelectedAmount(value, state.selectedUnit, true);
  const denominatorLabel = formatCostOfRiskSelectedAmount(definitionModel.denominator, state.selectedUnit);
  const definitionLabel = definitionModel.definition?.label ?? "selected definition";
  const text = activeCostOfRiskDefinitionDisplayMode === "ratio"
    ? `At ${referenceLabel}, for ${scopePhrase}, ${itemLabel} contributes ${formattedValue} under the ${definitionLabel}, calculated from ${amountLabel} over an exposure base of ${denominatorLabel}.`
    : `At ${referenceLabel}, for ${scopePhrase}, ${itemLabel} contributes ${formattedValue} under the ${definitionLabel}.`;
  setCostOfRiskSelectedDataSummary(createCostOfRiskSelectedDataDescription(text, formattedValue));
}

function setCostOfRiskNplFlowsSelectedDataSummary(model, state) {
  if (model?.status) {
    clearCostOfRiskSelectedDataSummary();
    return;
  }

  const metric = (model.metrics ?? []).find((candidate) => candidate.key === model.flow?.key) ?? model;
  const referenceLabel = formatReferenceQuarterLabel(model.referenceDate || activeCostOfRiskReferenceDate);
  const scopePhrase = getCostOfRiskSelectedPerimeterPhrase();
  const displayValue = activeCostOfRiskNplFlowsDisplayMode === "ratio" ? metric.ratioBasisPoints : metric.value;
  const formattedValue = formatCostOfRiskSelectedDisplayValue(
    displayValue,
    activeCostOfRiskNplFlowsDisplayMode,
    state.selectedUnit,
    true
  );
  const amountLabel = formatCostOfRiskSelectedAmount(metric.value, state.selectedUnit, true);
  const denominatorLabel = formatCostOfRiskSelectedAmount(metric.denominator, state.selectedUnit);
  const flowLabel = model.flow?.label ?? "the selected NPL flow";
  const text = activeCostOfRiskNplFlowsDisplayMode === "ratio"
    ? `At ${referenceLabel}, for ${scopePhrase}, ${flowLabel} is ${formattedValue}, calculated from ${amountLabel} over a previous-quarter loans and advances denominator of ${denominatorLabel}.`
    : `At ${referenceLabel}, for ${scopePhrase}, ${flowLabel} is ${formattedValue} in quarterly NPL flows from F_18.01.`;
  setCostOfRiskSelectedDataSummary(createCostOfRiskSelectedDataDescription(text, formattedValue));
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
    nplFlowsDisplayMenuOpen: activeCostOfRiskNplFlowsDisplayMenuOpen,
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
  if (activeCostOfRiskTab === "npl-flows") return activeCostOfRiskNplFlowsDisplayMode;
  if (activeCostOfRiskTab === "stage-transfers") return activeCostOfRiskStageTransferDisplayMode;
  return activeCostOfRiskDisplayMode;
}

function hasOpenCostOfRiskFilterMenu() {
  return activeCostOfRiskContributionDisplayMenuOpen
    || activeCostOfRiskStageTransferDisplayMenuOpen
    || activeCostOfRiskNplFlowsDisplayMenuOpen
    || activeCostOfRiskSummaryDisplayMenuOpen;
}

function closeCostOfRiskFilterMenus() {
  const changed = hasOpenCostOfRiskFilterMenu();
  activeCostOfRiskContributionDisplayMenuOpen = false;
  activeCostOfRiskStageTransferDisplayMenuOpen = false;
  activeCostOfRiskNplFlowsDisplayMenuOpen = false;
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

function getCostOfRiskAuditReferenceIndex(audit, referenceDate = activeCostOfRiskReferenceDate) {
  const dates = audit?.dates ?? [];
  const index = dates.findIndex((date) => date.label === referenceDate);
  return index >= 0 ? index : Math.max(0, dates.length - 1);
}

function getCostOfRiskAuditRowValue(audit, predicate, referenceDate = activeCostOfRiskReferenceDate) {
  const row = (audit?.rows ?? []).find(predicate);
  if (!row) return null;
  return row.values?.[getCostOfRiskAuditReferenceIndex(audit, referenceDate)] ?? null;
}

function formatCostOfRiskSelectedAmount(value, selectedUnit, signed = false) {
  if (!Number.isFinite(value)) return "-";
  return `${signed ? formatSignedMetricValue(value, selectedUnit) : formatMetricValue(value, selectedUnit)} ${getCostOfRiskUnitLongLabel(selectedUnit)}`;
}

function formatCostOfRiskSelectedDisplayValue(value, displayMode, selectedUnit, signed = true) {
  return displayMode === "ratio"
    ? formatCostOfRiskDisplayValue(value, "ratio", selectedUnit, signed)
    : formatCostOfRiskSelectedAmount(value, selectedUnit, signed);
}

function setCostOfRiskMovementSelectedDataSummary(state) {
  const selectedCode = activeCostOfRiskMovementAuditXCode || activeCostOfRiskXAxisCode;
  const audit = buildCostOfRiskMovementContributionAudit(
    state,
    activeCostOfRiskFilters,
    selectedCode
  );
  const amount = getCostOfRiskAuditRowValue(audit, (row) => row.label === "Displayed contribution");
  const relative = getCostOfRiskAuditRowValue(audit, (row) => row.label === "Relative contribution");
  const denominator = getCostOfRiskAuditRowValue(audit, (row) => row.label === "Denominator total");
  const displayValue = activeCostOfRiskMovementDisplayMode === "ratio" ? relative : amount;
  const formattedValue = formatCostOfRiskSelectedDisplayValue(
    displayValue,
    activeCostOfRiskMovementDisplayMode,
    state.selectedUnit,
    true
  );
  const amountLabel = formatCostOfRiskSelectedAmount(amount, state.selectedUnit, true);
  const denominatorLabel = formatCostOfRiskSelectedAmount(denominator, state.selectedUnit);
  const referenceLabel = formatReferenceQuarterLabel(activeCostOfRiskReferenceDate || audit.referenceDate);
  const componentLabel = getCostOfRiskReadableMovementComponentLabel(audit.title);
  const scopePhrase = getCostOfRiskSelectedPerimeterPhrase();
  const text = activeCostOfRiskMovementDisplayMode === "amount" && Number.isFinite(amount)
    ? `At ${referenceLabel}, for ${scopePhrase}, ${componentLabel} ${amount < 0 ? "reduces" : "increases"} ECL by ${formatCostOfRiskSelectedAmount(Math.abs(amount), state.selectedUnit)}.`
    : `At ${referenceLabel}, for ${scopePhrase}, the contribution from ${componentLabel} to ECL movements is ${formattedValue}.`;
  const detail = `from ${amountLabel} over ${denominatorLabel} previous-quarter exposure`;
  setCostOfRiskSelectedDataSummary(activeCostOfRiskMovementDisplayMode === "ratio"
    ? createCostOfRiskSelectedDataDescriptionWithDetail(text, detail, formattedValue)
    : createCostOfRiskSelectedDataDescription(text, formattedValue));
}

function getCostOfRiskReadableMovementComponentLabel(title) {
  const label = String(title || "the selected component")
    .replace(/^\s*\d{4}\s*-\s*/u, "")
    .replace(/^Movements\//iu, "")
    .trim();
  const normalized = label.toLowerCase();
  const replacements = [
    ["increases due to origination and acquisition", "origination and acquisition"],
    ["decreases due to derecognition", "derecognition"],
    ["changes due to change in credit risk", "credit-risk changes"],
    ["changes due to modifications without derecognition", "modifications without derecognition"],
    ["changes due to update in the institution's methodology for estimation", "methodology updates"],
    ["changes due to update in the institutions methodology for estimation", "methodology updates"],
    ["recoveries of previously written-off amounts recorded directly to the statement of profit or loss", "recoveries of written-off amounts"],
    ["amounts written-off directly to the statement of profit or loss", "direct write-offs to P&L"],
    ["gains or losses on derecognition", "derecognition gains and losses"],
    ["other adjustments", "other adjustments"]
  ];
  const match = replacements.find(([source]) => normalized === source);
  return match ? match[1] : label.charAt(0).toLowerCase() + label.slice(1);
}

function setCostOfRiskStageTransferSelectedDataSummary(state) {
  const audit = buildCostOfRiskStageTransferPanelAudit(
    state,
    activeCostOfRiskFilters,
    activeCostOfRiskStageTransferFlowKey,
    activeCostOfRiskReferenceDate
  );
  const isStageBox = activeCostOfRiskStageTransferFlowKey.startsWith("stagebox:");
  const displayMode = isStageBox ? "amount" : activeCostOfRiskStageTransferDisplayMode;
  const amount = getCostOfRiskAuditRowValue(audit, (row) => row.label === "Displayed value");
  const relative = getCostOfRiskAuditRowValue(audit, (row) => row.label === "Relative transfer");
  const denominator = getCostOfRiskAuditRowValue(audit, (row) => row.label === "Denominator total");
  const displayValue = displayMode === "ratio" ? relative : amount;
  const formattedValue = formatCostOfRiskSelectedDisplayValue(displayValue, displayMode, state.selectedUnit, true);
  const amountLabel = formatCostOfRiskSelectedAmount(amount, state.selectedUnit, true);
  const denominatorLabel = formatCostOfRiskSelectedAmount(denominator, state.selectedUnit);
  const referenceLabel = formatReferenceQuarterLabel(activeCostOfRiskReferenceDate || audit.dates?.[0]?.label);
  const scopePhrase = getCostOfRiskSelectedPerimeterPhrase({ omitStage: true });
  const title = getCostOfRiskReadableStageTransferSelectionTitle(audit.title, audit.type);
  const text = isStageBox
    ? `At ${referenceLabel}, for ${scopePhrase}, ${title} contains ${formattedValue} of GCA.`
    : displayMode === "ratio"
      ? `At ${referenceLabel}, for ${scopePhrase}, ${title} is ${formattedValue}`
      : `At ${referenceLabel}, for ${scopePhrase}, ${title} represents a quarterly transfer of ${formattedValue}.`;
  const detail = `from a quarterly transfer of ${amountLabel} over a previous-quarter exposure base of ${denominatorLabel}.`;
  setCostOfRiskSelectedDataSummary(displayMode === "ratio" && !isStageBox
    ? createCostOfRiskSelectedDataDescriptionWithDetail(text, detail, formattedValue)
    : createCostOfRiskSelectedDataDescription(text, formattedValue));
}

function getCostOfRiskReadableStageTransferSelectionTitle(title) {
  const cleanTitle = String(title || "the selected stage transfer")
    .replace(/^\d{4}\s*-\s*/u, "")
    .replace(/\s+/g, " ")
    .trim();
  if (/^to stage/i.test(cleanTitle)) {
    return `transfer ${cleanTitle.charAt(0).toLowerCase()}${cleanTitle.slice(1)}`;
  }
  const netMatch = cleanTitle.match(/^Net\s+Stage\s+(\d)\s*→\s*Stage\s+(\d)$/i);
  if (netMatch) {
    return `net transfer from stage ${netMatch[1]} to stage ${netMatch[2]}`;
  }
  if (/^Net\s+/i.test(cleanTitle)) {
    return cleanTitle.replace(/^Net\s+/i, "net transfer ");
  }
  return cleanTitle.charAt(0).toLowerCase() + cleanTitle.slice(1);
}

function renderCostOfRiskMovementAuditPanel(state, options = {}) {
  if (!elements.costOfRiskAuditPanel) return;

  setCostOfRiskMovementSelectedDataSummary(state);
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

  setCostOfRiskStageTransferSelectedDataSummary(state);
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

function setCostOfRiskRatioSelectedDataSummary(model, state, config) {
  const selectedCell = model.selectedCell;
  const row = (model.rows ?? []).find((candidate) => candidate.key === selectedCell?.stageKey);
  if (!selectedCell || !row) {
    clearCostOfRiskSelectedDataSummary();
    return;
  }

  const referenceLabel = formatReferenceQuarterLabel(model.referenceDate || activeCostOfRiskReferenceDate);
  const scopePhrase = getCostOfRiskSelectedPerimeterPhrase({ omitStage: true });
  const ratioTitle = `${row.label} ${config.ratioName}`;
  const cellValue = getCostOfRiskRatioSelectedCellValue(row, selectedCell);
  const formattedValue = formatCostOfRiskRatioSelectedCellValue(cellValue, selectedCell.metric, state.selectedUnit, config.formatter);
  const numeratorLabel = formatCostOfRiskSelectedAmount(row.currentNumerator, state.selectedUnit);
  const denominatorLabel = formatCostOfRiskSelectedAmount(row.currentDenominator, state.selectedUnit);

  if (selectedCell.driver) {
    const driver = getCostOfRiskRatioSelectedDriver(row, selectedCell);
    const driverValue = Number.isFinite(driver?.effectBasisPoints) ? driver.effectBasisPoints : cellValue;
    const driverLabel = driver?.label ?? selectedCell.driver.label ?? "the selected component";
    const driverFormattedValue = formatCostOfRiskSelectedBasisPoints(driverValue);
    const effectLabel = selectedCell.driver.effectType === "denominator" ? "denominator effect" : "numerator effect";
    const text = `At ${referenceLabel}, for ${scopePhrase}, ${driverLabel} contributes ${driverFormattedValue} to the ${effectLabel} of ${ratioTitle}.`;
    setCostOfRiskSelectedDataSummary(createCostOfRiskSelectedDataDescription(text, driverFormattedValue));
    return;
  }

  let text = "";
  if (selectedCell.metric === "ratio") {
    text = `At ${referenceLabel}, for ${scopePhrase}, ${ratioTitle} is ${formattedValue}, calculated as ${numeratorLabel} of ${config.numeratorName} over ${denominatorLabel} of ${config.denominatorName}.`;
  } else if (selectedCell.metric === "variation") {
    text = `At ${referenceLabel}, for ${scopePhrase}, ${ratioTitle} changes by ${formattedValue} quarter-on-quarter.`;
  } else if (selectedCell.metric === "numeratorEffect" || selectedCell.metric === "denominatorEffect") {
    const effectName = selectedCell.metric === "numeratorEffect" ? "numerator" : "denominator";
    text = `At ${referenceLabel}, for ${scopePhrase}, the ${effectName} contributes ${formattedValue} to the quarter-on-quarter change in ${ratioTitle}.`;
  } else if (selectedCell.metric === "numeratorLevel") {
    text = `At ${referenceLabel}, for ${scopePhrase}, the numerator of ${ratioTitle} is ${formattedValue}, representing ${config.numeratorName}.`;
  } else if (selectedCell.metric === "denominatorLevel") {
    text = `At ${referenceLabel}, for ${scopePhrase}, the denominator of ${ratioTitle} is ${formattedValue}, representing ${config.denominatorName}.`;
  } else if (selectedCell.metric === "numeratorDelta" || selectedCell.metric === "denominatorDelta") {
    const componentName = selectedCell.metric === "numeratorDelta" ? "numerator" : "denominator";
    text = `At ${referenceLabel}, for ${scopePhrase}, the ${componentName} of ${ratioTitle} changes by ${formattedValue} quarter-on-quarter.`;
  } else {
    text = `At ${referenceLabel}, for ${scopePhrase}, ${config.metricLabel(selectedCell.metric).toLowerCase()} for ${ratioTitle} is ${formattedValue}.`;
  }

  setCostOfRiskSelectedDataSummary(createCostOfRiskSelectedDataDescription(text, formattedValue));
}

function formatCostOfRiskSelectedBasisPoints(value) {
  if (!Number.isFinite(value)) return "-";
  return `${value > 0 ? "+" : ""}${formatBasisPointsValue(value)}`;
}

function getCostOfRiskRatioSelectedCellValue(row, selectedCell) {
  if (selectedCell.driver) {
    return getCostOfRiskRatioSelectedDriver(row, selectedCell)?.effectBasisPoints ?? null;
  }
  return row.cells?.[selectedCell.metric]?.value ?? null;
}

function getCostOfRiskRatioSelectedDriver(row, selectedCell) {
  const drivers = selectedCell.driver?.effectType === "denominator"
    ? row.denominatorDrivers ?? []
    : row.numeratorDrivers ?? [];
  return drivers.find((driver) => (
    driver.effectType === selectedCell.driver.effectType
    && driver.counterpartyKey === selectedCell.driver.counterpartyKey
    && driver.assetKey === selectedCell.driver.assetKey
  )) ?? null;
}

function formatCostOfRiskRatioSelectedCellValue(value, metric, selectedUnit, formatter) {
  const formatted = formatter(value, metric, selectedUnit);
  if (!Number.isFinite(value) || metric === "ratio" || metric === "variation" || metric.endsWith("Effect")) return formatted;
  return `${formatted} ${getCostOfRiskUnitLongLabel(selectedUnit)}`;
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
    `Current denominator, GCA: ${formatMetricValue(row.currentDenominator, state.selectedUnit)}`,
    `Previous numerator, allowances: ${formatMetricValue(row.previousNumerator, state.selectedUnit)}`,
    `Previous denominator, GCA: ${formatMetricValue(row.previousDenominator, state.selectedUnit)}`
  ]));
  article.append(createCostOfRiskAuditInfoSection("Decomposition method", [
    "Coverage ratio = allowances for the stage divided by GCA for the same stage.",
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
    `Current denominator, GCA: ${formatMetricValue(row.currentDenominator, state.selectedUnit)}`,
    `Previous numerator, collateral received: ${formatMetricValue(row.previousNumerator, state.selectedUnit)}`,
    `Previous denominator, GCA: ${formatMetricValue(row.previousDenominator, state.selectedUnit)}`
  ]));
  article.append(createCostOfRiskAuditInfoSection("Decomposition method", [
    "Collateral ratio = maximum amount of collateral received that can be considered divided by GCA.",
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
  const selectionDescription = createCostOfRiskSummarySelectionDescription({
    cell,
    isCounterpartyCell,
    row,
    selectedCell,
    selectedUnit: state.selectedUnit,
    summary
  });
  setCostOfRiskSelectedDataSummary(selectionDescription);
  if (renderCostOfRiskHelpPanel()) return;

  const article = document.createElement("article");
  article.className = "cost-of-risk-audit-intro";

  if (!options.allowDataAudit) {
    replaceCostOfRiskAuditPanelContent();
    return;
  }

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

function createCostOfRiskSummarySelectionDescription({
  cell,
  isCounterpartyCell,
  row,
  selectedCell,
  selectedUnit,
  summary
}) {
  const block = document.createElement("section");
  block.className = "cost-of-risk-selected-data-summary";

  const label = document.createElement("span");
  label.className = "cost-of-risk-selected-data-summary-label";
  label.textContent = "Selection";

  const description = document.createElement("span");
  description.className = "cost-of-risk-selected-data-summary-description";
  const selectedValue = getCostOfRiskSummarySelectedDataEmphasisValue(row, cell, selectedCell, selectedUnit);
  appendCostOfRiskHighlightedSelectionText(description, getCostOfRiskSummarySelectionDescription({
    cell,
    isCounterpartyCell,
    row,
    selectedCell,
    selectedUnit,
    summary
  }), selectedValue);

  block.append(label, description);
  return block;
}

function getCostOfRiskSummarySelectionDescription({
  cell,
  isCounterpartyCell,
  row,
  selectedCell,
  selectedUnit,
  summary
}) {
  const dateLabel = formatReferenceQuarterLabel(summary.referenceDate);
  const rowLabel = row?.label ?? "the selected row";
  const scopePhrase = getCostOfRiskSummarySelectedScopePhrase(isCounterpartyCell);
  const unitLabel = getCostOfRiskUnitLongLabel(selectedUnit);
  const numerator = getCostOfRiskSummaryNumeratorValue(row, cell, selectedCell);
  const numeratorLabel = Number.isFinite(numerator) ? `${formatMetricValue(numerator, selectedUnit)} ${unitLabel}` : "the selected amount";
  const denominator = getCostOfRiskSummaryDenominatorValue(row, cell, selectedCell);
  const denominatorLabel = Number.isFinite(denominator)
    ? `${formatMetricValue(denominator, selectedUnit)} ${unitLabel}`
    : "";
  const displayedSelectionValue = getCostOfRiskSummarySelectedDataEmphasisValue(row, cell, selectedCell, selectedUnit);

  if (selectedCell.metric === "gca" && selectedCell.kind === "ratio") {
    return `At ${dateLabel}, for ${scopePhrase}, ${rowLabel} represents ${formatContributionPercentValue(cell.ratio)} (${numeratorLabel}) of total GCA${denominatorLabel ? ` (${denominatorLabel})` : ""}.`;
  }

  if (selectedCell.metric === "coverage" && selectedCell.kind !== "mom") {
    return `At ${dateLabel}, for ${scopePhrase}, ${rowLabel} coverage is ${formatContributionPercentValue(cell.value)} (${numeratorLabel}) over GCA${denominatorLabel ? ` (${denominatorLabel})` : ""}.`;
  }

  if (selectedCell.metric === "collateral" && selectedCell.kind !== "mom") {
    return `At ${dateLabel}, for ${scopePhrase}, ${rowLabel} collateralisation is ${formatContributionPercentValue(cell.value)} (${numeratorLabel}) over GCA${denominatorLabel ? ` (${denominatorLabel})` : ""}.`;
  }

  if (selectedCell.kind === "mom") {
    return `At ${dateLabel}, for ${scopePhrase}, ${rowLabel} shows a quarter-on-quarter variation of ${displayedSelectionValue}. In relative mode, it is divided by the previous-quarter value for the same row.`;
  }

  const metricLabel = getCostOfRiskSummaryAuditMetricLabel(selectedCell).toLowerCase();
  return `At ${dateLabel}, for ${scopePhrase}, ${rowLabel} ${metricLabel} is ${numeratorLabel}.`;
}

function getCostOfRiskSummarySelectedDataEmphasisValue(row, cell, selectedCell, selectedUnit) {
  if (getActiveCostOfRiskDisplayMode() !== "amount") {
    return formatCostOfRiskSummaryAuditValue(cell, selectedCell, selectedUnit);
  }

  const unitLabel = getCostOfRiskUnitLongLabel(selectedUnit);
  if (selectedCell.kind === "mom") {
    return Number.isFinite(cell?.mom)
      ? `${formatSignedMetricValue(cell.mom, selectedUnit)} ${unitLabel}`
      : "";
  }

  const numerator = getCostOfRiskSummaryNumeratorValue(row, cell, selectedCell);
  return Number.isFinite(numerator)
    ? `${formatMetricValue(numerator, selectedUnit)} ${unitLabel}`
    : "";
}

function getCostOfRiskSummaryNumeratorValue(row, cell, selectedCell) {
  if (selectedCell.metric === "coverage") return row?.cells?.allowances?.value ?? null;
  if (selectedCell.metric === "collateral") return row?.cells?.collateralAmount?.value ?? null;
  return cell?.value ?? null;
}

function getCostOfRiskSummaryDenominatorValue(row, cell, selectedCell) {
  if (selectedCell.kind === "mom") return null;
  if (selectedCell.metric === "coverage" || selectedCell.metric === "collateral") return row?.cells?.gca?.value ?? null;
  const numerator = cell?.value;
  const ratio = cell?.ratio;
  return selectedCell.metric === "gca" && Number.isFinite(numerator) && Number.isFinite(ratio) && ratio !== 0
    ? numerator / ratio
    : null;
}

function getCostOfRiskSummarySelectedScopePhrase(isCounterpartyCell) {
  const balanceScope = getCostOfRiskActiveFilterLabel("balanceScopes", activeCostOfRiskFilters.balanceScope) || "In-balance";
  const instrument = getCostOfRiskActiveFilterLabel("assets", activeCostOfRiskFilters.asset) || "All instruments";
  const counterparty = isCounterpartyCell
    ? "all counterparties"
    : getCostOfRiskActiveFilterLabel("counterparties", activeCostOfRiskFilters.counterparty) || "all counterparties";
  const normalizedBalanceScope = balanceScope.toLowerCase();
  const normalizedInstrument = instrument === "All Instruments" ? "all instruments" : instrument;
  const normalizedCounterparty = counterparty === "All Counterparties" ? "all counterparties" : counterparty;
  return normalizedCounterparty === "all counterparties"
    ? `${normalizedBalanceScope} ${normalizedInstrument} across all counterparties`
    : `${normalizedBalanceScope} ${normalizedInstrument} to ${normalizedCounterparty}`;
}

function getCostOfRiskSelectedPerimeterPhrase(options = {}) {
  const balanceScope = getCostOfRiskActiveFilterLabel("balanceScopes", activeCostOfRiskFilters.balanceScope) || "In-balance";
  const instrument = getCostOfRiskActiveFilterLabel("assets", activeCostOfRiskFilters.asset) || "All Instruments";
  const counterparty = getCostOfRiskActiveFilterLabel("counterparties", activeCostOfRiskFilters.counterparty) || "All Counterparties";
  const status = getCostOfRiskActiveFilterLabel("stages", activeCostOfRiskFilters.stage) || "All Stage";
  const normalizedBalanceScope = balanceScope.toLowerCase();
  const isAllInstrument = ["All", "All Instruments"].includes(instrument);
  const isAllCounterparty = ["All", "All Counterparties"].includes(counterparty);
  const isAllStatus = ["All", "All Stage"].includes(status);
  const normalizedInstrument = isAllInstrument
    ? `all ${normalizedBalanceScope} instruments`
    : `${normalizedBalanceScope} ${instrument}`;
  const parts = [normalizedInstrument];

  if (!options.omitCounterparty && !isAllCounterparty) {
    parts.push(`to ${counterparty}`);
  } else if (!options.omitCounterparty && options.includeAllCounterparties) {
    parts.push("across all counterparties");
  }

  if (!options.omitStage && !isAllStatus) {
    parts.push(`in ${status}`);
  }

  return parts.join(" ");
}

function getCostOfRiskActiveFilterLabel(optionsKey, value) {
  const options = latestCostOfRiskFilterOptions?.[optionsKey] ?? [];
  const normalizedValue = value || COST_OF_RISK_FILTER_ALL;
  const option = options.find((candidate) => candidate.value === normalizedValue);
  return option?.label ?? "";
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
    gca: "GCA"
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
      : `${label} equals ${selectedCell.metric === "collateral" ? "collateral received" : "allowances"} divided by GCA for the selected row.`;
  }
  if (selectedCell.kind === "ratio") {
    return "Exposure ratio equals GCA for the selected row divided by total GCA for the perimeter.";
  }
  if (selectedCell.kind === "mom") {
    return "Variation is the quarter-on-quarter change in the selected stock, expressed as a growth rate versus the previous quarter when relative mode is active.";
  }
  return "Stock value is read from F_18.00 for the selected row and perimeter.";
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
  return Boolean(getCostOfRiskHelpPanelContent(activeCostOfRiskHelpTopic, activeCostOfRiskDefinitionId));
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
  const layout = document.createElement("section");
  layout.className = "cost-of-risk-context-layout";

  const selectionPane = document.createElement("div");
  selectionPane.className = "cost-of-risk-context-selected-pane";
  selectionPane.append(getCostOfRiskSelectedDataSummaryNode());

  const contextualPane = document.createElement("div");
  contextualPane.className = "cost-of-risk-context-detail-pane";
  contextualPane.append(...nodes);

  layout.append(selectionPane, contextualPane);
  elements.costOfRiskAuditPanel.replaceChildren(layout);
}

function setCostOfRiskSelectedDataSummary(node) {
  activeCostOfRiskSelectedDataSummaryNode = node ?? null;
}

function clearCostOfRiskSelectedDataSummary() {
  activeCostOfRiskSelectedDataSummaryNode = null;
}

function getCostOfRiskSelectedDataSummaryNode() {
  return activeCostOfRiskSelectedDataSummaryNode ?? createCostOfRiskSelectedDataPlaceholder();
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
  if (content.control?.type === "smoothing") {
    summary.classList.add("cost-of-risk-audit-intro-lead--smoothing");
  }
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

  const content = getCostOfRiskHelpPanelContent(activeCostOfRiskHelpTopic, activeCostOfRiskDefinitionId);
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
  if (content.control?.type === "smoothing") {
    summary.classList.add("cost-of-risk-audit-intro-lead--smoothing");
  }
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

function renderCostOfRiskFilterSelectionPanel(kind) {
  const previewToken = costOfRiskFilterPreviewRenderer.resetQueue();

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
  }, {
    preview: { kind, token: previewToken, value: COST_OF_RISK_FILTER_ALL }
  }));
  options.filter((option) => option.value !== COST_OF_RISK_FILTER_ALL).forEach((option) => {
    const optionState = getCostOfRiskFilterSelectionOptionState(kind, option);
    tbody.append(createCostOfRiskFilterSelectionRow(optionState.label, option.value === activeValue, () => {
      applyCostOfRiskFilterSelection(meta.filterKey, option.value);
    }, {
      ...optionState,
      preview: optionState.disabled ? null : { kind, token: previewToken, value: option.value }
    }));
  });

  table.append(tbody);
  intro.append(table);

  replaceCostOfRiskAuditPanelContent(intro);
  costOfRiskFilterPreviewRenderer.clearSnapshot();
}

function renderCostOfRiskBalanceScopeSelectionPanel() {
  const previewToken = costOfRiskFilterPreviewRenderer.resetQueue();
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
    }, {
      preview: { kind: "balanceScope", token: previewToken, value: option.value }
    }));
  });
  table.append(tbody);
  intro.append(table);

  replaceCostOfRiskAuditPanelContent(intro);
  costOfRiskFilterPreviewRenderer.clearSnapshot();
}

function renderCostOfRiskStageSelectionPanel() {
  const previewToken = costOfRiskFilterPreviewRenderer.resetQueue();
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
  }, {
    preview: { kind: "stage", token: previewToken, value: COST_OF_RISK_FILTER_ALL }
  }));
  allTable.append(allBody);
  intro.append(allTable);

  intro.append(createCostOfRiskStageSelectionGroup("Staging status", options.filter((option) => isCostOfRiskIfrsStageFilterValue(option.value)), activeValue, previewToken));
  intro.append(createCostOfRiskStageSelectionGroup("Performance status", options.filter((option) => isCostOfRiskPerformanceStatusFilterValue(option.value)), activeValue, previewToken));

  replaceCostOfRiskAuditPanelContent(intro);
  costOfRiskFilterPreviewRenderer.clearSnapshot();
}

function createCostOfRiskStageSelectionGroup(titleText, options, activeValue, previewToken) {
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
    }, {
      preview: { kind: "stage", token: previewToken, value: option.value }
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
  if (options.valueLabel || options.preview) {
    const valueNode = document.createElement("span");
    valueNode.className = "cost-of-risk-filter-selection-option-value";
    if (options.preview) costOfRiskFilterPreviewRenderer.markValueNode(valueNode, options.preview);
    const snapshotValue = costOfRiskFilterPreviewRenderer.consumeSnapshotValue(options.preview);
    valueNode.textContent = snapshotValue ?? options.valueLabel ?? "";
    button.append(valueNode);
    if (options.preview && snapshotValue === null) costOfRiskFilterPreviewRenderer.scheduleValue(valueNode, options.preview);
  }
  if (!options.disabled) button.addEventListener("click", onSelect);
  cell.append(button);
  row.append(cell);
  return row;
}

function getCostOfRiskFilterSelectionPreviewValue(kind, value) {
  const state = getLatestState();
  if (!state) return "";
  return costOfRiskFilterPreviewRenderer.getCachedValue(
    createCostOfRiskFilterPreviewCacheKey(
      "value",
      state.activeDatasetId,
      state.selectedJst,
      state.selectedUnit,
      state.rows?.length ?? 0,
      (state.peerJstCodes ?? []).join(","),
      activeCostOfRiskTab,
      kind,
      value,
      activeCostOfRiskReferenceDate,
      activeCostOfRiskFilters,
      activeCostOfRiskStageSummaryCellKey,
      activeCostOfRiskCounterpartySummaryCellKey,
      activeCostOfRiskStageRatioCellKey,
      activeCostOfRiskCoverageRatioCellKey,
      activeCostOfRiskCollateralRatioCellKey,
      activeCostOfRiskMovementAuditXCode,
      activeCostOfRiskXAxisCode,
      activeCostOfRiskStageTransferFlowKey,
      activeCostOfRiskNplFlowKey,
      activeCostOfRiskDefinitionId,
      activeCostOfRiskDefinitionDriverCode,
      activeCostOfRiskDefinitionDisplayMode,
      activeCostOfRiskMovementDisplayMode,
      activeCostOfRiskStageTransferDisplayMode,
      activeCostOfRiskNplFlowsDisplayMode,
      activeCostOfRiskSummaryDisplayMode
    ),
    () => {
      try {
        const filters = getCostOfRiskPreviewFiltersForSelection(kind, value);
        if (kind === "definition") return formatCostOfRiskFilterPreviewValue(getCostOfRiskDefinitionPreviewValue(state, value));
        if (activeCostOfRiskTab === "summary") return formatCostOfRiskFilterPreviewValue(getCostOfRiskSummaryPreviewValue(state, filters, kind, value));
        if (activeCostOfRiskTab === "stage-ratio") return getCostOfRiskRatioPreviewValue(state, filters, {
          builder: buildCostOfRiskStageRatioModel,
          cellKey: activeCostOfRiskStageRatioCellKey,
          displayMode: "ratio",
          formatter: formatCostOfRiskStageRatioCellValue
        });
        if (activeCostOfRiskTab === "coverage-ratio") return getCostOfRiskRatioPreviewValue(state, filters, {
          builder: buildCostOfRiskCoverageRatioModel,
          cellKey: activeCostOfRiskCoverageRatioCellKey,
          displayMode: "ratio",
          formatter: formatCostOfRiskCoverageRatioCellValue
        });
        if (activeCostOfRiskTab === "collateral-ratio") return getCostOfRiskRatioPreviewValue(state, filters, {
          builder: buildCostOfRiskCollateralRatioModel,
          cellKey: activeCostOfRiskCollateralRatioCellKey,
          displayMode: "ratio",
          formatter: formatCostOfRiskCollateralRatioCellValue
        });
        if (activeCostOfRiskTab === "contributions") return formatCostOfRiskFilterPreviewValue(getCostOfRiskMovementPreviewValue(state, filters));
        if (activeCostOfRiskTab === "stage-transfers") return formatCostOfRiskFilterPreviewValue(getCostOfRiskStageTransferPreviewValue(state, filters, kind, value));
        if (activeCostOfRiskTab === "npl-flows") return formatCostOfRiskFilterPreviewValue(getCostOfRiskNplFlowsPreviewValue(state, filters));
        if (activeCostOfRiskTab === "cost-of-risk") return formatCostOfRiskFilterPreviewValue(getCostOfRiskDefinitionPreviewValue(state, activeCostOfRiskDefinitionId, filters));
      } catch (error) {
        console.warn("Unable to calculate filter preview value", error);
      }
      return "";
    }
  );
}

function formatCostOfRiskFilterPreviewValue(value) {
  return String(value ?? "")
    .replace(/\s+EUR million\b/g, "")
    .trim();
}

function getCostOfRiskPreviewFiltersForSelection(kind, value) {
  const filters = { ...activeCostOfRiskFilters };
  if (kind === "instrument") filters.asset = value;
  if (kind === "counterparty") filters.counterparty = value;
  if (kind === "stage") filters.stage = value;
  if (kind === "balanceScope") filters.balanceScope = value;
  return filters;
}

function getCostOfRiskSummaryPreviewValue(state, filters, kind = "", value = "") {
  if (kind === "stage" || kind === "counterparty") {
    return getCostOfRiskSummaryDimensionPreviewValue(state, kind, value);
  }
  return getCostOfRiskSummaryFilteredPreviewValue(state, filters);
}

function getCostOfRiskSummaryFilteredPreviewValue(state, filters) {
  const model = costOfRiskFilterPreviewRenderer.getCachedValue(
    createCostOfRiskFilterPreviewCacheKey("summary-model", filters, activeCostOfRiskReferenceDate, activeCostOfRiskStageSummaryCellKey),
    () => buildCostOfRiskStageSummaryModel(state, filters, activeCostOfRiskReferenceDate, activeCostOfRiskStageSummaryCellKey, {
      includeCounterpartyRows: Boolean(activeCostOfRiskStageSummaryCellKey?.startsWith("counterparty:"))
    })
  );
  const selectedCell = model.selectedCell;
  if (!selectedCell) return "";
  const rowSource = selectedCell.rowKey ? model.counterpartyRows : model.rows;
  const rowKey = selectedCell.rowKey ?? selectedCell.stageKey;
  const row = (rowSource ?? []).find((candidate) => candidate.key === rowKey);
  const cell = row?.cells?.[selectedCell.metric];
  if (!row || !cell) return "";
  return getCostOfRiskSummarySelectedDataEmphasisValue(row, cell, selectedCell, state.selectedUnit);
}

function getCostOfRiskSummaryDimensionPreviewValue(state, kind, value) {
  const selectedColumnKey = getCostOfRiskSummaryCellColumnKey(activeCostOfRiskStageSummaryCellKey)
    || getCostOfRiskSummaryCellColumnKey(activeCostOfRiskCounterpartySummaryCellKey)
    || getCostOfRiskSummaryCellColumnKey(DEFAULT_COST_OF_RISK_STAGE_SUMMARY_CELL);
  const [metric, cellKind] = selectedColumnKey.split(":");
  if (!metric || !cellKind) return "";

  const model = costOfRiskFilterPreviewRenderer.getCachedValue(
    createCostOfRiskFilterPreviewCacheKey("summary-dimension-model", activeCostOfRiskFilters, activeCostOfRiskReferenceDate, activeCostOfRiskStageSummaryCellKey),
    () => buildCostOfRiskStageSummaryModel(
      state,
      activeCostOfRiskFilters,
      activeCostOfRiskReferenceDate,
      activeCostOfRiskStageSummaryCellKey,
      { includeCounterpartyRows: kind === "counterparty" }
    )
  );
  const rowSource = kind === "counterparty" ? model.counterpartyRows : model.rows;
  const row = (rowSource ?? []).find((candidate) => (
    kind === "counterparty"
      ? getCostOfRiskCounterpartySummaryValue(candidate.key) === value
      : getCostOfRiskStageSummaryFilterValue(candidate.key) === value
  ));
  const cell = row?.cells?.[metric];
  if (!row || !cell) return "";
  return getCostOfRiskSummarySelectedDataEmphasisValue(row, cell, { metric, kind: cellKind }, state.selectedUnit);
}

function getCostOfRiskRatioPreviewValue(state, filters, config) {
  const model = costOfRiskFilterPreviewRenderer.getCachedValue(
    createCostOfRiskFilterPreviewCacheKey("ratio-model", config.builder.name, filters, activeCostOfRiskReferenceDate, config.cellKey),
    () => config.builder(state, filters, activeCostOfRiskReferenceDate, config.cellKey)
  );
  const selectedCell = model.selectedCell;
  const row = (model.rows ?? []).find((candidate) => candidate.key === selectedCell?.stageKey);
  if (!selectedCell || !row) return "";
  const value = getCostOfRiskRatioSelectedCellValue(row, selectedCell);
  return formatCostOfRiskRatioSelectedCellValue(value, selectedCell.metric, state.selectedUnit, config.formatter);
}

function getCostOfRiskMovementPreviewValue(state, filters) {
  const audit = costOfRiskFilterPreviewRenderer.getCachedValue(
    createCostOfRiskFilterPreviewCacheKey("movement-audit", filters, activeCostOfRiskReferenceDate, activeCostOfRiskMovementAuditXCode || activeCostOfRiskXAxisCode),
    () => buildCostOfRiskMovementContributionAudit(
      state,
      filters,
      activeCostOfRiskReferenceDate,
      activeCostOfRiskMovementAuditXCode || activeCostOfRiskXAxisCode
    )
  );
  const amount = getCostOfRiskAuditRowValue(audit, (row) => row.label === "Displayed value");
  const relative = getCostOfRiskAuditRowValue(audit, (row) => row.label === "Relative contribution");
  return formatCostOfRiskSelectedDisplayValue(
    activeCostOfRiskMovementDisplayMode === "ratio" ? relative : amount,
    activeCostOfRiskMovementDisplayMode,
    state.selectedUnit,
    true
  );
}

function getCostOfRiskStageTransferPreviewValue(state, filters, kind = "", value = "") {
  let flowKey = activeCostOfRiskStageTransferFlowKey;
  if (kind === "stage") {
    const stageFlowKey = getCostOfRiskStageTransferFlowKeyForStageFilter(value);
    if (stageFlowKey) {
      flowKey = stageFlowKey;
    } else if (value === COST_OF_RISK_FILTER_ALL || !value) {
      flowKey = activeCostOfRiskStageTransferFlowKey?.startsWith("stagebox:")
        ? DEFAULT_COST_OF_RISK_STAGE_TRANSFER_FLOW_KEY
        : activeCostOfRiskStageTransferFlowKey;
    } else {
      return "";
    }
  }

  const audit = costOfRiskFilterPreviewRenderer.getCachedValue(
    createCostOfRiskFilterPreviewCacheKey("stage-transfer-audit", filters, activeCostOfRiskReferenceDate, flowKey),
    () => buildCostOfRiskStageTransferPanelAudit(
      state,
      filters,
      flowKey,
      activeCostOfRiskReferenceDate
    )
  );
  const isStageBox = flowKey.startsWith("stagebox:");
  const displayMode = isStageBox ? "amount" : activeCostOfRiskStageTransferDisplayMode;
  const amount = getCostOfRiskAuditRowValue(audit, (row) => row.label === "Displayed value");
  const relative = getCostOfRiskAuditRowValue(audit, (row) => row.label === "Relative transfer");
  return formatCostOfRiskSelectedDisplayValue(displayMode === "ratio" ? relative : amount, displayMode, state.selectedUnit, true);
}

function getCostOfRiskNplFlowsPreviewValue(state, filters) {
  const model = costOfRiskFilterPreviewRenderer.getCachedValue(
    createCostOfRiskFilterPreviewCacheKey("npl-flows-model", filters, activeCostOfRiskReferenceDate, activeCostOfRiskNplFlowKey),
    () => buildCostOfRiskNplFlowsModel(state, filters, activeCostOfRiskReferenceDate, activeCostOfRiskNplFlowKey)
  );
  if (model?.status) return "";
  return formatCostOfRiskDisplayValue(
    activeCostOfRiskNplFlowsDisplayMode === "ratio" ? model.ratioBasisPoints : model.value,
    activeCostOfRiskNplFlowsDisplayMode,
    state.selectedUnit,
    true
  );
}

function getCostOfRiskDefinitionPreviewValue(state, definitionId, filters = activeCostOfRiskFilters) {
  if (definitionId === COST_OF_RISK_COMPARISON_DEFINITION_ID) return "";
  const customCodes = getActiveCostOfRiskCustomDefinitionXCodes();
  const model = costOfRiskFilterPreviewRenderer.getCachedValue(
    createCostOfRiskFilterPreviewCacheKey("definition-model", definitionId, filters, activeCostOfRiskReferenceDate, activeCostOfRiskDefinitionDriverCode, customCodes.join(",")),
    () => buildCostOfRiskDefinitionModel(
      state,
      definitionId,
      filters,
      activeCostOfRiskReferenceDate,
      activeCostOfRiskDefinitionDriverCode,
      customCodes,
      {
        includeBenchmarkSeries: false,
        includeComponents: Boolean(activeCostOfRiskDefinitionDriverCode?.startsWith("component:")),
        includeDrivers: Boolean(activeCostOfRiskDefinitionDriverCode && !activeCostOfRiskDefinitionDriverCode.startsWith("component:"))
      }
    )
  );
  if (model?.status) return "";
  const selectedItem = activeCostOfRiskDefinitionDriverCode
    ? (model.components ?? []).find((item) => item.code === activeCostOfRiskDefinitionDriverCode)
      ?? (model.drivers ?? []).find((item) => item.code === activeCostOfRiskDefinitionDriverCode)
      ?? null
    : null;
  const value = selectedItem ? selectedItem.value : model.value;
  const ratio = selectedItem ? selectedItem.ratioBasisPoints : model.ratioBasisPoints;
  return formatCostOfRiskDisplayValue(
    activeCostOfRiskDefinitionDisplayMode === "ratio" ? ratio : value,
    activeCostOfRiskDefinitionDisplayMode,
    state.selectedUnit,
    true
  );
}

function applyCostOfRiskFilterSelection(filterKey, value) {
  costOfRiskFilterPreviewRenderer.captureSnapshot(elements.costOfRiskAuditPanel);
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
  const previewToken = costOfRiskFilterPreviewRenderer.resetQueue();
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
    const optionValue = document.createElement("span");
    optionValue.className = "cost-of-risk-filter-selection-option-value";
    const preview = {
      kind: "definition",
      token: previewToken,
      value: definition.id
    };
    optionValue.textContent = "";
    costOfRiskFilterPreviewRenderer.scheduleValue(optionValue, preview);
    const optionDescription = document.createElement("span");
    optionDescription.className = "cost-of-risk-filter-selection-option-description";
    optionDescription.textContent = definition.description;
    const optionSource = document.createElement("span");
    optionSource.className = "cost-of-risk-filter-selection-option-source";
    optionSource.textContent = definition.source;
    button.append(optionTitle);
    button.append(optionValue);
    button.append(optionDescription, optionSource);

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

  replaceCostOfRiskAuditPanelContent(intro);
  costOfRiskFilterPreviewRenderer.clearSnapshot();
}

function renderCostOfRiskDatasetInfoPanel() {
  const state = costOfRiskDatasetInfoActions?.getState?.() ?? getLatestState();
  replaceCostOfRiskAuditPanelContent(createCostOfRiskDatasetInfoPanel(state));
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
  if (scope === "nplFlows") return `npl-flow-${normalizedMode}`;
  if (scope === "summaryVariation") return `summary-${normalizedMode}`;
  if (scope === "costOfRiskDefinition") return `cost-risk-${normalizedMode}`;
  return `movement-${normalizedMode}`;
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
  const hadHelpTopic = Boolean(activeCostOfRiskHelpTopic);
  if (cellKey && cellKey !== activeCostOfRiskStageSummaryCellKey) {
    activeCostOfRiskStageSummaryCellKey = cellKey;
    activeCostOfRiskSummaryBreakdown = "stage";
    shouldRerender = true;
  }
  if (updateCostOfRiskStageFromSummaryRow(rowKey)) shouldRerender = true;
  if (!shouldRerender && !activeCostOfRiskDataAuditRequested && !hadHelpTopic) return;
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
  const hadHelpTopic = Boolean(activeCostOfRiskHelpTopic);
  if (cellKey && cellKey !== activeCostOfRiskCounterpartySummaryCellKey) {
    activeCostOfRiskCounterpartySummaryCellKey = cellKey;
    shouldRerender = true;
  }
  if (updateCostOfRiskCounterpartyFromSummaryRow(counterpartyValue)) shouldRerender = true;
  if (!shouldRerender && !activeCostOfRiskDataAuditRequested && !hadHelpTopic) return;
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

function showCostOfRiskMovementCalculationDetails(event, code) {
  showCostOfRiskCalculationDetailsMenu(event, () => {
    showCostOfRiskCalculationDetails("movement", code);
  });
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
          renderManualCostOfRiskWaterfall(this, waterfallData, {
            onSelectCode: selectCostOfRiskXAxisFromWaterfall,
            onShowCalculationDetails: showCostOfRiskMovementCalculationDetails
          });
          wireCostOfRiskWaterfallAxisLabels(this, {
            onSelectCode: selectCostOfRiskXAxisFromWaterfall
          });
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
  const nextWindow = value === "toggle"
    ? activeCostOfRiskSmoothingWindow > 1
      ? 1
      : activeCostOfRiskLastSmoothingWindow
    : clampCostOfRiskSmoothingWindow(value);
  setCostOfRiskHelpTopic(`smoothing:${nextWindow}`);
  if (activeCostOfRiskSmoothingWindow === nextWindow) {
    renderCostOfRiskHelpPanel();
    return;
  }
  activeCostOfRiskSmoothingWindow = nextWindow;
  if (nextWindow > 1) activeCostOfRiskLastSmoothingWindow = nextWindow;
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
  if (getLatestState()) rerenderApp(getLatestState());
}

function setCostOfRiskDefinitionBenchmarkMode(mode) {
  const nextMode = mode === "f02" ? "f02" : "benchmark";
  if (activeCostOfRiskDefinitionBenchmarkMode === nextMode) return;
  activeCostOfRiskDefinitionBenchmarkMode = nextMode;
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
