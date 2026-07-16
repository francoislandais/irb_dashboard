import { getCostOfRiskYAxisBounds } from "../data/costOfRisk.js?v=20260716-cost-risk-filters-above-tabs-view";
import { formatBasisPointsValue, formatContributionPercentValue, formatMetricValue, formatSignedMetricValue } from "../data/core/formatting.js?v=20260710-bp-format";
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
import {
  createCostOfRiskHighchartsTitle,
  escapeHtml,
  formatCostOfRiskQuarterAxisLabel,
  getCostOfRiskAxisTickPositions,
  renderCostOfRiskSmoothingBadge
} from "./costOfRiskChartUtils.js?v=20260716-cost-risk-filters-above-tabs-view";
import {
  formatSignedGrowthPercentValue,
  getCostOfRiskStageSummaryMetricLabel
} from "./costOfRiskSummaryTablesView.js?v=20260716-cost-risk-filters-above-tabs-view";
import { primaryDark } from "./theme.js?v=20260709-flow-arrow-color";

let costOfRiskCounterpartySummaryChart = null;
let costOfRiskStageSummaryChart = null;

export function getCostOfRiskCounterpartySummaryChart() {
  return costOfRiskCounterpartySummaryChart;
}

export function getCostOfRiskStageSummaryChart() {
  return costOfRiskStageSummaryChart;
}

export function destroyCostOfRiskCounterpartySummaryChart() {
  if (!costOfRiskCounterpartySummaryChart) return;
  costOfRiskCounterpartySummaryChart.destroy();
  costOfRiskCounterpartySummaryChart = null;
}

export function destroyCostOfRiskStageSummaryChart() {
  if (!costOfRiskStageSummaryChart) return;
  costOfRiskStageSummaryChart.destroy();
  costOfRiskStageSummaryChart = null;
}

export function renderCostOfRiskStageSummaryChart({
  activeReferenceDate,
  container,
  displayMode,
  model,
  onSelectJst,
  onSelectReferenceDate,
  onClearSmoothing,
  renderTabEmpty,
  selectedUnit,
  smoothingWindow,
  state
}) {
  renderCostOfRiskSummaryChart({
    activeReferenceDate,
    chart: costOfRiskStageSummaryChart,
    container,
    destroyChart: destroyCostOfRiskStageSummaryChart,
    displayMode,
    getChart: () => costOfRiskStageSummaryChart,
    getPointRowLabel: (stageSummary, selectedCell) => getCostOfRiskStageSummaryStageLabel(stageSummary, selectedCell.stageKey),
    missingMessage: "No stage summary time series is available for the current selection.",
    model,
    onChartCreated: (chart) => { costOfRiskStageSummaryChart = chart; },
    onSelectJst,
    onSelectReferenceDate,
    onClearSmoothing,
    renderTabEmpty,
    selectedUnit,
    smoothingWindow,
    state
  });
}

export function renderCostOfRiskCounterpartySummaryChart({
  activeReferenceDate,
  container,
  displayMode,
  model,
  onSelectJst,
  onSelectReferenceDate,
  onClearSmoothing,
  renderTabEmpty,
  selectedUnit,
  smoothingWindow,
  state
}) {
  renderCostOfRiskSummaryChart({
    activeReferenceDate,
    chart: costOfRiskCounterpartySummaryChart,
    container,
    destroyChart: destroyCostOfRiskCounterpartySummaryChart,
    displayMode,
    getChart: () => costOfRiskCounterpartySummaryChart,
    getPointRowLabel: (counterpartySummary, selectedCell) => getCostOfRiskCounterpartySummaryRowLabel(counterpartySummary, selectedCell.rowKey),
    missingMessage: "No counterparty summary time series is available for the current selection.",
    model,
    onChartCreated: (chart) => { costOfRiskCounterpartySummaryChart = chart; },
    onSelectJst,
    onSelectReferenceDate,
    onClearSmoothing,
    renderTabEmpty,
    selectedUnit,
    smoothingWindow,
    state
  });
}

function renderCostOfRiskSummaryChart({
  activeReferenceDate,
  chart,
  container,
  destroyChart,
  displayMode,
  getChart,
  getPointRowLabel,
  missingMessage,
  model,
  onChartCreated,
  onSelectJst,
  onSelectReferenceDate,
  onClearSmoothing,
  renderTabEmpty,
  selectedUnit,
  smoothingWindow,
  state
}) {
  if (!container || !window.Highcharts) return;

  const selectedCell = model.selectedCell;
  const chartDisplayMode = getCostOfRiskSummaryChartDisplayMode(selectedCell, displayMode);
  const chartModel = buildBenchmarkChartModel(model.benchmarkSeries, state.selectedJst, primaryDark, {
    displayMode: chartDisplayMode,
    peerDisplayMode: state.peerDisplayMode,
    smoothingWindow
  });
  const series = chartModel.series;
  const isAnonymised = chartModel.peerDisplayMode === "anonymised";

  if (!selectedCell || series.length === 0) {
    destroyChart();
    renderTabEmpty(model.status || missingMessage);
    return;
  }

  const yBounds = getCostOfRiskYAxisBounds(getBenchmarkYAxisBoundsSeries(series, chartModel.distribution));
  const selectedReferencePoint = model.benchmarkSeries
    .find((benchmark) => benchmark.jstCode === state.selectedJst)
    ?.points?.find((point) => point.label === activeReferenceDate);
  const titleText = `${getCostOfRiskStageSummaryMetricLabel(selectedCell)} - ${getPointRowLabel(model, selectedCell)} - time evolution`;
  const ratioIsPercent = selectedCell.metric === "coverage" && selectedCell.kind === "level";

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
          renderCostOfRiskSmoothingBadge(this, smoothingWindow, onClearSmoothing);
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
        return `<span style="color:${this.series.color}">●</span> <b>${escapeHtml(this.series.name)}</b>: ${formatCostOfRiskStageSummaryChartValue(this.y, selectedCell, chartDisplayMode, selectedUnit)}`;
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
          return formatCostOfRiskStageSummaryChartValue(this.value, selectedCell, chartDisplayMode, selectedUnit);
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
      title: { text: chartDisplayMode === "amount" ? "Amount" : (ratioIsPercent ? "Percent" : "Growth rate (%)") }
    }
  };

  if (hasBenchmarkChartModeChanged(chart, chartModel.peerDisplayMode)) destroyChart();
  const activeChart = getChart();
  if (activeChart) {
    clearBenchmarkEndpointLabels(activeChart);
    activeChart.update(options, true, true, false);
    markBenchmarkChartMode(activeChart, chartModel.peerDisplayMode);
    scheduleBenchmarkEndpointLabels(activeChart, state.selectedJst, onSelectJst, { peerDisplayMode: chartModel.peerDisplayMode });
  } else {
    const nextChart = window.Highcharts.chart(container, options);
    onChartCreated(nextChart);
    markBenchmarkChartMode(nextChart, chartModel.peerDisplayMode);
  }
}

function formatCostOfRiskStageSummaryChartValue(value, selectedCell, displayMode, selectedUnit) {
  if (!Number.isFinite(value)) return "-";
  if (selectedCell.metric === "coverage") {
    return selectedCell.kind === "mom"
      ? formatBasisPointsValue(value)
      : formatContributionPercentValue(value / 10000);
  }
  if (selectedCell.kind === "level" || displayMode === "amount") return selectedCell.kind === "mom"
    ? formatSignedMetricValue(value, selectedUnit)
    : formatMetricValue(value, selectedUnit);
  return selectedCell.kind === "mom"
    ? formatSignedGrowthPercentValue(value)
    : formatContributionPercentValue(value / 10000);
}

function getCostOfRiskSummaryChartDisplayMode(selectedCell, displayMode) {
  if (!selectedCell) return "amount";
  if (selectedCell.metric === "coverage") return "ratio";
  if (selectedCell.kind === "level") return "amount";
  return displayMode;
}

function getCostOfRiskStageSummaryStageLabel(stageSummary, stageKey) {
  return (stageSummary.rows ?? []).find((row) => row.key === stageKey)?.label ?? stageKey;
}

function getCostOfRiskCounterpartySummaryRowLabel(counterpartySummary, rowKey) {
  return (counterpartySummary.rows ?? []).find((row) => row.key === rowKey)?.label ?? rowKey;
}
