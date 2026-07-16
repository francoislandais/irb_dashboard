import {
  COST_OF_RISK_FILTER_ALL,
  DEFAULT_COST_OF_RISK_COUNTERPARTY_SUMMARY_CELL,
  DEFAULT_COST_OF_RISK_STAGE_SUMMARY_CELL,
  COST_OF_RISK_F12_RECONCILIATION_X_CODES,
  COST_OF_RISK_WATERFALL_X_CODES,
  COST_OF_RISK_X_AXIS_CODE,
  buildCostOfRiskCounterpartySummaryModel,
  buildCostOfRiskCounterpartyTreemapData,
  buildCostOfRiskF02ImpairmentRatio,
  buildCostOfRiskF02ImpairmentSeries,
  buildCostOfRiskF12ContributionSeries,
  buildCostOfRiskF2VsF12Audit,
  buildCostOfRiskFilteredSelectionValue,
  buildCostOfRiskMovementContributionAudit,
  buildCostOfRiskStageBoxTimeSeries,
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
} from "../data/costOfRisk.js?v=20260716-cost-risk-stage-related-flow-blue-view";
import {
  createStageTransferWaterfallData,
  getStageTransferAxisLabel,
  getStageTransferDisplayValue
} from "./costOfRiskStageTransfers.js?v=20260716-cost-risk-stage-related-flow-blue-view";
import {
  destroyCostOfRiskStageReconciliationChart,
  getCostOfRiskStageReconciliationChart,
  renderCostOfRiskStageReconciliationView
} from "./costOfRiskStageReconciliationView.js?v=20260716-cost-risk-stage-related-flow-blue-view";
import {
  createCostOfRiskHighchartsTitle,
  escapeHtml
} from "./costOfRiskChartUtils.js?v=20260716-cost-risk-stage-related-flow-blue-view";
import {
  getCostOfRiskCounterpartySummaryValue,
  getCostOfRiskStageSummaryFilterValue,
  getCostOfRiskSummaryCellColumnKey,
  getCostOfRiskSummaryCellRowKey,
  renderCostOfRiskCounterpartySummaryTable as renderCounterpartySummaryTable,
  renderCostOfRiskStageSummaryTable as renderStageSummaryTable
} from "./costOfRiskSummaryTablesView.js?v=20260716-cost-risk-stage-related-flow-blue-view";
import {
  destroyCostOfRiskCounterpartySummaryChart,
  destroyCostOfRiskStageSummaryChart,
  getCostOfRiskCounterpartySummaryChart,
  getCostOfRiskStageSummaryChart,
  renderCostOfRiskCounterpartySummaryChart as renderCounterpartySummaryTimeChart,
  renderCostOfRiskStageSummaryChart as renderStageSummaryTimeChart
} from "./costOfRiskSummaryChartsView.js?v=20260716-cost-risk-stage-related-flow-blue-view";
import { renderCostOfRiskStageTransferFlowView } from "./costOfRiskStageTransferFlowView.js?v=20260716-cost-risk-stage-related-flow-blue-view";
import {
  destroyCostOfRiskStageTransferFlowChart,
  getCostOfRiskStageTransferFlowChart,
  renderCostOfRiskStageTransferFlowTimeSeriesChart as renderStageTransferFlowTimeSeriesChart
} from "./costOfRiskStageTransferTimeSeriesView.js?v=20260716-cost-risk-stage-related-flow-blue-view";
import {
  destroyCostOfRiskF2VsF12Chart,
  getCostOfRiskF2VsF12Chart,
  renderCostOfRiskF2VsF12Chart as renderF2VsF12Chart
} from "./costOfRiskF2VsF12ChartView.js?v=20260716-cost-risk-stage-related-flow-blue-view";
import {
  getCostOfRiskTreemapChart,
  renderCostOfRiskTreemap as renderTreemapChart
} from "./costOfRiskTreemapView.js?v=20260716-cost-risk-stage-related-flow-blue-view";
import {
  destroyCostOfRiskMovementChart,
  getCostOfRiskMovementChart,
  renderCostOfRiskMovementTimeSeriesChart as renderMovementTimeSeriesChart
} from "./costOfRiskMovementTimeSeriesView.js?v=20260716-cost-risk-stage-related-flow-blue-view";
import {
  getCostOfRiskCoreSectionLabel,
  renderCostOfRiskCoreDefinitionTables
} from "./costOfRiskCoreDefinitionView.js?v=20260716-cost-risk-stage-related-flow-blue-view";
import { renderCostOfRiskActiveFiltersView } from "./costOfRiskActiveFiltersView.js?v=20260716-cost-risk-stage-related-flow-blue-view";
import {
  renderCostOfRiskFilterSelect as renderFilterSelect,
  renderCostOfRiskSmoothingControl as renderSmoothingControl,
  renderCostOfRiskXAxisOptions as renderXAxisOptions
} from "./costOfRiskControlsView.js?v=20260716-cost-risk-stage-related-flow-blue-view";
import {
  clearCostOfRiskAuditTableView,
  renderCostOfRiskAuditTableView
} from "./costOfRiskAuditTableView.js?v=20260716-cost-risk-stage-related-flow-blue-view";
import { renderCostOfRiskRatioDenominatorControls as renderRatioDenominatorControls } from "./costOfRiskRatioDenominatorView.js?v=20260716-cost-risk-stage-related-flow-blue-view";
import {
  clearCostOfRiskEmptyPanelsView,
  renderCostOfRiskTabEmptyView,
  renderCostOfRiskTabsView
} from "./costOfRiskTabsView.js?v=20260716-cost-risk-stage-related-flow-blue-view";
import {
  createCostOfRiskModelCacheKey,
  getCostOfRiskCachedModel
} from "./costOfRiskModelCache.js?v=20260716-cost-risk-stage-related-flow-blue-view";
import {
  getCostOfRiskFilterParentValue as getFilterParentValue,
  getCostOfRiskUnavailableMessage as getUnavailableMessage
} from "./costOfRiskFilterRules.js?v=20260716-cost-risk-stage-related-flow-blue-view";
import {
  DEFAULT_COST_OF_RISK_STAGE_TRANSFER_FLOW_KEY,
  getCostOfRiskStageTransferStage,
  getCostOfRiskStageFilterForStageTransferFlowKey,
  getSyncedCostOfRiskStageTransferFlowKey,
  isCostOfRiskAllStageValue,
  normalizeCostOfRiskStageFilterValue
} from "./costOfRiskStageTransferSelection.js?v=20260716-cost-risk-stage-related-flow-blue-view";
import {
  getActiveCostOfRiskCoreXCodes as getActiveCoreXCodes,
  normalizeCostOfRiskCoreSelection,
  updateCostOfRiskCoreSelection
} from "./costOfRiskCoreSelection.js?v=20260716-cost-risk-stage-related-flow-blue-view";
import { formatBasisPointsValue, formatContributionPercentValue, formatMetricValue, formatSignedMetricValue } from "../data/core/formatting.js?v=20260710-bp-format";
import { getLatestState } from "./appState.js";
import { flowArrowColor, primaryDark } from "./theme.js?v=20260709-flow-arrow-color";

let rerenderApp = () => {};
let updateSelectedJst = () => {};
let activeCostOfRiskXAxisCode = COST_OF_RISK_X_AXIS_CODE;
let activeCostOfRiskSmoothingWindow = 4;
let activeCostOfRiskReferenceDate = "";
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
let activeCostOfRiskStageFilterMenuOpen = false;
let activeCostOfRiskChartTitleText = "Time evolution chart";
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

export function wireCostOfRiskUi(actions, rerender) {
  rerenderApp = rerender;
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
    if (["contributions", "stage-transfers", "summary"].includes(activeCostOfRiskTab)) return;
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
  if (selectedMovementXCodes.length > 0 && !selectedMovementXCodes.includes(activeCostOfRiskXAxisCode)) {
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
  if (!["contributions", "stage-transfers"].includes(activeCostOfRiskTab)) renderCostOfRiskAuditPanelPlaceholder();
  const displayMode = getActiveCostOfRiskDisplayMode();
  if (elements.costOfRiskDisplayMode) elements.costOfRiskDisplayMode.value = displayMode;
  if (elements.costOfRiskDisplayMode) {
    elements.costOfRiskDisplayMode.disabled = activeCostOfRiskTab === "contributions"
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
    renderCostOfRiskStageReconciliationView({
      activeReferenceDate: activeCostOfRiskReferenceDate,
      clearEmptyPanels: clearCostOfRiskEmptyPanels,
      elements,
      formatReferenceQuarterLabel,
      model: stageReconciliation,
      onClearSmoothing: clearCostOfRiskSmoothing,
      onChangeSmoothing: updateCostOfRiskSmoothingWindow,
      onSelectJst: selectCostOfRiskChartJst,
      onSelectReferenceDate: selectCostOfRiskReferenceDate,
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
      jstCode: state.selectedJst,
      onClearSmoothing: clearCostOfRiskSmoothing,
      onChangeSmoothing: updateCostOfRiskSmoothingWindow,
      onSelectJst: selectCostOfRiskChartJst,
      onSelectReferenceDate: selectCostOfRiskReferenceDate,
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
  renderCostOfRiskActiveFiltersView({
    activeTab: activeCostOfRiskTab,
    contributionDisplayMenuOpen: activeCostOfRiskContributionDisplayMenuOpen,
    container: elements.costOfRiskActiveFilters,
    counterpartyMenuOpen: activeCostOfRiskCounterpartyFilterMenuOpen,
    displayMode: getActiveCostOfRiskDisplayMode(),
    instrumentMenuOpen: activeCostOfRiskInstrumentFilterMenuOpen,
    filterOptions,
    filters: activeCostOfRiskFilters,
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

  if (activeCostOfRiskTab !== "contributions" || !activeCostOfRiskMovementAuditXCode) {
    renderCostOfRiskAuditPanelPlaceholder();
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
    selectedUnit: state.selectedUnit
  });
}

function renderCostOfRiskStageTransferAuditPanel(state) {
  if (!elements.costOfRiskAuditPanel) return;

  if (activeCostOfRiskTab !== "stage-transfers" || !activeCostOfRiskStageTransferFlowKey) {
    renderCostOfRiskAuditPanelPlaceholder();
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
    selectedUnit: state.selectedUnit
  });
}

function renderCostOfRiskAuditPanelPlaceholder() {
  if (!elements.costOfRiskAuditPanel) return;
  const placeholder = document.createElement("div");
  placeholder.className = "cost-of-risk-audit-placeholder";
  placeholder.textContent = "Select a data point to display its audit trail.";
  elements.costOfRiskAuditPanel.replaceChildren(placeholder);
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
    model: stageSummary,
    onClearSmoothing: clearCostOfRiskSmoothing,
    onChangeSmoothing: updateCostOfRiskSmoothingWindow,
    onSelectJst: selectCostOfRiskChartJst,
    onSelectReferenceDate: selectCostOfRiskReferenceDate,
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
    model: counterpartySummary,
    onClearSmoothing: clearCostOfRiskSmoothing,
    onChangeSmoothing: updateCostOfRiskSmoothingWindow,
    onSelectJst: selectCostOfRiskChartJst,
    onSelectReferenceDate: selectCostOfRiskReferenceDate,
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

  let shouldRerender = flowKey !== activeCostOfRiskStageTransferFlowKey;
  activeCostOfRiskStageTransferFlowKey = flowKey;

  const stageFilter = getCostOfRiskStageFilterForStageTransferFlowKey(flowKey);
  if (stageFilter && activeCostOfRiskFilters.stage !== stageFilter) {
    setActiveCostOfRiskStageFilter(stageFilter);
    shouldRerender = true;
  }

  if (!shouldRerender) return;
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
    flowSeries,
    onClearSmoothing: clearCostOfRiskSmoothing,
    onChangeSmoothing: updateCostOfRiskSmoothingWindow,
    onSelectJst: selectCostOfRiskChartJst,
    onSelectReferenceDate: selectCostOfRiskReferenceDate,
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

  activeCostOfRiskMovementAuditXCode = code;
  if (code === activeCostOfRiskXAxisCode) {
    if (getLatestState()) renderCostOfRiskMovementAuditPanel(getLatestState());
    return;
  }
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
  if (activeCostOfRiskSmoothingWindow === nextWindow) return;
  activeCostOfRiskSmoothingWindow = nextWindow;
  if (elements.costOfRiskSmoothing) elements.costOfRiskSmoothing.value = String(nextWindow);
  if (elements.costOfRiskSmoothingValue) elements.costOfRiskSmoothingValue.textContent = formatCostOfRiskSmoothingLabel(nextWindow);
  if (getLatestState()) rerenderApp(getLatestState());
}

function clearCostOfRiskSmoothing() {
  if (activeCostOfRiskSmoothingWindow <= 1) return;
  updateCostOfRiskSmoothingWindow(1);
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
    selectedUnit
  });
}

function clearCostOfRiskAuditTable() {
  clearCostOfRiskAuditTableView(elements.costOfRiskAudit);
}
