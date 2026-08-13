import { getIrbOutputFloorModel } from "../data/irb.js?v=20260813-output-floor";
import { getCostOfRiskYAxisBounds } from "../data/costOfRisk.js?v=20260812-costofrisk-domain-split";
import { formatBasisPointsValue, formatMetricValue, formatSignedMetricValue } from "../data/core/formatting.js?v=20260710-bp-format";
import {
  buildBenchmarkChartModel,
  clearBenchmarkEndpointLabels,
  getBenchmarkLinePlotOptions,
  getBenchmarkYAxisBoundsSeries,
  hasBenchmarkChartModeChanged,
  markBenchmarkChartMode,
  renderBenchmarkEndpointLabels,
  scheduleBenchmarkEndpointLabels
} from "./benchmarkLineChart.js?v=20260812-costofrisk-domain-split";
import {
  createCostOfRiskHighchartsTitle,
  createCostOfRiskQuarterAxisLabelsOptions,
  getCostOfRiskAxisTickPositions
} from "./costOfRiskChartUtils.js?v=20260804-axis-year-labels";
import { primaryDark } from "./theme.js?v=20260709-flow-arrow-color";

const IRB_DEFAULT_TAB = "output-floor";
const IRB_DEFAULT_OUTPUT_FLOOR_HORIZON = "fully-loaded";

const elements = {
  outputFloorView: document.querySelector("#irb-output-floor-view"),
  tabs: [...document.querySelectorAll("[data-irb-tab]")],
  panels: [...document.querySelectorAll("[data-irb-panel]")]
};

let activeIrbTab = IRB_DEFAULT_TAB;
let activeOutputFloorHorizon = IRB_DEFAULT_OUTPUT_FLOOR_HORIZON;
let outputFloorBenchmarkChart = null;
let renderAppState = null;
let actionsRef = null;

export function wireIrbUi(actions, rerender) {
  actionsRef = actions;
  renderAppState = rerender;
  elements.tabs.forEach((button) => {
    button.addEventListener("click", () => {
      activeIrbTab = button.dataset.irbTab || IRB_DEFAULT_TAB;
      renderIrbTabs();
      rerender(actions.getState());
    });
  });
  renderIrbTabs();
}

export function renderIrb(state) {
  renderIrbTabs();
  if (activeIrbTab === "output-floor") renderOutputFloor(state);
}

function renderIrbTabs() {
  elements.tabs.forEach((button) => {
    const isActive = button.dataset.irbTab === activeIrbTab;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });

  elements.panels.forEach((panel) => {
    const isActive = panel.dataset.irbPanel === activeIrbTab;
    panel.classList.toggle("is-active", isActive);
    panel.hidden = !isActive;
  });
}

function renderOutputFloor(state) {
  const container = elements.outputFloorView;
  if (!container) return;

  const model = getIrbOutputFloorModel(state, activeOutputFloorHorizon);
  container.replaceChildren();

  if (model.status && !model.selectedSnapshot) {
    destroyOutputFloorBenchmarkChart();
    container.append(createIrbNotice(model.status));
    return;
  }

  container.append(
    createOutputFloorSummary(model, state),
    createCreditDiagnostic(model, state),
    createBenchmarkPanel(model, state)
  );

  renderOutputFloorBenchmarkChart(model, state);
}

function createOutputFloorSummary(model, state) {
  const section = document.createElement("section");
  section.className = "irb-output-floor-summary";

  const currentCard = createMetricCard({
    label: "Current CET1 ratio",
    value: formatPercentFromFraction(model.selectedSnapshot?.currentCet1Ratio),
    detail: `${model.selectedSnapshot?.referenceLabel ?? "-"} - reported denominator`
  });
  const flooredCard = createMetricCard({
    label: "Floored CET1 ratio",
    value: formatPercentFromFraction(model.selectedSnapshot?.flooredCet1Ratio),
    detail: `${model.selectedHorizon.label} output floor`
  });
  const impactCard = createMetricCard({
    label: model.selectedSnapshot?.isBinding ? "CET1 impact" : "Distance to bite",
    value: formatSignedBasisPoints(model.selectedSnapshot?.distanceBasisPoints),
    detail: model.selectedSnapshot?.isBinding ? "Output floor is binding" : "Negative value shows the distance before binding",
    tone: model.selectedSnapshot?.isBinding ? "negative" : "neutral"
  });
  const addOnCard = createMetricCard({
    label: "Distance to floor",
    value: formatOptionalSignedMetric(model.selectedSnapshot?.totalFloorGap, state.selectedUnit),
    detail: model.selectedSnapshot?.isBinding ? "Positive gap converted into add-on" : "Negative gap before the floor bites"
  });

  const horizonPanel = document.createElement("div");
  horizonPanel.className = "irb-output-floor-horizons";
  model.selectedDateHorizonImpacts.forEach((snapshot) => {
    const button = document.createElement("button");
    button.className = "irb-output-floor-horizon";
    button.classList.toggle("is-active", snapshot.factor === model.selectedHorizon.factor);
    button.type = "button";
    button.innerHTML = `
      <span>${snapshot.factor === 0.725 ? "FL" : Math.round(snapshot.factor * 100) + "%"}</span>
      <strong>${formatSignedBasisPoints(snapshot.distanceBasisPoints)}</strong>
    `;
    button.addEventListener("click", () => {
      activeOutputFloorHorizon = model.horizons.find((horizon) => horizon.factor === snapshot.factor)?.id || IRB_DEFAULT_OUTPUT_FLOOR_HORIZON;
      renderAppState?.(actionsRef?.getState?.() ?? state);
    });
    horizonPanel.append(button);
  });

  const mechanics = document.createElement("div");
  mechanics.className = "irb-output-floor-mechanics";
  mechanics.append(
    createMechanicRow("Total TREA", model.selectedSnapshot?.totalTrea, state.selectedUnit),
    createMechanicRow(`${formatPercentFromFactor(model.selectedHorizon.factor)} x total S-TREA`, model.selectedSnapshot?.totalFloorThreshold, state.selectedUnit),
    createMechanicRow("Output floor add-on", model.selectedSnapshot?.totalFloorAddOn, state.selectedUnit, true),
    createMechanicRow("Floored total TREA", model.selectedSnapshot?.flooredTrea, state.selectedUnit)
  );

  section.append(currentCard, flooredCard, impactCard, addOnCard, horizonPanel, mechanics);
  return section;
}

function createCreditDiagnostic(model, state) {
  const section = document.createElement("section");
  section.className = "irb-output-floor-diagnostic";

  const header = document.createElement("div");
  header.className = "irb-output-floor-section-title";
  header.textContent = "Credit risk diagnostic";

  const table = document.createElement("table");
  table.className = "irb-output-floor-table";
  table.innerHTML = `
    <thead>
      <tr>
        <th>Credit risk block</th>
        <th>Current TREA</th>
        <th>S-TREA</th>
        <th>Floor threshold</th>
        <th>Gap</th>
        <th>CET1 impact</th>
      </tr>
    </thead>
  `;

  const body = document.createElement("tbody");
  model.diagnosticRows.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.label}</td>
      <td>${formatOptionalMetric(row.currentTrea, state.selectedUnit)}</td>
      <td>${formatOptionalMetric(row.standardisedTrea, state.selectedUnit)}</td>
      <td>${formatOptionalMetric(row.threshold, state.selectedUnit)}</td>
      <td class="${Number(row.gap) > 0 ? "is-binding" : ""}">${formatOptionalSignedMetric(row.gap, state.selectedUnit)}</td>
      <td class="${Number(row.floorAddOn) > 0 ? "is-binding" : ""}">${formatSignedBasisPoints(row.impactBasisPoints)}</td>
    `;
    body.append(tr);
  });

  table.append(body);
  section.append(header, table);
  return section;
}

function createBenchmarkPanel(model) {
  const section = document.createElement("section");
  section.className = "irb-output-floor-benchmark-panel";

  const chart = document.createElement("div");
  chart.id = "irb-output-floor-benchmark-chart";
  chart.className = "irb-output-floor-benchmark-chart";
  section.append(chart);
  return section;
}

function renderOutputFloorBenchmarkChart(model, state) {
  const container = document.querySelector("#irb-output-floor-benchmark-chart");
  if (!container || !window.Highcharts) return;

  const chartModel = buildBenchmarkChartModel(model.benchmarkSeries, state.selectedJst, primaryDark, {
    displayMode: "ratio",
    peerDisplayMode: state.peerDisplayMode,
    smoothingWindow: 1
  });
  const series = chartModel.series;
  if (series.length === 0) {
    destroyOutputFloorBenchmarkChart();
    container.textContent = "No benchmark data available for the current output floor horizon.";
    return;
  }

  const yBounds = getCostOfRiskYAxisBounds(getBenchmarkYAxisBoundsSeries(series, chartModel.distribution));
  const options = {
    chart: {
      animation: false,
      backgroundColor: "transparent",
      events: {
        render() {
          renderBenchmarkEndpointLabels(this, state.selectedJst, onSelectJst, { peerDisplayMode: chartModel.peerDisplayMode });
        }
      },
      marginTop: 40,
      spacingRight: 128,
      type: "line",
      zooming: { type: "xy" },
      zoomType: "xy"
    },
    credits: { enabled: false },
    legend: { enabled: false },
    plotOptions: getBenchmarkLinePlotOptions((referenceLabel, seriesName) => {
      onSelectJst(seriesName);
    }, state.selectedJst),
    series,
    subtitle: { text: "" },
    title: createCostOfRiskHighchartsTitle(`CET1 impact / distance to output floor - ${model.selectedHorizon.label}`),
    tooltip: {
      headerFormat: "<span style=\"font-size:11px\">{point.key:%d/%m/%Y}</span><br/>",
      pointFormatter() {
        return `<span style="color:${this.series.color}">●</span> <b>${this.series.name}</b>: ${formatSignedBasisPoints(this.y)}`;
      },
      shared: false,
      split: false,
      stickOnContact: true,
      xDateFormat: "%d/%m/%Y"
    },
    xAxis: {
      labels: createCostOfRiskQuarterAxisLabelsOptions(),
      lineColor: "#c2cac5",
      lineWidth: 1,
      tickColor: "#d9dedb",
      tickPositions: getCostOfRiskAxisTickPositions(model.benchmarkSeries[0]?.points),
      type: "datetime"
    },
    yAxis: {
      gridLineColor: "#edf0ee",
      labels: {
        formatter() {
          return formatSignedBasisPoints(this.value);
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
      title: { text: "CET1 impact (bp)" }
    }
  };

  if (hasBenchmarkChartModeChanged(outputFloorBenchmarkChart, chartModel.peerDisplayMode)) destroyOutputFloorBenchmarkChart();
  if (outputFloorBenchmarkChart) {
    clearBenchmarkEndpointLabels(outputFloorBenchmarkChart);
    outputFloorBenchmarkChart.update(options, true, true, false);
    markBenchmarkChartMode(outputFloorBenchmarkChart, chartModel.peerDisplayMode);
    scheduleBenchmarkEndpointLabels(outputFloorBenchmarkChart, state.selectedJst, onSelectJst, { peerDisplayMode: chartModel.peerDisplayMode });
  } else {
    outputFloorBenchmarkChart = window.Highcharts.chart(container, options);
    markBenchmarkChartMode(outputFloorBenchmarkChart, chartModel.peerDisplayMode);
  }
}

function createMetricCard({ detail, label, tone = "", value }) {
  const card = document.createElement("div");
  card.className = `irb-output-floor-card ${tone ? `is-${tone}` : ""}`;
  const labelNode = document.createElement("div");
  labelNode.className = "irb-output-floor-card-label";
  labelNode.textContent = label;
  const valueNode = document.createElement("div");
  valueNode.className = "irb-output-floor-card-value";
  valueNode.textContent = value || "-";
  const detailNode = document.createElement("div");
  detailNode.className = "irb-output-floor-card-detail";
  detailNode.textContent = detail || "";
  card.append(labelNode, valueNode, detailNode);
  return card;
}

function createMechanicRow(label, value, selectedUnit, signed = false) {
  const row = document.createElement("div");
  row.className = "irb-output-floor-mechanic-row";
  const labelNode = document.createElement("span");
  labelNode.textContent = label;
  const valueNode = document.createElement("strong");
  valueNode.textContent = signed
    ? formatOptionalSignedMetric(value, selectedUnit)
    : formatOptionalMetric(value, selectedUnit);
  row.append(labelNode, valueNode);
  return row;
}

function createIrbNotice(message) {
  const notice = document.createElement("div");
  notice.className = "irb-empty-state";
  notice.textContent = message;
  return notice;
}

function destroyOutputFloorBenchmarkChart() {
  if (!outputFloorBenchmarkChart) return;
  outputFloorBenchmarkChart.destroy();
  outputFloorBenchmarkChart = null;
}

function onSelectJst(jstCode) {
  if (!jstCode || !actionsRef) return;
  actionsRef.updateSelectedJst(jstCode);
}

function formatPercentFromFraction(value) {
  if (!Number.isFinite(value)) return "-";
  return `${new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  }).format(value * 100)} %`;
}

function formatPercentFromFactor(value) {
  if (!Number.isFinite(value)) return "-";
  return `${new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: value === 0.725 ? 1 : 0
  }).format(value * 100)}%`;
}

function formatSignedBasisPoints(value) {
  if (!Number.isFinite(value)) return "-";
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatBasisPointsValue(value)}`;
}

function formatOptionalMetric(value, selectedUnit) {
  return Number.isFinite(value) ? formatMetricValue(value, selectedUnit) : "-";
}

function formatOptionalSignedMetric(value, selectedUnit) {
  return Number.isFinite(value) ? formatSignedMetricValue(value, selectedUnit) : "-";
}
