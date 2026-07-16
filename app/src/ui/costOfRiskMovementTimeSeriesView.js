import {
  formatCostOfRiskDisplayValue,
  getCostOfRiskYAxisBounds
} from "../data/costOfRisk.js?v=20260716-cost-risk-stage-related-flow-blue-view";
import { formatMetricValue } from "../data/core/formatting.js?v=20260710-bp-format";
import {
  createCostOfRiskHighchartsTitle,
  escapeHtml,
  formatCostOfRiskQuarterAxisLabel,
  getCostOfRiskAxisTickPositions,
  renderCostOfRiskSmoothingBadge
} from "./costOfRiskChartUtils.js?v=20260716-cost-risk-stage-related-flow-blue-view";
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

let costOfRiskMovementChart = null;

export function getCostOfRiskMovementChart() {
  return costOfRiskMovementChart;
}

export function destroyCostOfRiskMovementChart() {
  if (!costOfRiskMovementChart) return;
  costOfRiskMovementChart.destroy();
  costOfRiskMovementChart = null;
}

export function renderCostOfRiskMovementTimeSeriesChart({
  activeReferenceDate,
  container,
  displayMode = "ratio",
  jstCode,
  onSelectJst,
  onSelectReferenceDate,
  onClearSmoothing,
  onChangeSmoothing,
  peerDisplayMode = "explicit",
  renderTabEmpty,
  selectedUnit = "millions",
  selection,
  smoothingWindow,
  titleText
}) {
  if (!container || !window.Highcharts) return;

  const chartModel = buildBenchmarkChartModel(selection.benchmarkSeries, jstCode, primaryDark, { displayMode, peerDisplayMode, smoothingWindow });
  const series = chartModel.series;
  const isAnonymised = chartModel.peerDisplayMode === "anonymised";
  const yBounds = getCostOfRiskYAxisBounds(getBenchmarkYAxisBoundsSeries(series, chartModel.distribution));
  const selectedReferencePoint = selection.series?.find((point) => point.label === activeReferenceDate);

  if (series.length === 0) {
    destroyCostOfRiskMovementChart();
    renderTabEmpty("No contribution time series is available for the current selection.");
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
          renderBenchmarkEndpointLabels(this, jstCode, onSelectJst, { peerDisplayMode: chartModel.peerDisplayMode });
          renderCostOfRiskSmoothingBadge(this, smoothingWindow, onClearSmoothing, onChangeSmoothing);
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
    }, jstCode),
    series,
    subtitle: { text: "" },
    title: createCostOfRiskHighchartsTitle(titleText),
    tooltip: {
      headerFormat: "<span style=\"font-size:11px\">{point.key:%d/%m/%Y}</span><br/>",
      pointFormatter() {
        return `<span style="color:${this.series.color}">\u25cf</span> <b>${escapeHtml(this.series.name)}</b>: ${formatCostOfRiskDisplayValue(this.y, displayMode, selectedUnit)}`;
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
      title: { text: displayMode === "ratio" ? "Growth rate (bp)" : "Amount" }
    }
  };

  if (hasBenchmarkChartModeChanged(costOfRiskMovementChart, chartModel.peerDisplayMode)) destroyCostOfRiskMovementChart();
  if (costOfRiskMovementChart) {
    clearBenchmarkEndpointLabels(costOfRiskMovementChart);
    costOfRiskMovementChart.update(options, true, true, false);
    markBenchmarkChartMode(costOfRiskMovementChart, chartModel.peerDisplayMode);
    scheduleBenchmarkEndpointLabels(costOfRiskMovementChart, jstCode, onSelectJst, { peerDisplayMode: chartModel.peerDisplayMode });
  } else {
    costOfRiskMovementChart = window.Highcharts.chart(container, options);
    markBenchmarkChartMode(costOfRiskMovementChart, chartModel.peerDisplayMode);
  }
}
