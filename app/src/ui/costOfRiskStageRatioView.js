import { getCostOfRiskYAxisBounds } from "../data/costOfRisk.js?v=20260730-cor-compact-layout";
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
} from "./benchmarkLineChart.js?v=20260730-cor-compact-layout";
import {
  createCostOfRiskHighchartsTitle,
  escapeHtml,
  formatCostOfRiskQuarterAxisLabel,
  getCostOfRiskAxisTickPositions,
  getCostOfRiskFocusedYAxisBounds,
  renderCostOfRiskSmoothingBadge,
  renderCostOfRiskYAxisFocusBadge
} from "./costOfRiskChartUtils.js?v=20260730-cor-compact-layout";
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
  onBackToSummary,
  onCellSelect,
  selectedUnit,
  stageRatio
}) {
  if (!container) return;

  const row = stageRatio.rows?.[0] ?? null;
  if (!row) {
    container.replaceChildren();
    return;
  }

  const wrap = document.createElement("section");
  wrap.className = "cost-of-risk-stage-ratio-focus";
  wrap.append(createCostOfRiskRatioSummaryShortcut(onBackToSummary));

  const hero = document.createElement("div");
  hero.className = "cost-of-risk-stage-ratio-focus-hero";
  const heroTitle = document.createElement("div");
  heroTitle.className = "cost-of-risk-stage-ratio-focus-eyebrow";
  heroTitle.textContent = `${row.label} ratio`;
  const heroValue = createCostOfRiskStageRatioMetricButton({
    activeCellKey,
    label: "Exposure ratio",
    metric: "ratio",
    onCellSelect,
    row,
    selectedUnit,
    variant: "hero"
  });
  const heroVariation = createCostOfRiskStageRatioMetricButton({
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
  heroFormula.textContent = `${row.label} exposure / total exposure`;
  hero.append(heroTitle, heroValue, heroVariation, heroFormula);

  const numerator = createCostOfRiskStageRatioComponentCard({
    activeCellKey,
    effectDrivers: row.numeratorDrivers,
    metrics: [
      { label: "Current stock", metric: "numeratorLevel" },
      { label: "Delta", metric: "numeratorDelta" },
      { label: "Effect", metric: "numeratorEffect" }
    ],
    onCellSelect,
    row,
    selectedUnit,
    title: "Numerator",
    subtitle: `${row.label} exposure`
  });

  const denominator = createCostOfRiskStageRatioComponentCard({
    activeCellKey,
    effectDrivers: row.denominatorDrivers,
    metrics: [
      { label: "Current total", metric: "denominatorLevel" },
      { label: "Delta", metric: "denominatorDelta" },
      { label: "Effect", metric: "denominatorEffect" }
    ],
    onCellSelect,
    row,
    selectedUnit,
    title: "Denominator",
    subtitle: "Total exposure"
  });

  wrap.append(hero, numerator, denominator);
  container.replaceChildren(wrap);
}

function createCostOfRiskRatioSummaryShortcut(onBackToSummary) {
  const button = document.createElement("button");
  button.className = "cost-of-risk-ratio-summary-shortcut";
  button.type = "button";
  button.textContent = "Back to Summary";
  button.title = "Back to Summary";
  button.addEventListener("click", () => onBackToSummary?.());
  return button;
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
  const displayMode = isCostOfRiskStageRatioAmountMetric(selectedCell?.metric) ? "amount" : "ratio";
  const chartModel = buildBenchmarkChartModel(model.benchmarkSeries, state.selectedJst, primaryDark, {
    displayMode,
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
  const titleText = `${getCostOfRiskStageRatioMetricLabel(selectedCell.metric)} - ${getCostOfRiskStageRatioStageLabel(selectedCell.stageKey)} - time evolution`;

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
        return `<span style="color:${this.series.color}">●</span> <b>${escapeHtml(this.series.name)}</b>: ${formatCostOfRiskStageRatioCellValue(this.y, selectedCell.metric, state.selectedUnit)}`;
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
          return formatCostOfRiskStageRatioCellValue(this.value, selectedCell.metric, state.selectedUnit);
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
      title: { text: getCostOfRiskStageRatioYAxisTitle(selectedCell.metric) }
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

export function formatCostOfRiskStageRatioCellValue(value, metric, selectedUnit) {
  if (!Number.isFinite(value)) return "-";
  if (metric === "ratio") return formatContributionPercentValue(value / 10000);
  if (isCostOfRiskStageRatioAmountMetric(metric)) {
    return metric.endsWith("Delta")
      ? formatSignedMetricValue(value, selectedUnit)
      : formatMetricValue(value, selectedUnit);
  }
  return formatCostOfRiskStageRatioSignedBasisPoints(value);
}

export function getCostOfRiskStageRatioMetricLabel(metric) {
  return {
    denominatorDelta: "Denominator delta",
    denominatorEffect: "Denominator effect",
    denominatorLevel: "Denominator total",
    numeratorDelta: "Numerator delta",
    numeratorEffect: "Numerator effect",
    numeratorLevel: "Numerator exposure",
    ratio: "Exposure ratio",
    variation: "Ratio variation"
  }[metric] ?? metric;
}

function getCostOfRiskStageRatioStageLabel(stageKey) {
  return {
    nonperforming: "Non-performing",
    performing: "Performing",
    stage1: "Stage 1",
    stage2: "Stage 2",
    stage3: "Stage 3",
    poci: "POCI"
  }[stageKey] ?? stageKey;
}

function createCostOfRiskStageRatioComponentCard({
  activeCellKey,
  effectDrivers,
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
    list.append(createCostOfRiskStageRatioMetricButton({
      activeCellKey,
      label: definition.label,
      metric: definition.metric,
      onCellSelect,
      row,
      selectedUnit,
      variant: definition.metric.endsWith("Effect") ? "effect" : "row"
    }));
    if (definition.metric.endsWith("Effect")) {
      const driverList = createCostOfRiskStageRatioEffectDrivers(effectDrivers, {
        activeCellKey,
        metric: definition.metric,
        onCellSelect,
        row
      });
      if (driverList) list.append(driverList);
    }
  });

  card.append(heading, list);
  return card;
}

function createCostOfRiskStageRatioMetricButton({
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
  button.dataset.costOfRiskCalculationDetail = "stage-ratio";
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
  valueNode.textContent = formatCostOfRiskStageRatioCellValue(row.cells?.[metric]?.value, metric, selectedUnit);
  button.append(labelNode, valueNode);
  return button;
}

function createCostOfRiskStageRatioEffectDrivers(drivers = [], {
  activeCellKey,
  metric,
  onCellSelect,
  row
} = {}) {
  const validDrivers = drivers.filter((driver) => Number.isFinite(driver?.effectBasisPoints)).slice(0, 3);
  if (validDrivers.length === 0) return null;
  const list = document.createElement("div");
  list.className = "cost-of-risk-stage-ratio-effect-drivers";
  validDrivers.forEach((driver) => {
    const key = `${row.stageKey}:${metric}:driver:${driver.effectType}:${driver.counterpartyKey}:${driver.assetKey}`;
    const item = document.createElement("button");
    item.className = "cost-of-risk-stage-ratio-effect-driver";
    item.classList.toggle("is-active", key === activeCellKey);
    item.type = "button";
    item.textContent = `${driver.label} ${formatCostOfRiskStageRatioSignedBasisPoints(driver.effectBasisPoints)}`;
    item.addEventListener("click", (event) => {
      event.stopPropagation();
      onCellSelect?.(key);
    });
    list.append(item);
  });
  return list;
}

function createCostOfRiskStageRatioColGroup() {
  const colgroup = document.createElement("colgroup");
  [
    "cost-of-risk-stage-summary-col-label",
    "cost-of-risk-stage-ratio-col-ratio",
    "cost-of-risk-stage-ratio-col-variation",
    "cost-of-risk-stage-ratio-col-gap",
    "cost-of-risk-stage-ratio-col-amount",
    "cost-of-risk-stage-ratio-col-delta",
    "cost-of-risk-stage-ratio-col-effect",
    "cost-of-risk-stage-ratio-col-gap",
    "cost-of-risk-stage-ratio-col-amount",
    "cost-of-risk-stage-ratio-col-delta",
    "cost-of-risk-stage-ratio-col-effect"
  ].forEach((className) => {
    const col = document.createElement("col");
    col.className = className;
    colgroup.append(col);
  });
  return colgroup;
}

function createCostOfRiskStageRatioHead() {
  const thead = document.createElement("thead");
  const groupRow = document.createElement("tr");
  [
    { label: "", rowSpan: 2 },
    { label: "ratio", rowSpan: 2, className: "cost-of-risk-stage-ratio-direct-head is-primary" },
    { label: "variation", rowSpan: 2, className: "cost-of-risk-stage-ratio-direct-head" },
    { label: "", rowSpan: 2, className: "cost-of-risk-stage-ratio-gap" },
    { label: "Numerator", colSpan: 3, className: "cost-of-risk-stage-ratio-group-head" },
    { label: "", rowSpan: 2, className: "cost-of-risk-stage-ratio-gap" },
    { label: "Denominator", colSpan: 3, className: "cost-of-risk-stage-ratio-group-head" }
  ].forEach((definition) => {
    const th = document.createElement("th");
    th.scope = "col";
    if (definition.colSpan) th.colSpan = definition.colSpan;
    if (definition.rowSpan) th.rowSpan = definition.rowSpan;
    if (definition.className) th.className = definition.className;
    th.textContent = definition.label;
    groupRow.append(th);
  });

  const subRow = document.createElement("tr");
  [
    { label: "stock" },
    { label: "delta" },
    { label: "effect", className: "is-primary" },
    { label: "total" },
    { label: "delta" },
    { label: "effect" }
  ].forEach((definition) => {
    const th = document.createElement("th");
    th.scope = "col";
    th.className = `cost-of-risk-stage-ratio-subhead ${definition.className ?? ""}`.trim();
    th.textContent = definition.label;
    subRow.append(th);
  });

  thead.append(groupRow, subRow);
  return thead;
}

function getCostOfRiskStageRatioTableMetrics() {
  return [
    "ratio",
    "variation",
    "gap",
    "numeratorLevel",
    "numeratorDelta",
    "numeratorEffect",
    "gap",
    "denominatorLevel",
    "denominatorDelta",
    "denominatorEffect"
  ];
}

function isCostOfRiskStageRatioAmountMetric(metric) {
  return ["numeratorLevel", "numeratorDelta", "denominatorLevel", "denominatorDelta"].includes(metric);
}

function getCostOfRiskStageRatioYAxisTitle(metric) {
  if (metric === "ratio") return "Percent";
  if (isCostOfRiskStageRatioAmountMetric(metric)) return "Amount";
  return "Basis points";
}

function formatCostOfRiskStageRatioSignedBasisPoints(value) {
  if (!Number.isFinite(value)) return "-";
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatBasisPointsValue(value)}`;
}
