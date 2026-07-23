import { getCostOfRiskYAxisBounds } from "../data/costOfRisk.js?v=20260719-context-panel-filter-fixes";
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
} from "./benchmarkLineChart.js?v=20260719-context-panel-filter-fixes";
import {
  createCostOfRiskHighchartsTitle,
  escapeHtml,
  formatCostOfRiskQuarterAxisLabel,
  getCostOfRiskAxisTickPositions,
  getCostOfRiskFocusedYAxisBounds,
  renderCostOfRiskSmoothingBadge,
  renderCostOfRiskYAxisFocusBadge
} from "./costOfRiskChartUtils.js?v=20260719-context-panel-filter-fixes";
import { primaryDark } from "./theme.js?v=20260709-flow-arrow-color";

let costOfRiskCollateralRatioChart = null;

export function getCostOfRiskCollateralRatioChart() {
  return costOfRiskCollateralRatioChart;
}

export function destroyCostOfRiskCollateralRatioChart() {
  if (!costOfRiskCollateralRatioChart) return;
  costOfRiskCollateralRatioChart.destroy();
  costOfRiskCollateralRatioChart = null;
}

export function renderCostOfRiskCollateralRatioTable({
  activeCellKey,
  collateralRatio,
  container,
  onCellSelect,
  selectedUnit
}) {
  if (!container) return;

  const row = collateralRatio.rows?.[0] ?? null;
  if (!row) {
    container.replaceChildren();
    return;
  }

  const wrap = document.createElement("section");
  wrap.className = "cost-of-risk-stage-ratio-focus cost-of-risk-collateral-ratio-focus";

  const hero = document.createElement("div");
  hero.className = "cost-of-risk-stage-ratio-focus-hero";
  const heroTitle = document.createElement("div");
  heroTitle.className = "cost-of-risk-stage-ratio-focus-eyebrow";
  heroTitle.textContent = `${row.label} collateralisation`;
  const heroValue = createCostOfRiskCollateralRatioMetricButton({
    activeCellKey,
    label: "Collateral ratio",
    metric: "ratio",
    onCellSelect,
    row,
    selectedUnit,
    variant: "hero"
  });
  const heroVariation = createCostOfRiskCollateralRatioMetricButton({
    activeCellKey,
    label: "Quarter variation",
    metric: "variation",
    onCellSelect,
    row,
    selectedUnit,
    variant: "inline"
  });
  const heroFormula = document.createElement("div");
  heroFormula.className = "cost-of-risk-stage-ratio-focus-formula";
  heroFormula.textContent = "Collateral received / gross carrying amount";
  hero.append(heroTitle, heroValue, heroVariation, heroFormula);

  const numerator = createCostOfRiskCollateralRatioComponentCard({
    activeCellKey,
    metrics: [
      { label: "Current collateral", metric: "numeratorLevel" },
      { label: "Delta", metric: "numeratorDelta" },
      { label: "Effect", metric: "numeratorEffect" }
    ],
    onCellSelect,
    row,
    selectedUnit,
    title: "Numerator",
    subtitle: "Collateral received"
  });

  const denominator = createCostOfRiskCollateralRatioComponentCard({
    activeCellKey,
    metrics: [
      { label: "Current GCA", metric: "denominatorLevel" },
      { label: "Delta", metric: "denominatorDelta" },
      { label: "Effect", metric: "denominatorEffect" }
    ],
    onCellSelect,
    row,
    selectedUnit,
    title: "Denominator",
    subtitle: "Gross carrying amount"
  });

  wrap.append(hero, numerator, denominator);
  container.replaceChildren(wrap);
}

export function renderCostOfRiskCollateralRatioChart({
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
  const displayMode = isCostOfRiskCollateralRatioAmountMetric(selectedCell?.metric) ? "amount" : "ratio";
  const chartModel = buildBenchmarkChartModel(model.benchmarkSeries, state.selectedJst, primaryDark, {
    displayMode,
    peerDisplayMode: state.peerDisplayMode,
    smoothingWindow
  });
  const series = chartModel.series;
  const isAnonymised = chartModel.peerDisplayMode === "anonymised";

  if (!selectedCell || series.length === 0) {
    destroyCostOfRiskCollateralRatioChart();
    renderTabEmpty(model.status || "No collateral ratio time series is available for the current selection.");
    return;
  }

  const yBounds = focusSelectedYAxis
    ? getCostOfRiskFocusedYAxisBounds(series, state.selectedJst)
    : getCostOfRiskYAxisBounds(getBenchmarkYAxisBoundsSeries(series, chartModel.distribution));
  const selectedReferencePoint = model.benchmarkSeries
    .find((benchmark) => benchmark.jstCode === state.selectedJst)
    ?.points?.find((point) => point.label === activeReferenceDate);
  const titleText = `${getCostOfRiskCollateralRatioMetricLabel(selectedCell.metric)} - ${getCostOfRiskCollateralRatioRowLabel(model, selectedCell.stageKey)} - time evolution`;

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
        return `<span style="color:${this.series.color}">●</span> <b>${escapeHtml(this.series.name)}</b>: ${formatCostOfRiskCollateralRatioCellValue(this.y, selectedCell.metric, state.selectedUnit)}`;
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
          return formatCostOfRiskCollateralRatioCellValue(this.value, selectedCell.metric, state.selectedUnit);
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
      title: { text: getCostOfRiskCollateralRatioYAxisTitle(selectedCell.metric) }
    }
  };

  if (hasBenchmarkChartModeChanged(costOfRiskCollateralRatioChart, chartModel.peerDisplayMode)) destroyCostOfRiskCollateralRatioChart();
  if (costOfRiskCollateralRatioChart) {
    clearBenchmarkEndpointLabels(costOfRiskCollateralRatioChart);
    costOfRiskCollateralRatioChart.update(options, true, true, false);
    markBenchmarkChartMode(costOfRiskCollateralRatioChart, chartModel.peerDisplayMode);
    scheduleBenchmarkEndpointLabels(costOfRiskCollateralRatioChart, state.selectedJst, onSelectJst, { peerDisplayMode: chartModel.peerDisplayMode });
  } else {
    costOfRiskCollateralRatioChart = window.Highcharts.chart(container, options);
    markBenchmarkChartMode(costOfRiskCollateralRatioChart, chartModel.peerDisplayMode);
  }
}

export function formatCostOfRiskCollateralRatioCellValue(value, metric, selectedUnit) {
  if (!Number.isFinite(value)) return "-";
  if (metric === "ratio") return formatContributionPercentValue(value / 10000);
  if (isCostOfRiskCollateralRatioAmountMetric(metric)) {
    return metric.endsWith("Delta")
      ? formatSignedMetricValue(value, selectedUnit)
      : formatMetricValue(value, selectedUnit);
  }
  return formatCostOfRiskCollateralRatioSignedBasisPoints(value);
}

export function getCostOfRiskCollateralRatioMetricLabel(metric) {
  return {
    denominatorDelta: "Denominator delta",
    denominatorEffect: "Denominator effect",
    denominatorLevel: "Denominator GCA",
    numeratorDelta: "Numerator delta",
    numeratorEffect: "Numerator effect",
    numeratorLevel: "Numerator collateral",
    ratio: "Collateral ratio",
    variation: "Ratio variation"
  }[metric] ?? metric;
}

function getCostOfRiskCollateralRatioRowLabel(model, stageKey) {
  return (model.rows ?? []).find((row) => row.key === stageKey)?.label ?? stageKey;
}

function createCostOfRiskCollateralRatioComponentCard({
  activeCellKey,
  metrics,
  onCellSelect,
  row,
  selectedUnit,
  subtitle,
  title
}) {
  const card = document.createElement("div");
  card.className = "cost-of-risk-stage-ratio-focus-card";

  const heading = document.createElement("div");
  heading.className = "cost-of-risk-stage-ratio-focus-card-heading";
  const titleNode = document.createElement("div");
  titleNode.className = "cost-of-risk-stage-ratio-focus-card-title";
  titleNode.textContent = title;
  const subtitleNode = document.createElement("div");
  subtitleNode.className = "cost-of-risk-stage-ratio-focus-card-subtitle";
  subtitleNode.textContent = subtitle;
  heading.append(titleNode, subtitleNode);

  const list = document.createElement("div");
  list.className = "cost-of-risk-stage-ratio-focus-metrics";
  metrics.forEach((definition) => {
    list.append(createCostOfRiskCollateralRatioMetricButton({
      activeCellKey,
      label: definition.label,
      metric: definition.metric,
      onCellSelect,
      row,
      selectedUnit,
      variant: definition.metric.endsWith("Effect") ? "effect" : "row"
    }));
  });

  card.append(heading, list);
  return card;
}

function createCostOfRiskCollateralRatioMetricButton({
  activeCellKey,
  label,
  metric,
  onCellSelect,
  row,
  selectedUnit,
  variant = "row"
}) {
  const key = `${row.stageKey}:${metric}`;
  const button = document.createElement("button");
  button.className = `cost-of-risk-stage-ratio-focus-metric cost-of-risk-stage-ratio-focus-metric--${variant}`;
  button.classList.toggle("is-active", key === activeCellKey);
  button.dataset.costOfRiskCalculationDetail = "collateral-ratio";
  button.dataset.costOfRiskCalculationValue = key;
  button.type = "button";
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    onCellSelect(key);
  });

  const labelNode = document.createElement("span");
  labelNode.className = "cost-of-risk-stage-ratio-focus-metric-label";
  labelNode.textContent = label;
  const valueNode = document.createElement("span");
  valueNode.className = "cost-of-risk-stage-ratio-focus-metric-value";
  valueNode.textContent = formatCostOfRiskCollateralRatioCellValue(row.cells?.[metric]?.value, metric, selectedUnit);
  button.append(labelNode, valueNode);
  return button;
}

function isCostOfRiskCollateralRatioAmountMetric(metric) {
  return ["numeratorLevel", "numeratorDelta", "denominatorLevel", "denominatorDelta"].includes(metric);
}

function getCostOfRiskCollateralRatioYAxisTitle(metric) {
  if (metric === "ratio") return "Percent";
  if (isCostOfRiskCollateralRatioAmountMetric(metric)) return "Amount";
  return "Basis points";
}

function formatCostOfRiskCollateralRatioSignedBasisPoints(value) {
  if (!Number.isFinite(value)) return "-";
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatBasisPointsValue(value)}`;
}
