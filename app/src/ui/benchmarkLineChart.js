import { createCostOfRiskChartData, smoothCostOfRiskPoints } from "../data/costOfRisk.js?v=20260713-temporal-xy-zoom";
import { buildPeerDistributionByDate } from "../data/peerDistribution.js?v=20260713-temporal-xy-zoom";

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
// own line). In "anonymised" mode the peer series are never returned - only
// the selected JST's series goes into the model, so no peer jst_code ever
// reaches a Highcharts series/point/tooltip/legend/DOM node. The peer
// distribution (percentiles per date) is returned separately for the
// caller to draw as custom background bands via renderPeerDistributionBands
// and to read from in a tooltip formatter - it carries only aggregates
// (percentiles, peer count), never individual peer values or jst_codes.
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

  return {
    distribution,
    peerDisplayMode,
    series: selectedSeries ? [selectedSeries] : [],
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

const PEER_BAND_OUTER_FILL = "rgba(143, 152, 147, 0.10)";
const PEER_BAND_INNER_FILL = "rgba(143, 152, 147, 0.22)";
const PEER_MEDIAN_COLOR = "#8f9893";

// Draws the P01-P99 and P25-P75 bands plus the median line as custom SVG
// shapes on top of an already-rendered chart - not as Highcharts series,
// so no peer data is ever attached to a chart series/point (which is what
// keeps tooltips/legend/export naturally free of individual peer data).
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
    elements.push(drawPeerMedianLine(chart, xAxis, yAxis, run));
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

function drawPeerMedianLine(chart, xAxis, yAxis, run) {
  if (run.length === 0) return null;

  if (run.length === 1) {
    const point = run[0];
    const x = xAxis.toPixels(point.x, false);
    const y = yAxis.toPixels(point.median, false);
    return chart.renderer
      .path([["M", x - 4, y], ["L", x + 4, y]])
      .attr({ "stroke-dasharray": "3 3", "stroke-width": 1.6, stroke: PEER_MEDIAN_COLOR, fill: "none", zIndex: 3 })
      .add();
  }

  const segments = run.map((point) => ["L", xAxis.toPixels(point.x, false), yAxis.toPixels(point.median, false)]);
  segments[0][0] = "M";

  return chart.renderer
    .path(segments)
    .attr({ "stroke-dasharray": "3 3", "stroke-width": 1.6, stroke: PEER_MEDIAN_COLOR, fill: "none", zIndex: 3 })
    .add();
}

// Extra tooltip lines for anonymised mode, appended after the selected
// series' own line in a pointFormatter. Only ever reads aggregates
// (percentiles, peer count) from the distribution - never an individual
// peer's jst_code or value.
export function formatAnonymisedTooltipPeerLines(distribution, x, formatValue) {
  const point = (distribution ?? []).find((candidate) => candidate.x === x);
  if (!point || point.status !== "available") return "";

  return [
    "",
    `<span style="color:${PEER_MEDIAN_COLOR}">Peer median</span>: ${formatValue(point.median)}`,
    `<span style="color:${PEER_MEDIAN_COLOR}">25th-75th percentile</span>: ${formatValue(point.p25)}-${formatValue(point.p75)}`,
    `<span style="color:${PEER_MEDIAN_COLOR}">1st-99th percentile</span>: ${formatValue(point.p01)}-${formatValue(point.p99)}`,
    `<span style="color:${PEER_MEDIAN_COLOR}">Peer population</span>: ${point.peerCount}`
  ].join("<br/>");
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
export function renderBenchmarkEndpointLabels(chart, selectedJst, onSelectJst) {
  clearBenchmarkEndpointLabels(chart);

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
        cursor: "pointer",
        fontSize: candidate.isSelected ? "11px" : "10px",
        fontWeight: candidate.isSelected ? "700" : "600"
      })
      .attr({
        fill: "rgba(255, 255, 255, 0.92)",
        padding: 4,
        r: 3,
        stroke: candidate.isSelected ? candidate.color : "rgba(255,255,255,0)",
        "stroke-width": candidate.isSelected ? 1 : 0,
        zIndex: candidate.isSelected ? 90 : 75
      })
      .on("click", () => setTimeout(() => onSelectJst(candidate.name), 0))
      .add();

    chart.customBenchmarkEndpointLabels.push(connector, label);
  });
}

export function clearBenchmarkEndpointLabels(chart) {
  if (!Array.isArray(chart.customBenchmarkEndpointLabels)) return;

  chart.customBenchmarkEndpointLabels.forEach((element) => element.destroy());
  chart.customBenchmarkEndpointLabels = [];
}
