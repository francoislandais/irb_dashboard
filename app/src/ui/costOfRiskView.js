import {
  COST_OF_RISK_FILTER_ALL,
  COST_OF_RISK_WATERFALL_X_CODES,
  COST_OF_RISK_X_AXIS_CODE,
  buildCostOfRiskCounterpartyTreemapData,
  buildCostOfRiskF02ImpairmentRatio,
  buildCostOfRiskF02ImpairmentSeries,
  buildCostOfRiskF12ContributionSeries,
  buildCostOfRiskF2VsF12Audit,
  buildCostOfRiskFilteredSelectionValue,
  buildCostOfRiskStageExposureTable,
  buildCostOfRiskStageTransferFlowDiagram,
  buildCostOfRiskStageTransferWaterfall,
  buildCostOfRiskWaterfall,
  clampCostOfRiskSmoothingWindow,
  createCostOfRiskChartData,
  createCostOfRiskRatioChartData,
  formatCostOfRiskAuditValue,
  formatCostOfRiskDisplayValue,
  formatCostOfRiskSmoothingLabel,
  formatReferenceQuarterLabel,
  getCostOfRiskFilterOptions,
  getCostOfRiskPointDisplayValue,
  getCostOfRiskWaterfallXAxisOptions,
  getCostOfRiskXAxisOptions,
  getCostOfRiskYAxisBounds,
  getSelectedSmoothedCostOfRiskPoint,
  smoothCostOfRiskPoints
} from "../data/costOfRisk.js?v=20260708-explorer-rename";
import {
  createStageTransferWaterfallData,
  getStageTransferAxisLabel,
  getStageTransferDisplayValue,
  renderCostOfRiskStageExposureTable,
  renderCostOfRiskStageTransferFlowDiagram
} from "./costOfRiskStageTransfers.js?v=20260707-stage-flow-3";
import { formatMetricValue, formatSignedMetricValue } from "../data/core/formatting.js";
import { getLatestState } from "./appState.js";

let rerenderApp = () => {};
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
  costOfRiskXAxis: document.querySelector("#cost-of-risk-x-axis")
};

export function wireCostOfRiskUi(actions, rerender) {
  rerenderApp = rerender;
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
    renderCostOfRiskTreemap(
      buildCostOfRiskCounterpartyTreemapData(state, activeCostOfRiskFilters, activeCostOfRiskReferenceDate),
      activeCostOfRiskDisplayMode,
      state.selectedUnit
    );
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

function selectCostOfRiskReferenceDate(referenceDate) {
  if (!referenceDate || referenceDate === activeCostOfRiskReferenceDate) return;

  activeCostOfRiskReferenceDate = referenceDate;
  if (getLatestState()) rerenderApp(getLatestState());
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

