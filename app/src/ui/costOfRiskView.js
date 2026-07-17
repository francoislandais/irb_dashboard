import {
  COST_OF_RISK_FILTER_ALL,
  DEFAULT_COST_OF_RISK_COVERAGE_RATIO_CELL,
  DEFAULT_COST_OF_RISK_COUNTERPARTY_SUMMARY_CELL,
  DEFAULT_COST_OF_RISK_STAGE_RATIO_CELL,
  DEFAULT_COST_OF_RISK_STAGE_SUMMARY_CELL,
  COST_OF_RISK_F12_RECONCILIATION_X_CODES,
  COST_OF_RISK_TOTAL_CONTRIBUTION_X_CODE,
  COST_OF_RISK_WATERFALL_X_CODES,
  COST_OF_RISK_X_AXIS_CODE,
  buildCostOfRiskCoverageRatioModel,
  buildCostOfRiskCounterpartySummaryModel,
  buildCostOfRiskCounterpartyTreemapData,
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
} from "../data/costOfRisk.js?v=20260717-allowances-group-tab";
import {
  createStageTransferWaterfallData,
  getStageTransferAxisLabel,
  getStageTransferDisplayValue
} from "./costOfRiskStageTransfers.js?v=20260717-allowances-group-tab";
import {
  destroyCostOfRiskStageReconciliationChart,
  getCostOfRiskStageReconciliationChart,
  renderCostOfRiskStageReconciliationView
} from "./costOfRiskStageReconciliationView.js?v=20260717-allowances-group-tab";
import {
  createCostOfRiskHighchartsTitle,
  escapeHtml
} from "./costOfRiskChartUtils.js?v=20260717-allowances-group-tab";
import {
  getCostOfRiskCounterpartySummaryValue,
  getCostOfRiskStageSummaryFilterValue,
  getCostOfRiskSummaryCellColumnKey,
  getCostOfRiskSummaryCellRowKey,
  renderCostOfRiskCounterpartySummaryTable as renderCounterpartySummaryTable,
  renderCostOfRiskStageSummaryTable as renderStageSummaryTable
} from "./costOfRiskSummaryTablesView.js?v=20260717-allowances-group-tab";
import {
  destroyCostOfRiskCounterpartySummaryChart,
  destroyCostOfRiskStageSummaryChart,
  getCostOfRiskCounterpartySummaryChart,
  getCostOfRiskStageSummaryChart,
  renderCostOfRiskCounterpartySummaryChart as renderCounterpartySummaryTimeChart,
  renderCostOfRiskStageSummaryChart as renderStageSummaryTimeChart
} from "./costOfRiskSummaryChartsView.js?v=20260717-allowances-group-tab";
import { renderCostOfRiskStageTransferFlowView } from "./costOfRiskStageTransferFlowView.js?v=20260717-allowances-group-tab";
import {
  destroyCostOfRiskStageTransferFlowChart,
  getCostOfRiskStageTransferFlowChart,
  renderCostOfRiskStageTransferFlowTimeSeriesChart as renderStageTransferFlowTimeSeriesChart
} from "./costOfRiskStageTransferTimeSeriesView.js?v=20260717-allowances-group-tab";
import {
  destroyCostOfRiskStageRatioChart,
  formatCostOfRiskStageRatioCellValue,
  getCostOfRiskStageRatioChart,
  getCostOfRiskStageRatioMetricLabel,
  renderCostOfRiskStageRatioChart,
  renderCostOfRiskStageRatioTable
} from "./costOfRiskStageRatioView.js?v=20260717-allowances-group-tab";
import {
  destroyCostOfRiskCoverageRatioChart,
  formatCostOfRiskCoverageRatioCellValue,
  getCostOfRiskCoverageRatioChart,
  getCostOfRiskCoverageRatioMetricLabel,
  renderCostOfRiskCoverageRatioChart,
  renderCostOfRiskCoverageRatioTable
} from "./costOfRiskCoverageRatioView.js?v=20260717-allowances-group-tab";
import {
  destroyCostOfRiskF2VsF12Chart,
  getCostOfRiskF2VsF12Chart,
  renderCostOfRiskF2VsF12Chart as renderF2VsF12Chart
} from "./costOfRiskF2VsF12ChartView.js?v=20260717-allowances-group-tab";
import {
  getCostOfRiskTreemapChart,
  renderCostOfRiskTreemap as renderTreemapChart
} from "./costOfRiskTreemapView.js?v=20260717-allowances-group-tab";
import {
  destroyCostOfRiskMovementChart,
  getCostOfRiskMovementChart,
  renderCostOfRiskMovementTimeSeriesChart as renderMovementTimeSeriesChart
} from "./costOfRiskMovementTimeSeriesView.js?v=20260717-allowances-group-tab";
import {
  getCostOfRiskCoreSectionLabel,
  renderCostOfRiskCoreDefinitionTables
} from "./costOfRiskCoreDefinitionView.js?v=20260717-allowances-group-tab";
import { renderCostOfRiskActiveFiltersView } from "./costOfRiskActiveFiltersView.js?v=20260717-allowances-group-tab";
import {
  renderCostOfRiskFilterSelect as renderFilterSelect,
  renderCostOfRiskSmoothingControl as renderSmoothingControl,
  renderCostOfRiskXAxisOptions as renderXAxisOptions
} from "./costOfRiskControlsView.js?v=20260717-allowances-group-tab";
import {
  clearCostOfRiskAuditTableView,
  renderCostOfRiskAuditTableView
} from "./costOfRiskAuditTableView.js?v=20260717-allowances-group-tab";
import { openExplorerPoint } from "./explorerView.js?v=20260717-allowances-group-tab";
import { renderCostOfRiskRatioDenominatorControls as renderRatioDenominatorControls } from "./costOfRiskRatioDenominatorView.js?v=20260717-allowances-group-tab";
import {
  clearCostOfRiskEmptyPanelsView,
  renderCostOfRiskTabEmptyView,
  renderCostOfRiskTabsView
} from "./costOfRiskTabsView.js?v=20260717-allowances-group-tab";
import {
  createCostOfRiskModelCacheKey,
  getCostOfRiskCachedModel
} from "./costOfRiskModelCache.js?v=20260717-allowances-group-tab";
import {
  getCostOfRiskFilterParentValue as getFilterParentValue,
  getCostOfRiskUnavailableMessage as getUnavailableMessage
} from "./costOfRiskFilterRules.js?v=20260717-allowances-group-tab";
import {
  DEFAULT_COST_OF_RISK_STAGE_TRANSFER_FLOW_KEY,
  getCostOfRiskStageTransferStage,
  getCostOfRiskStageFilterForStageTransferFlowKey,
  getSyncedCostOfRiskStageTransferFlowKey,
  isCostOfRiskAllStageValue,
  normalizeCostOfRiskStageFilterValue
} from "./costOfRiskStageTransferSelection.js?v=20260717-allowances-group-tab";
import {
  getActiveCostOfRiskCoreXCodes as getActiveCoreXCodes,
  normalizeCostOfRiskCoreSelection,
  updateCostOfRiskCoreSelection
} from "./costOfRiskCoreSelection.js?v=20260717-allowances-group-tab";
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
let activeCostOfRiskMovementDisplayMode = "amount";
let activeCostOfRiskStageTransferDisplayMode = "amount";
let activeCostOfRiskSummaryDisplayMode = "ratio";
let activeCostOfRiskCounterpartySummaryCellKey = DEFAULT_COST_OF_RISK_COUNTERPARTY_SUMMARY_CELL;
let activeCostOfRiskCounterpartySummaryOtherOpen = false;
let activeCostOfRiskCounterpartyFilterMenuOpen = false;
let activeCostOfRiskContributionDisplayMenuOpen = false;
let activeCostOfRiskInstrumentFilterMenuOpen = false;
let activeCostOfRiskStageTransferDisplayMenuOpen = false;
let activeCostOfRiskSummaryDisplayMenuOpen = false;
let activeCostOfRiskStageSummaryCellKey = DEFAULT_COST_OF_RISK_STAGE_SUMMARY_CELL;
let activeCostOfRiskStageRatioCellKey = DEFAULT_COST_OF_RISK_STAGE_RATIO_CELL;
let activeCostOfRiskCoverageRatioCellKey = DEFAULT_COST_OF_RISK_COVERAGE_RATIO_CELL;
let activeCostOfRiskStageFilterMenuOpen = false;
let activeCostOfRiskStagingTabMenuOpen = false;
let activeCostOfRiskStagingTabKey = "stage-ratio";
let activeCostOfRiskAllowancesTabMenuOpen = false;
let activeCostOfRiskAllowancesTabKey = "coverage-ratio";
let activeCostOfRiskChartTitleText = "Time evolution chart";
let activeCostOfRiskAuditIntroTab = "summary";
let activeCostOfRiskHelpTopic = "";
let activeCostOfRiskMovementAuditXCode = "";
let activeCostOfRiskWaterfallTitleText = "F12 Contribution Breakdown";
let costOfRiskStageTransferChart = null;
let activeCostOfRiskStageTransferFlowKey = DEFAULT_COST_OF_RISK_STAGE_TRANSFER_FLOW_KEY;
let costOfRiskWaterfallChart = null;
const COST_OF_RISK_STAGE_BOX_FILL = "#f7f8f7";
const activeCostOfRiskFilters = {
  asset: COST_OF_RISK_FILTER_ALL,
  counterparty: COST_OF_RISK_FILTER_ALL,
  stage: COST_OF_RISK_FILTER_ALL
};

const elements = {
  costOfRiskActiveFilters: document.querySelector("#cost-of-risk-active-filters"),
  costOfRiskAsset: document.querySelector("#cost-of-risk-asset"),
  costOfRiskAudit: document.querySelector("#cost-of-risk-audit"),
  costOfRiskAuditPanel: document.querySelector("#cost-of-risk-audit-panel"),
  costOfRiskAllowancesTab: document.querySelector("[data-cost-of-risk-tab-group='allowances']"),
  costOfRiskAllowancesTabLabel: document.querySelector("#cost-of-risk-allowances-tab-label"),
  costOfRiskAllowancesTabMain: document.querySelector("#cost-of-risk-allowances-tab-main"),
  costOfRiskAllowancesTabMenu: document.querySelector("#cost-of-risk-allowances-tab-menu"),
  costOfRiskAllowancesTabToggle: document.querySelector("#cost-of-risk-allowances-tab-toggle"),
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
  costOfRiskStagingTab: document.querySelector("[data-cost-of-risk-tab-group='staging']"),
  costOfRiskStagingTabLabel: document.querySelector("#cost-of-risk-staging-tab-label"),
  costOfRiskStagingTabMain: document.querySelector("#cost-of-risk-staging-tab-main"),
  costOfRiskStagingTabMenu: document.querySelector("#cost-of-risk-staging-tab-menu"),
  costOfRiskStagingTabToggle: document.querySelector("#cost-of-risk-staging-tab-toggle"),
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

export function wireCostOfRiskUi(actions, rerender) {
  rerenderApp = rerender;
  setActiveModule = actions.setActiveModule;
  updateSelectedJst = actions.updateSelectedJst;
  elements.costOfRiskAsset?.addEventListener("change", (event) => {
    activeCostOfRiskInstrumentFilterMenuOpen = false;
    activeCostOfRiskFilters.asset = event.target.value;
    rerenderApp(actions.getState());
  });
  elements.costOfRiskCounterparty?.addEventListener("change", (event) => {
    activeCostOfRiskCounterpartyFilterMenuOpen = false;
    activeCostOfRiskFilters.counterparty = event.target.value;
    rerenderApp(actions.getState());
  });
  elements.costOfRiskStage?.addEventListener("change", (event) => {
    activeCostOfRiskStageFilterMenuOpen = false;
    setActiveCostOfRiskStageFilter(event.target.value);
    rerenderApp(actions.getState());
  });
  elements.costOfRiskDisplayMode?.addEventListener("change", (event) => {
    if (["contributions", "coverage-ratio", "stage-ratio", "stage-transfers", "summary"].includes(activeCostOfRiskTab)) return;
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
  elements.costOfRiskStagingTabMain?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (activeCostOfRiskTab === "stage-ratio" || activeCostOfRiskTab === "stage-transfers") return;

    activeCostOfRiskTab = activeCostOfRiskStagingTabKey;
    activeCostOfRiskAuditIntroTab = activeCostOfRiskTab;
    clearCostOfRiskHelpTopic();
    activeCostOfRiskStagingTabMenuOpen = false;
    closeCostOfRiskFilterMenus();
    rerenderApp(actions.getState());
  });
  elements.costOfRiskStagingTabToggle?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    activeCostOfRiskStagingTabMenuOpen = !activeCostOfRiskStagingTabMenuOpen;
    activeCostOfRiskAllowancesTabMenuOpen = false;
    closeCostOfRiskFilterMenus();
    renderCostOfRiskGroupedTabs();
  });
  elements.costOfRiskStagingTabMenu?.addEventListener("click", (event) => {
    const option = event.target.closest?.("[data-cost-of-risk-staging-option]");
    if (!option) return;

    event.preventDefault();
    event.stopPropagation();
    activeCostOfRiskTab = option.dataset.costOfRiskStagingOption === "stage-transfers" ? "stage-transfers" : "stage-ratio";
    activeCostOfRiskStagingTabKey = activeCostOfRiskTab;
    activeCostOfRiskStagingTabMenuOpen = false;
    activeCostOfRiskAllowancesTabMenuOpen = false;
    clearCostOfRiskHelpTopic();
    activeCostOfRiskAuditIntroTab = activeCostOfRiskTab;
    closeCostOfRiskFilterMenus();
    rerenderApp(actions.getState());
  });
  elements.costOfRiskAllowancesTabMain?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (activeCostOfRiskTab === "coverage-ratio" || activeCostOfRiskTab === "contributions") return;

    activeCostOfRiskTab = activeCostOfRiskAllowancesTabKey;
    activeCostOfRiskAuditIntroTab = activeCostOfRiskTab;
    clearCostOfRiskHelpTopic();
    activeCostOfRiskAllowancesTabMenuOpen = false;
    closeCostOfRiskFilterMenus();
    rerenderApp(actions.getState());
  });
  elements.costOfRiskAllowancesTabToggle?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    activeCostOfRiskAllowancesTabMenuOpen = !activeCostOfRiskAllowancesTabMenuOpen;
    activeCostOfRiskStagingTabMenuOpen = false;
    closeCostOfRiskFilterMenus();
    renderCostOfRiskGroupedTabs();
  });
  elements.costOfRiskAllowancesTabMenu?.addEventListener("click", (event) => {
    const option = event.target.closest?.("[data-cost-of-risk-allowances-option]");
    if (!option) return;

    event.preventDefault();
    event.stopPropagation();
    activeCostOfRiskTab = option.dataset.costOfRiskAllowancesOption === "contributions" ? "contributions" : "coverage-ratio";
    activeCostOfRiskAllowancesTabKey = activeCostOfRiskTab;
    activeCostOfRiskAllowancesTabMenuOpen = false;
    clearCostOfRiskHelpTopic();
    activeCostOfRiskAuditIntroTab = activeCostOfRiskTab;
    closeCostOfRiskFilterMenus();
    rerenderApp(actions.getState());
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
      } else {
        activeCostOfRiskMovementDisplayMode = nextMode;
      }
      setCostOfRiskHelpTopic(getCostOfRiskDisplayModeHelpTopic(scope, nextMode));
      if (elements.costOfRiskDisplayMode) elements.costOfRiskDisplayMode.value = getActiveCostOfRiskDisplayMode();
      rerenderApp(actions.getState());
      return;
    }

    const displayModeToggle = event.target.closest?.("[data-cost-of-risk-display-mode-toggle]");
    if (displayModeToggle) {
      event.preventDefault();
      event.stopPropagation();
      const scope = displayModeToggle.dataset.costOfRiskDisplayModeToggle;
      activeCostOfRiskContributionDisplayMenuOpen = scope === "contribution"
        ? !activeCostOfRiskContributionDisplayMenuOpen
        : false;
      activeCostOfRiskStageTransferDisplayMenuOpen = scope === "stageTransfer"
        ? !activeCostOfRiskStageTransferDisplayMenuOpen
        : false;
      activeCostOfRiskSummaryDisplayMenuOpen = scope === "summaryVariation"
        ? !activeCostOfRiskSummaryDisplayMenuOpen
        : false;
      activeCostOfRiskInstrumentFilterMenuOpen = false;
      activeCostOfRiskCounterpartyFilterMenuOpen = false;
      activeCostOfRiskStageFilterMenuOpen = false;
      const currentMode = scope === "stageTransfer"
        ? activeCostOfRiskStageTransferDisplayMode
        : scope === "summaryVariation"
          ? activeCostOfRiskSummaryDisplayMode
          : activeCostOfRiskMovementDisplayMode;
      setCostOfRiskHelpTopic(getCostOfRiskDisplayModeHelpTopic(scope, currentMode));
      rerenderApp(actions.getState());
      return;
    }

    const instrumentOption = event.target.closest?.("[data-cost-of-risk-instrument-filter-option]");
    if (instrumentOption) {
      event.preventDefault();
      event.stopPropagation();
      closeCostOfRiskFilterMenus();
      activeCostOfRiskFilters.asset = instrumentOption.dataset.costOfRiskInstrumentFilterOption;
      if (elements.costOfRiskAsset) elements.costOfRiskAsset.value = activeCostOfRiskFilters.asset;
      rerenderApp(actions.getState());
      return;
    }

    const instrumentToggle = event.target.closest?.("[data-cost-of-risk-instrument-filter-toggle]");
    if (instrumentToggle) {
      event.preventDefault();
      event.stopPropagation();
      activeCostOfRiskInstrumentFilterMenuOpen = !activeCostOfRiskInstrumentFilterMenuOpen;
      activeCostOfRiskContributionDisplayMenuOpen = false;
      activeCostOfRiskStageTransferDisplayMenuOpen = false;
      activeCostOfRiskSummaryDisplayMenuOpen = false;
      activeCostOfRiskCounterpartyFilterMenuOpen = false;
      activeCostOfRiskStageFilterMenuOpen = false;
      rerenderApp(actions.getState());
      return;
    }

    const counterpartyOption = event.target.closest?.("[data-cost-of-risk-counterparty-filter-option]");
    if (counterpartyOption) {
      event.preventDefault();
      event.stopPropagation();
      closeCostOfRiskFilterMenus();
      activeCostOfRiskFilters.counterparty = counterpartyOption.dataset.costOfRiskCounterpartyFilterOption;
      if (elements.costOfRiskCounterparty) elements.costOfRiskCounterparty.value = activeCostOfRiskFilters.counterparty;
      rerenderApp(actions.getState());
      return;
    }

    const counterpartyToggle = event.target.closest?.("[data-cost-of-risk-counterparty-filter-toggle]");
    if (counterpartyToggle) {
      event.preventDefault();
      event.stopPropagation();
      activeCostOfRiskCounterpartyFilterMenuOpen = !activeCostOfRiskCounterpartyFilterMenuOpen;
      activeCostOfRiskContributionDisplayMenuOpen = false;
      activeCostOfRiskStageTransferDisplayMenuOpen = false;
      activeCostOfRiskSummaryDisplayMenuOpen = false;
      activeCostOfRiskInstrumentFilterMenuOpen = false;
      activeCostOfRiskStageFilterMenuOpen = false;
      rerenderApp(actions.getState());
      return;
    }

    const stageOption = event.target.closest?.("[data-cost-of-risk-stage-filter-option]");
    if (stageOption) {
      event.preventDefault();
      event.stopPropagation();
      closeCostOfRiskFilterMenus();
      setActiveCostOfRiskStageFilter(stageOption.dataset.costOfRiskStageFilterOption);
      rerenderApp(actions.getState());
      return;
    }

    const stageToggle = event.target.closest?.("[data-cost-of-risk-stage-filter-toggle]");
    if (stageToggle) {
      event.preventDefault();
      event.stopPropagation();
      activeCostOfRiskStageFilterMenuOpen = !activeCostOfRiskStageFilterMenuOpen;
      activeCostOfRiskContributionDisplayMenuOpen = false;
      activeCostOfRiskStageTransferDisplayMenuOpen = false;
      activeCostOfRiskSummaryDisplayMenuOpen = false;
      activeCostOfRiskInstrumentFilterMenuOpen = false;
      activeCostOfRiskCounterpartyFilterMenuOpen = false;
      rerenderApp(actions.getState());
      return;
    }

    const button = event.target.closest?.("[data-cost-of-risk-clear-filter]");
    if (!button) return;

    closeCostOfRiskFilterMenus();
    clearActiveCostOfRiskFilter(button.dataset.costOfRiskClearFilter);
    rerenderApp(actions.getState());
  });
  document.addEventListener("click", (event) => {
    if (activeCostOfRiskStagingTabMenuOpen && !elements.costOfRiskStagingTab?.contains(event.target)) {
      activeCostOfRiskStagingTabMenuOpen = false;
      renderCostOfRiskGroupedTabs();
    }
    if (activeCostOfRiskAllowancesTabMenuOpen && !elements.costOfRiskAllowancesTab?.contains(event.target)) {
      activeCostOfRiskAllowancesTabMenuOpen = false;
      renderCostOfRiskGroupedTabs();
    }
    if (!hasOpenCostOfRiskFilterMenu()) return;
    if (elements.costOfRiskActiveFilters?.contains(event.target)) return;
    if (closeCostOfRiskFilterMenus()) rerenderApp(actions.getState());
  });
  document.addEventListener("pointerdown", (event) => {
    if (activeCostOfRiskStagingTabMenuOpen && !elements.costOfRiskStagingTab?.contains(event.target)) {
      window.setTimeout(() => {
        activeCostOfRiskStagingTabMenuOpen = false;
        renderCostOfRiskGroupedTabs();
      }, 0);
    }
    if (activeCostOfRiskAllowancesTabMenuOpen && !elements.costOfRiskAllowancesTab?.contains(event.target)) {
      window.setTimeout(() => {
        activeCostOfRiskAllowancesTabMenuOpen = false;
        renderCostOfRiskGroupedTabs();
      }, 0);
    }
    if (!hasOpenCostOfRiskFilterMenu()) return;
    if (elements.costOfRiskActiveFilters?.contains(event.target)) return;
    window.setTimeout(() => {
      if (closeCostOfRiskFilterMenus()) rerenderApp(actions.getState());
    }, 0);
  }, true);
  elements.costOfRiskDashboard?.addEventListener("click", (event) => {
    const button = event.target.closest?.("[data-cost-of-risk-summary-breakdown]");
    if (!button) return;

    event.preventDefault();
    event.stopPropagation();
    selectCostOfRiskSummaryBreakdown(button.dataset.costOfRiskSummaryBreakdown);
  });
  elements.costOfRiskDashboard?.addEventListener("change", (event) => {
    const checkbox = event.target.closest?.("[data-cost-of-risk-core-code]");
    if (!checkbox) return;

    updateCostOfRiskCoreDefinition(checkbox.dataset.costOfRiskCoreCode, checkbox.checked, checkbox.dataset.costOfRiskCoreScope);
    rerenderApp(actions.getState());
  });
  elements.costOfRiskTabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      activeCostOfRiskTab = button.dataset.costOfRiskTab || "contributions";
      activeCostOfRiskStagingTabMenuOpen = false;
      activeCostOfRiskAllowancesTabMenuOpen = false;
      clearCostOfRiskHelpTopic();
      activeCostOfRiskAuditIntroTab = activeCostOfRiskTab;
      closeCostOfRiskFilterMenus();
      rerenderApp(actions.getState());
    });
  });
}

export function renderCostOfRisk(state) {
  if (!elements.costOfRiskEmpty || !elements.costOfRiskDashboard) return;
  renderCostOfRiskTabs();
  clearCostOfRiskEmptyPanels();

  const filterOptions = getCostOfRiskFilterOptions(state);
  const xAxisOptions = getCostOfRiskXAxisOptions(state);
  const waterfallXAxisOptions = getCostOfRiskWaterfallXAxisOptions(state);
  const f2F12XAxisOptions = getCostOfRiskF12ReconciliationXAxisOptions(state);
  normalizeActiveCostOfRiskCoreDefinition(waterfallXAxisOptions, "movement");
  normalizeActiveCostOfRiskCoreDefinition(f2F12XAxisOptions, "f2-f12");
  normalizeActiveCostOfRiskFilter("asset", filterOptions.assets);
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
  if (!["contributions", "coverage-ratio", "stage-ratio", "stage-transfers", "summary"].includes(activeCostOfRiskTab)) renderCostOfRiskAuditPanelIntro();
  const displayMode = getActiveCostOfRiskDisplayMode();
  if (elements.costOfRiskDisplayMode) elements.costOfRiskDisplayMode.value = displayMode;
  if (elements.costOfRiskDisplayMode) {
    elements.costOfRiskDisplayMode.disabled = activeCostOfRiskTab === "contributions"
      || activeCostOfRiskTab === "coverage-ratio"
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

  if (activeCostOfRiskTab === "summary") {
    const summary = activeCostOfRiskSummaryBreakdown === "counterparty"
      ? getCostOfRiskCachedModel(
        state,
        createCostOfRiskModelCacheKey(state, "counterparty-summary", activeCostOfRiskFilters, activeCostOfRiskReferenceDate, activeCostOfRiskCounterpartySummaryCellKey),
        () => buildCostOfRiskCounterpartySummaryModel(
          state,
          activeCostOfRiskFilters,
          activeCostOfRiskReferenceDate,
          activeCostOfRiskCounterpartySummaryCellKey
        )
      )
      : getCostOfRiskCachedModel(
        state,
        createCostOfRiskModelCacheKey(state, "stage-summary", activeCostOfRiskFilters, activeCostOfRiskReferenceDate, activeCostOfRiskStageSummaryCellKey),
        () => buildCostOfRiskStageSummaryModel(
          state,
          activeCostOfRiskFilters,
          activeCostOfRiskReferenceDate,
          activeCostOfRiskStageSummaryCellKey
        )
      );
    activeCostOfRiskReferenceDate = summary.referenceDate || activeCostOfRiskReferenceDate;
    renderCostOfRiskActiveFilters(filterOptions);
    renderCostOfRiskSummaryDisplayControl();
    elements.costOfRiskEmpty.hidden = true;
    elements.costOfRiskEmpty.textContent = "";
    elements.costOfRiskDashboard.hidden = false;
    renderCostOfRiskF18SummaryOnlyView(summary, state);
    renderCostOfRiskAuditPanelIntro();
    scheduleCostOfRiskChartReflow();
    return;
  }

  if (activeCostOfRiskTab === "stage-ratio") {
    const stageRatio = getCostOfRiskCachedModel(
      state,
      createCostOfRiskModelCacheKey(state, "stage-ratio", activeCostOfRiskFilters, activeCostOfRiskReferenceDate, activeCostOfRiskStageRatioCellKey),
      () => buildCostOfRiskStageRatioModel(
        state,
        activeCostOfRiskFilters,
        activeCostOfRiskReferenceDate,
        activeCostOfRiskStageRatioCellKey
      )
    );
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
    elements.costOfRiskRatioContext.textContent = "F_18.00 stage ratios";
    elements.costOfRiskF02Value.textContent = "-";
    elements.costOfRiskF02Context.textContent = "-";
    elements.costOfRiskPoints.textContent = "-";
    leaveCostOfRiskStageTransferTab();
    clearCostOfRiskAuditTable();
    renderCostOfRiskStageRatioView(stageRatio, state);
    renderCostOfRiskStageRatioAuditPanel(stageRatio, state);
    scheduleCostOfRiskChartReflow();
    return;
  }

  if (activeCostOfRiskTab === "coverage-ratio") {
    const coverageRatio = getCostOfRiskCachedModel(
      state,
      createCostOfRiskModelCacheKey(state, "coverage-ratio", activeCostOfRiskFilters, activeCostOfRiskReferenceDate, activeCostOfRiskCoverageRatioCellKey),
      () => buildCostOfRiskCoverageRatioModel(
        state,
        activeCostOfRiskFilters,
        activeCostOfRiskReferenceDate,
        activeCostOfRiskCoverageRatioCellKey
      )
    );
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
    renderCostOfRiskCoverageRatioAuditPanel(coverageRatio, state);
    scheduleCostOfRiskChartReflow();
    return;
  }

  if (activeCostOfRiskTab === "stage-transfers") {
    elements.costOfRiskEmpty.hidden = true;
    elements.costOfRiskEmpty.textContent = "";
    elements.costOfRiskDashboard.hidden = false;
    clearCostOfRiskAuditTable();
    renderCostOfRiskStageTransferView(state);
    renderCostOfRiskStageTransferAuditPanel(state);
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
    renderCostOfRiskAuditPanelIntro();
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
    elements.costOfRiskEmpty.hidden = true;
    elements.costOfRiskEmpty.textContent = "";
    elements.costOfRiskDashboard.hidden = false;
    renderCostOfRiskTabEmpty(activeSelection.status);
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
    renderCostOfRiskWaterfallTitle(activeWaterfall.referenceDate);
    renderCostOfRiskChartTitle(selectedWaterfallPoint, xAxisOptions, activeCostOfRiskXAxisCode);
    renderCostOfRiskWaterfallChart(activeWaterfall, state.selectedJst, displayMode, state.selectedUnit);
    renderCostOfRiskMovementAuditPanel(state);
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
    return activeCostOfRiskSummaryBreakdown === "counterparty"
      ? [getCostOfRiskCounterpartySummaryChart()]
      : [getCostOfRiskStageSummaryChart()];
  }
  if (activeCostOfRiskTab === "stage-ratio") return [getCostOfRiskStageRatioChart()];
  if (activeCostOfRiskTab === "coverage-ratio") return [getCostOfRiskCoverageRatioChart()];
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
  renderCostOfRiskGroupedTabs();
  window.requestAnimationFrame?.(updateCostOfRiskTabsFade);
}

function renderCostOfRiskGroupedTabs() {
  renderCostOfRiskStagingTab();
  renderCostOfRiskAllowancesTab();
}

function renderCostOfRiskStagingTab() {
  const isStagingTab = activeCostOfRiskTab === "stage-ratio" || activeCostOfRiskTab === "stage-transfers";
  const stagingTabKey = isStagingTab ? activeCostOfRiskTab : activeCostOfRiskStagingTabKey;
  const activeStagingLabel = stagingTabKey === "stage-transfers" ? "Transfer" : "Ratio";
  elements.costOfRiskStagingTab?.classList.toggle("is-active", isStagingTab);
  elements.costOfRiskStagingTab?.classList.toggle("is-open", activeCostOfRiskStagingTabMenuOpen);
  elements.costOfRiskStagingTabMain?.classList.toggle("is-active", isStagingTab);
  elements.costOfRiskStagingTabMain?.setAttribute("aria-selected", String(isStagingTab));
  elements.costOfRiskStagingTabToggle?.classList.toggle("is-active", isStagingTab);
  elements.costOfRiskStagingTabToggle?.setAttribute("aria-expanded", String(activeCostOfRiskStagingTabMenuOpen));
  if (elements.costOfRiskStagingTabLabel) elements.costOfRiskStagingTabLabel.textContent = activeStagingLabel;
  if (elements.costOfRiskStagingTabMenu) {
    elements.costOfRiskStagingTabMenu.hidden = !activeCostOfRiskStagingTabMenuOpen;
    if (activeCostOfRiskStagingTabMenuOpen) positionCostOfRiskStagingMenu();
  }
  elements.costOfRiskStagingTabMenu?.querySelectorAll("[data-cost-of-risk-staging-option]").forEach((option) => {
    const isActive = option.dataset.costOfRiskStagingOption === stagingTabKey;
    option.classList.toggle("is-active", isActive);
    option.setAttribute("aria-checked", String(isActive));
  });
}

function renderCostOfRiskAllowancesTab() {
  const isAllowancesTab = activeCostOfRiskTab === "coverage-ratio" || activeCostOfRiskTab === "contributions";
  const allowancesTabKey = isAllowancesTab ? activeCostOfRiskTab : activeCostOfRiskAllowancesTabKey;
  const activeAllowancesLabel = allowancesTabKey === "contributions" ? "Movement" : "Coverage";
  elements.costOfRiskAllowancesTab?.classList.toggle("is-active", isAllowancesTab);
  elements.costOfRiskAllowancesTab?.classList.toggle("is-open", activeCostOfRiskAllowancesTabMenuOpen);
  elements.costOfRiskAllowancesTabMain?.classList.toggle("is-active", isAllowancesTab);
  elements.costOfRiskAllowancesTabMain?.setAttribute("aria-selected", String(isAllowancesTab));
  elements.costOfRiskAllowancesTabToggle?.classList.toggle("is-active", isAllowancesTab);
  elements.costOfRiskAllowancesTabToggle?.setAttribute("aria-expanded", String(activeCostOfRiskAllowancesTabMenuOpen));
  if (elements.costOfRiskAllowancesTabLabel) elements.costOfRiskAllowancesTabLabel.textContent = activeAllowancesLabel;
  if (elements.costOfRiskAllowancesTabMenu) {
    elements.costOfRiskAllowancesTabMenu.hidden = !activeCostOfRiskAllowancesTabMenuOpen;
    if (activeCostOfRiskAllowancesTabMenuOpen) positionCostOfRiskAllowancesMenu();
  }
  elements.costOfRiskAllowancesTabMenu?.querySelectorAll("[data-cost-of-risk-allowances-option]").forEach((option) => {
    const isActive = option.dataset.costOfRiskAllowancesOption === allowancesTabKey;
    option.classList.toggle("is-active", isActive);
    option.setAttribute("aria-checked", String(isActive));
  });
}

function positionCostOfRiskStagingMenu() {
  const toggleRect = elements.costOfRiskStagingTabToggle?.getBoundingClientRect();
  const wrapRect = elements.costOfRiskStagingTab?.getBoundingClientRect();
  if (!toggleRect || !wrapRect || !elements.costOfRiskStagingTabMenu) return;

  elements.costOfRiskStagingTabMenu.style.left = `${Math.max(8, wrapRect.left)}px`;
  elements.costOfRiskStagingTabMenu.style.top = `${toggleRect.bottom}px`;
}

function positionCostOfRiskAllowancesMenu() {
  const toggleRect = elements.costOfRiskAllowancesTabToggle?.getBoundingClientRect();
  const wrapRect = elements.costOfRiskAllowancesTab?.getBoundingClientRect();
  if (!toggleRect || !wrapRect || !elements.costOfRiskAllowancesTabMenu) return;

  elements.costOfRiskAllowancesTabMenu.style.left = `${Math.max(8, wrapRect.left)}px`;
  elements.costOfRiskAllowancesTabMenu.style.top = `${toggleRect.bottom}px`;
}

function updateCostOfRiskTabsFade() {
  const tabs = elements.costOfRiskTabs;
  if (!tabs) return;

  const maxScrollLeft = Math.max(0, tabs.scrollWidth - tabs.clientWidth);
  tabs.classList.toggle("can-scroll-left", tabs.scrollLeft > 1);
  tabs.classList.toggle("can-scroll-right", tabs.scrollLeft < maxScrollLeft - 1);
  if (activeCostOfRiskStagingTabMenuOpen) positionCostOfRiskStagingMenu();
  if (activeCostOfRiskAllowancesTabMenuOpen) positionCostOfRiskAllowancesMenu();
}

export function showCostOfRiskPeerDisplayHelp(peerDisplayMode) {
  setCostOfRiskHelpTopic(peerDisplayMode === "anonymised" ? "peer-anonymised" : "peer-explicit");
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
  if (!message) return getCostOfRiskUnavailableMessage();
  if (String(message).startsWith("No matching F") || String(message).startsWith("No F_")) {
    return getCostOfRiskUnavailableMessage();
  }
  return message;
}

function clearCostOfRiskEmptyPanels() {
  clearCostOfRiskEmptyPanelsView(elements.costOfRiskTabPanels);
}

function renderCostOfRiskF18SummaryOnlyView(summary, state) {
  renderCostOfRiskSummaryBreakdownSwitch();
  elements.costOfRiskValue.textContent = "-";
  elements.costOfRiskContext.textContent = "-";
  elements.costOfRiskDenominatorValue.textContent = "-";
  elements.costOfRiskDenominatorContext.textContent = "-";
  elements.costOfRiskRatioValue.textContent = "-";
  elements.costOfRiskRatioContext.textContent = "F_18.00 summary";
  elements.costOfRiskF02Value.textContent = "-";
  elements.costOfRiskF02Context.textContent = "-";
  elements.costOfRiskPoints.textContent = "-";

  if (activeCostOfRiskSummaryBreakdown === "counterparty") {
    leaveCostOfRiskStageTransferTab();
    clearCostOfRiskAuditTable();
    renderCostOfRiskCounterpartySummaryView(summary, state);
    return;
  }

  leaveCostOfRiskStageTransferTab();
  clearCostOfRiskAuditTable();
  renderCostOfRiskStageSummaryView(summary, state);
}

function renderCostOfRiskStageRatioView(stageRatio, state) {
  renderCostOfRiskStageRatioTable({
    activeCellKey: activeCostOfRiskStageRatioCellKey,
    container: elements.costOfRiskStageRatioTable,
    onCellSelect: selectCostOfRiskStageRatioCell,
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
    activeCellKey: activeCostOfRiskCoverageRatioCellKey,
    container: elements.costOfRiskCoverageRatioTable,
    onCellSelect: selectCostOfRiskCoverageRatioCell,
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

function selectCostOfRiskStageRatioCell(cellKey) {
  activeCostOfRiskStageRatioCellKey = cellKey;
  hideCostOfRiskAuditIntro();
  clearCostOfRiskHelpTopic();
  if (getLatestState()) rerenderApp(getLatestState());
}

function selectCostOfRiskCoverageRatioCell(cellKey) {
  activeCostOfRiskCoverageRatioCellKey = cellKey;
  hideCostOfRiskAuditIntro();
  clearCostOfRiskHelpTopic();
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
  const displayedFilters = ["coverage-ratio", "stage-ratio"].includes(activeCostOfRiskTab)
    ? { ...activeCostOfRiskFilters, stage: COST_OF_RISK_FILTER_ALL }
    : activeCostOfRiskFilters;
  renderCostOfRiskActiveFiltersView({
    activeTab: activeCostOfRiskTab,
    contributionDisplayMenuOpen: activeCostOfRiskContributionDisplayMenuOpen,
    container: elements.costOfRiskActiveFilters,
    counterpartyMenuOpen: activeCostOfRiskCounterpartyFilterMenuOpen,
    displayMode: getActiveCostOfRiskDisplayMode(),
    instrumentMenuOpen: activeCostOfRiskInstrumentFilterMenuOpen,
    filterOptions,
    filters: displayedFilters,
    referenceDate: activeCostOfRiskReferenceDate,
    stageMenuOpen: activeCostOfRiskStageFilterMenuOpen,
    summaryDisplayMenuOpen: activeCostOfRiskSummaryDisplayMenuOpen,
    stageTransferDisplayMenuOpen: activeCostOfRiskStageTransferDisplayMenuOpen
  });
}

function getActiveCostOfRiskDisplayMode() {
  if (activeCostOfRiskTab === "summary") return activeCostOfRiskSummaryDisplayMode;
  if (activeCostOfRiskTab === "contributions") return activeCostOfRiskMovementDisplayMode;
  if (activeCostOfRiskTab === "stage-transfers") return activeCostOfRiskStageTransferDisplayMode;
  return activeCostOfRiskDisplayMode;
}

function hasOpenCostOfRiskFilterMenu() {
  return activeCostOfRiskContributionDisplayMenuOpen
    || activeCostOfRiskStageTransferDisplayMenuOpen
    || activeCostOfRiskSummaryDisplayMenuOpen
    || activeCostOfRiskInstrumentFilterMenuOpen
    || activeCostOfRiskCounterpartyFilterMenuOpen
    || activeCostOfRiskStageFilterMenuOpen;
}

function closeCostOfRiskFilterMenus() {
  const changed = hasOpenCostOfRiskFilterMenu();
  activeCostOfRiskContributionDisplayMenuOpen = false;
  activeCostOfRiskStageTransferDisplayMenuOpen = false;
  activeCostOfRiskSummaryDisplayMenuOpen = false;
  activeCostOfRiskInstrumentFilterMenuOpen = false;
  activeCostOfRiskCounterpartyFilterMenuOpen = false;
  activeCostOfRiskStageFilterMenuOpen = false;
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

function getCostOfRiskFilterParentValue(filterName, value) {
  return getFilterParentValue(filterName, value);
}

function getCostOfRiskUnavailableMessage() {
  return getUnavailableMessage(activeCostOfRiskFilters);
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

function renderCostOfRiskWaterfallTitle() {
  activeCostOfRiskWaterfallTitleText = "Movement in the stock of allowance";
  if (elements.costOfRiskWaterfallTitle) elements.costOfRiskWaterfallTitle.textContent = activeCostOfRiskWaterfallTitleText;
}

function renderCostOfRiskMovementAuditPanel(state) {
  if (!elements.costOfRiskAuditPanel) return;

  if (renderCostOfRiskHelpPanel()) return;

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

function renderCostOfRiskStageTransferAuditPanel(state) {
  if (!elements.costOfRiskAuditPanel) return;

  if (renderCostOfRiskHelpPanel()) return;

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

function renderCostOfRiskStageRatioAuditPanel(stageRatio, state) {
  if (!elements.costOfRiskAuditPanel) return;

  if (renderCostOfRiskHelpPanel()) return;

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
  eyebrow.textContent = "Stage ratio audit trail";

  const title = document.createElement("h2");
  title.className = "cost-of-risk-audit-intro-title";
  title.textContent = `${getCostOfRiskStageRatioMetricLabel(selectedCell.metric)} - ${row.label}`;

  const lead = document.createElement("p");
  lead.className = "cost-of-risk-audit-intro-lead";
  lead.textContent = `Selected value: ${formatCostOfRiskStageRatioCellValue(selectedValue, selectedCell.metric)}.`;

  article.append(eyebrow, title, lead);
  article.append(createCostOfRiskAuditInfoSection("Selected scope", [
    `Reference date: ${formatReferenceQuarterLabel(stageRatio.referenceDate)}`,
    `JST: ${state.selectedJst}`,
    `Perimeter: ${stageRatio.filterLabel || "selected instruments and counterparties"}`,
    "The global Stage filter is not applied here because the three stages are shown explicitly."
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
  hint.textContent = "Click another cell in the upper table to benchmark and explain that stage-ratio component.";
  article.append(hint);

  elements.costOfRiskAuditPanel.replaceChildren(article);
}

function renderCostOfRiskCoverageRatioAuditPanel(coverageRatio, state) {
  if (!elements.costOfRiskAuditPanel) return;

  if (renderCostOfRiskHelpPanel()) return;

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
  lead.textContent = `Selected value: ${formatCostOfRiskCoverageRatioCellValue(selectedValue, selectedCell.metric)}.`;

  article.append(eyebrow, title, lead);
  article.append(createCostOfRiskAuditInfoSection("Selected scope", [
    `Reference date: ${formatReferenceQuarterLabel(coverageRatio.referenceDate)}`,
    `JST: ${state.selectedJst}`,
    `Perimeter: ${coverageRatio.filterLabel || "selected instruments and counterparties"}`,
    "The global Stage filter is not applied here because the three stages are shown explicitly."
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
  hint.textContent = "Click another cell in the upper table to benchmark and explain that coverage-ratio component.";
  article.append(hint);

  elements.costOfRiskAuditPanel.replaceChildren(article);
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
  elements.costOfRiskAuditPanel.replaceChildren(placeholder);
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
  activeCostOfRiskHelpTopic = "";
}

function setCostOfRiskHelpTopic(topic) {
  activeCostOfRiskHelpTopic = topic || "";
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

  elements.costOfRiskAuditPanel.replaceChildren(intro);
}

function renderCostOfRiskHelpPanel() {
  if (!elements.costOfRiskAuditPanel) return false;

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

  elements.costOfRiskAuditPanel.replaceChildren(intro);
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
  return `movement-${normalizedMode}`;
}

function getCostOfRiskHelpPanelContent(topic) {
  if (!topic) return null;

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
    "summary-absolute": {
      eyebrow: "Summary display",
      title: "Absolute Variation",
      lead: "Absolute variation shows the quarter-on-quarter movement in amount for the selected summary row.",
      sections: [
        {
          title: "Numerator",
          body: "The value is the current-quarter stock minus the previous-quarter stock for the selected stage or counterparty line."
        },
        {
          title: "Unit",
          body: "Values are displayed in the selected monetary unit."
        }
      ],
      hint: "Switch to Relative Variation to read the same movement as a growth rate."
    },
    "summary-relative": {
      eyebrow: "Summary display",
      title: "Relative Variation",
      lead: "Relative variation is a growth rate for the selected summary row.",
      sections: [
        {
          title: "Numerator",
          body: "The numerator is the quarter-on-quarter variation of the selected row and metric."
        },
        {
          title: "Denominator",
          body: "The denominator is the previous-quarter value of that same row and metric, after applying the active perimeter filters."
        },
        {
          title: "Formula",
          body: "Relative variation = quarterly variation divided by previous-quarter value, displayed as a percentage."
        }
      ],
      hint: "Use this mode when the question is how fast the selected stock is growing or shrinking."
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
          body: "The upper table decomposes gross carrying amount, allowances and coverage either by stage or by counterparty. Stock measures stay in amount, while variation columns can be displayed as absolute or relative movements."
        },
        {
          title: "How to use it",
          body: "Use the display switch to move between stage and counterparty breakdowns. Clicking a row updates the global filter, and clicking a cell drives the time evolution chart below."
        },
        {
          title: "Source",
          body: "Figures are built from F_18.00, with the active instruments, counterparty and stage filters applied where the regulatory template supports that level of detail."
        }
      ],
      hint: "Click a table cell to focus the time chart on that metric."
    },
    "stage-ratio": {
      eyebrow: "Stage mix",
      title: "Stage Ratio",
      lead: "This view measures the share of the selected exposure perimeter that sits in Stage 1, Stage 2 or Stage 3.",
      sections: [
        {
          title: "What you see",
          body: "The upper table shows each stage ratio, its quarter-on-quarter change, and a split of that change between numerator and denominator effects."
        },
        {
          title: "How it is calculated",
          body: "Stage ratio = gross carrying amount of the stage divided by total gross carrying amount of the perimeter. The variation is decomposed with a two-factor Shapley method, averaging the numerator-first and denominator-first paths."
        },
        {
          title: "Source",
          body: "Figures are built from FINREP F_18.00. Instruments and counterparty filters define the perimeter; the global stage filter is ignored in this view because stages are displayed explicitly."
        }
      ],
      hint: "Click a table cell to benchmark the selected ratio or decomposition effect over time."
    },
    "coverage-ratio": {
      eyebrow: "Allowance coverage",
      title: "Coverage Ratio",
      lead: "This view measures allowances as a share of gross carrying amount for Stage 1, Stage 2 and Stage 3.",
      sections: [
        {
          title: "What you see",
          body: "The upper table shows each coverage ratio, its quarter-on-quarter change, and a split of that change between numerator and denominator effects."
        },
        {
          title: "How it is calculated",
          body: "Coverage ratio = allowances for the stage divided by gross carrying amount for the same stage. The variation is decomposed with a two-factor Shapley method, averaging the numerator-first and denominator-first paths."
        },
        {
          title: "Source",
          body: "Figures are built from FINREP F_18.00. Instruments and counterparty filters define the perimeter; the global stage filter is ignored in this view because stages are displayed explicitly."
        }
      ],
      hint: "Click a table cell to benchmark the selected coverage ratio or decomposition effect over time."
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
      eyebrow: "Allowance movement",
      title: "Movement in Allowance",
      lead: "This view reconciles the movement in the stock of allowances and helps identify which FINREP components explain the quarterly change.",
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
    onRowSelect: selectCostOfRiskStageSummaryRow,
    referenceDate: activeCostOfRiskReferenceDate,
    selectedUnit,
    stageSummary
  });
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
  clearCostOfRiskHelpTopic();
  let shouldRerender = false;
  if (cellKey && cellKey !== activeCostOfRiskStageSummaryCellKey) {
    activeCostOfRiskStageSummaryCellKey = cellKey;
    shouldRerender = true;
  }
  if (updateCostOfRiskStageFromSummaryRow(rowKey)) shouldRerender = true;
  if (!shouldRerender) {
    if (getLatestState()) renderCostOfRiskStageTransferAuditPanel(getLatestState());
    return;
  }
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
  clearCostOfRiskHelpTopic();
  let shouldRerender = false;
  if (cellKey && cellKey !== activeCostOfRiskCounterpartySummaryCellKey) {
    activeCostOfRiskCounterpartySummaryCellKey = cellKey;
    shouldRerender = true;
  }
  if (updateCostOfRiskCounterpartyFromSummaryRow(counterpartyValue)) shouldRerender = true;
  if (!shouldRerender) {
    if (getLatestState()) renderCostOfRiskStageTransferAuditPanel(getLatestState());
    return;
  }
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
  renderCostOfRiskStageTransferFlowChart(
    state,
    getCostOfRiskCachedModel(
      state,
      createCostOfRiskModelCacheKey(state, "stage-transfer-flow-diagram", activeCostOfRiskFilters, activeCostOfRiskReferenceDate),
      () => buildCostOfRiskStageTransferFlowDiagram(state, activeCostOfRiskReferenceDate, activeCostOfRiskFilters)
    ),
    state.selectedUnit,
    getActiveCostOfRiskDisplayMode()
  );
}

function renderCostOfRiskStageTransferFlowChart(state, flowDiagram, selectedUnit, displayMode = "amount") {
  if (!elements.costOfRiskStageTransferChart) return;
  destroyCostOfRiskStageTransferChart();

  renderCostOfRiskStageTransferFlowView({
    container: elements.costOfRiskStageTransferChart,
    displayMode,
    flowDiagram,
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

  const hadIntro = isCostOfRiskAuditIntroVisible();
  clearCostOfRiskHelpTopic();
  hideCostOfRiskAuditIntro();
  let shouldRerender = flowKey !== activeCostOfRiskStageTransferFlowKey;
  activeCostOfRiskStageTransferFlowKey = flowKey;

  const stageFilter = getCostOfRiskStageFilterForStageTransferFlowKey(flowKey);
  if (stageFilter && activeCostOfRiskFilters.stage !== stageFilter) {
    setActiveCostOfRiskStageFilter(stageFilter);
    shouldRerender = true;
  }

  if (!shouldRerender) {
    if (hadIntro && getLatestState()) renderCostOfRiskStageTransferAuditPanel(getLatestState());
    return;
  }
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
  const chartDisplayMode = isStageBoxSelection ? "amount" : displayMode;
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

  clearCostOfRiskHelpTopic();
  hideCostOfRiskAuditIntro();
  activeCostOfRiskMovementAuditXCode = code;
  if (code === activeCostOfRiskXAxisCode) {
    if (getLatestState()) renderCostOfRiskMovementAuditPanel(getLatestState());
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
