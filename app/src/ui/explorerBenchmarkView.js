import { getCostOfRiskYAxisBounds } from "../data/costOfRisk.js?v=20260812-costofrisk-domain-split";
import {
  createCostOfRiskHighchartsTitle,
  getCostOfRiskFocusedYAxisBounds,
  renderCostOfRiskSmoothingBadge,
  renderCostOfRiskYAxisFocusBadge
} from "./costOfRiskChartUtils.js?v=20260804-axis-year-labels";
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
} from "./benchmarkLineChart.js?v=20260812-costofrisk-domain-split";
import { primaryDark } from "./theme.js?v=20260709-flow-arrow-color";

let explorerBenchmarkChart = null;

export function destroyExplorerBenchmarkChart() {
  if (!explorerBenchmarkChart) return;
  explorerBenchmarkChart.destroy();
  explorerBenchmarkChart = null;
}

export function renderExplorerBenchmarkView({
  benchmark,
  compact = false,
  container,
  focusYAxis,
  formatValue,
  onClearSmoothing,
  onChangeSmoothing,
  onSelectJst,
  onSelectReference,
  onToggleYAxisFocus,
  peerDisplayMode,
  selectedReferenceLabel,
  selectedJst,
  smoothingWindow
}) {
  if (benchmark.series.length === 0 || benchmark.dates.length === 0) {
    destroyExplorerBenchmarkChart();
    if (container) container.textContent = "No data available for this point.";
    return;
  }

  if (!container || !window.Highcharts) return;

  const benchmarkSeries = benchmark.series.map((serie) => ({ jstCode: serie.jstCode, points: serie.values }));
  const chartModel = buildBenchmarkChartModel(benchmarkSeries, selectedJst, primaryDark, {
    displayMode: "amount",
    peerDisplayMode,
    smoothingWindow
  });
  const series = compact
    ? chartModel.series.map((serie) => ({
      ...serie,
      lineWidth: serie.name === selectedJst ? 2.2 : serie.lineWidth,
      marker: serie.name === selectedJst
        ? { ...serie.marker, enabled: true, fillColor: primaryDark, lineWidth: 0, radius: 1.4 }
        : serie.marker,
      states: serie.name === selectedJst
        ? { ...serie.states, hover: { ...serie.states?.hover, halo: { size: 2 }, lineWidth: 2.4 } }
        : serie.states
    }))
    : chartModel.series;
  const isAnonymised = chartModel.peerDisplayMode === "anonymised";
  const selectedReferencePoint = benchmark.dates.find((reference) => reference.label === selectedReferenceLabel);

  if (series.length === 0) {
    destroyExplorerBenchmarkChart();
    container.textContent = "No data available for this point.";
    return;
  }

  const yBounds = focusYAxis
    ? getCostOfRiskFocusedYAxisBounds(series, selectedJst)
    : getCostOfRiskYAxisBounds(getBenchmarkYAxisBoundsSeries(series, chartModel.distribution));

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
          if (compact) {
            clearBenchmarkEndpointLabels(this);
          } else {
            renderBenchmarkEndpointLabels(this, selectedJst, onSelectJst, { peerDisplayMode: chartModel.peerDisplayMode });
            renderCostOfRiskSmoothingBadge(this, smoothingWindow, onClearSmoothing, onChangeSmoothing);
            renderCostOfRiskYAxisFocusBadge(this, focusYAxis, onToggleYAxisFocus);
          }
        }
      },
      // Fixed regardless of whether the anonymised-mode subtitle has text:
      // letting Highcharts auto-size that margin shifted the plot area (and
      // every axis label with it) whenever the subtitle appeared/disappeared.
      marginTop: compact ? 8 : 40,
      spacingBottom: compact ? 4 : 10,
      spacingLeft: compact ? 2 : 10,
      spacingRight: compact ? 6 : 128,
      type: "line",
      zooming: { type: "xy" },
      zoomType: "xy"
    },
    credits: { enabled: false },
    legend: { enabled: false },
    plotOptions: getBenchmarkLinePlotOptions((referenceLabel, seriesName) => {
      onSelectReference(referenceLabel);
      onSelectJst(seriesName);
    }, selectedJst),
    series,
    subtitle: !compact && isAnonymised && chartModel.status ? { text: chartModel.status, style: { color: "#8a7248", fontSize: "10px" } } : { text: "" },
    title: compact ? { text: "" } : createCostOfRiskHighchartsTitle("temporal benchmark of the current selection"),
    tooltip: {
      headerFormat: "<span style=\"font-size:11px\">{point.key:%d/%m/%Y}</span><br/>",
      pointFormatter() {
        return `<span style="color:${this.series.color}">●</span> <b>${this.series.name}</b>: ${formatValue(this.y)}`;
      },
      shared: false,
      split: false,
      stickOnContact: true,
      xDateFormat: "%d/%m/%Y"
    },
    xAxis: {
      labels: { style: { color: "#5f6b65", fontSize: compact ? "9px" : undefined } },
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
      visible: !compact,
      gridLineColor: "#edf0ee",
      gridLineWidth: compact ? 0 : 1,
      labels: {
        enabled: !compact,
        formatter() {
          return formatValue(this.value);
        },
        style: { color: "#5f6b65", fontSize: compact ? "9px" : undefined }
      },
      lineColor: "#aeb8b2",
      lineWidth: compact ? 0 : 1,
      max: yBounds.max,
      min: yBounds.min,
      startOnTick: false,
      endOnTick: false,
      tickAmount: compact ? undefined : 8,
      tickLength: compact ? 0 : undefined,
      tickWidth: compact ? 0 : 1,
      title: { text: null }
    }
  };

  if (hasBenchmarkChartModeChanged(explorerBenchmarkChart, chartModel.peerDisplayMode)
      || (explorerBenchmarkChart && explorerBenchmarkChart.__explorerCompact !== compact)) {
    destroyExplorerBenchmarkChart();
  }
  if (explorerBenchmarkChart) {
    clearBenchmarkEndpointLabels(explorerBenchmarkChart);
    explorerBenchmarkChart.update(options, true, true, false);
    markBenchmarkChartMode(explorerBenchmarkChart, chartModel.peerDisplayMode);
    if (!compact) {
      scheduleBenchmarkEndpointLabels(explorerBenchmarkChart, selectedJst, onSelectJst, { peerDisplayMode: chartModel.peerDisplayMode });
    }
  } else {
    explorerBenchmarkChart = window.Highcharts.chart(container, options);
    markBenchmarkChartMode(explorerBenchmarkChart, chartModel.peerDisplayMode);
  }
  explorerBenchmarkChart.__explorerCompact = compact;
  // The container is only unhidden a moment before this runs (see
  // renderExplorer), so force a reflow in case Highcharts measured its
  // width before the surrounding grid track had finished laying out.
  explorerBenchmarkChart.reflow();
}
