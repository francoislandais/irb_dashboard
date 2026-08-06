import { formatContributionPercentValue, formatMetricValue } from "../data/core/formatting.js?v=20260710-bp-format";
import { getCostOfRiskYAxisBounds } from "../data/costOfRisk.js?v=20260806-cell-selection";
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
} from "./benchmarkLineChart.js?v=20260806-cell-selection";
import {
  createCostOfRiskHighchartsTitle,
  createCostOfRiskQuarterAxisLabelsOptions,
  escapeHtml,
  getCostOfRiskAxisTickPositions
} from "./costOfRiskChartUtils.js?v=20260804-axis-year-labels";
import { primaryDark } from "./theme.js?v=20260709-flow-arrow-color";

let costOfRiskGeographyChart = null;

export function getCostOfRiskGeographyChart() {
  return costOfRiskGeographyChart;
}

export function destroyCostOfRiskGeographyChart() {
  if (!costOfRiskGeographyChart) return;
  costOfRiskGeographyChart.destroy();
  costOfRiskGeographyChart = null;
}

const GEOGRAPHY_METRICS = [
  { amountKey: "exposure", label: "Exposure", ratioKey: null },
  { amountKey: "nonPerforming", label: "Non-performing", ratioKey: "nplRatio", ratioLabel: "NPL ratio" },
  { amountKey: "impairment", label: "Impairment", ratioKey: "coverageRatio", ratioLabel: "Coverage" }
];

export function renderCostOfRiskGeographyView({
  chartContainer,
  container,
  countryQuery,
  displayMode,
  model,
  onCellSelect,
  onSelectJst,
  onSelectReferenceDate,
  peerDisplayMode,
  selectedJst,
  selectedUnit
}) {
  if (!container) return;
  container.replaceChildren();

  const wrap = document.createElement("div");
  wrap.className = "cost-of-risk-geography";

  const controls = document.createElement("div");
  controls.className = "cost-of-risk-geography-controls";
  controls.append(createModeButton("top10", "Top 10", model.countryMode));
  controls.append(createModeButton("euro-area", "Euro area", model.countryMode));
  controls.append(createModeButton("custom", "Custom", model.countryMode));

  const search = document.createElement("input");
  search.className = "cost-of-risk-geography-search";
  search.type = "search";
  search.placeholder = "Search country";
  search.value = countryQuery || "";
  search.dataset.costOfRiskGeographySearch = "true";
  search.hidden = model.countryMode !== "custom";
  controls.append(search);

  if (model.status) {
    destroyCostOfRiskGeographyChart();
    if (chartContainer) chartContainer.replaceChildren();
    const empty = document.createElement("div");
    empty.className = "cost-of-risk-tab-empty";
    empty.textContent = model.status;
    wrap.append(controls, empty);
    container.append(wrap);
    return;
  }

  const layout = document.createElement("div");
  layout.className = "cost-of-risk-geography-layout";
  const side = document.createElement("aside");
  side.className = "cost-of-risk-geography-side";
  side.append(controls);
  if (model.countryMode === "custom") {
    const picker = createCountryPicker(model, countryQuery);
    side.append(picker);
  }
  const tableScroller = document.createElement("div");
  tableScroller.className = "cost-of-risk-geography-table-scroll";
  tableScroller.append(createGeographyTable(model.countries ?? [], model.allCountries ?? [], displayMode, selectedUnit, model.selectedCell, onCellSelect));
  layout.append(side, tableScroller);

  wrap.append(layout);
  container.append(wrap);
  renderCostOfRiskGeographyBenchmarkChart({
    activeReferenceDate: model.referenceDate,
    container: chartContainer,
    displayMode,
    model,
    onSelectJst,
    onSelectReferenceDate,
    peerDisplayMode,
    selectedJst,
    selectedUnit
  });
}

function createModeButton(mode, label, activeMode) {
  const button = document.createElement("button");
  button.className = "cost-of-risk-geography-mode";
  button.classList.toggle("is-active", mode === activeMode);
  button.type = "button";
  button.dataset.costOfRiskGeographyMode = mode;
  button.textContent = label;
  return button;
}

function createCountryPicker(model, query) {
  const normalizedQuery = String(query ?? "").trim().toLocaleLowerCase("fr-FR");
  const selected = new Set(model.selectedCountries ?? []);
  const countries = (model.allCountries ?? [])
    .filter((country) => {
      if (!normalizedQuery) return true;
      return `${country.code} ${country.label}`.toLocaleLowerCase("fr-FR").includes(normalizedQuery);
    })
    .slice(0, 24);

  const picker = document.createElement("div");
  picker.className = "cost-of-risk-geography-picker";
  countries.forEach((country) => {
    const button = document.createElement("button");
    button.className = "cost-of-risk-geography-country";
    button.classList.toggle("is-selected", selected.has(country.code));
    button.type = "button";
    button.dataset.costOfRiskGeographyCountry = country.code;
    button.textContent = `${country.code} ${country.label}`;
    picker.append(button);
  });
  return picker;
}

function createGeographyTable(countries, allCountries, displayMode, selectedUnit, selectedCell, onCellSelect) {
  const columnMaxima = getGeographyColumnMaxima(allCountries, displayMode);
  const table = document.createElement("table");
  table.className = "cost-of-risk-geography-table";

  const thead = document.createElement("thead");
  const header = document.createElement("tr");
  ["Country", ...GEOGRAPHY_METRICS.map((metric) => (displayMode === "ratio" && metric.ratioKey ? metric.ratioLabel : metric.label))].forEach((label) => {
    const th = document.createElement("th");
    th.textContent = label;
    header.append(th);
  });
  thead.append(header);

  const tbody = document.createElement("tbody");
  countries.forEach((country) => {
    const tr = document.createElement("tr");
    tr.classList.toggle("is-active-summary-row", country.code === selectedCell?.countryCode);
    const countryCell = document.createElement("td");
    countryCell.className = "cost-of-risk-geography-country-cell";
    const code = document.createElement("span");
    code.className = "cost-of-risk-geography-country-code";
    code.textContent = country.code;
    const label = document.createElement("span");
    label.className = "cost-of-risk-geography-country-label";
    label.textContent = country.label;
    countryCell.append(code, label);
    tr.append(countryCell);

    GEOGRAPHY_METRICS.forEach((metric) => {
      const td = document.createElement("td");
      td.className = "cost-of-risk-geography-value-cell";
      const value = displayMode === "ratio" && metric.ratioKey
        ? country[metric.ratioKey]
        : country[metric.amountKey];
      const metricKey = displayMode === "ratio" && metric.ratioKey ? metric.ratioKey : metric.amountKey;
      const cellKey = `${country.code}:${metricKey}`;
      const button = document.createElement("button");
      button.className = "cost-of-risk-geography-value-button";
      button.classList.toggle("is-active", selectedCell?.key === cellKey);
      button.type = "button";
      button.dataset.costOfRiskCalculationDetail = "geography-cell";
      button.dataset.costOfRiskCalculationValue = cellKey;
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        onCellSelect?.(cellKey);
      });
      button.append(createValueBar(value, columnMaxima.get(metricKey)), createValueText(value, metric, displayMode, selectedUnit));
      td.append(button);
      tr.append(td);
    });
    tbody.append(tr);
  });

  table.append(thead, tbody);
  return table;
}

function getGeographyColumnMaxima(countries, displayMode) {
  const maxima = new Map();
  GEOGRAPHY_METRICS.forEach((metric) => {
    const metricKey = displayMode === "ratio" && metric.ratioKey ? metric.ratioKey : metric.amountKey;
    const max = Math.max(
      ...(countries ?? [])
        .map((country) => Math.abs(country[metricKey]))
        .filter(Number.isFinite),
      0
    );
    maxima.set(metricKey, max);
  });
  return maxima;
}

function renderCostOfRiskGeographyBenchmarkChart({
  activeReferenceDate,
  container,
  displayMode,
  model,
  onSelectJst,
  onSelectReferenceDate,
  peerDisplayMode,
  selectedJst,
  selectedUnit
}) {
  if (!container || !window.Highcharts) return;

  const selectedCell = model.selectedCell;
  const chartDisplayMode = "amount";
  const chartModel = buildBenchmarkChartModel(model.benchmarkSeries ?? [], selectedJst, primaryDark, {
    displayMode: chartDisplayMode,
    peerDisplayMode,
    smoothingWindow: 1
  });
  const series = chartModel.series;
  if (!selectedCell || series.length === 0) {
    destroyCostOfRiskGeographyChart();
    return;
  }

  const yBounds = getCostOfRiskYAxisBounds(getBenchmarkYAxisBoundsSeries(series, chartModel.distribution));
  const selectedReferencePoint = model.benchmarkSeries
    ?.find((benchmark) => benchmark.jstCode === selectedJst)
    ?.points?.find((point) => point.label === activeReferenceDate);
  const titleText = `${getGeographyMetricLabel(selectedCell.metric, displayMode)} - ${selectedCell.countryLabel} - time evolution`;
  const options = {
    chart: {
      animation: false,
      backgroundColor: "transparent",
      events: {
        render() {
          if (chartModel.peerDisplayMode === "anonymised") {
            renderPeerDistributionBands(this, chartModel.distribution);
          } else {
            clearPeerDistributionBands(this);
          }
          renderBenchmarkEndpointLabels(this, selectedJst, onSelectJst, { peerDisplayMode: chartModel.peerDisplayMode });
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
      onSelectReferenceDate?.(referenceLabel);
      onSelectJst?.(seriesName);
    }, selectedJst),
    series,
    subtitle: { text: "" },
    title: createCostOfRiskHighchartsTitle(titleText),
    tooltip: {
      headerFormat: "<span style=\"font-size:11px\">{point.key:%d/%m/%Y}</span><br/>",
      pointFormatter() {
        return `<span style="color:${this.series.color}">●</span> <b>${escapeHtml(this.series.name)}</b>: ${formatGeographyValue(this.y, selectedCell.metric, selectedUnit)}`;
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
      plotLines: selectedReferencePoint?.date instanceof Date ? [{
        color: "#7f8984",
        dashStyle: "ShortDash",
        value: selectedReferencePoint.date.getTime(),
        width: 1,
        zIndex: 3
      }] : [],
      tickColor: "#d9dedb",
      tickPositions: getCostOfRiskAxisTickPositions(model.benchmarkSeries?.[0]?.points),
      type: "datetime"
    },
    yAxis: {
      gridLineColor: "#edf0ee",
      labels: {
        formatter() {
          return formatGeographyValue(this.value, selectedCell.metric, selectedUnit);
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
      title: { text: getGeographyMetricLabel(selectedCell.metric, displayMode) }
    }
  };

  if (hasBenchmarkChartModeChanged(costOfRiskGeographyChart, chartModel.peerDisplayMode)) destroyCostOfRiskGeographyChart();
  if (costOfRiskGeographyChart) {
    clearBenchmarkEndpointLabels(costOfRiskGeographyChart);
    costOfRiskGeographyChart.update(options, true, true, false);
    markBenchmarkChartMode(costOfRiskGeographyChart, chartModel.peerDisplayMode);
    scheduleBenchmarkEndpointLabels(costOfRiskGeographyChart, selectedJst, onSelectJst, { peerDisplayMode: chartModel.peerDisplayMode });
  } else {
    costOfRiskGeographyChart = window.Highcharts.chart(container, options);
    markBenchmarkChartMode(costOfRiskGeographyChart, chartModel.peerDisplayMode);
  }
}

function getGeographyMetricLabel(metric, displayMode) {
  if (metric === "nplRatio") return "NPL ratio";
  if (metric === "coverageRatio") return "Coverage ratio";
  if (metric === "nonPerforming") return "Non-performing";
  if (metric === "impairment") return "Impairment";
  return displayMode === "ratio" ? "Exposure" : "Exposure";
}

export function formatCostOfRiskGeographyCellValue(value, metric, selectedUnit) {
  if (!Number.isFinite(value)) return "-";
  if (metric === "nplRatio" || metric === "coverageRatio") return formatContributionPercentValue(value);
  return formatMetricValue(value, selectedUnit);
}

function formatGeographyValue(value, metric, selectedUnit) {
  return formatCostOfRiskGeographyCellValue(value, metric, selectedUnit);
}

function createValueBar(value, maxValue) {
  const bar = document.createElement("span");
  bar.className = "cost-of-risk-geography-bar";
  const magnitude = Number.isFinite(value) ? Math.abs(value) : 0;
  const width = maxValue ? Math.min(100, Math.max(3, magnitude / maxValue * 100)) : 0;
  bar.style.setProperty("--bar-width", `${width}%`);
  return bar;
}

function createValueText(value, metric, displayMode, selectedUnit) {
  const text = document.createElement("span");
  text.className = "cost-of-risk-geography-value";
  if (displayMode === "ratio" && metric.ratioKey) {
    text.textContent = Number.isFinite(value) ? formatContributionPercentValue(value) : "-";
  } else {
    text.textContent = Number.isFinite(value) ? formatMetricValue(value, selectedUnit) : "-";
  }
  return text;
}
