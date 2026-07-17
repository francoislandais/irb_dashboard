import { getCostOfRiskYAxisBounds } from "../data/costOfRisk.js?v=20260717-header-context-controls";
import { formatBasisPointsValue, formatContributionPercentValue } from "../data/core/formatting.js?v=20260710-bp-format";
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
} from "./benchmarkLineChart.js?v=20260717-header-context-controls";
import {
  createCostOfRiskHighchartsTitle,
  escapeHtml,
  formatCostOfRiskQuarterAxisLabel,
  getCostOfRiskAxisTickPositions,
  getCostOfRiskFocusedYAxisBounds,
  renderCostOfRiskSmoothingBadge,
  renderCostOfRiskYAxisFocusBadge
} from "./costOfRiskChartUtils.js?v=20260717-header-context-controls";
import { primaryDark } from "./theme.js?v=20260709-flow-arrow-color";

let costOfRiskStageRatioChart = null;

export function getCostOfRiskStageRatioChart() {
  return costOfRiskStageRatioChart;
}

export function destroyCostOfRiskStageRatioChart() {
  if (!costOfRiskStageRatioChart) return;
  costOfRiskStageRatioChart.destroy();
  costOfRiskStageRatioChart = null;
}

export function renderCostOfRiskStageRatioTable({
  activeCellKey,
  container,
  onCellSelect,
  stageRatio
}) {
  if (!container) return;

  const table = document.createElement("table");
  table.className = "cost-of-risk-stage-summary-grid cost-of-risk-stage-ratio-grid";
  table.append(createCostOfRiskStageRatioColGroup());
  table.append(createCostOfRiskStageRatioHead());

  const tbody = document.createElement("tbody");
  (stageRatio.rows ?? []).forEach((row) => {
    const tr = document.createElement("tr");
    tr.className = "cost-of-risk-stage-summary-row";

    const label = document.createElement("th");
    label.scope = "row";
    label.className = "cost-of-risk-stage-summary-row-label";
    label.textContent = row.label;
    tr.append(label);

    ["ratio", "variation", "numerator", "denominator"].forEach((metric) => {
      const key = `${row.key}:${metric}`;
      const td = document.createElement("td");
      const button = document.createElement("button");
      button.className = "cost-of-risk-stage-summary-cell";
      button.classList.toggle("is-active", key === activeCellKey);
      button.type = "button";
      button.textContent = formatCostOfRiskStageRatioCellValue(row.cells?.[metric]?.value, metric);
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        onCellSelect(key);
      });
      td.append(button);
      tr.append(td);
    });

    tbody.append(tr);
  });

  table.append(tbody);
  container.replaceChildren(table);
}

export function renderCostOfRiskStageRatioChart({
  activeReferenceDate,
  container,
  focusSelectedYAxis = false,
  model,
  onSelectJst,
  onSelectReferenceDate,
  onClearSmoothing,
  onChangeSmoothing,
  onToggleYAxisFocus,
  renderTabEmpty,
  smoothingWindow,
  state
}) {
  if (!container || !window.Highcharts) return;

  const selectedCell = model.selectedCell;
  const chartModel = buildBenchmarkChartModel(model.benchmarkSeries, state.selectedJst, primaryDark, {
    displayMode: "ratio",
    peerDisplayMode: state.peerDisplayMode,
    smoothingWindow
  });
  const series = chartModel.series;
  const isAnonymised = chartModel.peerDisplayMode === "anonymised";

  if (!selectedCell || series.length === 0) {
    destroyCostOfRiskStageRatioChart();
    renderTabEmpty(model.status || "No stage ratio time series is available for the current selection.");
    return;
  }

  const yBounds = focusSelectedYAxis
    ? getCostOfRiskFocusedYAxisBounds(series, state.selectedJst)
    : getCostOfRiskYAxisBounds(getBenchmarkYAxisBoundsSeries(series, chartModel.distribution));
  const selectedReferencePoint = model.benchmarkSeries
    .find((benchmark) => benchmark.jstCode === state.selectedJst)
    ?.points?.find((point) => point.label === activeReferenceDate);
  const titleText = `${getCostOfRiskStageRatioMetricLabel(selectedCell.metric)} - ${getCostOfRiskStageRatioRowLabel(model, selectedCell.stageKey)} - time evolution`;

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
        return `<span style="color:${this.series.color}">●</span> <b>${escapeHtml(this.series.name)}</b>: ${formatCostOfRiskStageRatioCellValue(this.y, selectedCell.metric)}`;
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
          return formatCostOfRiskStageRatioCellValue(this.value, selectedCell.metric);
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
      title: { text: selectedCell.metric === "ratio" ? "Percent" : "Basis points" }
    }
  };

  if (hasBenchmarkChartModeChanged(costOfRiskStageRatioChart, chartModel.peerDisplayMode)) destroyCostOfRiskStageRatioChart();
  if (costOfRiskStageRatioChart) {
    clearBenchmarkEndpointLabels(costOfRiskStageRatioChart);
    costOfRiskStageRatioChart.update(options, true, true, false);
    markBenchmarkChartMode(costOfRiskStageRatioChart, chartModel.peerDisplayMode);
    scheduleBenchmarkEndpointLabels(costOfRiskStageRatioChart, state.selectedJst, onSelectJst, { peerDisplayMode: chartModel.peerDisplayMode });
  } else {
    costOfRiskStageRatioChart = window.Highcharts.chart(container, options);
    markBenchmarkChartMode(costOfRiskStageRatioChart, chartModel.peerDisplayMode);
  }
}

export function formatCostOfRiskStageRatioCellValue(value, metric) {
  if (!Number.isFinite(value)) return "-";
  return metric === "ratio"
    ? formatContributionPercentValue(value / 10000)
    : formatBasisPointsValue(value);
}

export function getCostOfRiskStageRatioMetricLabel(metric) {
  return {
    denominator: "Denominator effect",
    numerator: "Numerator effect",
    ratio: "Stage ratio",
    variation: "Ratio variation"
  }[metric] ?? metric;
}

function getCostOfRiskStageRatioRowLabel(model, stageKey) {
  return (model.rows ?? []).find((row) => row.key === stageKey)?.label ?? stageKey;
}

function createCostOfRiskStageRatioColGroup() {
  const colgroup = document.createElement("colgroup");
  [
    "cost-of-risk-stage-summary-col-label",
    "cost-of-risk-stage-ratio-col-value",
    "cost-of-risk-stage-ratio-col-value",
    "cost-of-risk-stage-ratio-col-value",
    "cost-of-risk-stage-ratio-col-value"
  ].forEach((className) => {
    const col = document.createElement("col");
    col.className = className;
    colgroup.append(col);
  });
  return colgroup;
}

function createCostOfRiskStageRatioHead() {
  const thead = document.createElement("thead");
  const tr = document.createElement("tr");
  ["", "Ratio", "Variation", "Numerator effect", "Denominator effect"].forEach((label) => {
    const th = document.createElement("th");
    th.scope = "col";
    th.textContent = label;
    tr.append(th);
  });
  thead.append(tr);
  return thead;
}
