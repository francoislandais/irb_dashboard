import { createCostOfRiskChartData, smoothCostOfRiskPoints } from "../data/costOfRisk.js?v=20260709-flow-interactive";

const BENCHMARK_LINE_GRAYS = ["#8f9893", "#a2aaa6", "#b4bbb8", "#7f8984"];
const BENCHMARK_LINE_DASHES = ["ShortDash", "ShortDot", "Dash", "Dot"];

// Shared by every "JST benchmark line chart" in the app (Cost of Risk's
// Contribution/Stage transfers time evolution charts, Explorer's Benchmark
// view, ...) so that series styling, colors and point-click behavior never
// diverge between charts using the same visual language.
export function buildBenchmarkLineSeries(benchmarkSeries, selectedJstCode, primaryDark, {
  displayMode = "amount",
  smoothingWindow = 1
} = {}) {
  return (benchmarkSeries ?? [])
    .map((benchmark, index) => {
      const isSelected = benchmark.jstCode === selectedJstCode;
      const points = smoothCostOfRiskPoints(benchmark.points ?? [], smoothingWindow);
      const color = isSelected ? primaryDark : BENCHMARK_LINE_GRAYS[index % BENCHMARK_LINE_GRAYS.length];
      const dashStyle = isSelected ? "Solid" : BENCHMARK_LINE_DASHES[index % BENCHMARK_LINE_DASHES.length];
      const chartData = createCostOfRiskChartData(points, displayMode);
      return {
        // Selected series render as an area down to y=0, so the reader can
        // immediately see whether it sits above or below zero. The fill is a
        // discreet, near-transparent gray — never tinted by the series color.
        clip: isSelected ? true : false,
        color,
        dashStyle,
        data: chartData,
        dataLabels: { enabled: false },
        fillColor: isSelected ? "rgba(140, 148, 144, 0.12)" : "transparent",
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
            halo: { size: isSelected ? 5 : 0 },
            lineWidth: isSelected ? 4 : 2.1,
            lineWidthPlus: 0
          },
          inactive: {
            opacity: isSelected ? 1 : 0.42
          }
        },
        threshold: 0,
        type: isSelected ? "area" : "line",
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

// onPointClick(referenceLabel, seriesName) — callers that don't yet support a
// reference-date callback (e.g. Explorer's Benchmark view) can simply ignore
// the first argument.
export function getBenchmarkLinePlotOptions(onPointClick) {
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
            const referenceLabel = this.referenceLabel;
            const seriesName = this.series.name;
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
