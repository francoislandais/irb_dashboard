import { getCostOfRiskYAxisBounds } from "../data/costOfRisk.js?v=20260715-cost-risk-movement-chart-view";
import { formatMetricValue, formatSignedMetricValue } from "../data/core/formatting.js?v=20260710-bp-format";
import {
  createCostOfRiskHighchartsTitle,
  escapeHtml,
  formatCostOfRiskQuarterAxisLabel,
  getCostOfRiskAxisTickPositions
} from "./costOfRiskChartUtils.js?v=20260715-cost-risk-movement-chart-view";
import {
  buildBenchmarkChartModel,
  clearBenchmarkEndpointLabels,
  clearPeerDistributionBands,
  getBenchmarkLinePlotOptions,
  getBenchmarkYAxisBoundsSeries,
  hasBenchmarkChartModeChanged,
  markBenchmarkChartMode,
  renderBenchmarkEndpointLabels,
  renderPeerDistributionBands,
  scheduleBenchmarkEndpointLabels
} from "./benchmarkLineChart.js?v=20260714-benchmark-mode-recreate";
import { primaryDark } from "./theme.js?v=20260709-flow-arrow-color";

let costOfRiskStageReconciliationChart = null;

export function getCostOfRiskStageReconciliationChart() {
  return costOfRiskStageReconciliationChart;
}

export function destroyCostOfRiskStageReconciliationChart() {
  if (!costOfRiskStageReconciliationChart) return;
  costOfRiskStageReconciliationChart.destroy();
  costOfRiskStageReconciliationChart = null;
}

export function renderCostOfRiskStageReconciliationView({
  activeReferenceDate,
  clearEmptyPanels,
  elements,
  formatReferenceQuarterLabel,
  model,
  onSelectJst,
  onSelectReferenceDate,
  renderTabEmpty,
  selectedUnit,
  smoothingWindow,
  state
}) {
  if (!elements.costOfRiskStageReconciliationSummary) return;

  if (model.status) {
    elements.costOfRiskStageReconciliationSummary.replaceChildren();
    destroyCostOfRiskStageReconciliationChart();
    renderTabEmpty(getCostOfRiskStageReconciliationEmptyMessage(model.status));
    return;
  }

  clearEmptyPanels();
  renderCostOfRiskStageReconciliationSummary(model, selectedUnit, formatReferenceQuarterLabel, elements);
  renderCostOfRiskStageReconciliationChart({
    activeReferenceDate,
    elements,
    model,
    onSelectJst,
    onSelectReferenceDate,
    renderTabEmpty,
    selectedUnit,
    smoothingWindow,
    state
  });
}

function getCostOfRiskStageReconciliationEmptyMessage(status) {
  if (status === "No matching FINREP point is available for the selected filters.") {
    return "";
  }
  return status;
}

function renderCostOfRiskStageReconciliationSummary(model, selectedUnit, formatReferenceQuarterLabel, elements) {
  const container = elements.costOfRiskStageReconciliationSummary;
  if (!container) return;

  const header = document.createElement("div");
  header.className = "cost-of-risk-stage-reconciliation-header";
  const title = document.createElement("div");
  title.className = "cost-of-risk-stage-reconciliation-title";
  title.textContent = `${model.stageLabel} reconciliation`;
  const context = document.createElement("div");
  context.className = "cost-of-risk-stage-reconciliation-context";
  context.textContent = `${formatReferenceQuarterLabel(model.referenceDate)} - ${model.transferLabel}`;
  header.append(title, context);

  const metrics = document.createElement("div");
  metrics.className = "cost-of-risk-stage-reconciliation-metrics";
  metrics.append(
    createCostOfRiskStageReconciliationMetric("Net stage transfers", formatSignedMetricValue(model.netTransfers, selectedUnit), "F12.02 inter-stage transfers only"),
    createCostOfRiskStageReconciliationMetric("Change in credit risk", formatSignedMetricValue(model.creditRiskChange, selectedUnit), "F12.01 x=0040"),
    createCostOfRiskStageReconciliationMetric("Allowance / transfer ratio", formatCostOfRiskStageReconciliationPercentValue(model.ratio), "Change in credit risk divided by net stage transfers")
  );

  const table = document.createElement("table");
  table.className = "cost-of-risk-stage-reconciliation-table";
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  ["Component", "Direction", "Quarterly amount", "Contribution"].forEach((label) => {
    const th = document.createElement("th");
    th.textContent = label;
    headRow.append(th);
  });
  thead.append(headRow);
  const tbody = document.createElement("tbody");
  model.breakdown.forEach((item) => {
    const row = document.createElement("tr");
    const direction = item.direction === "in"
      ? `From Stage ${item.from}`
      : `To Stage ${item.to}`;
    [
      item.label,
      direction,
      formatMetricValue(item.value, selectedUnit),
      formatSignedMetricValue(item.signedValue, selectedUnit)
    ].forEach((value, index) => {
      const td = document.createElement("td");
      td.textContent = value;
      if (index >= 2) td.className = "cost-of-risk-stage-reconciliation-number";
      row.append(td);
    });
    tbody.append(row);
  });
  const totalRow = document.createElement("tr");
  totalRow.className = "cost-of-risk-stage-reconciliation-total";
  const totalLabel = document.createElement("td");
  totalLabel.colSpan = 3;
  totalLabel.textContent = "Net stage transfers";
  const totalValue = document.createElement("td");
  totalValue.className = "cost-of-risk-stage-reconciliation-number";
  totalValue.textContent = formatSignedMetricValue(model.netTransfers, selectedUnit);
  totalRow.append(totalLabel, totalValue);
  tbody.append(totalRow);
  table.append(thead, tbody);

  container.replaceChildren(header, metrics, table);
}

function createCostOfRiskStageReconciliationMetric(label, value, context) {
  const item = document.createElement("div");
  item.className = "cost-of-risk-stage-reconciliation-metric";
  const itemLabel = document.createElement("div");
  itemLabel.className = "cost-of-risk-stage-reconciliation-metric-label";
  itemLabel.textContent = label;
  const itemValue = document.createElement("div");
  itemValue.className = "cost-of-risk-stage-reconciliation-metric-value";
  itemValue.textContent = value;
  const itemContext = document.createElement("div");
  itemContext.className = "cost-of-risk-stage-reconciliation-metric-context";
  itemContext.textContent = context;
  item.append(itemLabel, itemValue, itemContext);
  return item;
}

function formatCostOfRiskStageReconciliationPercentValue(value) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "-";

  return `${new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
    signDisplay: "exceptZero"
  }).format(value * 100)} %`;
}

function capCostOfRiskStageReconciliationYAxisBounds(bounds) {
  return {
    max: Number.isFinite(bounds?.max) ? Math.min(bounds.max, 1) : bounds?.max,
    min: Number.isFinite(bounds?.min) ? Math.max(bounds.min, -1) : bounds?.min
  };
}

function renderCostOfRiskStageReconciliationChart({
  activeReferenceDate,
  elements,
  model,
  onSelectJst,
  onSelectReferenceDate,
  renderTabEmpty,
  smoothingWindow,
  state
}) {
  if (!elements.costOfRiskStageReconciliationChart || !window.Highcharts) return;

  const chartModel = buildBenchmarkChartModel(model.benchmarkSeries, state.selectedJst, primaryDark, {
    displayMode: "amount",
    peerDisplayMode: state.peerDisplayMode,
    smoothingWindow
  });
  const series = chartModel.series;
  const isAnonymised = chartModel.peerDisplayMode === "anonymised";

  if (series.length === 0) {
    destroyCostOfRiskStageReconciliationChart();
    renderTabEmpty("No stage reconciliation benchmark is available for the current selection.");
    return;
  }

  const yBounds = capCostOfRiskStageReconciliationYAxisBounds(
    getCostOfRiskYAxisBounds(getBenchmarkYAxisBoundsSeries(series, chartModel.distribution))
  );
  const selectedReferencePoint = model.benchmarkSeries
    .find((benchmark) => benchmark.jstCode === state.selectedJst)
    ?.points?.find((point) => point.label === activeReferenceDate);
  const titleText = `${model.stageLabel} reconciliation ratio - time evolution`;
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
          renderBenchmarkEndpointLabels(this, state.selectedJst, onSelectJst, { peerDisplayMode: chartModel.peerDisplayMode });
        }
      },
      spacingRight: 128,
      type: "line",
      zooming: { type: "xy" },
      zoomType: "xy"
    },
    credits: { enabled: false },
    legend: { enabled: false },
    plotOptions: getBenchmarkLinePlotOptions((referenceLabel, seriesName) => {
      onSelectReferenceDate(referenceLabel);
      onSelectJst(seriesName);
    }, state.selectedJst),
    series,
    subtitle: { text: "" },
    title: createCostOfRiskHighchartsTitle(titleText),
    tooltip: {
      headerFormat: "<span style=\"font-size:11px\">{point.key:%d/%m/%Y}</span><br/>",
      pointFormatter() {
        return `<span style="color:${this.series.color}">●</span> <b>${escapeHtml(this.series.name)}</b>: ${formatCostOfRiskStageReconciliationPercentValue(this.y)}`;
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
      tickPositions: getCostOfRiskAxisTickPositions(model.benchmarkSeries[0]?.points),
      type: "datetime"
    },
    yAxis: {
      gridLineColor: "#edf0ee",
      labels: {
        formatter() {
          return formatCostOfRiskStageReconciliationPercentValue(this.value);
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
      title: { text: "Ratio (%)" }
    }
  };

  if (hasBenchmarkChartModeChanged(costOfRiskStageReconciliationChart, chartModel.peerDisplayMode)) destroyCostOfRiskStageReconciliationChart();
  if (costOfRiskStageReconciliationChart) {
    clearBenchmarkEndpointLabels(costOfRiskStageReconciliationChart);
    costOfRiskStageReconciliationChart.update(options, true, true, false);
    markBenchmarkChartMode(costOfRiskStageReconciliationChart, chartModel.peerDisplayMode);
    scheduleBenchmarkEndpointLabels(costOfRiskStageReconciliationChart, state.selectedJst, onSelectJst, { peerDisplayMode: chartModel.peerDisplayMode });
  } else {
    costOfRiskStageReconciliationChart = window.Highcharts.chart(elements.costOfRiskStageReconciliationChart, options);
    markBenchmarkChartMode(costOfRiskStageReconciliationChart, chartModel.peerDisplayMode);
  }
}
