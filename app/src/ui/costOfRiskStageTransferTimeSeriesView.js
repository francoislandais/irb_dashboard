import {
  formatCostOfRiskDisplayValue,
  getCostOfRiskYAxisBounds
} from "../data/costOfRisk.js?v=20260717-cost-risk-reference-date-help";
import { formatMetricValue } from "../data/core/formatting.js?v=20260710-bp-format";
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
} from "./benchmarkLineChart.js?v=20260717-cost-risk-reference-date-help";
import {
  createCostOfRiskHighchartsTitle,
  escapeHtml,
  formatCostOfRiskQuarterAxisLabel,
  getCostOfRiskAxisTickPositions,
  getCostOfRiskFocusedYAxisBounds,
  renderCostOfRiskYAxisFocusBadge,
  renderCostOfRiskSmoothingBadge
} from "./costOfRiskChartUtils.js?v=20260717-cost-risk-reference-date-help";
import { primaryDark } from "./theme.js?v=20260709-flow-arrow-color";

let costOfRiskStageTransferFlowChart = null;

export function getCostOfRiskStageTransferFlowChart() {
  return costOfRiskStageTransferFlowChart;
}

export function destroyCostOfRiskStageTransferFlowChart() {
  if (!costOfRiskStageTransferFlowChart) return;
  costOfRiskStageTransferFlowChart.destroy();
  costOfRiskStageTransferFlowChart = null;
}

export function renderCostOfRiskStageTransferFlowTimeSeriesChart({
  activeReferenceDate,
  chartDisplayMode,
  container,
  focusSelectedYAxis = false,
  flowSeries,
  onSelectJst,
  onSelectReferenceDate,
  onClearSmoothing,
  onChangeSmoothing,
  onToggleYAxisFocus,
  renderTabEmpty,
  selectedUnit,
  smoothingWindow,
  state,
  titleElement,
  wrapElement
}) {
  if (!container) return;

  if (wrapElement) wrapElement.hidden = false;
  const titleText = `${flowSeries.label} - time evolution`;
  if (titleElement) titleElement.textContent = titleText;

  if (!window.Highcharts || flowSeries.benchmarkSeries.length === 0) {
    destroyCostOfRiskStageTransferFlowChart();
    renderTabEmpty(flowSeries.status || "No stage transfer time series is available for the current selection.");
    return;
  }

  const chartModel = buildBenchmarkChartModel(flowSeries.benchmarkSeries, state.selectedJst, primaryDark, {
    displayMode: chartDisplayMode,
    peerDisplayMode: state.peerDisplayMode,
    smoothingWindow
  });
  const series = chartModel.series;
  const isAnonymised = chartModel.peerDisplayMode === "anonymised";
  if (series.length === 0) {
    destroyCostOfRiskStageTransferFlowChart();
    renderTabEmpty("No stage transfer time series is available for the current selection.");
    return;
  }

  const yBounds = focusSelectedYAxis
    ? getCostOfRiskFocusedYAxisBounds(series, state.selectedJst)
    : getCostOfRiskYAxisBounds(getBenchmarkYAxisBoundsSeries(series, chartModel.distribution));
  const selectedReferencePoint = flowSeries.benchmarkSeries
    .find((benchmark) => benchmark.jstCode === state.selectedJst)
    ?.points?.find((point) => point.label === activeReferenceDate);

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
          renderCostOfRiskSmoothingBadge(this, smoothingWindow, onClearSmoothing, onChangeSmoothing);
          renderCostOfRiskYAxisFocusBadge(this, focusSelectedYAxis, onToggleYAxisFocus);
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
        return `<span style="color:${this.series.color}">●</span> <b>${escapeHtml(this.series.name)}</b>: ${formatCostOfRiskDisplayValue(this.y, chartDisplayMode, selectedUnit)}`;
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
          return chartDisplayMode === "ratio"
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
      title: { text: chartDisplayMode === "ratio" ? "Growth rate (bp)" : "Amount" }
    }
  };

  if (hasBenchmarkChartModeChanged(costOfRiskStageTransferFlowChart, chartModel.peerDisplayMode)) destroyCostOfRiskStageTransferFlowChart();
  if (costOfRiskStageTransferFlowChart) {
    clearBenchmarkEndpointLabels(costOfRiskStageTransferFlowChart);
    costOfRiskStageTransferFlowChart.update(options, true, true, false);
    markBenchmarkChartMode(costOfRiskStageTransferFlowChart, chartModel.peerDisplayMode);
    scheduleBenchmarkEndpointLabels(costOfRiskStageTransferFlowChart, state.selectedJst, onSelectJst, { peerDisplayMode: chartModel.peerDisplayMode });
  } else {
    costOfRiskStageTransferFlowChart = window.Highcharts.chart(container, options);
    markBenchmarkChartMode(costOfRiskStageTransferFlowChart, chartModel.peerDisplayMode);
  }
}
