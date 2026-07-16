import { createCostOfRiskChartData, smoothCostOfRiskPoints } from "../data/costOfRisk.js?v=20260717-cost-risk-reference-date-help";
import { buildPeerDistributionByDate } from "../data/peerDistribution.js?v=20260717-cost-risk-reference-date-help";

const BENCHMARK_LINE_GRAYS = ["#8f9893", "#a2aaa6", "#b4bbb8", "#7f8984"];
const BENCHMARK_LINE_DASHES = ["ShortDash", "ShortDot", "Dash", "Dot"];

// Shared by every "JST benchmark line chart" in the app (Cost of Risk's
// Contribution/Stage transfers time evolution charts, Explorer's Benchmark
// view, ...) so that series styling, colors and point-click behavior never
// diverge between charts using the same visual language.
export function buildBenchmarkLineSeries(benchmarkSeries, selectedJstCode, primaryDark, {
  displayMode = "amount",
  selectedAreaFill = true,
  smoothingWindow = 1
} = {}) {
  return (benchmarkSeries ?? [])
    .map((benchmark, index) => {
      const isSelected = benchmark.jstCode === selectedJstCode;
      const points = smoothCostOfRiskPoints(benchmark.points ?? [], smoothingWindow);
      const color = isSelected ? primaryDark : BENCHMARK_LINE_GRAYS[index % BENCHMARK_LINE_GRAYS.length];
      const dashStyle = isSelected ? "Solid" : BENCHMARK_LINE_DASHES[index % BENCHMARK_LINE_DASHES.length];
      const chartData = createCostOfRiskChartData(points, displayMode);
      const shouldFillSelectedArea = isSelected && selectedAreaFill;
      return {
        // Selected series render as an area down to y=0, so the reader can
        // immediately see whether it sits above or below zero. The fill is a
        // discreet, near-transparent gray — never tinted by the series color.
        // In anonymised mode this fill is disabled so the peer quantile bands
        // remain visually unambiguous.
        clip: shouldFillSelectedArea,
        color,
        dashStyle,
        data: chartData,
        dataLabels: { enabled: false },
        fillColor: shouldFillSelectedArea ? "rgba(140, 148, 144, 0.12)" : "transparent",
        lineWidth: isSelected ? 3.6 : 1.45,
        marker: {
          fillColor: isSelected ? "#ffffff" : color,
          enabled: isSelected,
          lineColor: color,
          lineWidth: isSelected ? 1.5 : 0,
          radius: isSelected ? 5 : 0,
          symbol: "circle"
        },
        name: benchmark.jstCode,
        opacity: isSelected ? 1 : 0.78,
        states: {
          hover: {
            enabled: true,
            halo: { size: isSelected ? 9 : 0 },
            lineWidth: isSelected ? 4 : 2.1,
            lineWidthPlus: 0
          },
          inactive: {
            opacity: isSelected ? 1 : 0.42
          }
        },
        threshold: 0,
        type: shouldFillSelectedArea ? "area" : "line",
        zIndex: isSelected ? 100 : 1
      };
    })
    .filter((benchmark) => benchmark.data.length > 0)
    .sort((left, right) => {
      if (left.name === selectedJstCode) return 1;
      if (right.name === selectedJstCode) return -1;
      return left.name.localeCompare(right.name);
    });
}

// Builds the Highcharts series list for a benchmark chart under either
// display mode. In "explicit" mode this is unchanged (every peer JST as its
// own line). In "anonymised" mode individual peer series are replaced by
// aggregate percentile series, so no peer jst_code ever reaches a
// Highcharts series/point/tooltip/legend/DOM node.
export function buildBenchmarkChartModel(benchmarkSeries, selectedJstCode, primaryDark, options = {}) {
  const peerDisplayMode = options.peerDisplayMode === "anonymised" ? "anonymised" : "explicit";
  const explicitSeries = buildBenchmarkLineSeries(benchmarkSeries, selectedJstCode, primaryDark, {
    ...options,
    selectedAreaFill: peerDisplayMode !== "anonymised"
  });

  if (peerDisplayMode !== "anonymised") {
    return { distribution: null, peerDisplayMode, series: explicitSeries, status: "" };
  }

  const selectedSeries = explicitSeries.find((series) => series.name === selectedJstCode) ?? null;
  const peerChartSeries = explicitSeries.filter((series) => series.name !== selectedJstCode);

  if (peerChartSeries.length === 0) {
    return {
      distribution: [],
      peerDisplayMode,
      series: selectedSeries ? [selectedSeries] : [],
      status: "No peer data available."
    };
  }

  const distribution = buildPeerDistributionByDate(peerChartSeries);
  const hasAvailableDate = distribution.some((point) => point.status === "available");
  const distributionSeries = buildPeerDistributionLineSeries(distribution);

  return {
    distribution,
    peerDisplayMode,
    series: selectedSeries ? [selectedSeries, ...distributionSeries] : distributionSeries,
    status: hasAvailableDate ? "" : "Anonymised peer distribution unavailable: insufficient peer population."
  };
}

// In anonymised mode the peer band's P01-P99 range can extend beyond the
// selected series' own range, so the Y axis must be sized to include it too
// (the band is drawn as custom SVG, not a Highcharts series, and therefore
// wouldn't otherwise be accounted for by an axis' auto-scaling helper that
// only looks at series data). Pass the result to whatever Y-bounds helper
// the caller already uses (e.g. getCostOfRiskYAxisBounds).
export function getBenchmarkYAxisBoundsSeries(series, distribution) {
  if (!distribution) return series;

  const bandValues = distribution
    .filter((point) => point.status === "available")
    .flatMap((point) => [{ y: point.p01 }, { y: point.p99 }]);

  return [...series, { data: bandValues }];
}

function buildPeerDistributionLineSeries(distribution) {
  if (!Array.isArray(distribution) || distribution.length === 0) return [];

  return PEER_DISTRIBUTION_LINE_SERIES.map((definition) => {
    const data = distribution.map((point) => (
      point.status === "available"
        ? {
          custom: { peerCount: point.peerCount },
          x: point.x,
          y: point[definition.key]
        }
        : {
          x: point.x,
          y: null
        }
    ));

    return {
      clip: false,
      color: PEER_MEDIAN_COLOR,
      custom: {
        benchmarkLabel: definition.name,
        isBenchmarkDistribution: true,
        isEndpointSelectable: false
      },
      cursor: "default",
      dashStyle: definition.dashStyle,
      data,
      enableMouseTracking: true,
      lineWidth: definition.lineWidth,
      marker: { enabled: false, radius: 0 },
      name: definition.name,
      opacity: definition.opacity,
      states: {
        hover: {
          enabled: true,
          halo: { size: 0 },
          lineWidth: Math.max(definition.lineWidth + 0.45, 1.4),
          lineWidthPlus: 0
        },
        inactive: { opacity: definition.opacity }
      },
      type: "line",
      zIndex: definition.zIndex
    };
  }).filter((series) => series.data.some((point) => Number.isFinite(point.y)));
}

const PEER_BAND_OUTER_FILL = "rgba(143, 152, 147, 0.10)";
const PEER_BAND_INNER_FILL = "rgba(143, 152, 147, 0.22)";
const PEER_MEDIAN_COLOR = "#8f9893";
const PEER_DISTRIBUTION_LINE_SERIES = [
  { dashStyle: "ShortDash", key: "median", lineWidth: 1.7, name: "Median", opacity: 0.95, zIndex: 62 },
  { dashStyle: "ShortDot", key: "p25", lineWidth: 1.15, name: "25th percentile", opacity: 0.78, zIndex: 61 },
  { dashStyle: "ShortDot", key: "p75", lineWidth: 1.15, name: "75th percentile", opacity: 0.78, zIndex: 61 },
  { dashStyle: "Dot", key: "p01", lineWidth: 0.9, name: "1st percentile", opacity: 0.62, zIndex: 60 },
  { dashStyle: "Dot", key: "p99", lineWidth: 0.9, name: "99th percentile", opacity: 0.62, zIndex: 60 }
];

// Draws the P01-P99 and P25-P75 bands as custom SVG shapes behind the
// aggregate percentile Highcharts series.
// Call from the chart's "render" event, same pattern as
// renderBenchmarkEndpointLabels. A run of consecutive dates without a
// gap is drawn as one continuous band; a gap (insufficient population or a
// missing date) breaks the band instead of bridging across it.
export function renderPeerDistributionBands(chart, distribution) {
  clearPeerDistributionBands(chart);
  if (!distribution || distribution.length === 0) return;

  const xAxis = chart.xAxis?.[0];
  const yAxis = chart.yAxis?.[0];
  if (!xAxis || !yAxis) return;

  const elements = [];
  splitIntoAvailableRuns(distribution).forEach((run) => {
    elements.push(drawPeerBand(chart, xAxis, yAxis, run, "p01", "p99", PEER_BAND_OUTER_FILL));
    elements.push(drawPeerBand(chart, xAxis, yAxis, run, "p25", "p75", PEER_BAND_INNER_FILL));
  });

  chart.customPeerDistributionElements = elements.filter(Boolean);
}

export function clearPeerDistributionBands(chart) {
  if (!Array.isArray(chart.customPeerDistributionElements)) return;

  chart.customPeerDistributionElements.forEach((element) => element.destroy());
  chart.customPeerDistributionElements = [];
}

function splitIntoAvailableRuns(distribution) {
  const runs = [];
  let current = [];

  distribution.forEach((point) => {
    if (point.status === "available") {
      current.push(point);
    } else if (current.length > 0) {
      runs.push(current);
      current = [];
    }
  });
  if (current.length > 0) runs.push(current);

  return runs;
}

function drawPeerBand(chart, xAxis, yAxis, run, lowerKey, upperKey, fillColor) {
  if (run.length === 0) return null;

  if (run.length === 1) {
    const point = run[0];
    const x = xAxis.toPixels(point.x, false);
    const yLower = yAxis.toPixels(point[lowerKey], false);
    const yUpper = yAxis.toPixels(point[upperKey], false);
    return chart.renderer
      .path([
        ["M", x - 3, yUpper],
        ["L", x + 3, yUpper],
        ["L", x + 3, yLower],
        ["L", x - 3, yLower],
        ["Z"]
      ])
      .attr({ fill: fillColor, zIndex: 2 })
      .add();
  }

  const upperSegments = run.map((point) => ["L", xAxis.toPixels(point.x, false), yAxis.toPixels(point[upperKey], false)]);
  upperSegments[0][0] = "M";
  const lowerSegments = [...run].reverse().map((point) => ["L", xAxis.toPixels(point.x, false), yAxis.toPixels(point[lowerKey], false)]);

  return chart.renderer
    .path([...upperSegments, ...lowerSegments, ["Z"]])
    .attr({ fill: fillColor, zIndex: 2 })
    .add();
}

// Clicking near two close points from different JSTs is ambiguous — the user
// can't tell exactly which one they hit. The selected JST's curve is meant to
// be the "safe" target: a click within this many pixels of one of its points
// snaps to that point instead of whatever point technically received the
// click, so a nearby unrelated JST is never picked by accident.
const SELECTED_SERIES_SNAP_DISTANCE = 24;

// onPointClick(referenceLabel, seriesName) — callers that don't yet support a
// reference-date callback (e.g. Explorer's Benchmark view) can simply ignore
// the first argument. selectedJstCode is the currently selected JST's name
// (matches a series' `name`); pass "" if there is none yet.
export function getBenchmarkLinePlotOptions(onPointClick, selectedJstCode = "") {
  return {
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
      point: {
        events: {
          // Registered on the generic "series" plotOptions (not "line") so it
          // still fires for the selected series, which renders as an "area"
          // type — Highcharts scopes plotOptions.<type>.point.events to that
          // type only, and a point's click event only bubbles up to its own
          // series-type config, never to a sibling type's config.
          //
          // Deferred: onPointClick typically triggers a full app rerender
          // (JST_CODE/reference-date change), which can call chart.update()
          // on this very chart. Doing that synchronously, from inside
          // Highcharts' own point-click dispatch, corrupts the chart mid-event
          // (it can end up empty). Running it on the next tick lets Highcharts
          // finish handling this click first.
          click() {
            if (this.series.userOptions?.custom?.isBenchmarkDistribution) return;
            const targetPoint = resolveBenchmarkClickTarget(this, selectedJstCode);
            const referenceLabel = targetPoint.referenceLabel;
            const seriesName = targetPoint.series.name;
            setTimeout(() => onPointClick(referenceLabel, seriesName), 0);
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
  };
}

function resolveBenchmarkClickTarget(clickedPoint, selectedJstCode) {
  if (!selectedJstCode || clickedPoint.series.name === selectedJstCode) return clickedPoint;

  const selectedSeries = clickedPoint.series.chart.series.find((serie) => serie.name === selectedJstCode);
  if (!selectedSeries) return clickedPoint;

  let closestPoint = null;
  let closestDistance = Infinity;
  selectedSeries.points.forEach((point) => {
    if (!Number.isFinite(point.plotX) || !Number.isFinite(point.plotY)) return;
    const distance = Math.hypot(point.plotX - clickedPoint.plotX, point.plotY - clickedPoint.plotY);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestPoint = point;
    }
  });

  return closestPoint && closestDistance <= SELECTED_SERIES_SNAP_DISTANCE ? closestPoint : clickedPoint;
}

// onSelectJst(jstCode) — same JST_CODE selection entry point as clicking a
// series or a point, so clicking an endpoint label behaves identically.
export function renderBenchmarkEndpointLabels(chart, selectedJst, onSelectJst, options = {}) {
  clearBenchmarkEndpointLabels(chart);

  const peerDisplayMode = options.peerDisplayMode === "anonymised" ? "anonymised" : "explicit";
  const candidates = chart.series
    .filter((serie) => {
      if (!serie.visible || !serie.points?.length) return false;
      const custom = serie.userOptions?.custom ?? {};
      return peerDisplayMode === "anonymised" || custom.isBenchmarkDistribution !== true;
    })
    .map((serie) => {
      const point = [...serie.points]
        .reverse()
        .find((candidate) => Number.isFinite(candidate.plotX) && Number.isFinite(candidate.plotY));

      if (!point) return null;

      const custom = serie.userOptions?.custom ?? {};
      return {
        anchorX: chart.plotLeft + point.plotX,
        anchorY: chart.plotTop + point.plotY,
        color: serie.color,
        isSelected: serie.name === selectedJst,
        isSelectable: custom.isEndpointSelectable !== false,
        name: custom.benchmarkLabel ?? serie.name
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
  chart.customBenchmarkEndpointLabels = [];

  candidates.forEach((candidate) => {
    const targetY = Math.max(top, Math.min(bottom, candidate.labelY));
    const connectorEndX = labelX - 5;
    const connector = chart.renderer
      .path([
        ["M", candidate.anchorX, candidate.anchorY],
        ["L", connectorEndX, targetY]
      ])
      .attr({
        class: "cost-risk-benchmark-endpoint-label",
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
        cursor: candidate.isSelectable ? "pointer" : "default",
        fontSize: candidate.isSelected ? "11px" : "10px",
        fontWeight: candidate.isSelected ? "700" : "600"
      })
      .attr({
        class: "cost-risk-benchmark-endpoint-label",
        fill: "rgba(255, 255, 255, 0.92)",
        padding: 4,
        r: 3,
        stroke: candidate.isSelected ? candidate.color : "rgba(255,255,255,0)",
        "stroke-width": candidate.isSelected ? 1 : 0,
        zIndex: candidate.isSelected ? 90 : 75
      })
      .add();

    if (candidate.isSelectable) {
      label.on("click", () => setTimeout(() => onSelectJst(candidate.name), 0));
    }

    chart.customBenchmarkEndpointLabels.push(connector, label);
  });
}

export function scheduleBenchmarkEndpointLabels(chart, selectedJst, onSelectJst, options = {}) {
  clearBenchmarkEndpointLabels(chart);
  const render = () => {
    if (!chart?.container || chart.destroyed) return;
    renderBenchmarkEndpointLabels(chart, selectedJst, onSelectJst, options);
  };

  if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
    window.requestAnimationFrame(() => window.requestAnimationFrame(render));
    return;
  }

  setTimeout(render, 0);
}

export function hasBenchmarkChartModeChanged(chart, peerDisplayMode) {
  if (!chart) return false;

  const nextMode = peerDisplayMode === "anonymised" ? "anonymised" : "explicit";
  return Boolean(chart.customBenchmarkPeerDisplayMode && chart.customBenchmarkPeerDisplayMode !== nextMode);
}

export function markBenchmarkChartMode(chart, peerDisplayMode) {
  if (!chart) return;

  chart.customBenchmarkPeerDisplayMode = peerDisplayMode === "anonymised" ? "anonymised" : "explicit";
}

export function clearBenchmarkEndpointLabels(chart) {
  chart.container
    ?.querySelectorAll?.(".cost-risk-benchmark-endpoint-label")
    ?.forEach((element) => element.remove());

  if (!Array.isArray(chart.customBenchmarkEndpointLabels)) {
    chart.customBenchmarkEndpointLabels = [];
    return;
  }

  chart.customBenchmarkEndpointLabels.forEach((element) => element.destroy());
  chart.customBenchmarkEndpointLabels = [];
}
