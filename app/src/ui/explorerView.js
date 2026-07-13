import { buildExplorerAxisSeries, EXPLORER_TARGET } from "../data/timeSeries.js?v=20260708-explorer-rename";
import { normalizeAxisCode } from "../data/core/axisCode.js";
import { getCompleteAxisColumnIndexes } from "../data/core/axisColumns.js";
import { formatContributionPercentValue, formatMetricValue } from "../data/core/formatting.js?v=20260710-bp-format";
import { getReferenceColumns, parseNumericValue } from "../data/core/referenceColumns.js";
import { getCostOfRiskYAxisBounds } from "../data/costOfRisk.js?v=20260713-stagebox-audit";
import {
  getBenchmarkLabel,
  getBenchmarkPointValue,
  getBenchmarkRows,
  getBenchmarkValueFormat,
  getExplorerSelectionsForAxisCode,
  getPeerBenchmarkJstCodes
} from "../data/explorerBenchmark.js";
import {
  buildBenchmarkChartModel,
  clearPeerDistributionBands,
  formatAnonymisedTooltipPeerLines,
  getBenchmarkLinePlotOptions,
  getBenchmarkYAxisBoundsSeries,
  renderBenchmarkEndpointLabels,
  renderPeerDistributionBands
} from "./benchmarkLineChart.js?v=20260712-anonymised-peers";
import {
  buildExplorerDisplayRows,
  getExplicitPaths,
  getExplorerAxisOptions,
  getExplorerContributionRatio,
  getExplorerRowsForTemplate,
  getExplorerTemplates,
  getHierarchyAncestorPaths,
  getParentPaths,
  getSelectedExplorerCodeForAxis,
  getVisibleExplorerAxes,
  hasExplorerSelectedCombination,
  isExplorerContributionChild,
  normalizeExplorerSeriesRow,
  normalizeHierarchyPath,
  splitHierarchyPath
} from "../data/explorer.js";
import { getLatestState } from "./appState.js";
import { primaryDark } from "./theme.js?v=20260709-flow-arrow-color";

let rerenderApp = () => {};
let updateSelectedJst = () => {};
let activeExplorerTemplateId = EXPLORER_TARGET.tableId;
let hasAppliedUrlTemplate = false;
let hasInteractedWithExplorerSelection = false;
const explorerTemplateContexts = new Map();
const explorerTemplateAxisState = {
  scroll: { left: 0, top: 0 },
  search: ""
};
const COMMON_EXPLORER_DENOMINATORS = [
  {
    label: "Total risk exposure amount",
    tableId: "C_02.00",
    selectedXCode: "0010",
    selectedYCode: "0010",
    selectedZCode: ""
  }
];
const EXPLORER_STICKY_PARENT_ROW_HEIGHT = 28;
const TEMPLATE_URL_PARAM = "template";
const AXIS_URL_PARAM = "axis";
const ROW_URL_PARAM = "row";
const COLUMN_URL_PARAM = "column";
const TAB_URL_PARAM = "tab";
const EXPLORER_AXIS_VALUES = new Set(["template", "x", "y", "z"]);
// Captured synchronously at module load, before any render can mutate the URL,
// so the originally bookmarked/refreshed selection is never lost to a premature render.
const pendingUrlAxis = getUrlAxisParam();
const pendingUrlRow = getUrlRowParam();
const pendingUrlColumn = getUrlColumnParam();
const pendingUrlTab = getUrlTabParam();
let explorerStickyFrame = 0;
let explorerContextMenu = null;
let explorerBenchmarkViewActive = false;
let explorerBenchmarkChart = null;

const elements = {
  explorerAxisButtons: [...document.querySelectorAll("[data-explorer-axis]")],
  explorerAxisCaptions: {
    template: document.querySelector('[data-axis-caption="template"]'),
    x: document.querySelector('[data-axis-caption="x"]'),
    y: document.querySelector('[data-axis-caption="y"]'),
    z: document.querySelector('[data-axis-caption="z"]')
  },
  explorerBenchmarkBack: document.querySelector("#explorer-benchmark-back"),
  explorerBenchmarkChart: document.querySelector("#explorer-benchmark-chart"),
  explorerBenchmarkTitle: document.querySelector("#explorer-benchmark-title"),
  explorerBenchmarkView: document.querySelector("#explorer-benchmark-view"),
  explorerEmpty: document.querySelector("#explorer-empty"),
  explorerTable: document.querySelector("#explorer-table"),
  explorerTableWrap: document.querySelector(".metric-table-wrap"),
  unitSelect: document.querySelector("#unit-select")
};

export function wireExplorerUi(actions, rerender) {
  rerenderApp = rerender;
  updateSelectedJst = actions.updateSelectedJst;
  elements.explorerAxisButtons.forEach((button) => {
    button.addEventListener("click", () => {
      hasInteractedWithExplorerSelection = true;
      saveExplorerScrollPosition();
      explorerBenchmarkViewActive = false;
      getActiveExplorerContext().activeAxis = button.getAttribute("data-explorer-axis") || "y";
      rerenderApp(actions.getState());
    });
  });
  elements.explorerBenchmarkBack?.addEventListener("click", hideExplorerBenchmarkView);
  elements.explorerTableWrap?.addEventListener("scroll", scheduleExplorerStickyParentsUpdate, { passive: true });
  elements.explorerTableWrap?.addEventListener("scroll", hideExplorerContextMenu, { passive: true });
  elements.explorerTable.addEventListener("click", (event) => {
    hideExplorerContextMenu();

    const toggle = event.target.closest("[data-toggle-path]");
    if (toggle) {
      toggleExplorerPath(toggle.dataset.togglePath);
      return;
    }

    const row = event.target.closest("tbody tr[data-point-code]");
    if (row) selectExplorerRow(row.dataset.pointCode, { shouldToggle: true, shouldFocus: true });
  });
  elements.explorerTable.addEventListener("contextmenu", (event) => {
    const row = event.target.closest("tbody tr[data-normalized-path]");
    if (!row) return;

    event.preventDefault();
    showExplorerContextMenu(row, event);
  });
  elements.explorerTable.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      moveExplorerSelection(event.key === "ArrowDown" ? 1 : -1);
      return;
    }

    if (event.key !== "Enter" && event.key !== " ") return;

    const row = event.target.closest("tbody tr[data-point-code]");
    if (!row) return;

    event.preventDefault();
    selectExplorerRow(row.dataset.pointCode, { shouldToggle: true, shouldFocus: true });
  });
  document.addEventListener("click", hideExplorerContextMenu);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      hideExplorerContextMenu();
    }
  });
}

function createExplorerTemplateContext() {
  return {
    activeAxis: "y",
    defaultExpandedPathsInitializedByAxis: {
      template: false,
      x: false,
      y: false,
      z: false
    },
    expandedPathsByAxis: {
      template: new Set(),
      x: new Set(),
      y: new Set(),
      z: new Set()
    },
    scrollByAxis: {
      template: { left: 0, top: 0 },
      x: { left: 0, top: 0 },
      y: { left: 0, top: 0 },
      z: { left: 0, top: 0 }
    },
    searchByAxis: {
      template: "",
      x: "",
      y: "",
      z: ""
    },
    contributionBaseByAxis: {
      template: null,
      x: null,
      y: null,
      z: null
    },
    selectedXCode: "",
    selectedYCode: "",
    selectedZCode: ""
  };
}

function getActiveExplorerTemplate() {
  const templates = getExplorerTemplates(getLatestState());
  return templates.find((template) => template.tableId === activeExplorerTemplateId) ?? templates[0] ?? {
    tableId: activeExplorerTemplateId || EXPLORER_TARGET.tableId,
    label: activeExplorerTemplateId || EXPLORER_TARGET.tableId
  };
}

function getActiveExplorerContext() {
  return getExplorerContextForTemplate(activeExplorerTemplateId);
}

function ensureActiveExplorerTemplate(state) {
  const templates = getExplorerTemplates(state);
  if (templates.length === 0) return;

  if (!hasAppliedUrlTemplate) {
    hasAppliedUrlTemplate = true;
    const urlTemplateId = findMatchingExplorerTemplateId(templates, getUrlTemplateParam());
    if (urlTemplateId) activeExplorerTemplateId = urlTemplateId;
  }

  if (!templates.some((template) => template.tableId === activeExplorerTemplateId)) {
    activeExplorerTemplateId = templates[0].tableId;
    updateUrlTemplateParam(activeExplorerTemplateId);
  }

  applyPendingUrlExplorerSelection(getActiveExplorerContext());
}

function applyPendingUrlExplorerSelection(context) {
  if (hasInteractedWithExplorerSelection) return;

  if (EXPLORER_AXIS_VALUES.has(pendingUrlAxis)) context.activeAxis = pendingUrlAxis;
  if (pendingUrlRow) context.selectedYCode = normalizeAxisCode(pendingUrlRow, "y");
  if (pendingUrlColumn) context.selectedXCode = normalizeAxisCode(pendingUrlColumn, "x");
  if (pendingUrlTab) context.selectedZCode = normalizeAxisCode(pendingUrlTab, "z");
}

function updateUrlExplorerSelectionParams() {
  const context = getActiveExplorerContext();
  const url = new URL(window.location.href);
  setOrDeleteUrlParam(url, AXIS_URL_PARAM, context.activeAxis);
  setOrDeleteUrlParam(url, ROW_URL_PARAM, context.selectedYCode);
  setOrDeleteUrlParam(url, COLUMN_URL_PARAM, context.selectedXCode);
  setOrDeleteUrlParam(url, TAB_URL_PARAM, context.selectedZCode);
  window.history.replaceState({}, "", url);
}

function setOrDeleteUrlParam(url, key, value) {
  if (value) {
    url.searchParams.set(key, value);
  } else {
    url.searchParams.delete(key);
  }
}

function getUrlAxisParam() {
  return new URLSearchParams(window.location.search).get(AXIS_URL_PARAM) ?? "";
}

function getUrlRowParam() {
  return new URLSearchParams(window.location.search).get(ROW_URL_PARAM) ?? "";
}

function getUrlColumnParam() {
  return new URLSearchParams(window.location.search).get(COLUMN_URL_PARAM) ?? "";
}

function getUrlTabParam() {
  return new URLSearchParams(window.location.search).get(TAB_URL_PARAM) ?? "";
}

function getUrlTemplateParam() {
  return new URLSearchParams(window.location.search).get(TEMPLATE_URL_PARAM) ?? "";
}

function updateUrlTemplateParam(templateId) {
  const url = new URL(window.location.href);
  if (templateId) {
    url.searchParams.set(TEMPLATE_URL_PARAM, templateId);
  } else {
    url.searchParams.delete(TEMPLATE_URL_PARAM);
  }
  window.history.replaceState({}, "", url);
}

function findMatchingExplorerTemplateId(templates, requestedTemplateId) {
  if (!requestedTemplateId) return "";

  const exactMatch = templates.find((template) => template.tableId === requestedTemplateId);
  if (exactMatch) return exactMatch.tableId;

  const normalizedRequestedTemplateId = normalizeUrlTemplateValue(requestedTemplateId);
  return templates.find((template) => (
    normalizeUrlTemplateValue(template.tableId) === normalizedRequestedTemplateId
  ))?.tableId ?? "";
}

function normalizeUrlTemplateValue(value) {
  return String(value ?? "").replace(/[\s_.-]+/g, "").toUpperCase();
}

function getExplorerContextForTemplate(tableId) {
  const contextKey = tableId || EXPLORER_TARGET.tableId;

  if (!explorerTemplateContexts.has(contextKey)) {
    explorerTemplateContexts.set(contextKey, createExplorerTemplateContext());
  }

  return explorerTemplateContexts.get(contextKey);
}

function getActiveExplorerAxis() {
  return getActiveExplorerContext().activeAxis;
}

function getActiveExplorerExpandedPaths() {
  const context = getActiveExplorerContext();
  return context.expandedPathsByAxis[context.activeAxis];
}

function ensureExplorerSelections(state) {
  const tableId = getActiveExplorerTemplate()?.tableId ?? EXPLORER_TARGET.tableId;
  ensureExplorerTemplateSelections(state, tableId);
}

function ensureExplorerTemplateSelections(state, tableId) {
  const context = getExplorerContextForTemplate(tableId);
  const axisOptions = getExplorerAxisOptions(state, tableId);
  const yCodes = axisOptions.y.codes;
  const zCodes = axisOptions.z.codes;
  const xCodes = axisOptions.x.codes;
  let selectionChanged = false;

  if (!context.selectedYCode || !yCodes.includes(context.selectedYCode)) {
    context.selectedYCode = yCodes[0] ?? "";
    selectionChanged = true;
  }

  if (!context.selectedXCode || !xCodes.includes(context.selectedXCode)) {
    context.selectedXCode = xCodes[0] ?? "";
    selectionChanged = true;
  }

  if (zCodes.length > 0 && (!context.selectedZCode || !zCodes.includes(context.selectedZCode))) {
    context.selectedZCode = zCodes[0] ?? "";
    selectionChanged = true;
  }

  if (zCodes.length === 0 && context.selectedZCode) {
    context.selectedZCode = "";
    selectionChanged = true;
  }

  if (selectionChanged) {
    ensureExplorerSelectionUsesExistingRow(state, tableId, context, axisOptions);
  }

  const visibleAxes = getVisibleExplorerAxes(axisOptions);
  if (visibleAxes.length > 0 && !visibleAxes.includes(context.activeAxis)) {
    context.activeAxis = visibleAxes[0];
  }
}

function ensureExplorerSelectionUsesExistingRow(state, tableId, context, axisOptions) {
  const rows = getExplorerRowsForTemplate(state, tableId);
  if (rows.length === 0 || hasExplorerSelectedCombination(rows, state.columns, context)) return;

  const firstRow = rows[0];
  const indexes = getCompleteAxisColumnIndexes(state.columns);
  if (!indexes) return;

  if (axisOptions.x.codes.length > 0) {
    context.selectedXCode = normalizeAxisCode(firstRow[indexes.xAxisRcCode], "x");
  }
  if (axisOptions.y.codes.length > 0) {
    context.selectedYCode = normalizeAxisCode(firstRow[indexes.yAxisRcCode], "y");
  }
  if (axisOptions.z.codes.length > 0) {
    context.selectedZCode = normalizeAxisCode(firstRow[indexes.zAxisRcCode], "z");
  }
}

export function renderExplorer(state) {
  ensureActiveExplorerTemplate(state);
  const context = getActiveExplorerContext();
  const template = getActiveExplorerTemplate();
  const templates = getExplorerTemplates(state);
  ensureExplorerSelections(state);
  if (context.activeAxis === "template") ensureAllExplorerTemplateSelections(state);
  updateUrlExplorerSelectionParams();
  elements.unitSelect.value = state.selectedUnit;
  renderExplorerAxisTabs();

  if (elements.explorerTableWrap) elements.explorerTableWrap.hidden = explorerBenchmarkViewActive;
  if (elements.explorerBenchmarkView) elements.explorerBenchmarkView.hidden = !explorerBenchmarkViewActive;

  if (explorerBenchmarkViewActive) {
    elements.explorerEmpty.hidden = true;
    elements.explorerEmpty.textContent = "";
    renderExplorerBenchmarkView(state);
    return;
  }

  destroyExplorerBenchmarkChart();

  const tableSeries = buildExplorerAxisSeries(state, {
    axis: context.activeAxis,
    selectedXCode: context.selectedXCode,
    selectedYCode: context.selectedYCode,
    selectedZCode: context.selectedZCode,
    tableId: template?.tableId,
    templateSelections: getExplorerTemplateSelections(),
    templates
  });
  elements.explorerTable.replaceChildren();

  elements.explorerEmpty.hidden = !tableSeries.status;
  elements.explorerEmpty.textContent = tableSeries.status;

  if (tableSeries.rows.length === 0 || tableSeries.dateColumns.length === 0) return;

  renderExplorerTable(tableSeries, state.selectedUnit);
  applyExplorerSelection();
  restoreExplorerScrollPosition();
}

function hideExplorerBenchmarkView() {
  if (!explorerBenchmarkViewActive) return;

  explorerBenchmarkViewActive = false;
  if (getLatestState()) rerenderApp(getLatestState());
}

function renderExplorerBenchmarkView(state) {
  const benchmark = buildExplorerBenchmark();
  if (elements.explorerBenchmarkTitle) elements.explorerBenchmarkTitle.textContent = benchmark.label;

  if (benchmark.series.length === 0 || benchmark.dates.length === 0) {
    destroyExplorerBenchmarkChart();
    if (elements.explorerBenchmarkChart) elements.explorerBenchmarkChart.textContent = "No data available for this point.";
    return;
  }

  renderExplorerBenchmarkChart(benchmark, state);
}

function renderExplorerBenchmarkChart(benchmark, state) {
  if (!elements.explorerBenchmarkChart || !window.Highcharts) return;

  const benchmarkSeries = benchmark.series.map((serie) => ({ jstCode: serie.jstCode, points: serie.values }));
  const chartModel = buildBenchmarkChartModel(benchmarkSeries, state.selectedJst, primaryDark, { displayMode: "amount", peerDisplayMode: state.peerDisplayMode });
  const series = chartModel.series;
  const isAnonymised = chartModel.peerDisplayMode === "anonymised";

  if (series.length === 0) {
    destroyExplorerBenchmarkChart();
    elements.explorerBenchmarkChart.textContent = "No data available for this point.";
    return;
  }

  const yBounds = getCostOfRiskYAxisBounds(getBenchmarkYAxisBoundsSeries(series, chartModel.distribution));

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
          renderBenchmarkEndpointLabels(this, state.selectedJst, selectExplorerBenchmarkJst);
        }
      },
      spacingRight: 128,
      type: "line"
    },
    credits: { enabled: false },
    legend: { enabled: false },
    // No reference-date callback yet: the first argument (referenceLabel) is
    // intentionally ignored, per spec ("aucun callback sur la date de
    // référence n'est implémenté à ce stade").
    plotOptions: getBenchmarkLinePlotOptions((referenceLabel, seriesName) => {
      selectExplorerBenchmarkJst(seriesName);
    }, state.selectedJst),
    series,
    subtitle: isAnonymised && chartModel.status ? { text: chartModel.status, style: { color: "#8a7248", fontSize: "10px" } } : { text: "" },
    title: { text: null },
    tooltip: {
      headerFormat: "<span style=\"font-size:11px\">{point.key:%d/%m/%Y}</span><br/>",
      pointFormatter() {
        const peerLines = isAnonymised
          ? formatAnonymisedTooltipPeerLines(chartModel.distribution, this.x, (value) => formatBenchmarkValue(value, benchmark))
          : "";
        return `<span style="color:${this.series.color}">●</span> <b>${this.series.name}</b>: ${formatBenchmarkValue(this.y, benchmark)}${peerLines ? `<br/>${peerLines}` : ""}`;
      },
      shared: false,
      split: false,
      stickOnContact: true,
      xDateFormat: "%d/%m/%Y"
    },
    xAxis: {
      labels: { style: { color: "#5f6b65" } },
      lineColor: "#c2cac5",
      lineWidth: 1,
      tickColor: "#d9dedb",
      type: "datetime"
    },
    yAxis: {
      gridLineColor: "#edf0ee",
      labels: {
        formatter() {
          return formatBenchmarkValue(this.value, benchmark);
        },
        style: { color: "#5f6b65" }
      },
      lineColor: "#aeb8b2",
      lineWidth: 1,
      max: yBounds.max,
      min: yBounds.min,
      startOnTick: false,
      endOnTick: false,
      tickAmount: 8,
      title: { text: null }
    }
  };

  if (explorerBenchmarkChart) {
    explorerBenchmarkChart.update(options, true, true, false);
  } else {
    explorerBenchmarkChart = window.Highcharts.chart(elements.explorerBenchmarkChart, options);
  }
}

function destroyExplorerBenchmarkChart() {
  if (!explorerBenchmarkChart) return;
  explorerBenchmarkChart.destroy();
  explorerBenchmarkChart = null;
}

// Reuses the same global JST_CODE update entry point as the header dropdown
// and every other benchmark-style chart in the app.
function selectExplorerBenchmarkJst(jstCode) {
  if (!jstCode || jstCode === getLatestState()?.selectedJst) return;

  updateSelectedJst(jstCode);
}

function ensureAllExplorerTemplateSelections(state) {
  getExplorerTemplates(state).forEach((template) => {
    ensureExplorerTemplateSelections(state, template.tableId);
  });
}

function getExplorerTemplateSelections(state = getLatestState()) {
  return Object.fromEntries(getExplorerTemplates(state).map((template) => {
    const context = getExplorerContextForTemplate(template.tableId);
    return [template.tableId, {
      selectedXCode: context.selectedXCode,
      selectedYCode: context.selectedYCode,
      selectedZCode: context.selectedZCode
    }];
  }));
}


function renderExplorerTable(series, selectedUnit) {
  hideExplorerContextMenu();
  const activeAxis = getActiveExplorerAxis();
  const orderedDates = [...series.dateColumns].reverse();
  const tableRows = series.rows.map(normalizeExplorerSeriesRow);
  const displayRows = buildExplorerDisplayRows(tableRows);
  const contributionBase = getExplorerContributionBase(displayRows, activeAxis);
  const propagatedContribution = getExplorerPropagatedContribution(activeAxis);
  const parentPaths = getParentPaths(tableRows);
  const nodePaths = getExplicitPaths(displayRows);
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  const tbody = document.createElement("tbody");

  expandDefaultExplorerPaths(displayRows, parentPaths);

  const descriptionHeader = document.createElement("th");
  descriptionHeader.scope = "col";
  descriptionHeader.className = "description-column";
  descriptionHeader.append(createExplorerSearchInput());
  headerRow.append(descriptionHeader);

  const codeHeader = document.createElement("th");
  codeHeader.scope = "col";
  codeHeader.className = "code-column";
  codeHeader.textContent = "Code";
  headerRow.append(codeHeader);

  orderedDates.forEach((dateColumn, index) => {
    const th = document.createElement("th");
    th.scope = "col";
    th.className = index === 0 ? "latest-column" : "";
    th.textContent = dateColumn.label;
    headerRow.append(th);
  });

  displayRows.forEach((seriesRow) => {
    const valueRow = document.createElement("tr");
    const normalizedPath = normalizeHierarchyPath(seriesRow.hierarchyPath);
    const isParent = parentPaths.has(normalizedPath);
    const contributionValues = getExplorerContributionBaseValues(seriesRow, normalizedPath, activeAxis, contributionBase, propagatedContribution);
    const isContributionChild = Boolean(contributionValues);

    if (!seriesRow.isVirtual) valueRow.dataset.pointCode = seriesRow.code;
    valueRow.dataset.axis = activeAxis;
    valueRow.dataset.hierarchyPath = seriesRow.hierarchyPath;
    valueRow.dataset.normalizedPath = normalizedPath;
    valueRow.dataset.searchText = createExplorerSearchText(seriesRow);
    valueRow.dataset.isParent = String(isParent);
    valueRow.dataset.isVirtual = String(Boolean(seriesRow.isVirtual));
    valueRow.dataset.parentPath = seriesRow.parentPath;
    valueRow.dataset.indentLevel = String(seriesRow.indentLevel ?? 0);
    valueRow.classList.toggle("is-contribution-base", Boolean(contributionBase?.row) && normalizedPath === contributionBase.path);
    valueRow.classList.toggle("is-contribution-child", isContributionChild);
    if (!seriesRow.isVirtual) {
      valueRow.setAttribute("role", "button");
      valueRow.tabIndex = 0;
    }

    const description = document.createElement("th");
    description.scope = "row";
    description.className = "description-column";
    description.style.setProperty("--indent-level", seriesRow.indentLevel ?? 0);
    description.title = seriesRow.description;
    description.append(createDescriptionContent(seriesRow, normalizedPath, isParent, {
      isDenominatorBase: Boolean(contributionBase?.row) && normalizedPath === contributionBase.path,
      ratioAxis: activeAxis
    }));
    valueRow.append(description);

    const code = document.createElement("td");
    code.className = "code-column";
    if (!seriesRow.isVirtual && seriesRow.code) {
      const codeBadge = document.createElement("span");
      codeBadge.className = "code-column-badge";
      codeBadge.textContent = seriesRow.code;
      code.append(codeBadge);
    }
    valueRow.append(code);

    const reversedValues = [...seriesRow.values].reverse();
    const reversedBaseValues = contributionValues ? [...contributionValues].reverse() : [];

    reversedValues.forEach((point, index) => {
      const td = document.createElement("td");
      td.className = index === 0 ? "latest-column" : "";
      const contributionValue = isContributionChild
        ? getExplorerContributionRatio(point.value, reversedBaseValues[index]?.value)
        : null;
      td.textContent = seriesRow.isVirtual || point.value === null
        ? "-"
        : contributionValue === null
          ? formatMetricValue(point.value, selectedUnit, seriesRow.format)
          : formatContributionPercentValue(contributionValue);
      valueRow.append(td);
    });

    tbody.append(valueRow);
  });

  thead.append(headerRow);
  elements.explorerTable.append(thead, tbody);
  applyExplorerTreeState(parentPaths, nodePaths);
}

function getExplorerContributionBase(rows, activeAxis) {
  const base = getActiveExplorerContext().contributionBaseByAxis[activeAxis];
  if (!base?.path) return null;

  const path = normalizeHierarchyPath(base.path);
  const row = rows.find((item) => normalizeHierarchyPath(item.hierarchyPath) === path);
  if (!row && base.type !== "common") {
    getActiveExplorerContext().contributionBaseByAxis[activeAxis] = null;
    return null;
  }

  return { ...base, path, row };
}

function getExplorerContributionBaseValues(seriesRow, normalizedPath, activeAxis, contributionBase, propagatedContribution) {
  if (contributionBase && isExplorerContributionChild(normalizedPath, contributionBase)) {
    return contributionBase.row?.values ?? getExplorerDenominatorValues(contributionBase, activeAxis, seriesRow.code);
  }

  if (!propagatedContribution || seriesRow.isVirtual) return null;
  if (propagatedContribution.axis === activeAxis) return null;

  const state = getLatestState();
  const tableId = getActiveExplorerTemplate()?.tableId ?? EXPLORER_TARGET.tableId;
  const indexes = getCompleteAxisColumnIndexes(state?.columns ?? []);
  const dates = getReferenceColumns(state?.columns ?? []);
  if (!state || !indexes || dates.length === 0) return null;

  const denominatorTableId = propagatedContribution.tableId || tableId;
  const selections = propagatedContribution.selections
    ? { ...propagatedContribution.selections }
    : getExplorerSelectionsForAxisCode(getActiveExplorerContext(), activeAxis, seriesRow.code);
  if (!propagatedContribution.selections) {
    selections[`selected${propagatedContribution.axis.toUpperCase()}Code`] = propagatedContribution.baseCode;
  }

  const rows = getBenchmarkRows(state, indexes, denominatorTableId, selections, state.selectedJst);
  return dates.map((dateColumn) => ({
    date: dateColumn.date,
    label: dateColumn.label,
    value: rows.length === 0
      ? null
      : rows.reduce((total, row) => total + parseNumericValue(row[dateColumn.index]), 0)
  }));
}

function getExplorerDenominatorValues(base, activeAxis, axisCode) {
  const state = getLatestState();
  const indexes = getCompleteAxisColumnIndexes(state?.columns ?? []);
  const dates = getReferenceColumns(state?.columns ?? []);
  if (!state || !indexes || dates.length === 0 || !base?.selections) return [];

  const tableId = base.tableId || getActiveExplorerTemplate()?.tableId || EXPLORER_TARGET.tableId;
  const rows = getBenchmarkRows(state, indexes, tableId, base.selections, state.selectedJst);

  return dates.map((dateColumn) => ({
    date: dateColumn.date,
    label: dateColumn.label,
    value: rows.length === 0
      ? null
      : rows.reduce((total, row) => total + parseNumericValue(row[dateColumn.index]), 0)
  }));
}

function getExplorerPropagatedContribution(activeAxis) {
  const context = getActiveExplorerContext();

  for (const axis of ["y", "x", "z"]) {
    const base = context.contributionBaseByAxis[axis];
    if (!base?.path || (!base.pointCode && !base.selections)) continue;

    const selectedCode = axis === activeAxis
      ? getSelectedExplorerCodeForActiveAxis()
      : getSelectedExplorerCodeForAxis(context, axis);
    const selectedPath = getExplorerAxisCodePath(axis, selectedCode);
    const basePath = normalizeHierarchyPath(base.path);

    if (base.type !== "common" && !selectedPath.startsWith(`${basePath} > `)) continue;

    return {
      axis,
      baseCode: base.pointCode,
      basePath,
      label: String(base.label ?? "").replaceAll(">", "/"),
      selections: base.selections,
      tableId: base.tableId,
      type: base.type
    };
  }

  return null;
}

function getExplorerAxisCodePath(axis, code) {
  const tableId = getActiveExplorerTemplate()?.tableId ?? EXPLORER_TARGET.tableId;
  if (!code) return "";

  if (axis === "x") {
    const description = getLatestState()?.dimensionMapping?.find(tableId, "x_axis_rc_code", code)?.description;
    return normalizeHierarchyPath(splitHierarchyPath(String(description ?? "").replaceAll("/", ">")).join(" > "));
  }

  const point = getLatestState()?.explorerPoints?.find((item) => (
    item.tableId === tableId
    && item.coordinate === `${axis}_axis_rc_code`
    && item.code === code
  ));

  return normalizeHierarchyPath(point?.hierarchyPath || point?.description || "");
}

function showExplorerContextMenu(row, event) {
  hideExplorerContextMenu();

  explorerContextMenu = createExplorerContextMenu(row);
  document.body.append(explorerContextMenu);

  const { innerWidth, innerHeight } = window;
  const menuRect = explorerContextMenu.getBoundingClientRect();
  const left = Math.min(event.clientX, innerWidth - menuRect.width - 8);
  const top = Math.min(event.clientY, innerHeight - menuRect.height - 8);

  explorerContextMenu.style.left = `${Math.max(8, left)}px`;
  explorerContextMenu.style.top = `${Math.max(8, top)}px`;
}

function hideExplorerContextMenu() {
  explorerContextMenu?.remove();
  explorerContextMenu = null;
}

function createExplorerContextMenu(row) {
  const menu = document.createElement("div");
  menu.className = "context-menu";
  menu.setAttribute("role", "menu");

  const isSelectableParent = Boolean(row.dataset.pointCode) && row.dataset.isParent === "true";
  if (isSelectableParent) {
    menu.append(createContextMenuButton("Use as denominator", () => {
      setExplorerContributionBase(row);
    }));

    getCommonExplorerDenominatorOptions(row).forEach((option) => {
      menu.append(createContextMenuButton(`Use ${option.label} as denominator`, () => {
        setExplorerContributionBaseFromDenominator(option);
      }));
    });
  }

  if (row.dataset.pointCode) {
    menu.append(createContextMenuButton("Benchmark", () => {
      showExplorerBenchmarkView(row);
    }));
  }

  return menu;
}

function getCommonExplorerDenominatorOptions(row) {
  if (!row.dataset.pointCode) return [];

  return COMMON_EXPLORER_DENOMINATORS.map((denominator) => ({
    ...denominator,
    scopePath: row.dataset.normalizedPath
  }));
}

function createContextMenuButton(label, action) {
  const button = document.createElement("button");
  button.type = "button";
  button.setAttribute("role", "menuitem");
  button.textContent = label;
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    hideExplorerContextMenu();
    action();
  });
  return button;
}

function copyExplorerLabel(label) {
  const text = String(label ?? "").replaceAll(">", "/");
  if (!text || !navigator.clipboard?.writeText) return;
  navigator.clipboard.writeText(text).catch(() => {});
}

function getActiveExplorerContributionSetting() {
  const context = getActiveExplorerContext();
  return context.contributionBaseByAxis[context.activeAxis];
}

function setExplorerContributionBase(row) {
  const context = getActiveExplorerContext();
  context.contributionBaseByAxis[context.activeAxis] = {
    label: row.dataset.hierarchyPath,
    path: row.dataset.normalizedPath,
    pointCode: row.dataset.pointCode,
    tableId: getActiveExplorerTemplate()?.tableId ?? EXPLORER_TARGET.tableId,
    type: "axis"
  };

  saveExplorerScrollPosition();
  if (getLatestState()) rerenderApp(getLatestState());
}

function setExplorerContributionBaseFromDenominator(denominator) {
  const context = getActiveExplorerContext();
  context.contributionBaseByAxis[context.activeAxis] = {
    label: denominator.label,
    path: denominator.scopePath,
    pointCode: "",
    selections: {
      selectedXCode: normalizeAxisCode(denominator.selectedXCode, "x"),
      selectedYCode: normalizeAxisCode(denominator.selectedYCode, "y"),
      selectedZCode: normalizeAxisCode(denominator.selectedZCode, "z")
    },
    tableId: denominator.tableId,
    type: "common"
  };

  saveExplorerScrollPosition();
  if (getLatestState()) rerenderApp(getLatestState());
}

function clearExplorerContributionBase(axis = getActiveExplorerContext().activeAxis) {
  const context = getActiveExplorerContext();
  context.contributionBaseByAxis[axis] = null;

  saveExplorerScrollPosition();
  if (getLatestState()) rerenderApp(getLatestState());
}

// Right-clicking "Benchmark" needs the row selected (the one documented
// exception to right-click no longer selecting rows), so the flag is set
// before selectExplorerRow triggers its own single rerender.
function showExplorerBenchmarkView(row) {
  explorerBenchmarkViewActive = true;
  selectExplorerRow(row.dataset.pointCode);
}

function buildExplorerBenchmark() {
  const state = getLatestState();
  const tableId = getActiveExplorerTemplate()?.tableId ?? EXPLORER_TARGET.tableId;
  const context = getActiveExplorerContext();
  const activeAxis = context.activeAxis;
  const selections = getCompleteExplorerSelectionsForBenchmark(context, activeAxis);
  const contribution = getExplorerBenchmarkContributionContext(context, activeAxis);
  const indexes = getCompleteAxisColumnIndexes(state?.columns ?? []);
  const dates = getReferenceColumns(state?.columns ?? []);
  const format = getBenchmarkValueFormat(state, tableId, context);
  const label = getBenchmarkLabel(state, tableId, context, activeAxis, getActiveExplorerTemplate()?.label);

  if (!state || !indexes || dates.length === 0) {
    return { dates: [], format, isContribution: false, label, series: [] };
  }

  const series = getPeerBenchmarkJstCodes(state).map((jstCode) => {
    const rows = getBenchmarkRows(state, indexes, tableId, selections, jstCode);
    const baseRows = contribution
      ? getBenchmarkRows(state, indexes, contribution.tableId || tableId, contribution.selections, jstCode)
      : [];

    return {
      jstCode,
      values: dates.map((dateColumn) => ({
        date: dateColumn.date,
        label: dateColumn.label,
        value: rows.length === 0
          ? null
          : getBenchmarkPointValue(rows, baseRows, dateColumn.index, Boolean(contribution))
      }))
    };
  }).filter((item) => item.values.some((point) => point.value !== null));

  return {
    dates,
    format,
    isContribution: Boolean(contribution),
    label: contribution ? `${label} / ${contribution.label}` : label,
    series
  };
}

function getCompleteExplorerSelectionsForBenchmark(context, activeAxis) {
  const selectedCode = getSelectedExplorerCodeForActiveAxis();
  return getExplorerSelectionsForAxisCode(context, activeAxis, selectedCode);
}

function getExplorerBenchmarkContributionContext(context, activeAxis) {
  const contribution = getExplorerPropagatedContribution(activeAxis);
  if (!contribution?.baseCode && !contribution?.selections) return null;

  const selections = contribution.selections
    ? { ...contribution.selections }
    : getCompleteExplorerSelectionsForBenchmark(context, activeAxis);
  if (!contribution.selections) {
    selections[`selected${contribution.axis.toUpperCase()}Code`] = contribution.baseCode;
  }
  return {
    label: contribution.label,
    selections,
    tableId: contribution.tableId
  };
}

function formatBenchmarkValue(value, benchmark) {
  return benchmark.isContribution
    ? formatContributionPercentValue(value)
    : formatMetricValue(value, getLatestState().selectedUnit, benchmark.format);
}

function createExplorerSearchInput() {
  const input = document.createElement("input");
  input.id = "explorer-search";
  input.className = "table-search-input";
  input.type = "search";
  input.placeholder = "search";
  input.setAttribute("aria-label", "Recherche");
  input.value = getActiveExplorerSearchRawValue();
  input.addEventListener("input", updateExplorerSearch);
  input.addEventListener("search", updateExplorerSearch);
  return input;
}

function updateExplorerSearch(event) {
  const context = getActiveExplorerContext();
  if (context.activeAxis === "template") {
    explorerTemplateAxisState.search = event.target.value;
  } else {
    context.searchByAxis[context.activeAxis] = event.target.value;
  }
  applyExplorerSearchFilter();
}

function renderExplorerAxisTabs() {
  const captions = getExplorerAxisCaptions();
  const ratioCaptions = getExplorerAxisRatioCaptions();
  const activeAxis = getActiveExplorerAxis();
  const tableId = getActiveExplorerTemplate()?.tableId ?? EXPLORER_TARGET.tableId;
  const axisOptions = getExplorerAxisOptions(getLatestState() ?? { columns: [], rows: [], explorerPoints: [] }, tableId);

  elements.explorerAxisButtons.forEach((button) => {
    const axis = button.getAttribute("data-explorer-axis");
    const isActive = axis === activeAxis;
    const isAvailable = Boolean(axisOptions[axis]?.isVisible);
    button.classList.toggle("is-active", isActive);
    button.hidden = !isAvailable;
    button.setAttribute("aria-selected", String(isActive));
  });

  Object.entries(elements.explorerAxisCaptions).forEach(([axis, element]) => {
    if (!element) return;

    element.title = [captions[axis], ratioCaptions[axis]].filter(Boolean).join("\n");
    element.replaceChildren(createAxisCaptionLine(captions[axis], ratioCaptions[axis], axis));
  });
}

function createAxisCaptionLine(caption, ratioCaption = "", axis = "") {
  const parts = splitAxisCaption(caption);
  const wrapper = document.createElement("span");
  wrapper.className = "axis-tab-lines";
  const line = document.createElement("span");
  line.className = "axis-tab-line axis-tab-main";

  if (parts.length === 0) {
    line.textContent = "-";
  } else {
    line.textContent = parts.join(" - ");
  }

  wrapper.append(line);

  if (ratioCaption) {
    const ratioLine = document.createElement("span");
    ratioLine.className = "axis-tab-line axis-tab-ratio";
    const ratioText = document.createElement("span");
    ratioText.textContent = ratioCaption;
    ratioLine.append(ratioText, createAxisRatioClearButton(axis));
    wrapper.append(ratioLine);
  }

  return wrapper;
}

function createAxisRatioClearButton(axis) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "axis-ratio-clear";
  button.setAttribute("aria-label", "Remove ratio");
  button.textContent = "x";
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    clearExplorerContributionBase(axis);
  });
  return button;
}

function splitAxisCaption(caption) {
  return String(caption ?? "")
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);
}

function getExplorerAxisCaptions() {
  const context = getActiveExplorerContext();
  const tableId = getActiveExplorerTemplate()?.tableId ?? EXPLORER_TARGET.tableId;
  const yPoint = getLatestState()?.explorerPoints?.find((point) => (
    point.tableId === tableId
    && point.code === context.selectedYCode
    && point.coordinate === "y_axis_rc_code"
  ));
  const zPoint = getLatestState()?.explorerPoints?.find((point) => (
    point.tableId === tableId
    && point.code === context.selectedZCode
    && point.coordinate === "z_axis_rc_code"
  ));
  const xDescription = getLatestState()?.dimensionMapping
    ?.find(tableId, "x_axis_rc_code", context.selectedXCode)
    ?.description;

  const activeTemplate = getActiveExplorerTemplate();

  return {
    template: formatExplorerAxisCaption(activeTemplate?.tableId || activeExplorerTemplateId, activeTemplate?.label || activeExplorerTemplateId),
    x: formatExplorerAxisCaption(context.selectedXCode, xDescription || (context.selectedXCode ? `X ${context.selectedXCode}` : "")),
    y: formatExplorerAxisCaption(context.selectedYCode, yPoint?.description || (context.selectedYCode ? `Y ${context.selectedYCode}` : "")),
    z: formatExplorerAxisCaption(context.selectedZCode, zPoint?.description || (context.selectedZCode ? `Z ${context.selectedZCode}` : ""))
  };
}

// Same "<CODE> - <LIBELLÉ>" convention used for the Explorer table's Code
// column: axis captions must show the same code as the row it points at.
function formatExplorerAxisCaption(code, label) {
  if (!code) return label || "";
  return label ? `${code} - ${label}` : code;
}

function getExplorerAxisRatioCaptions() {
  return Object.fromEntries(["template", "x", "y", "z"].map((axis) => {
    const contribution = ["x", "y", "z"].includes(axis)
      ? getExplorerOwnAxisContribution(axis)
      : null;
    return [axis, contribution ? `as % of ${contribution.label}` : ""];
  }));
}

function getExplorerOwnAxisContribution(axis) {
  const context = getActiveExplorerContext();
  const base = context.contributionBaseByAxis[axis];
  if (!base?.path || (!base.pointCode && !base.selections)) return null;

  const selectedCode = getSelectedExplorerCodeForAxis(context, axis);
  const selectedPath = getExplorerAxisCodePath(axis, selectedCode);
  const basePath = normalizeHierarchyPath(base.path);

  if (base.type !== "common" && !selectedPath.startsWith(`${basePath} > `)) return null;

  return {
    axis,
    baseCode: base.pointCode,
    basePath,
    label: String(base.label ?? "").replaceAll(">", "/"),
    selections: base.selections,
    tableId: base.tableId,
    type: base.type
  };
}

function getSelectedExplorerCodeForActiveAxis() {
  const context = getActiveExplorerContext();
  if (context.activeAxis === "template") return activeExplorerTemplateId;
  if (context.activeAxis === "x") return context.selectedXCode;
  if (context.activeAxis === "z") return context.selectedZCode;
  return context.selectedYCode;
}


function expandDefaultExplorerPaths(rows, parentPaths) {
  const context = getActiveExplorerContext();
  const activeAxis = context.activeAxis;
  if (context.defaultExpandedPathsInitializedByAxis[activeAxis]) return;

  const expandedPaths = context.expandedPathsByAxis[activeAxis];

  rows.forEach((row) => {
    const path = normalizeHierarchyPath(row.hierarchyPath);
    if (parentPaths.has(path) && (row.indentLevel ?? 0) < 3) {
      expandedPaths.add(path);
    }
  });

  context.defaultExpandedPathsInitializedByAxis[activeAxis] = true;
}

function createDescriptionContent(seriesRow, normalizedPath, isParent, options = {}) {
  const fragment = document.createDocumentFragment();
  const content = document.createElement("span");
  content.className = "tree-cell-content";
  const expandedPaths = getActiveExplorerExpandedPaths();
  const parts = splitHierarchyPath(seriesRow.hierarchyPath);

  createTreeConnectors(parts, normalizedPath, isParent).forEach((connector) => {
    fragment.append(connector);
  });

  if (isParent) {
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "tree-toggle";
    toggle.dataset.togglePath = normalizedPath;
    toggle.setAttribute("aria-expanded", String(expandedPaths.has(normalizedPath)));
    toggle.textContent = expandedPaths.has(normalizedPath) ? "-" : "+";
    content.append(toggle);
  } else {
    const spacer = document.createElement("span");
    spacer.className = "tree-toggle-spacer";
    content.append(spacer);
  }

  const label = document.createElement("span");
  label.className = "tree-label";
  label.textContent = seriesRow.displayDescription || seriesRow.description;
  content.append(label);

  if (options.isDenominatorBase) {
    content.append(createDenominatorBadge(options.ratioAxis));
  }

  fragment.append(content);

  return fragment;
}

function createDenominatorBadge(axis) {
  const badge = document.createElement("span");
  badge.className = "denominator-badge";

  const label = document.createElement("span");
  label.textContent = "denominator";

  const clearButton = document.createElement("button");
  clearButton.type = "button";
  clearButton.className = "axis-ratio-clear denominator-clear";
  clearButton.setAttribute("aria-label", "Remove denominator");
  clearButton.textContent = "x";
  clearButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    clearExplorerContributionBase(axis);
  });

  badge.append(label, clearButton);
  return badge;
}

function createTreeConnectors(parts, normalizedPath, isParent) {
  const expandedPaths = getActiveExplorerExpandedPaths();
  const connectors = [];

  for (let index = 0; index < parts.length - 1; index += 1) {
    const ancestorPath = normalizeHierarchyPath(parts.slice(0, index + 1).join(" > "));
    if (!expandedPaths.has(ancestorPath)) continue;

    connectors.push(createTreeConnector(index));
  }

  if (isParent && expandedPaths.has(normalizedPath)) {
    connectors.push(createTreeConnector(Math.max(0, parts.length - 1), true));
  }

  return connectors;
}

function createTreeConnector(level, startsUnderToggle = false) {
  const connector = document.createElement("span");
  connector.className = startsUnderToggle
    ? "tree-connector starts-under-toggle"
    : "tree-connector";
  connector.style.setProperty("--connector-level", level);
  connector.setAttribute("aria-hidden", "true");
  return connector;
}


function toggleExplorerPath(path) {
  const expandedPaths = getActiveExplorerExpandedPaths();
  saveExplorerScrollPosition();

  if (expandedPaths.has(path)) {
    collapseExplorerPath(path);
  } else {
    expandedPaths.add(path);
  }

  if (getLatestState()) {
    rerenderApp(getLatestState());
    return;
  }

  const rows = [...elements.explorerTable.querySelectorAll("tbody tr[data-normalized-path]")];
  applyExplorerTreeState(getParentPathsFromRenderedRows(rows), getExplicitPathsFromRenderedRows(rows));
}

function collapseExplorerPath(path) {
  const expandedPaths = getActiveExplorerExpandedPaths();

  expandedPaths.delete(path);
  [...expandedPaths].forEach((expandedPath) => {
    if (expandedPath.startsWith(`${path} > `)) expandedPaths.delete(expandedPath);
  });
}

function applyExplorerTreeState(parentPaths, explicitPaths) {
  const rows = [...elements.explorerTable.querySelectorAll("tbody tr[data-normalized-path]")];
  const expandedPaths = getActiveExplorerExpandedPaths();

  rows.forEach((row) => {
    const path = row.dataset.normalizedPath;
    const isParent = parentPaths.has(path);
    const isExpanded = expandedPaths.has(path);
    row.dataset.treeHidden = String(hasCollapsedExplicitAncestor(path, explicitPaths));
    row.classList.toggle("is-tree-parent", isParent);
    row.classList.remove("is-sticky-parent");
    row.classList.toggle("is-tree-expanded", isParent && isExpanded);
    row.classList.toggle("is-tree-collapsed", isParent && !isExpanded);
    setStickyParentPosition(row, isParent);

    const toggle = row.querySelector("[data-toggle-path]");
    if (toggle) {
      toggle.textContent = isExpanded ? "-" : "+";
      toggle.setAttribute("aria-expanded", String(isExpanded));
      toggle.setAttribute("aria-label", isExpanded ? "Replier" : "Déplier");
    }
  });

  applyExplorerSearchFilter();
}

function applyExplorerSearchFilter() {
  const rows = [...elements.explorerTable.querySelectorAll("tbody tr[data-normalized-path]")];
  const query = getActiveExplorerSearchQuery();

  if (!query) {
    rows.forEach((row) => {
      row.hidden = row.dataset.treeHidden === "true";
      row.classList.remove("is-search-match");
    });
    scheduleExplorerStickyParentsUpdate();
    return;
  }

  const visiblePaths = new Set();
  const matchedPaths = new Set();

  rows.forEach((row) => {
    if (!row.dataset.searchText?.includes(query)) return;

    const path = row.dataset.normalizedPath;
    matchedPaths.add(path);
    getHierarchyAncestorPaths(row.dataset.hierarchyPath).forEach((ancestorPath) => {
      visiblePaths.add(ancestorPath);
    });
    visiblePaths.add(path);
  });

  rows.forEach((row) => {
    const path = row.dataset.normalizedPath;
    row.hidden = !visiblePaths.has(path);
    row.classList.toggle("is-search-match", matchedPaths.has(path));
  });

  scheduleExplorerStickyParentsUpdate();
}

function getActiveExplorerSearchQuery() {
  return getActiveExplorerSearchRawValue()
    .trim()
    .toLocaleLowerCase("fr-FR");
}

function getActiveExplorerSearchRawValue() {
  const context = getActiveExplorerContext();
  return String(context.activeAxis === "template"
    ? explorerTemplateAxisState.search
    : context.searchByAxis[context.activeAxis] ?? "");
}

function createExplorerSearchText(seriesRow) {
  return [
    seriesRow.description,
    seriesRow.hierarchyPath,
    String(seriesRow.hierarchyPath ?? "").replaceAll(">", "/")
  ]
    .join(" ")
    .toLocaleLowerCase("fr-FR");
}


function setStickyParentPosition(row, isParent) {
  if (!isParent) {
    row.style.removeProperty("--sticky-top");
    return;
  }

  const headerHeight = elements.explorerTable.querySelector("thead")?.getBoundingClientRect().height ?? 0;
  const indentLevel = Number(row.dataset.indentLevel) || 0;
  row.style.setProperty("--sticky-top", `${headerHeight + (indentLevel * EXPLORER_STICKY_PARENT_ROW_HEIGHT)}px`);
}

export function scheduleExplorerStickyParentsUpdate() {
  if (explorerStickyFrame) return;

  explorerStickyFrame = requestAnimationFrame(() => {
    explorerStickyFrame = 0;
    updateExplorerStickyParents();
  });
}

function updateExplorerStickyParents() {
  if (!elements.explorerTableWrap) return;

  const rows = [...elements.explorerTable.querySelectorAll("tbody tr[data-normalized-path]")];
  const headerHeight = elements.explorerTable.querySelector("thead")?.getBoundingClientRect().height ?? 0;
  const scrollTop = elements.explorerTableWrap.scrollTop;
  const stickyStack = new Map();

  rows.forEach((row) => {
    row.classList.remove("is-sticky-parent");

    if (!row.classList.contains("is-tree-parent") || row.hidden) return;

    const indentLevel = Number(row.dataset.indentLevel) || 0;
    const activationTop = scrollTop + headerHeight + (indentLevel * EXPLORER_STICKY_PARENT_ROW_HEIGHT);

    if (row.offsetTop > activationTop) return;

    stickyStack.set(indentLevel, row);
    [...stickyStack.keys()].forEach((level) => {
      if (level > indentLevel) stickyStack.delete(level);
    });
  });

  stickyStack.forEach((row) => {
    row.classList.add("is-sticky-parent");
  });
}

function hasCollapsedExplicitAncestor(path, explicitPaths) {
  const parts = splitHierarchyPath(path);
  const expandedPaths = getActiveExplorerExpandedPaths();

  for (let index = 0; index < parts.length - 1; index += 1) {
    const ancestor = normalizeHierarchyPath(parts.slice(0, index + 1).join(" > "));
    if (explicitPaths.has(ancestor) && !expandedPaths.has(ancestor)) return true;
  }

  return false;
}

function getParentPathsFromRenderedRows(rows) {
  return getParentPaths(rows.map((row) => ({
    hierarchyPath: row.dataset.hierarchyPath
  })));
}

function getExplicitPathsFromRenderedRows(rows) {
  return new Set(rows.map((row) => row.dataset.normalizedPath).filter(Boolean));
}

function selectExplorerRow(pointCode, options = {}) {
  const { shouldFocus = false } = options;
  hasInteractedWithExplorerSelection = true;
  const context = getActiveExplorerContext();
  const activeAxis = context.activeAxis;

  if (activeAxis === "template") {

  activeExplorerTemplateId = pointCode || activeExplorerTemplateId;

  updateUrlTemplateParam(activeExplorerTemplateId);

  getActiveExplorerContext().activeAxis = "template";

}else if (activeAxis === "y") {
    context.selectedYCode = pointCode || context.selectedYCode;
  } else if (activeAxis === "z") {
    context.selectedZCode = pointCode || context.selectedZCode;
  } else {
    context.selectedXCode = pointCode || context.selectedXCode;
  }
  const selectedCode = getSelectedExplorerCodeForActiveAxis();

  if (getLatestState()) {
    saveExplorerScrollPosition();
    rerenderApp(getLatestState());
    if (shouldFocus && selectedCode) focusSelectedExplorerRow();
    return;
  }

  applyExplorerSelection();
  if (shouldFocus && selectedCode) focusSelectedExplorerRow();
}

function applyExplorerSelection() {
  const rows = [...elements.explorerTable.querySelectorAll("tbody tr")];

  rows.forEach((row) => {
    row.classList.remove(
      "is-selected",
      "is-ancestor",
      "is-family",
      "is-descendant",
      "is-selected-child",
      "is-leaf-parent-highlight",
      "is-leaf-sibling-highlight"
    );
    row.removeAttribute("aria-selected");
    row.style.removeProperty("--highlight-start");
    row.style.removeProperty("--parent-highlight-start");
  });

  const selectedCode = getSelectedExplorerCodeForActiveAxis();
  if (!selectedCode) return;

  const selectedRow = rows.find((row) => row.dataset.pointCode === selectedCode);
  const selectedPath = selectedRow?.dataset.normalizedPath || "";
  const selectedIndentLevel = Number(selectedRow?.dataset.indentLevel) || 0;
  const highlightStart = getExplorerHighlightStart(selectedIndentLevel);

  if (selectedPath) {
    const orderedAncestorPaths = getHierarchyAncestorPaths(selectedRow.dataset.hierarchyPath);
    const ancestorPaths = new Set(orderedAncestorPaths);
    const isSelectedLeaf = selectedRow.dataset.isParent !== "true";
    const parentPath = normalizeHierarchyPath(selectedRow.dataset.parentPath);

    rows.forEach((row) => {
      const path = row.dataset.normalizedPath || "";
      const isSelectedChild = path.startsWith(`${selectedPath} > `);
      row.classList.toggle("is-selected-child", isSelectedChild);
      row.classList.toggle("is-ancestor", ancestorPaths.has(path));
      if (isSelectedChild) row.style.setProperty("--highlight-start", highlightStart);
    });

    if (isSelectedLeaf && parentPath) {
      applyLeafFamilyHighlight(rows, selectedRow, parentPath);
    }
  }

  rows.forEach((row) => {
    if (row.dataset.pointCode === selectedCode) {
      row.classList.add("is-selected");
      row.setAttribute("aria-selected", "true");
      row.style.setProperty("--highlight-start", highlightStart);
    }
  });
}

function applyLeafFamilyHighlight(rows, selectedRow, parentPath) {
  const parentRow = rows.find((row) => row.dataset.normalizedPath === parentPath);
  const parentHighlightStart = getExplorerHighlightStart(Number(parentRow?.dataset.indentLevel) || 0);

  selectedRow.style.setProperty("--parent-highlight-start", parentHighlightStart);

  rows.forEach((row) => {
    const path = row.dataset.normalizedPath || "";

    if (path === parentPath) {
      row.classList.add("is-leaf-parent-highlight");
      row.style.setProperty("--highlight-start", parentHighlightStart);
      return;
    }

    if (row !== selectedRow && path.startsWith(`${parentPath} > `)) {
      row.classList.add("is-leaf-sibling-highlight");
      row.style.setProperty("--highlight-start", parentHighlightStart);
    }
  });
}

function getExplorerHighlightStart(indentLevel) {
  return `${18 + (indentLevel * 18)}px`;
}

function moveExplorerSelection(direction) {
  const rows = getVisibleSelectableExplorerRows();
  if (rows.length === 0) return;

  const focusedRow = document.activeElement?.closest?.("tbody tr[data-point-code]");
  const currentCode = getSelectedExplorerCodeForActiveAxis() || focusedRow?.dataset.pointCode || "";
  const currentIndex = rows.findIndex((row) => row.dataset.pointCode === currentCode);
  const fallbackIndex = direction > 0 ? 0 : rows.length - 1;
  const nextIndex = currentIndex === -1
    ? fallbackIndex
    : Math.min(Math.max(currentIndex + direction, 0), rows.length - 1);

  setSelectedExplorerCodeForActiveAxis(rows[nextIndex].dataset.pointCode);
  applyExplorerSelection();
  focusSelectedExplorerRow();
}

function setSelectedExplorerCodeForActiveAxis(pointCode) {
  hasInteractedWithExplorerSelection = true;
  const context = getActiveExplorerContext();

  if (context.activeAxis === "template") {
    activeExplorerTemplateId = pointCode || activeExplorerTemplateId;
    updateUrlTemplateParam(activeExplorerTemplateId);
    getActiveExplorerContext().activeAxis = "template";
  } else if (context.activeAxis === "y") {
    context.selectedYCode = pointCode;
  } else if (context.activeAxis === "z") {
    context.selectedZCode = pointCode;
  } else {
    context.selectedXCode = pointCode || EXPLORER_TARGET.xAxisRcCode;
  }
}

function getVisibleSelectableExplorerRows() {
  return [...elements.explorerTable.querySelectorAll("tbody tr[data-point-code]")]
    .filter((row) => !row.hidden);
}

function focusSelectedExplorerRow() {
  const selectedCode = getSelectedExplorerCodeForActiveAxis();
  const row = elements.explorerTable.querySelector(`tbody tr[data-point-code="${CSS.escape(selectedCode)}"]`);
  if (!row || row.hidden) return;

  row.focus({ preventScroll: true });
  row.scrollIntoView({ block: "nearest", inline: "nearest" });
}

export function saveExplorerScrollPosition() {
  if (!elements.explorerTableWrap) return;

  const context = getActiveExplorerContext();
  if (context.activeAxis === "template") {
    explorerTemplateAxisState.scroll = {
      left: elements.explorerTableWrap.scrollLeft,
      top: elements.explorerTableWrap.scrollTop
    };
    return;
  }

  context.scrollByAxis[context.activeAxis] = {
    left: elements.explorerTableWrap.scrollLeft,
    top: elements.explorerTableWrap.scrollTop
  };
}

function restoreExplorerScrollPosition() {
  if (!elements.explorerTableWrap) return;

  const context = getActiveExplorerContext();
  const position = context.activeAxis === "template"
    ? explorerTemplateAxisState.scroll
    : context.scrollByAxis[context.activeAxis] ?? { left: 0, top: 0 };
  elements.explorerTableWrap.scrollLeft = position.left;
  elements.explorerTableWrap.scrollTop = position.top;
  scheduleExplorerStickyParentsUpdate();
}
