import { getIrbOutputFloorModel } from "../data/irb.js?v=20260817-output-floor-bridge";
import { getIrbDensityModel, getIrbDensityPoint, IRB_DENSITY_TOTAL_Y_CODE } from "../data/irbDensity.js?v=20260814-irb-density-cube";
import { getIrbCet1RatioModel, getIrbCet1TimeSeriesModel } from "../data/irbCet1.js?v=20260818-cet1-timeseries";
import { formatBasisPointsValue, formatMetricValue, formatSignedMetricValue } from "../data/core/formatting.js?v=20260710-bp-format";
import { createCostOfRiskQuarterAxisLabelsOptions } from "./costOfRiskChartUtils.js?v=20260804-axis-year-labels";
import { clearBenchmarkEndpointLabels, renderBenchmarkEndpointLabels, scheduleBenchmarkEndpointLabels } from "./benchmarkLineChart.js?v=20260812-costofrisk-domain-split";
import { primaryDark } from "./theme.js?v=20260709-flow-arrow-color";

const IRB_DEFAULT_TAB = "output-floor";

const elements = {
  activeFilters: document.querySelector("#irb-active-filters"),
  contextPanel: document.querySelector("#irb-context-panel"),
  cet1RatioView: document.querySelector("#irb-cet1-ratio-view"),
  densityView: document.querySelector("#irb-density-view"),
  outputFloorView: document.querySelector("#irb-output-floor-view"),
  tabs: [...document.querySelectorAll("[data-irb-tab]")],
  panels: [...document.querySelectorAll("[data-irb-panel]")]
};

let activeIrbTab = IRB_DEFAULT_TAB;
let activeOutputFloorReference = "";
let activeCet1PreviousReference = "";
let activeCet1Detail = "numerator";
let activeCet1FilterPanel = "cet1-reference-date";
let activeCet1ComparisonHorizon = "quarter";
let activeCet1RatioType = "cet1";
let activeCet1ChartSelection = { kind: "ratio", label: "CET1 ratio" };
let activeDensityBenchmarkPortfolio = "";
let activeDensityBenchmarkMetric = "density";
let activeDensityYCode = IRB_DENSITY_TOTAL_Y_CODE;
let activeDensityFilterPanel = "";
const expandedDensityYPaths = new Set();
let densityYTreeInitialized = false;
let densityBenchmarkChart = null;
let cet1TimeSeriesChart = null;
let densityTableScrollTop = 0;
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
  elements.activeFilters?.addEventListener("click", (event) => {
    const toggle = event.target.closest?.("[data-irb-filter-toggle]");
    if (!toggle) return;
    const filter = toggle.dataset.irbFilterToggle;
    if (activeIrbTab === "cet1-ratio") {
      activeCet1FilterPanel = filter;
    } else {
      activeDensityFilterPanel = activeDensityFilterPanel === filter ? "" : filter;
    }
    renderIrb(actions.getState());
  });
  renderIrbTabs();
}

export function renderIrb(state) {
  renderIrbTabs();
  const isDensity = activeIrbTab === "density";
  const hasFilterBar = isDensity || activeIrbTab === "cet1-ratio";
  if (elements.activeFilters) elements.activeFilters.hidden = !hasFilterBar;
  if (elements.contextPanel && !hasFilterBar) elements.contextPanel.hidden = true;
  if (activeIrbTab === "output-floor") renderOutputFloor(state);
  if (isDensity) renderDensity(state);
  if (activeIrbTab === "cet1-ratio") renderCet1Ratio(state);
}

function renderCet1Ratio(state) {
  const container = elements.cet1RatioView;
  if (!container) return;
  let model = getIrbCet1RatioModel(state, activeOutputFloorReference, activeCet1PreviousReference, activeCet1RatioType);
  container.replaceChildren();
  if (model.status) {
    elements.activeFilters?.replaceChildren();
    if (elements.contextPanel) {
      elements.contextPanel.hidden = true;
      elements.contextPanel.replaceChildren();
    }
    container.append(createIrbNotice(model.status));
    return;
  }
  const horizonOffset = getCet1HorizonOffset(activeCet1ComparisonHorizon);
  const currentIndex = model.referenceDates.findIndex((date) => date.name === model.currentReference.name);
  const horizonReference = model.referenceDates[currentIndex - horizonOffset];
  if (!horizonReference) {
    activeCet1ComparisonHorizon = "quarter";
  } else if (horizonReference.name !== model.previousReference.name) {
    model = getIrbCet1RatioModel(state, model.currentReference.name, horizonReference.name, activeCet1RatioType);
  }
  if (model.status) {
    container.append(createIrbNotice(model.status));
    return;
  }
  activeOutputFloorReference = model.currentReference.name;
  activeCet1PreviousReference = model.previousReference.name;
  renderCet1ActiveFilters(model);
  renderCet1FilterPanel(model, state);
  const analysisPanel = document.createElement("section");
  analysisPanel.className = "irb-cet1-analysis-panel";
  analysisPanel.append(createCet1RatioHero(model, state));
  const detail = createCet1DetailPanel(model, state);
  if (detail) analysisPanel.append(detail);
  container.append(analysisPanel);
  const chartPanel = createCet1TimeSeriesPanel();
  container.append(chartPanel);
  renderCet1TimeSeriesChart(state, model);
}

function renderCet1ActiveFilters(model) {
  const container = elements.activeFilters;
  if (!container) return;
  container.replaceChildren(
    createCet1FilterChip("cet1-ratio-type", model.ratioDefinition.label, "Change capital ratio"),
    createCet1FilterChip("cet1-reference-date", formatCet1Quarter(model.currentReference), "Change CET1 reference date"),
    createCet1FilterChip("cet1-comparison", getCet1HorizonLabel(activeCet1ComparisonHorizon), "Change comparison horizon")
  );
}

function createCet1FilterChip(filter, text, ariaLabel) {
  const chip = document.createElement("div");
  chip.className = `cost-of-risk-filter-chip${filter === "cet1-reference-date" ? " cost-of-risk-filter-chip--locked cost-of-risk-filter-chip--date" : ""}`;
  chip.classList.toggle("is-open", activeCet1FilterPanel === filter);
  const toggle = document.createElement("button");
  toggle.className = "cost-of-risk-filter-chip-toggle";
  toggle.type = "button";
  toggle.dataset.irbFilterToggle = filter;
  toggle.setAttribute("aria-expanded", String(activeCet1FilterPanel === filter));
  toggle.setAttribute("aria-label", ariaLabel);
  const label = document.createElement("span");
  label.className = "cost-of-risk-filter-chip-label cost-of-risk-filter-chip-value";
  label.textContent = text;
  toggle.append(label);
  chip.append(toggle);
  return chip;
}

function renderCet1FilterPanel(model, state) {
  const panel = elements.contextPanel;
  if (!panel) return;
  if (!activeCet1FilterPanel) activeCet1FilterPanel = "cet1-reference-date";
  panel.hidden = false;
  panel.replaceChildren();

  const article = document.createElement("article");
  article.className = "cost-of-risk-audit-intro cost-of-risk-reference-date-panel";
  const panelTitle = activeCet1FilterPanel === "cet1-reference-date"
    ? "Reference quarter"
    : activeCet1FilterPanel === "cet1-ratio-type"
      ? "Capital ratio"
      : "Comparison horizon";
  article.innerHTML = `<span class="cost-of-risk-audit-intro-eyebrow">Breakdown of selection by:</span><h2 class="cost-of-risk-audit-intro-title">${panelTitle}</h2>`;
  const table = document.createElement("table");
  table.className = "cost-of-risk-filter-selection-table cost-of-risk-reference-date-table";
  const body = document.createElement("tbody");

  if (activeCet1FilterPanel === "cet1-reference-date") {
    [...model.availableCurrentDates].reverse().forEach((reference) => {
      const preview = getIrbCet1RatioModel(state, reference.name, "", activeCet1RatioType);
      body.append(createCet1FilterOption({
        active: reference.name === model.currentReference.name,
        label: formatCet1Quarter(reference),
        value: preview.status ? "-" : formatPercentFromFraction(preview.currentRatio),
        onSelect: () => {
          activeOutputFloorReference = reference.name;
          activeCet1PreviousReference = "";
          renderAppState?.(actionsRef?.getState?.() ?? state);
        }
      }));
    });
  } else if (activeCet1FilterPanel === "cet1-ratio-type") {
    [
      { key: "cet1", label: "CET1 ratio" },
      { key: "tier1", label: "Tier 1 capital ratio" },
      { key: "total", label: "Total capital ratio" }
    ].forEach((option) => {
      const preview = getIrbCet1RatioModel(state, model.currentReference.name, model.previousReference.name, option.key);
      body.append(createCet1FilterOption({
        active: option.key === activeCet1RatioType,
        label: option.label,
        value: preview.status ? "-" : formatPercentFromFraction(preview.currentRatio),
        onSelect: () => {
          activeCet1RatioType = option.key;
          activeCet1ChartSelection = { kind: "ratio", label: option.label, ratioKey: option.key };
          renderAppState?.(actionsRef?.getState?.() ?? state);
        }
      }));
    });
  } else {
    const currentIndex = model.referenceDates.findIndex((date) => date.name === model.currentReference.name);
    [
      { key: "quarter", label: "Previous quarter", offset: 1 },
      { key: "semester", label: "Six months", offset: 2 },
      { key: "year", label: "One year", offset: 4 }
    ].forEach((option) => {
      const comparisonDate = model.referenceDates[currentIndex - option.offset];
      body.append(createCet1FilterOption({
        active: option.key === activeCet1ComparisonHorizon,
        disabled: !comparisonDate,
        label: option.label,
        value: comparisonDate ? formatCet1Quarter(comparisonDate) : "Unavailable",
        onSelect: () => {
          activeCet1ComparisonHorizon = option.key;
          activeCet1PreviousReference = comparisonDate.name;
          renderAppState?.(actionsRef?.getState?.() ?? state);
        }
      }));
    });
  }
  table.append(body);
  article.append(table);
  panel.append(article);
}

function createCet1FilterOption({ active, disabled = false, label, value, onSelect }) {
  const row = document.createElement("tr");
  row.className = `cost-of-risk-filter-selection-row${active ? " is-active" : ""}`;
  const cell = document.createElement("td");
  const button = document.createElement("button");
  button.className = "cost-of-risk-filter-selection-option";
  button.type = "button";
  button.disabled = disabled;
  button.innerHTML = `<span class="cost-of-risk-filter-selection-option-label">${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong>`;
  button.addEventListener("click", onSelect);
  cell.append(button);
  row.append(cell);
  return row;
}

function getCet1HorizonOffset(horizon) {
  return { quarter: 1, semester: 2, year: 4 }[horizon] ?? 1;
}

function getCet1HorizonLabel(horizon) {
  return { quarter: "Previous quarter", semester: "Six months", year: "One year" }[horizon] ?? "Previous quarter";
}

function formatCet1Quarter(reference) {
  const date = reference?.date;
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return reference?.label ?? "-";
  return `Q${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear()}`;
}

function createCet1RatioHero(model, state) {
  const section = document.createElement("section");
  section.className = "irb-cet1-summary-rail";
  const ratio = document.createElement("button");
  ratio.type = "button";
  ratio.className = "irb-cet1-rail-ratio";
  ratio.classList.toggle("is-selected", activeCet1ChartSelection.kind === "ratio");
  ratio.innerHTML = `
      <span>${escapeHtml(model.ratioDefinition.label)}</span>
      <strong>${formatPercentFromFraction(model.currentRatio)}</strong>
      <small>${formatSignedBasisPoints(model.ratioChangeBasisPoints)} over the selected period</small>
  `;
  ratio.addEventListener("click", () => selectCet1ChartMetric({ kind: "ratio", label: model.ratioDefinition.label, ratioKey: activeCet1RatioType }));
  section.append(
    ratio,
    createCet1ScopeButton({
      key: "numerator",
      label: model.ratioDefinition.capitalLabel,
      value: formatOptionalMetric(model.numerator.current, state.selectedUnit),
      change: formatOptionalSignedMetric(model.numerator.change, state.selectedUnit),
      effect: formatSignedBasisPoints(model.attribution.numeratorBasisPoints)
    }),
    createCet1ScopeButton({
      key: "denominator",
      label: "Total RWA",
      value: formatOptionalMetric(model.denominator.current, state.selectedUnit),
      change: formatOptionalSignedMetric(model.denominator.change, state.selectedUnit),
      effect: formatSignedBasisPoints(model.attribution.denominatorBasisPoints)
    })
  );
  return section;
}

function createCet1ScopeButton({ key, label, value, change, effect }) {
  const button = document.createElement("button");
  button.className = `irb-cet1-scope-button${activeCet1Detail === key ? " is-active" : ""}`;
  button.classList.toggle("is-chart-selected", activeCet1ChartSelection.kind === key);
  button.type = "button";
  button.setAttribute("aria-pressed", String(activeCet1Detail === key));
  button.innerHTML = `<span>${label}</span><strong>${value}</strong><small>${change} · ${effect}</small>`;
  button.addEventListener("click", () => {
    activeCet1Detail = key;
    activeCet1ChartSelection = { kind: key, label, ratioKey: activeCet1RatioType };
    renderAppState?.(actionsRef?.getState?.());
  });
  return button;
}

function createCet1DetailPanel(model, state) {
  if (!activeCet1Detail) return null;
  const isNumerator = activeCet1Detail === "numerator";
  const source = isNumerator ? "C01.00" : "C02.00";
  const components = isNumerator ? model.numeratorComponents : model.denominatorComponents;
  const effectBasisPoints = isNumerator ? model.attribution.numeratorBasisPoints : model.attribution.denominatorBasisPoints;
  const section = document.createElement("section");
  section.className = "irb-cet1-breakdown irb-cet1-detail-panel";
  const header = document.createElement("div");
  header.className = "irb-cet1-breakdown-header";
  header.innerHTML = `<div><strong>${isNumerator ? `${escapeHtml(model.ratioDefinition.capitalLabel)} drivers` : "RWA drivers"}</strong></div><div class="irb-cet1-detail-effect"><span>Effect on capital ratio</span><strong class="${effectBasisPoints >= 0 ? "is-positive" : "is-negative"}">${formatSignedBasisPoints(effectBasisPoints)}</strong></div>`;
  const table = document.createElement("table");
  table.innerHTML = '<thead><tr><th aria-label="Component"></th><th>Current value</th><th>Change</th><th>Ratio impact</th></tr></thead>';
  const body = document.createElement("tbody");
  components.forEach((component) => {
    const row = document.createElement("tr");
    const isChartSelected = activeCet1ChartSelection.kind === "component"
      && activeCet1ChartSelection.tableId === source
      && activeCet1ChartSelection.yCode === component.code;
    row.className = `irb-cet1-driver-row${isChartSelected ? " is-selected" : ""}`;
    if (component.code !== "residual") {
      row.tabIndex = 0;
      row.setAttribute("role", "button");
    }
    const tone = component.basisPoints > 0 ? "is-positive" : component.basisPoints < 0 ? "is-negative" : "";
    row.innerHTML = `<td><span>${escapeHtml(component.label)}</span><small>${component.code === "residual" ? "Reconciliation" : `${source.replace("_", "")} · ${component.code}`}</small></td><td>${formatOptionalMetric(component.current, state.selectedUnit)}</td><td>${formatOptionalSignedMetric(component.change, state.selectedUnit)}</td><td class="${tone}">${formatSignedBasisPoints(component.basisPoints)}</td>`;
    if (component.code !== "residual") {
      const selectComponent = () => selectCet1ChartMetric({ kind: "component", label: component.label, tableId: source, yCode: component.code });
      row.addEventListener("click", selectComponent);
      row.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        selectComponent();
      });
    }
    body.append(row);
  });
  table.append(body);
  section.append(header, table);
  return section;
}

function selectCet1ChartMetric(selection) {
  activeCet1ChartSelection = selection;
  renderAppState?.(actionsRef?.getState?.());
}

function createCet1TimeSeriesPanel() {
  const section = document.createElement("section");
  section.className = "irb-cet1-timeseries-panel";
  const header = document.createElement("div");
  header.className = "irb-cet1-timeseries-header";
  header.innerHTML = `<div><strong>Time evolution</strong><span>${escapeHtml(activeCet1ChartSelection.label)}</span></div>`;
  const chart = document.createElement("div");
  chart.className = "irb-cet1-timeseries-chart";
  section.append(header, chart);
  return section;
}

function renderCet1TimeSeriesChart(state, ratioModel) {
  const container = elements.cet1RatioView?.querySelector(".irb-cet1-timeseries-chart");
  if (!container || !window.Highcharts) return;
  const model = getIrbCet1TimeSeriesModel(state, { ...activeCet1ChartSelection, ratioKey: activeCet1RatioType });
  if (model.status || !model.series.length) {
    container.classList.add("is-empty");
    container.textContent = model.status || "No time series is available for this selection.";
    cet1TimeSeriesChart?.destroy();
    cet1TimeSeriesChart = null;
    return;
  }
  const selectedReferenceIndex = model.referenceDates.findIndex((reference) => reference.name === ratioModel.currentReference.name);
  const selectedReference = model.referenceDates[selectedReferenceIndex];
  const peerGrays = ["#8f9893", "#a2aaa6", "#b4bbb8", "#7f8984"];
  const peerDashes = ["ShortDash", "ShortDot", "Dash", "Dot"];
  const onSelectJst = (jstCode) => actionsRef?.updateSelectedJst?.(jstCode);
  const chartSeries = model.series.map((series, index) => {
    const selected = series.jstCode === model.selectedJst;
    const color = selected ? primaryDark : peerGrays[index % peerGrays.length];
    return {
      clip: false,
      color,
      dashStyle: selected ? "Solid" : peerDashes[index % peerDashes.length],
      data: series.data.map((value, pointIndex) => ({
        x: model.referenceDates[pointIndex].date.getTime(),
        y: Number.isFinite(value) ? value : null
      })),
      fillColor: selected ? "rgba(140, 148, 144, 0.12)" : "transparent",
      lineWidth: selected ? 3.6 : 1.45,
      marker: {
        enabled: selected,
        fillColor: selected ? "#ffffff" : color,
        lineColor: color,
        lineWidth: selected ? 1.5 : 0,
        radius: selected ? 5 : 0,
        symbol: "circle"
      },
      name: series.jstCode,
      opacity: selected ? 1 : 0.78,
      states: {
        hover: { enabled: true, halo: { size: selected ? 9 : 0 }, lineWidth: selected ? 4 : 2.1, lineWidthPlus: 0 },
        inactive: { opacity: selected ? 1 : 0.42 }
      },
      threshold: 0,
      type: selected ? "area" : "line",
      zIndex: selected ? 100 : 1
    };
  }).sort((left, right) => left.name === model.selectedJst ? 1 : right.name === model.selectedJst ? -1 : left.name.localeCompare(right.name));
  const chartOptions = {
    chart: {
      animation: false,
      backgroundColor: "transparent",
      events: {
        render() {
          renderBenchmarkEndpointLabels(this, model.selectedJst, onSelectJst, { peerDisplayMode: "explicit" });
        }
      },
      spacing: [6, 128, 4, 4],
      type: "line",
      zooming: { type: "xy" },
      zoomType: "xy"
    },
    credits: { enabled: false },
    legend: { enabled: false },
    title: { text: null },
    xAxis: {
      labels: createCostOfRiskQuarterAxisLabelsOptions(),
      lineColor: "#c2cac5",
      lineWidth: 1,
      plotLines: selectedReference ? [{ color: "#7f8984", dashStyle: "ShortDash", value: selectedReference.date.getTime(), width: 1, zIndex: 3 }] : [],
      tickColor: "#d9dedb",
      tickPositions: model.referenceDates.map((reference) => reference.date.getTime()),
      type: "datetime"
    },
    yAxis: {
      gridLineColor: "#edf0ee",
      labels: {
        formatter() {
          return model.valueKind === "amount"
            ? formatMetricValue(this.value, state.selectedUnit)
            : new Intl.NumberFormat("fr-FR", { maximumFractionDigits: model.valueKind === "ratio" ? 1 : 0 }).format(this.value);
        },
        style: { color: "#5f6b65" }
      },
      lineColor: "#aeb8b2",
      lineWidth: 1,
      startOnTick: false,
      endOnTick: false,
      tickAmount: 8,
      title: { text: model.valueKind === "ratio" ? `${model.label} (%)` : model.valueKind === "bps" ? "Change (bp)" : "Amount" }
    },
    plotOptions: {
      series: {
        animation: false,
        clip: false,
        connectNulls: false,
        cursor: "pointer",
        point: {
          events: {
            click() {
              const reference = model.referenceDates.find((item) => item.date.getTime() === this.x);
              if (reference) activeOutputFloorReference = reference.name;
              if (this.series.name === state.selectedJst) {
                renderAppState?.(actionsRef?.getState?.() ?? state);
              } else {
                actionsRef?.updateSelectedJst?.(this.series.name);
              }
            }
          }
        }
      }
    },
    series: chartSeries,
    tooltip: {
      shared: false,
      formatter() {
        const value = model.valueKind === "ratio"
          ? `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(this.y)} %`
          : model.valueKind === "bps"
            ? formatSignedBasisPoints(this.y)
            : formatMetricValue(this.y, state.selectedUnit);
        const date = new Date(this.x);
        const quarter = `Q${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear()}`;
        return `<b>${this.series.name}</b><br>${quarter}: ${value}`;
      }
    }
  };
  if (cet1TimeSeriesChart) {
    clearBenchmarkEndpointLabels(cet1TimeSeriesChart);
    cet1TimeSeriesChart.destroy();
  }
  cet1TimeSeriesChart = window.Highcharts.chart(container, chartOptions);
  scheduleBenchmarkEndpointLabels(cet1TimeSeriesChart, model.selectedJst, onSelectJst, { peerDisplayMode: "explicit" });
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

  const model = getIrbOutputFloorModel(state, activeOutputFloorReference);
  container.replaceChildren();

  if (model.status) {
    container.append(createIrbNotice(model.status));
    return;
  }

  activeOutputFloorReference = model.referenceDate.name;

  container.append(
    createOutputFloorReferenceSelector(model, state),
    createOutputFloorHero(model, state),
    createOutputFloorScenarioBridge(model, state),
    createOutputFloorBenchmark(model, state)
  );
}

function createOutputFloorReferenceSelector(model, state) {
  const toolbar = document.createElement("div");
  toolbar.className = "irb-output-floor-toolbar";

  const label = document.createElement("label");
  label.className = "field compact-field irb-output-floor-reference-field";
  const caption = document.createElement("span");
  caption.textContent = "Reference date";
  const select = document.createElement("select");
  select.setAttribute("aria-label", "IRB reference date");

  model.referenceDates.forEach((reference) => {
    select.append(new Option(reference.label, reference.name, false, reference.name === model.referenceDate.name));
  });
  select.addEventListener("change", (event) => {
    activeOutputFloorReference = event.target.value;
    renderAppState?.(actionsRef?.getState?.() ?? state);
  });

  label.append(caption, select);
  toolbar.append(label);
  return toolbar;
}

function renderDensity(state) {
  const container = elements.densityView;
  if (!container) return;

  const currentTableWrap = container.querySelector(".irb-density-table-wrap");
  if (currentTableWrap) densityTableScrollTop = currentTableWrap.scrollTop;
  const model = getIrbDensityModel(state, activeOutputFloorReference, activeDensityBenchmarkPortfolio, activeDensityYCode);
  container.replaceChildren();

  if (model.status) {
    destroyDensityBenchmarkChart();
    elements.activeFilters?.replaceChildren();
    if (elements.contextPanel) {
      elements.contextPanel.hidden = true;
      elements.contextPanel.replaceChildren();
    }
    container.append(createIrbNotice(model.status));
    return;
  }

  activeOutputFloorReference = model.referenceDate.name;
  activeDensityYCode = model.selectedY.code;
  if (activeDensityBenchmarkPortfolio) {
    activeDensityBenchmarkPortfolio = model.selectedPortfolio.code;
  }
  renderDensityActiveFilters(model);
  renderDensityFilterPanel(model, state);
  container.append(createDensityTable(model, state), createDensityBenchmarkPanel(model));
  const nextTableWrap = container.querySelector(".irb-density-table-wrap");
  if (nextTableWrap) nextTableWrap.scrollTop = densityTableScrollTop;
  renderDensityBenchmarkChart(model, state);
}

function renderDensityActiveFilters(model) {
  const container = elements.activeFilters;
  if (!container) return;
  container.replaceChildren(
    createDensityFilterChip("reference-date", model.referenceDate.label, "Change IRB reference date"),
    createDensityFilterChip("y-axis", model.selectedY.label, "Change exposure component")
  );
}

function createDensityFilterChip(filter, text, ariaLabel) {
  const chip = document.createElement("div");
  chip.className = `cost-of-risk-filter-chip${filter === "reference-date" ? " cost-of-risk-filter-chip--locked cost-of-risk-filter-chip--date" : ""}`;
  chip.classList.toggle("is-open", activeDensityFilterPanel === filter);
  const toggle = document.createElement("button");
  toggle.className = "cost-of-risk-filter-chip-toggle";
  toggle.type = "button";
  toggle.dataset.irbFilterToggle = filter;
  toggle.setAttribute("aria-expanded", String(activeDensityFilterPanel === filter));
  toggle.setAttribute("aria-label", ariaLabel);
  const label = document.createElement("span");
  label.className = "cost-of-risk-filter-chip-label cost-of-risk-filter-chip-value";
  label.textContent = text;
  toggle.append(label);
  chip.append(toggle);
  return chip;
}

function renderDensityFilterPanel(model, state) {
  const panel = elements.contextPanel;
  if (!panel) return;
  panel.hidden = !activeDensityFilterPanel;
  if (!activeDensityFilterPanel) {
    panel.replaceChildren();
    return;
  }

  if (activeDensityFilterPanel === "y-axis") {
    renderDensityYAxisPanel(panel, model, state);
    return;
  }

  const article = document.createElement("article");
  article.className = "cost-of-risk-audit-intro cost-of-risk-reference-date-panel";
  const eyebrow = document.createElement("span");
  eyebrow.className = "cost-of-risk-audit-intro-eyebrow";
  eyebrow.textContent = "Breakdown of selection by:";
  const title = document.createElement("h2");
  title.className = "cost-of-risk-audit-intro-title";
  title.textContent = "Reference quarter";
  article.append(eyebrow, title);

  const table = document.createElement("table");
  table.className = "cost-of-risk-filter-selection-table cost-of-risk-reference-date-table";
  const body = document.createElement("tbody");
  [...model.referenceDates].reverse().forEach((reference) => {
    const preview = getIrbDensityPoint(
      state,
      reference.name,
      state.selectedJst,
      model.selectedPortfolio.code,
      model.selectedY.code
    )?.[activeDensityBenchmarkMetric];
    const row = document.createElement("tr");
    row.className = `cost-of-risk-filter-selection-row${reference.name === model.referenceDate.name ? " is-active" : ""}`;
    const cell = document.createElement("td");
    const button = document.createElement("button");
    button.className = "cost-of-risk-filter-selection-option";
    button.type = "button";
    const label = document.createElement("span");
    label.className = "cost-of-risk-filter-selection-option-label";
    label.textContent = reference.label;
    const value = document.createElement("strong");
    value.className = "cost-of-risk-filter-selection-option-value";
    value.textContent = activeDensityBenchmarkMetric === "density"
      ? formatDensity(preview)
      : formatOptionalMetric(preview, state.selectedUnit);
    button.append(label, value);
    button.addEventListener("click", () => {
      activeOutputFloorReference = reference.name;
      renderDensity(actionsRef?.getState?.() ?? state);
    });
    cell.append(button);
    row.append(cell);
    body.append(row);
  });
  table.append(body);
  article.append(table);
  panel.replaceChildren(article);
}

function renderDensityYAxisPanel(panel, model, state) {
  const article = document.createElement("article");
  article.className = "cost-of-risk-audit-intro cost-of-risk-reference-date-panel";
  const eyebrow = document.createElement("span");
  eyebrow.className = "cost-of-risk-audit-intro-eyebrow";
  eyebrow.textContent = "Breakdown of selection by:";
  const title = document.createElement("h2");
  title.className = "cost-of-risk-audit-intro-title";
  title.textContent = "Exposure component";
  article.append(eyebrow, title);

  const table = document.createElement("table");
  table.className = "cost-of-risk-filter-selection-table irb-y-tree-table";
  const body = document.createElement("tbody");
  const treeRows = buildDensityYAxisTree(model.yOptions);
  if (!densityYTreeInitialized) {
    treeRows.filter((node) => node.children.length > 0 && node.level < 3)
      .forEach((node) => expandedDensityYPaths.add(node.path));
    densityYTreeInitialized = true;
  }
  treeRows.filter(isDensityYTreeNodeVisible).forEach((node) => {
    const option = node.option;
    const preview = option
      ? getIrbDensityPoint(
        state,
        model.referenceDate.name,
        state.selectedJst,
        model.selectedPortfolio.code,
        option.code
      )?.[activeDensityBenchmarkMetric]
      : null;
    const row = document.createElement("tr");
    row.className = `cost-of-risk-filter-selection-row irb-y-tree-row${option?.code === model.selectedY.code ? " is-active" : ""}${node.children.length > 0 ? " is-parent" : ""}`;
    row.style.setProperty("--irb-y-level", node.level);
    const cell = document.createElement("td");
    const control = document.createElement("div");
    control.className = `cost-of-risk-filter-selection-option irb-y-tree-option${option ? "" : " is-virtual"}`;
    if (option) {
      control.tabIndex = 0;
      control.setAttribute("role", "button");
    }
    const content = document.createElement("span");
    content.className = "irb-y-tree-content";
    if (node.children.length > 0) {
      const toggle = document.createElement("button");
      const isExpanded = expandedDensityYPaths.has(node.path);
      toggle.className = "tree-toggle irb-y-tree-toggle";
      toggle.type = "button";
      toggle.textContent = isExpanded ? "−" : "+";
      toggle.setAttribute("aria-expanded", String(isExpanded));
      toggle.setAttribute("aria-label", isExpanded ? "Collapse group" : "Expand group");
      toggle.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        toggleDensityYPath(node.path);
        renderDensityYAxisPanel(panel, model, state);
      });
      toggle.addEventListener("keydown", (event) => event.stopPropagation());
      content.append(toggle);
    } else {
      const spacer = document.createElement("span");
      spacer.className = "tree-toggle-spacer";
      content.append(spacer);
    }
    const label = document.createElement("span");
    label.className = "cost-of-risk-filter-selection-option-label tree-label";
    label.textContent = node.label;
    content.append(label);
    control.append(content);
    if (option) {
      const value = document.createElement("strong");
      value.className = "cost-of-risk-filter-selection-option-value";
      value.textContent = activeDensityBenchmarkMetric === "density"
        ? formatDensity(preview)
        : formatOptionalMetric(preview, state.selectedUnit);
      control.append(value);
      control.addEventListener("click", () => {
        activeDensityYCode = option.code;
        renderDensity(actionsRef?.getState?.() ?? state);
      });
      control.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        activeDensityYCode = option.code;
        renderDensity(actionsRef?.getState?.() ?? state);
      });
    }
    cell.append(control);
    row.append(cell);
    body.append(row);
  });
  table.append(body);
  article.append(table);
  panel.replaceChildren(article);
}

function buildDensityYAxisTree(options) {
  const roots = [];
  const nodesByPath = new Map();
  options.forEach((option) => {
    const parts = String(option.label ?? option.code).split("/").map((part) => part.trim()).filter(Boolean);
    let siblings = roots;
    parts.forEach((label, index) => {
      const path = parts.slice(0, index + 1).join(" > ");
      let node = nodesByPath.get(path);
      if (!node) {
        node = { children: [], label, level: index, option: null, parentPath: index > 0 ? parts.slice(0, index).join(" > ") : "", path };
        nodesByPath.set(path, node);
        siblings.push(node);
      }
      if (index === parts.length - 1) node.option = option;
      siblings = node.children;
    });
  });
  const rows = [];
  const visit = (node) => {
    rows.push(node);
    node.children.forEach(visit);
  };
  roots.forEach(visit);
  return rows;
}

function isDensityYTreeNodeVisible(node) {
  if (!node.parentPath) return true;
  const parts = node.parentPath.split(" > ");
  return parts.every((_part, index) => expandedDensityYPaths.has(parts.slice(0, index + 1).join(" > ")));
}

function toggleDensityYPath(path) {
  if (expandedDensityYPaths.has(path)) {
    expandedDensityYPaths.delete(path);
    [...expandedDensityYPaths].forEach((candidate) => {
      if (candidate.startsWith(`${path} > `)) expandedDensityYPaths.delete(candidate);
    });
    return;
  }
  expandedDensityYPaths.add(path);
}

function createDensityTable(model, state) {
  const section = document.createElement("section");
  section.className = "irb-density-table-panel";

  const header = document.createElement("div");
  header.className = "irb-density-header";
  const headerText = document.createElement("div");
  const title = document.createElement("strong");
  title.textContent = "IRB credit risk density";
  const definition = document.createElement("span");
  definition.textContent = `Risk density = RWA after supporting factors / Exposure at default (C_08.01, ${model.selectedY.label}).`;
  headerText.append(title, definition);
  header.append(headerText);

  const tableWrap = document.createElement("div");
  tableWrap.className = "irb-density-table-wrap";
  const table = document.createElement("table");
  table.className = "irb-output-floor-table irb-density-table";
  table.innerHTML = `
    <thead>
      <tr>
        <th>IRB portfolio</th>
        <th>EAD</th>
        <th>RWA</th>
        <th>Risk density</th>
      </tr>
    </thead>
  `;
  const body = document.createElement("tbody");

  model.portfolios.forEach((portfolio) => {
    const row = document.createElement("tr");
    const isSelected = portfolio.code === activeDensityBenchmarkPortfolio;
    row.className = `irb-density-row${isSelected ? " is-selected" : ""}`;
    row.dataset.densityPortfolioCode = portfolio.code;
    row.tabIndex = 0;
    row.setAttribute("role", "button");
    row.setAttribute("aria-label", `Benchmark risk density for ${portfolio.label}`);
    row.addEventListener("click", () => selectDensityBenchmark(portfolio.code, "density", state));
    row.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      selectDensityBenchmark(portfolio.code, "density", state);
    });
    const labelCell = document.createElement("td");
    labelCell.textContent = portfolio.label;
    const eadCell = document.createElement("td");
    eadCell.append(createDensityMetricButton(portfolio, "ead", "EAD", state));
    const rwaCell = document.createElement("td");
    rwaCell.append(createDensityMetricButton(portfolio, "rwa", "RWA", state));
    const densityCell = document.createElement("td");
    densityCell.append(createDensityMetricButton(portfolio, "density", "risk density", state));
    row.append(labelCell, eadCell, rwaCell, densityCell);
    body.append(row);
  });

  table.append(body);
  tableWrap.append(table);
  section.append(header, tableWrap);
  return section;
}

function createDensityMetricButton(portfolio, metric, label, state) {
  const button = document.createElement("button");
  const isRatio = metric === "density";
  const isActive = portfolio.code === activeDensityBenchmarkPortfolio && metric === activeDensityBenchmarkMetric;
  button.type = "button";
  button.dataset.densityMetric = metric;
  button.dataset.densityPortfolioCode = portfolio.code;
  button.className = `irb-density-metric-button ${isRatio ? "is-ratio" : "is-amount"}${isActive ? " is-active" : ""}`;
  button.textContent = isRatio
    ? formatDensity(portfolio[metric])
    : formatOptionalMetric(portfolio[metric], state.selectedUnit);
  button.title = `Benchmark ${label} for ${portfolio.label}`;
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    selectDensityBenchmark(portfolio.code, metric, state);
  });
  button.addEventListener("keydown", (event) => event.stopPropagation());
  return button;
}

function selectDensityBenchmark(portfolioCode, metric, state) {
  activeDensityBenchmarkPortfolio = portfolioCode;
  activeDensityBenchmarkMetric = metric;
  const latestState = actionsRef?.getState?.() ?? state;
  const model = getIrbDensityModel(latestState, activeOutputFloorReference, portfolioCode, activeDensityYCode);
  if (model.status) {
    renderDensity(latestState);
    return;
  }
  elements.densityView?.querySelectorAll(".irb-density-row").forEach((row) => {
    row.classList.toggle("is-selected", row.dataset.densityPortfolioCode === portfolioCode);
  });
  elements.densityView?.querySelectorAll(".irb-density-metric-button").forEach((button) => {
    button.classList.toggle("is-active", (
      button.dataset.densityPortfolioCode === portfolioCode
      && button.dataset.densityMetric === metric
    ));
  });
  renderDensityFilterPanel(model, latestState);
  renderDensityBenchmarkChart(model, latestState);
}

function createDensityBenchmarkPanel(model) {
  const section = document.createElement("section");
  section.className = "irb-density-benchmark-panel";
  const chart = document.createElement("div");
  chart.id = "irb-density-benchmark-chart";
  chart.className = "irb-density-benchmark-chart";
  if (!activeDensityBenchmarkPortfolio) {
    chart.classList.add("is-empty");
    chart.textContent = "Click a density in the table to compare this portfolio with peer JSTs.";
  }
  section.append(chart);
  return section;
}

function renderDensityBenchmarkChart(model, state) {
  if (!activeDensityBenchmarkPortfolio || !window.Highcharts) {
    destroyDensityBenchmarkChart();
    return;
  }
  const container = document.querySelector("#irb-density-benchmark-chart");
  if (!container) return;
  const metric = activeDensityBenchmarkMetric;
  const isRatio = metric === "density";
  const metricLabel = metric === "ead" ? "EAD" : metric === "rwa" ? "RWA" : "Risk density";
  const benchmark = model.benchmark
    .filter((point) => Number.isFinite(point[metric]))
    .sort((left, right) => right[metric] - left[metric]);
  if (benchmark.length === 0) {
    destroyDensityBenchmarkChart();
    container.classList.add("is-empty");
    container.textContent = "No peer density is available for this portfolio and reference date.";
    return;
  }

  const chartOptions = {
    chart: { animation: false, backgroundColor: "transparent", type: "column" },
    credits: { enabled: false },
    legend: { enabled: false },
    title: { text: `${metricLabel} — ${model.selectedPortfolio.label} — ${model.referenceDate.label}`, style: { color: "#203b61", fontSize: "14px" } },
    xAxis: {
      categories: benchmark.map((point) => point.jstCode),
      labels: { style: { color: "#5f6b65", fontSize: "11px" } },
      lineColor: "#c2cac5"
    },
    yAxis: {
      min: 0,
      title: { text: isRatio ? "RWA / EAD" : metricLabel },
      labels: {
        formatter() {
          return isRatio ? `${this.value.toFixed(0)}%` : formatMetricValue(this.value, state.selectedUnit);
        },
        style: { color: "#5f6b65" }
      },
      gridLineColor: "#edf0ee"
    },
    plotOptions: {
      column: { borderRadius: 2, maxPointWidth: 54 },
      series: { animation: false, states: { inactive: { opacity: 0.45 } } }
    },
    series: [{
      data: benchmark.map((point) => ({
        color: point.jstCode === state.selectedJst ? "#0f6b5c" : "#aeb8b2",
        name: point.jstCode,
        y: isRatio ? point[metric] * 100 : point[metric]
      })),
      name: metricLabel
    }],
    tooltip: {
      pointFormatter() {
        const value = isRatio
          ? `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(this.y)} %`
          : formatMetricValue(this.y, state.selectedUnit);
        return `<b>${this.name}</b>: ${value}`;
      }
    }
  };
  if (densityBenchmarkChart?.renderTo === container) {
    densityBenchmarkChart.update(chartOptions, true, true, false);
  } else {
    destroyDensityBenchmarkChart();
    densityBenchmarkChart = window.Highcharts.chart(container, chartOptions);
  }
}

function destroyDensityBenchmarkChart() {
  densityBenchmarkChart?.destroy();
  densityBenchmarkChart = null;
}

function formatDensity(value) {
  if (!Number.isFinite(value)) return "-";
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(value * 100)} %`;
}

function createOutputFloorHero(model, state) {
  const section = document.createElement("section");
  section.className = "irb-output-floor-hero";
  const snapshot = model.selectedSnapshot;
  const copy = document.createElement("div");
  copy.className = "irb-output-floor-hero-copy";
  copy.innerHTML = `
    <span class="irb-output-floor-eyebrow">Reported fully loaded bite</span>
    <strong>${formatOptionalMetric(snapshot.fullyLoadedFloorAdjustment, state.selectedUnit)}</strong>
    <p>C04.00, row 0890 — RWA increase reported by the institution with the output floor at 72.5%. Total RWA: ${formatOptionalMetric(snapshot.totalTrea, state.selectedUnit)}. The reported bite represents ${formatPercentFromFraction(snapshot.fullyLoadedFloorAdjustmentShare)} of total RWA.</p>
  `;
  const ratios = document.createElement("div");
  ratios.className = "irb-output-floor-hero-ratios";
  ratios.append(
    createMetricCard({
      label: "Current CET1 ratio",
      value: formatPercentFromFraction(snapshot.currentCet1Ratio),
      detail: `Reported starting point — ${snapshot.referenceLabel}`
    }),
    createMetricCard({
      label: "CET1 after reported bite",
      value: formatPercentFromFraction(snapshot.fullyLoadedCet1Ratio),
      detail: `${formatSignedBasisPoints(snapshot.fullyLoadedImpactBasisPoints)} vs current CET1`,
      tone: snapshot.fullyLoadedFloorAdjustment > 0 ? "negative" : "neutral"
    }),
    createMetricCard({
      label: "Impact on CET1",
      value: formatSignedBasisPoints(snapshot.fullyLoadedImpactBasisPoints),
      detail: "Basis points vs current CET1 ratio",
      tone: snapshot.fullyLoadedImpactBasisPoints < 0 ? "negative" : "neutral"
    })
  );
  section.append(copy, ratios);
  return section;
}

function createOutputFloorScenarioBridge(model, state) {
  const section = document.createElement("section");
  section.className = "irb-output-floor-bridge";
  const snapshot = model.selectedSnapshot;

  const header = document.createElement("div");
  header.className = "irb-output-floor-bridge-header";
  header.innerHTML = `
    <div>
      <span class="irb-output-floor-section-title">Market standardisation scenario</span>
      <strong>Can the mandatory market RWA increase absorb the fully loaded bite?</strong>
    </div>
    <span>Current market RWA = C02.00 rows 0520 + 0755 + 0770. Standardised target = row 0520, column 0020.</span>
  `;
  section.append(header);

  const metrics = document.createElement("div");
  metrics.className = "irb-output-floor-bridge-metrics";
  metrics.append(
    createMetricCard({
      label: "Current market RWA",
      value: formatOptionalMetric(snapshot.currentMarketRwa, state.selectedUnit),
      detail: `${formatPercentFromFraction(snapshot.currentMarketRwaShare)} of total RWA · C02 x=0010 · 0520 plus add-ons 0755/0770 (${formatOptionalMetric(snapshot.currentMarketAddOnRwa, state.selectedUnit)})`
    }),
    createMetricCard({
      label: "Standardised market RWA",
      value: formatOptionalMetric(snapshot.standardisedMarketRwa, state.selectedUnit),
      detail: "C02.00 · x=0020 · y=0520"
    }),
    createMetricCard({
      label: "Mandatory market RWA impact",
      value: formatOptionalSignedMetric(snapshot.marketRwaImpact, state.selectedUnit),
      detail: "Standardised market RWA − current market RWA",
      tone: snapshot.marketRwaImpact > 0 ? "negative" : "neutral"
    }),
    createMetricCard({
      label: "CET1 after market standardisation",
      value: formatPercentFromFraction(snapshot.marketAdjustedCet1Ratio),
      detail: `${formatSignedBasisPoints(snapshot.marketImpactBasisPoints)} vs current CET1`,
      tone: snapshot.marketRwaImpact > 0 ? "negative" : "neutral"
    }),
    createMetricCard({
      label: snapshot.netHeadroom >= 0 ? "IRB headroom after market" : "Residual floor bite",
      value: formatOptionalMetric(snapshot.netHeadroom >= 0 ? snapshot.irbHeadroom : snapshot.residualFloorBite, state.selectedUnit),
      detail: snapshot.netHeadroom >= 0
        ? "Market impact fully absorbs the reported bite"
        : "Reported bite exceeds the mandatory market impact",
      tone: snapshot.netHeadroom >= 0 ? "positive" : "negative"
    }),
    createMetricCard({
      label: "CET1 distance between scenarios",
      value: formatSignedBasisPoints(snapshot.scenarioDifferenceBasisPoints),
      detail: "CET1 after floor bite − CET1 after market standardisation",
      tone: snapshot.netHeadroom >= 0 ? "positive" : "negative"
    })
  );
  section.append(metrics);
  return section;
}

function createOutputFloorBenchmark(model, state) {
  const section = document.createElement("section");
  section.className = "irb-output-floor-diagnostic";

  const header = document.createElement("div");
  header.className = "irb-output-floor-section-title";
  header.textContent = "Peer benchmark — fully loaded bite and market absorption";

  if (model.benchmarkRows.length === 0) {
    const notice = createIrbNotice("No comparable institution is available for this reference date.");
    section.append(header, notice);
    return section;
  }

  const table = document.createElement("table");
  table.className = "irb-output-floor-table";
  table.innerHTML = `
    <thead>
      <tr>
        <th>Institution</th>
        <th>C04 fully loaded bite</th>
        <th>Market RWA impact</th>
        <th>After market</th>
        <th>CET1 current</th>
        <th>CET1 after floor</th>
        <th>CET1 after market</th>
      </tr>
    </thead>
  `;

  const body = document.createElement("tbody");
  model.benchmarkRows.forEach((row) => {
    const tr = document.createElement("tr");
    const isSelected = row.jstCode === state.selectedJst;
    tr.className = `irb-output-floor-benchmark-row${isSelected ? " is-selected" : ""}`;
    tr.tabIndex = 0;
    tr.setAttribute("role", "button");
    tr.setAttribute("aria-label", `Select ${row.jstCode}`);
    tr.innerHTML = `
      <td>${row.jstCode}</td>
      <td>${formatOptionalMetric(row.fullyLoadedFloorAdjustment, state.selectedUnit)}</td>
      <td>${formatOptionalSignedMetric(row.marketRwaImpact, state.selectedUnit)}</td>
      <td class="${row.netHeadroom < 0 ? "is-binding" : "is-headroom"}">${row.netHeadroom >= 0
        ? `${formatOptionalMetric(row.irbHeadroom, state.selectedUnit)} headroom`
        : `${formatOptionalMetric(row.residualFloorBite, state.selectedUnit)} bite`}</td>
      <td>${formatPercentFromFraction(row.currentCet1Ratio)}</td>
      <td>${formatPercentFromFraction(row.fullyLoadedCet1Ratio)}</td>
      <td>${formatPercentFromFraction(row.marketAdjustedCet1Ratio)}</td>
    `;
    const selectInstitution = () => actionsRef?.updateSelectedJst?.(row.jstCode);
    tr.addEventListener("click", selectInstitution);
    tr.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      selectInstitution();
    });
    body.append(tr);
  });

  table.append(body);
  section.append(header, table);
  return section;
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

function createIrbNotice(message) {
  const notice = document.createElement("div");
  notice.className = "irb-empty-state";
  notice.textContent = message;
  return notice;
}

function formatPercentFromFraction(value) {
  if (!Number.isFinite(value)) return "-";
  return `${new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  }).format(value * 100)} %`;
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

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
