import { buildExplorerAxisSeries, EXPLORER_TARGET } from "../data/timeSeries.js?v=20260804-lazy-index";
import { normalizeAxisCode } from "../data/core/axisCode.js";
import { createUrlState, readUrlStateParams, replaceUrlState } from "./urlState.js";
import { getCompleteAxisColumnIndexes } from "../data/core/axisColumns.js";
import { formatContributionPercentValue, formatMetricValue } from "../data/core/formatting.js?v=20260710-bp-format";
import { getReferenceColumns, parseNumericValue } from "../data/core/referenceColumns.js";
import { clampCostOfRiskSmoothingWindow } from "../data/costOfRisk.js?v=20260812-costofrisk-domain-split";
import {
  getBenchmarkLabel,
  getBenchmarkPointValue,
  getBenchmarkRows,
  getBenchmarkValueFormat,
  getExplorerSelectionsForAxisCode,
  getPeerBenchmarkJstCodes
} from "../data/explorerBenchmark.js?v=20260804-lazy-index";
import {
  destroyExplorerBenchmarkChart,
  renderExplorerBenchmarkView
} from "./explorerBenchmarkView.js?v=20260812-explorer-benchmark-view";
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
} from "../data/explorer.js?v=20260805-template-desc";
import { getLatestState } from "./appState.js";

let rerenderApp = () => {};
let setActiveModule = () => {};
let updateSelectedJst = () => {};
let activeExplorerTemplateId = EXPLORER_TARGET.tableId;
let hasAppliedUrlTemplate = false;
let hasInteractedWithExplorerSelection = false;
const explorerTemplateContexts = new Map();
const explorerTemplateAxisState = {
  scroll: { left: 0, top: 0 },
  search: ""
};
const EXPLORER_STICKY_PARENT_ROW_HEIGHT = 28;
const TEMPLATE_URL_PARAM = "template";
const AXIS_URL_PARAM = "axis";
const ROW_URL_PARAM = "row";
const COLUMN_URL_PARAM = "column";
const TAB_URL_PARAM = "tab";
// "template" used to be a fourth browsable axis (clicking the template tab
// turned the main table into a list of templates); that mode is retired in
// favor of the always-visible template list in the context panel, so it's
// no longer a value the active axis can resolve to — including from a
// bookmarked/refreshed URL that still has an old ?axis=template.
const EXPLORER_AXIS_VALUES = new Set(["x", "y", "z"]);
// Captured synchronously at module load, before any render can mutate the URL,
// so the originally bookmarked/refreshed selection is never lost to a premature render.
const pendingUrlAxis = getUrlAxisParam();
const pendingUrlRow = getUrlRowParam();
const pendingUrlColumn = getUrlColumnParam();
const pendingUrlTab = getUrlTabParam();
let explorerStickyFrame = 0;
let explorerBenchmarkViewActive = false;
let explorerBenchmarkSmoothingWindow = 1;
let explorerBenchmarkLastSmoothingWindow = 4;
let explorerBenchmarkFocusYAxis = false;
let explorerReturnTarget = null;
let shouldFocusOpenedExplorerPoint = false;
let explorerCellDrag = null;
let explorerCellRanges = [];
let explorerCellRangePreview = null;
let suppressNextExplorerRowClick = false;
let explorerContextTopic = "";
let explorerPeerSelectionActions = null;

const elements = {
  explorerAxisButtons: [...document.querySelectorAll("[data-explorer-axis]")],
  explorerAxisCaptions: {
    template: document.querySelector('[data-axis-caption="template"]'),
    x: document.querySelector('[data-axis-caption="x"]'),
    y: document.querySelector('[data-axis-caption="y"]'),
    z: document.querySelector('[data-axis-caption="z"]')
  },
  explorerBenchmarkChart: document.querySelector("#explorer-benchmark-chart"),
  explorerBenchmarkClose: document.querySelector("#explorer-benchmark-close"),
  explorerBenchmarkView: document.querySelector("#explorer-benchmark-view"),
  explorerContextPanel: document.querySelector("#explorer-context-panel"),
  explorerEmpty: document.querySelector("#explorer-empty"),
  explorerMainPane: document.querySelector(".explorer-main-pane"),
  explorerTable: document.querySelector("#explorer-table"),
  explorerTableWrap: document.querySelector(".metric-table-wrap"),
  unitSelect: document.querySelector("#unit-select")
};

export function wireExplorerUi(actions, rerender) {
  rerenderApp = rerender;
  setActiveModule = actions.setActiveModule;
  updateSelectedJst = actions.updateSelectedJst;
  elements.explorerAxisButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (button.disabled) return;

      hasInteractedWithExplorerSelection = true;
      saveExplorerScrollPosition();
      explorerBenchmarkViewActive = false;
      clearExplorerContextTopic();
      getActiveExplorerContext().activeAxis = button.getAttribute("data-explorer-axis") || "y";
      rerenderApp(actions.getState());
    });
  });
  elements.explorerBenchmarkClose?.addEventListener("click", hideExplorerBenchmarkView);
  elements.explorerTableWrap?.addEventListener("scroll", scheduleExplorerStickyParentsUpdate, { passive: true });
  elements.explorerTable.addEventListener("pointerdown", startExplorerCellRangeSelection);
  elements.explorerTable.addEventListener("pointerover", updateExplorerCellRangeSelection);
  elements.explorerTable.addEventListener("click", (event) => {
    if (suppressNextExplorerRowClick) {
      suppressNextExplorerRowClick = false;
      event.preventDefault();
      return;
    }

    const toggle = event.target.closest("[data-toggle-path]");
    if (toggle) {
      toggleExplorerPath(toggle.dataset.togglePath);
      return;
    }

    const row = event.target.closest("tbody tr[data-point-code]");
    if (row) {
      clearExplorerContextTopic();
      const cell = event.target.closest("td[data-explorer-cell-column]");
      const cellColumnIndex = cell ? Number(cell.dataset.explorerCellColumn) : 0;
      selectExplorerRow(row.dataset.pointCode, { shouldToggle: true, shouldFocus: true, cellColumnIndex });
    }
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
    clearExplorerContextTopic();
    selectExplorerRow(row.dataset.pointCode, { shouldToggle: true, shouldFocus: true });
  });
  document.addEventListener("pointerup", finishExplorerCellRangeSelection, true);
}

export function showExplorerPeerSelection(actions) {
  explorerPeerSelectionActions = actions;
  explorerContextTopic = "peer-selection";
  renderExplorerContextPanel(actions.getState());
}

function clearExplorerContextTopic() {
  explorerContextTopic = "";
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
    selectedZCode: "",
    // Which date column (0 = most recent) carries the strong highlight
    // within the selected row — see applyExplorerSelection. Defaults to the
    // first visible column until the user clicks a specific cell.
    selectedCellColumnIndex: 0
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
  const url = createUrlState();
  setOrDeleteUrlParam(url, AXIS_URL_PARAM, context.activeAxis);
  setOrDeleteUrlParam(url, ROW_URL_PARAM, context.selectedYCode);
  setOrDeleteUrlParam(url, COLUMN_URL_PARAM, context.selectedXCode);
  setOrDeleteUrlParam(url, TAB_URL_PARAM, context.selectedZCode);
  replaceExplorerUrlState(url);
}

function setOrDeleteUrlParam(url, key, value) {
  if (value) {
    url.searchParams.set(key, value);
  } else {
    url.searchParams.delete(key);
  }
}

function getUrlAxisParam() {
  return readUrlStateParams().get(AXIS_URL_PARAM) ?? "";
}

function getUrlRowParam() {
  return readUrlStateParams().get(ROW_URL_PARAM) ?? "";
}

function getUrlColumnParam() {
  return readUrlStateParams().get(COLUMN_URL_PARAM) ?? "";
}

function getUrlTabParam() {
  return readUrlStateParams().get(TAB_URL_PARAM) ?? "";
}

function getUrlTemplateParam() {
  return readUrlStateParams().get(TEMPLATE_URL_PARAM) ?? "";
}

function updateUrlTemplateParam(templateId) {
  const url = createUrlState();
  if (templateId) {
    url.searchParams.set(TEMPLATE_URL_PARAM, templateId);
  } else {
    url.searchParams.delete(TEMPLATE_URL_PARAM);
  }
  replaceExplorerUrlState(url);
}

function replaceExplorerUrlState(url) {
  replaceUrlState(url);
}

// Switches the active template from the context panel's template list.
// Deliberately does not touch context.activeAxis: each template keeps its
// own remembered row/column/tab selection (see getExplorerContextForTemplate),
// so switching templates here just swaps which template's data the main
// table shows, without forcing it into any particular browsing mode.
function setActiveExplorerTemplate(tableId) {
  if (!tableId || tableId === activeExplorerTemplateId) return;

  hasInteractedWithExplorerSelection = true;
  activeExplorerTemplateId = tableId;
  updateUrlTemplateParam(activeExplorerTemplateId);
  if (getLatestState()) {
    saveExplorerScrollPosition();
    rerenderApp(getLatestState());
  }
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
  clearExplorerCellRangeSelection();
  ensureActiveExplorerTemplate(state);
  const context = getActiveExplorerContext();
  const template = getActiveExplorerTemplate();
  const templates = getExplorerTemplates(state);
  ensureExplorerSelections(state);
  updateUrlExplorerSelectionParams();
  elements.unitSelect.value = state.selectedUnit;
  renderExplorerAxisTabs();
  renderExplorerContextPanel(state);

  // The benchmark chart no longer replaces the table: it splits the main
  // pane the same way Cost of Risk's tab panels do — data on top, the
  // time-series chart in a fixed band underneath (see .has-benchmark).
  if (elements.explorerMainPane) elements.explorerMainPane.classList.toggle("has-benchmark", explorerBenchmarkViewActive);
  if (elements.explorerBenchmarkView) elements.explorerBenchmarkView.hidden = !explorerBenchmarkViewActive;

  // The table keeps rendering/updating even while the benchmark chart is
  // open (selection changes and the chart's own JST callback both need to
  // keep reaching it) — only the benchmark chart itself is torn down once
  // it's actually closed.
  if (explorerBenchmarkViewActive) {
    const benchmark = buildExplorerBenchmark();
    // No on-chart title: the context panel's selection summary card already
    // describes the selection, so the chart itself just shows the plot.
    renderExplorerBenchmarkView({
      benchmark,
      container: elements.explorerBenchmarkChart,
      focusYAxis: explorerBenchmarkFocusYAxis,
      formatValue: (value) => formatBenchmarkValue(value, benchmark),
      onClearSmoothing: clearExplorerBenchmarkSmoothing,
      onChangeSmoothing: updateExplorerBenchmarkSmoothingWindow,
      onSelectJst: selectExplorerBenchmarkJst,
      onToggleYAxisFocus: toggleExplorerBenchmarkFocusYAxis,
      peerDisplayMode: state.peerDisplayMode,
      selectedJst: state.selectedJst,
      smoothingWindow: explorerBenchmarkSmoothingWindow
    });
  } else {
    destroyExplorerBenchmarkChart();
  }

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
  if (shouldFocusOpenedExplorerPoint) {
    shouldFocusOpenedExplorerPoint = false;
    revealSelectedExplorerRowPath();
    applyExplorerSelection();
    focusSelectedExplorerRow();
  } else {
    restoreExplorerScrollPosition();
  }
}

export function openExplorerPoint({
  returnTarget = null,
  tableId,
  xCode = "",
  yCode = "",
  zCode = ""
} = {}) {
  if (!tableId) return false;

  hasInteractedWithExplorerSelection = true;
  explorerBenchmarkViewActive = false;
  explorerReturnTarget = returnTarget?.module ? returnTarget : null;
  activeExplorerTemplateId = tableId;
  updateUrlTemplateParam(activeExplorerTemplateId);

  const context = getExplorerContextForTemplate(activeExplorerTemplateId);
  context.activeAxis = yCode ? "y" : xCode ? "x" : zCode ? "z" : "y";
  if (xCode) context.selectedXCode = normalizeAxisCode(xCode, "x");
  if (yCode) context.selectedYCode = normalizeAxisCode(yCode, "y");
  if (zCode) context.selectedZCode = normalizeAxisCode(zCode, "z");

  shouldFocusOpenedExplorerPoint = true;
  updateUrlExplorerSelectionParams();
  return true;
}

function hideExplorerBenchmarkView() {
  if (!explorerBenchmarkViewActive) return;

  explorerBenchmarkViewActive = false;
  if (getLatestState()) rerenderApp(getLatestState());
}

// Same smoothing/focus controls as every Cost of Risk benchmark chart (see
// costOfRiskChartUtils.js's badges) so this reads as the exact same chart.
function updateExplorerBenchmarkSmoothingWindow(value) {
  const nextWindow = value === "toggle"
    ? (explorerBenchmarkSmoothingWindow > 1 ? 1 : explorerBenchmarkLastSmoothingWindow)
    : clampCostOfRiskSmoothingWindow(value);
  if (explorerBenchmarkSmoothingWindow === nextWindow) return;
  explorerBenchmarkSmoothingWindow = nextWindow;
  if (nextWindow > 1) explorerBenchmarkLastSmoothingWindow = nextWindow;
  if (getLatestState()) rerenderApp(getLatestState());
}

function clearExplorerBenchmarkSmoothing() {
  if (explorerBenchmarkSmoothingWindow <= 1) return;
  updateExplorerBenchmarkSmoothingWindow(1);
}

function toggleExplorerBenchmarkFocusYAxis() {
  explorerBenchmarkFocusYAxis = !explorerBenchmarkFocusYAxis;
  if (getLatestState()) rerenderApp(getLatestState());
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


// Flags rows that can never have data given the OTHER axis's current
// selection (see assets/ITS_impossible_x_y.csv) — e.g. browsing rows (y)
// while a column (x) is selected, and this row's y-code is incompatible
// with that x-code. Purely visual: the row stays fully selectable, and
// selecting it is what drives the symmetric check on the other axis next
// time that axis is browsed.
function isExplorerRowAxisImpossible(seriesRow, activeAxis) {
  if (seriesRow.isVirtual || !seriesRow.code) return false;
  if (activeAxis !== "x" && activeAxis !== "y") return false;

  const combinations = getLatestState()?.impossibleXYCombinations;
  if (!combinations) return false;

  const tableId = getActiveExplorerTemplate()?.tableId ?? EXPLORER_TARGET.tableId;
  const context = getActiveExplorerContext();

  if (activeAxis === "y") {
    if (!context.selectedXCode) return false;
    return combinations.isImpossible(tableId, context.selectedXCode, seriesRow.code);
  }

  if (!context.selectedYCode) return false;
  return combinations.isImpossible(tableId, seriesRow.code, context.selectedYCode);
}

// A hierarchy branch is unavailable when none of its terminal descendants
// can be combined with the selection made on the other axis. Propagating the
// state from compatible leaves keeps this recursive for any tree depth while
// preserving selectable parent rows and their expand/collapse controls.
function getExplorerAxisImpossiblePaths(rows, activeAxis, parentPaths) {
  const compatibleAncestorPaths = new Set();
  const leafImpossibleByPath = new Map();

  rows.forEach((row) => {
    const path = normalizeHierarchyPath(row.hierarchyPath);
    if (!path || parentPaths.has(path)) return;

    const isImpossible = isExplorerRowAxisImpossible(row, activeAxis);
    leafImpossibleByPath.set(path, isImpossible);
    if (isImpossible) return;

    compatibleAncestorPaths.add(path);
    getHierarchyAncestorPaths(row.hierarchyPath).forEach((ancestorPath) => {
      compatibleAncestorPaths.add(ancestorPath);
    });
  });

  return new Map(rows.map((row) => {
    const path = normalizeHierarchyPath(row.hierarchyPath);
    const isImpossible = parentPaths.has(path)
      ? !compatibleAncestorPaths.has(path)
      : Boolean(leafImpossibleByPath.get(path));
    return [path, isImpossible];
  }));
}

function renderExplorerTable(series, selectedUnit) {
  clearExplorerCellRangeSelection();
  const activeAxis = getActiveExplorerAxis();
  const orderedDates = [...series.dateColumns].reverse();
  const tableRows = series.rows.map(normalizeExplorerSeriesRow);
  const displayRows = buildExplorerDisplayRows(tableRows);
  const contributionBase = getExplorerContributionBase(displayRows, activeAxis);
  const propagatedContribution = getExplorerPropagatedContribution(activeAxis);
  const parentPaths = getParentPaths(tableRows);
  const nodePaths = getExplicitPaths(displayRows);
  const axisImpossibleByPath = getExplorerAxisImpossiblePaths(displayRows, activeAxis, parentPaths);
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

  displayRows.forEach((seriesRow, rowIndex) => {
    const valueRow = document.createElement("tr");
    const normalizedPath = normalizeHierarchyPath(seriesRow.hierarchyPath);
    const isParent = parentPaths.has(normalizedPath);
    const contributionValues = getExplorerContributionBaseValues(seriesRow, normalizedPath, activeAxis, contributionBase, propagatedContribution);
    const isContributionChild = Boolean(contributionValues);
    const isAxisImpossible = Boolean(axisImpossibleByPath.get(normalizedPath));

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
    valueRow.classList.toggle("is-axis-impossible", isAxisImpossible);
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
      const displayValue = contributionValue === null ? point.value : contributionValue;
      if (isAxisImpossible && !isParent && index === 0) {
        td.textContent = activeAxis === "y"
          ? "Not compatible with the current column selection"
          : "Not compatible with the current row selection";
        td.classList.add("is-axis-impossible-hint");
      } else {
        td.textContent = isAxisImpossible
          ? ""
          : seriesRow.isVirtual || point.value === null
            ? "-"
            : contributionValue === null
              ? formatMetricValue(point.value, selectedUnit, seriesRow.format)
              : formatContributionPercentValue(contributionValue);
      }
      if (!seriesRow.isVirtual && Number.isFinite(displayValue)) {
        td.dataset.explorerCellValue = String(displayValue);
        td.dataset.explorerCellRow = String(rowIndex);
        td.dataset.explorerCellColumn = String(index);
        td.dataset.explorerCellKind = contributionValue === null ? "amount" : "ratio";
        td.dataset.explorerCellDate = orderedDates[index]?.label ?? "";
        td.dataset.explorerCellLabel = seriesRow.description || seriesRow.code || "";
      }
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

function startExplorerCellRangeSelection(event) {
  if (event.button !== 0) return;

  const cell = getExplorerValueCell(event.target);
  if (!cell) return;

  explorerCellDrag = {
    isAdditive: event.metaKey || event.ctrlKey,
    currentCell: cell,
    hasMoved: false,
    pointerId: event.pointerId,
    startCell: cell
  };
  suppressNextExplorerRowClick = false;
}

function updateExplorerCellRangeSelection(event) {
  if (!explorerCellDrag) return;

  const cell = getExplorerValueCell(event.target);
  if (!cell || cell === explorerCellDrag.currentCell) return;

  explorerCellDrag.currentCell = cell;
  explorerCellDrag.hasMoved = true;
  applyExplorerCellRangeSelection(explorerCellDrag.startCell, cell);
  event.preventDefault();
}

function finishExplorerCellRangeSelection() {
  if (!explorerCellDrag) return;

  if (explorerCellDrag.hasMoved) {
    commitExplorerCellRangeSelection();
    suppressNextExplorerRowClick = true;
  } else if (explorerCellDrag.isAdditive) {
    applyExplorerCellRangeSelection(explorerCellDrag.startCell, explorerCellDrag.startCell);
    commitExplorerCellRangeSelection();
    suppressNextExplorerRowClick = true;
  } else {
    clearExplorerCellRangeSelection();
  }

  explorerCellDrag = null;
}

function getExplorerValueCell(target) {
  return target?.closest?.("td[data-explorer-cell-value]");
}

function applyExplorerCellRangeSelection(startCell, endCell) {
  if (!explorerCellDrag?.isAdditive) explorerCellRanges = [];

  const cells = getExplorerCellRangeCells(startCell, endCell);
  if (cells.length === 0) {
    explorerCellRangePreview = null;
    renderExplorerCellRangeHighlights();
    renderExplorerContextPanel(getLatestState());
    return;
  }

  explorerCellRangePreview = buildExplorerCellRangeSummary(cells);
  renderExplorerCellRangeHighlights();
  renderExplorerContextPanel(getLatestState());
}

function commitExplorerCellRangeSelection() {
  if (!explorerCellRangePreview) return;

  if (explorerCellDrag?.isAdditive) {
    explorerCellRanges = [...explorerCellRanges, explorerCellRangePreview];
  } else {
    explorerCellRanges = [explorerCellRangePreview];
  }
  explorerCellRangePreview = null;
  renderExplorerCellRangeHighlights();
  renderExplorerContextPanel(getLatestState());
}

function clearExplorerCellRangeSelection() {
  clearExplorerCellRangeHighlight();
  explorerCellRanges = [];
  explorerCellRangePreview = null;
}

function clearExplorerCellRangeHighlight() {
  elements.explorerTable
    ?.querySelectorAll("td.is-cell-range-selected")
    .forEach((cell) => cell.classList.remove("is-cell-range-selected"));
}

function renderExplorerCellRangeHighlights() {
  clearExplorerCellRangeHighlight();
  getActiveExplorerCellRanges().forEach((range) => {
    range.cells.forEach((cell) => cell.classList.add("is-cell-range-selected"));
  });
}

function getExplorerCellRangeCells(startCell, endCell) {
  const start = getExplorerCellCoordinates(startCell);
  const end = getExplorerCellCoordinates(endCell);
  if (!start || !end) return [];

  const rowDelta = Math.abs(end.row - start.row);
  const columnDelta = Math.abs(end.column - start.column);
  const mode = start.row === end.row || columnDelta >= rowDelta ? "row" : "column";
  const rowMin = Math.min(start.row, end.row);
  const rowMax = Math.max(start.row, end.row);
  const columnMin = Math.min(start.column, end.column);
  const columnMax = Math.max(start.column, end.column);

  return [...elements.explorerTable.querySelectorAll("td[data-explorer-cell-value]")]
    .filter((cell) => {
      const row = cell.closest("tr");
      if (!row || row.hidden) return false;

      const coordinates = getExplorerCellCoordinates(cell);
      if (!coordinates) return false;

      return mode === "row"
        ? coordinates.row === start.row && coordinates.column >= columnMin && coordinates.column <= columnMax
        : coordinates.column === start.column && coordinates.row >= rowMin && coordinates.row <= rowMax;
    })
    .sort((left, right) => (
      mode === "row"
        ? Number(left.dataset.explorerCellColumn) - Number(right.dataset.explorerCellColumn)
        : Number(left.dataset.explorerCellRow) - Number(right.dataset.explorerCellRow)
    ));
}

function getExplorerCellCoordinates(cell) {
  const row = Number(cell?.dataset?.explorerCellRow);
  const column = Number(cell?.dataset?.explorerCellColumn);
  if (!Number.isFinite(row) || !Number.isFinite(column)) return null;

  return { column, row };
}

function buildExplorerCellRangeSummary(cells) {
  const values = cells
    .map((cell) => Number(cell.dataset.explorerCellValue))
    .filter(Number.isFinite);
  const firstCell = cells[0];
  const lastCell = cells[cells.length - 1];
  const kinds = new Set(cells.map((cell) => cell.dataset.explorerCellKind));
  const firstCoordinates = getExplorerCellCoordinates(firstCell);
  const lastCoordinates = getExplorerCellCoordinates(lastCell);
  const orientation = firstCoordinates?.row === lastCoordinates?.row ? "row" : "column";

  return {
    cells,
    count: values.length,
    endDate: lastCell?.dataset.explorerCellDate || "",
    endLabel: lastCell?.dataset.explorerCellLabel || "",
    kind: kinds.size === 1 ? [...kinds][0] : "mixed",
    orientation,
    startDate: firstCell?.dataset.explorerCellDate || "",
    startLabel: firstCell?.dataset.explorerCellLabel || "",
    sum: values.reduce((total, value) => total + value, 0)
  };
}

function getActiveExplorerCellRanges() {
  return [...explorerCellRanges, explorerCellRangePreview].filter(Boolean);
}

function buildExplorerCellRangeAggregate() {
  const ranges = getActiveExplorerCellRanges();
  if (ranges.length === 0) return null;

  const kinds = new Set(ranges.map((range) => range.kind));
  const count = ranges.reduce((total, range) => total + range.count, 0);
  if (count === 0) return null;

  return {
    count,
    endDate: ranges.at(-1)?.endDate || "",
    endLabel: ranges.at(-1)?.endLabel || "",
    kind: kinds.size === 1 ? [...kinds][0] : "mixed",
    orientation: ranges.length === 1 ? ranges[0].orientation : "multiple",
    rangeCount: ranges.length,
    startDate: ranges[0]?.startDate || "",
    startLabel: ranges[0]?.startLabel || "",
    sum: ranges.reduce((total, range) => total + range.sum, 0)
  };
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

function clearExplorerContributionBase(axis = getActiveExplorerContext().activeAxis) {
  const context = getActiveExplorerContext();
  context.contributionBaseByAxis[axis] = null;

  saveExplorerScrollPosition();
  if (getLatestState()) rerenderApp(getLatestState());
}

// Triggered from the context panel's Benchmark button: it always benchmarks
// whatever is already selected on the active axis, so there's no row to pass in.
function showExplorerBenchmarkView() {
  hasInteractedWithExplorerSelection = true;
  saveExplorerScrollPosition();
  explorerBenchmarkViewActive = true;
  if (getLatestState()) rerenderApp(getLatestState());
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
  const context = getActiveExplorerContext();
  const axisCodes = { x: context.selectedXCode, y: context.selectedYCode, z: context.selectedZCode };
  const tableId = getActiveExplorerTemplate()?.tableId ?? EXPLORER_TARGET.tableId;
  const axisOptions = getExplorerAxisOptions(getLatestState() ?? { columns: [], rows: [], explorerPoints: [] }, tableId);

  elements.explorerAxisButtons.forEach((button) => {
    const axis = button.getAttribute("data-explorer-axis");
    const isActive = axis === activeAxis;
    const isAvailable = Boolean(axisOptions[axis]?.isVisible);
    button.classList.toggle("is-active", isActive);
    button.classList.toggle("is-disabled", !isAvailable);
    button.disabled = !isAvailable;
    button.hidden = false;
    button.setAttribute("aria-disabled", String(!isAvailable));
    button.setAttribute("aria-selected", String(isActive && isAvailable));
  });

  Object.entries(elements.explorerAxisCaptions).forEach(([axis, element]) => {
    if (!element) return;

    if (axis === "template") {
      const activeTemplate = getActiveExplorerTemplate();
      element.title = activeTemplate?.label || activeExplorerTemplateId;
      element.replaceChildren(createExplorerTemplateCaption(activeTemplate));
      return;
    }

    element.title = [captions[axis], ratioCaptions[axis]].filter(Boolean).join("\n");
    element.replaceChildren(createAxisCaptionLine(axisCodes[axis], ratioCaptions[axis], axis));
  });
}

// The template slot is a static title, not a switchable tab like row/column/
// tab (see index.html's explorer-template-static), so it's plain typography
// (big code, lighter description) rather than a bordered axis-tab card.
function createExplorerTemplateCaption(activeTemplate) {
  const wrapper = document.createElement("span");
  wrapper.className = "explorer-template-static-lines";

  const code = document.createElement("span");
  code.className = "explorer-template-static-code";
  code.textContent = activeTemplate?.tableId || activeExplorerTemplateId || "-";
  wrapper.append(code);

  if (activeTemplate?.description) {
    const description = document.createElement("span");
    description.className = "explorer-template-static-description";
    description.textContent = activeTemplate.description;
    wrapper.append(description);
  }

  return wrapper;
}

function renderExplorerContextPanel(state) {
  if (!elements.explorerContextPanel) return;

  if (explorerContextTopic === "peer-selection") {
    renderExplorerPeerSelectionPanel(state);
    return;
  }

  const activeTemplate = getActiveExplorerTemplate();
  const article = document.createElement("article");
  article.className = "explorer-context-article";

  if (explorerReturnTarget?.module) {
    article.append(createExplorerReturnButton(explorerReturnTarget));
  }

  // Simplified on purpose: the context panel always shows just the
  // selection summary card and the template list, whether or not the
  // benchmark chart is open — opening it must not replace this panel with
  // anything else (see createExplorerSelectionSummaryCard's Benchmark
  // button, which just toggles explorerBenchmarkViewActive in place).
  article.append(createExplorerSelectionSummaryCard());
  article.append(createExplorerTemplateList(getExplorerTemplates(state), activeTemplate?.tableId ?? activeExplorerTemplateId));
  elements.explorerContextPanel.replaceChildren(article);
}

function renderExplorerPeerSelectionPanel(state) {
  const jstOptions = state?.jstOptions ?? [];
  const selectedPeers = new Set((state?.peerJstCodes ?? jstOptions) ?? []);
  const selectedCount = jstOptions.filter((jstCode) => selectedPeers.has(jstCode)).length;

  const article = document.createElement("article");
  article.className = "explorer-context-article cost-of-risk-peer-selection-panel";

  const eyebrow = document.createElement("div");
  eyebrow.className = "explorer-context-eyebrow";
  eyebrow.textContent = "Benchmark peers";

  const title = document.createElement("h2");
  title.className = "explorer-context-title";
  title.textContent = "Peers";

  const lead = document.createElement("p");
  lead.className = "explorer-context-lead";
  lead.textContent = jstOptions.length > 0
    ? `${selectedCount} of ${jstOptions.length} JST selected for benchmark views. Changes are applied immediately.`
    : "Load a dataset to choose the JST included in benchmark views.";

  article.append(eyebrow, title, lead);

  if (jstOptions.length > 0) {
    article.append(renderExplorerPeerDisplayControl(state));

    const actions = document.createElement("div");
    actions.className = "cost-of-risk-peer-selection-actions";
    actions.append(
      createExplorerPeerSelectionButton("Select all", () => updateExplorerPeerSelection(jstOptions)),
      createExplorerPeerSelectionButton("Deselect all", () => updateExplorerPeerSelection([]))
    );

    const list = document.createElement("div");
    list.className = "cost-of-risk-peer-selection-list";
    jstOptions.forEach((jstCode) => {
      const row = document.createElement("label");
      row.className = "cost-of-risk-peer-selection-row";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = jstCode;
      checkbox.checked = selectedPeers.has(jstCode);
      checkbox.addEventListener("change", (event) => {
        const nextPeers = new Set(selectedPeers);
        if (event.target.checked) {
          nextPeers.add(jstCode);
        } else {
          nextPeers.delete(jstCode);
        }
        updateExplorerPeerSelection([...nextPeers]);
      });

      const label = document.createElement("span");
      label.textContent = jstCode;
      row.append(checkbox, label);
      list.append(row);
    });

    article.append(actions, list);
  }

  article.append(createExplorerContextItem("How it is used", [
    "The selected JST always remains visible in benchmark charts.",
    "The peers selected here define the comparison population for explicit peer curves and anonymized percentile distributions.",
    "Leaving no peer selected means the benchmark population is empty until peers are selected again."
  ].join("\n")));

  const hint = document.createElement("p");
  hint.className = "explorer-context-hint";
  hint.textContent = "Use Select all or individual checkboxes to adjust the peer set; charts refresh as soon as the selection changes.";
  article.append(hint);

  elements.explorerContextPanel.replaceChildren(article);
}

function renderExplorerPeerDisplayControl(state) {
  const activeMode = state?.peerDisplayMode === "anonymised" ? "anonymised" : "explicit";
  const block = document.createElement("section");
  block.className = "cost-of-risk-peer-display-panel";

  const label = document.createElement("div");
  label.className = "cost-of-risk-peer-display-label";
  label.textContent = "Display";

  const group = document.createElement("div");
  group.className = "cost-of-risk-peer-display-group";
  group.setAttribute("role", "radiogroup");
  group.setAttribute("aria-label", "Peer display mode");
  group.append(
    createExplorerPeerDisplayOption("Explicit", "explicit", activeMode),
    createExplorerPeerDisplayOption("Anonymized", "anonymised", activeMode)
  );

  block.append(label, group);
  return block;
}

function createExplorerPeerDisplayOption(label, mode, activeMode) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "cost-of-risk-peer-display-option";
  button.classList.toggle("is-active", mode === activeMode);
  button.dataset.peerDisplayMode = mode;
  button.setAttribute("role", "radio");
  button.setAttribute("aria-checked", String(mode === activeMode));
  button.textContent = label;
  button.addEventListener("click", () => updateExplorerPeerDisplayMode(mode));
  return button;
}

function updateExplorerPeerDisplayMode(peerDisplayMode) {
  if (!explorerPeerSelectionActions?.updatePeerDisplayMode) return;
  explorerPeerSelectionActions.updatePeerDisplayMode(peerDisplayMode);
}

function createExplorerPeerSelectionButton(label, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "cost-of-risk-peer-selection-button";
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
}

function updateExplorerPeerSelection(peerJstCodes) {
  if (!explorerPeerSelectionActions?.updatePeerJstCodes) return;
  explorerPeerSelectionActions.updatePeerJstCodes(peerJstCodes);
}

function createExplorerReturnButton(target) {
  const button = document.createElement("button");
  button.className = "explorer-context-back";
  button.type = "button";
  button.textContent = `Back to ${target.label || "previous module"}`;
  button.addEventListener("click", () => {
    const moduleName = target.module;
    explorerReturnTarget = null;
    if (moduleName) setActiveModule(moduleName);
  });
  return button;
}

function createExplorerCellRangeContext(range, selectedUnit) {
  const section = document.createElement("section");
  section.className = "explorer-context-item explorer-context-range";

  const title = document.createElement("h3");
  title.textContent = "Quick sum";

  const value = document.createElement("p");
  value.className = "explorer-context-range-value";
  value.textContent = formatExplorerCellRangeValue(range, selectedUnit);

  const detail = document.createElement("p");
  const rangeLabel = getExplorerCellRangeLabel(range);
  const rangeCountLabel = range.rangeCount > 1 ? ` across ${range.rangeCount} ranges` : "";
  detail.textContent = `${range.count} selected values${rangeCountLabel}${rangeLabel ? ` - ${rangeLabel}` : ""}.`;

  section.append(title, value, detail);
  return section;
}

function formatExplorerCellRangeValue(range, selectedUnit) {
  if (range.kind === "ratio") return formatContributionPercentValue(range.sum);

  return formatMetricValue(range.sum, selectedUnit);
}

function getExplorerCellRangeLabel(range) {
  if (range.orientation === "multiple") return "";

  return range.orientation === "row"
    ? [range.startDate, range.endDate].filter(Boolean).join(" to ")
    : [range.startLabel, range.endLabel].filter(Boolean).join(" to ");
}

function createExplorerContextItem(label, value) {
  const item = document.createElement("section");
  item.className = "explorer-context-item";

  const heading = document.createElement("h3");
  heading.textContent = label;

  const body = document.createElement("p");
  body.textContent = value;
  body.title = value;

  item.append(heading, body);
  return item;
}

// Mirrors the size/shape of Cost of Risk's small "selected data" card (see
// .cost-of-risk-context-selected-pane) so the two modules read as one
// system. It always describes whatever is currently selected on the active
// axis, and its Benchmark button is now the only way to open the benchmark
// overlay (the right-click "Benchmark" menu entry was removed).
function createExplorerSelectionSummaryCard() {
  const captions = getExplorerAxisCaptions();
  const pane = document.createElement("div");
  pane.className = "explorer-selection-summary-pane";

  const description = document.createElement("div");
  description.className = "explorer-selection-summary-description";

  const lines = [
    ["Row", captions.y],
    ["Column", captions.x],
    ["Tab", captions.z]
  ].filter(([, value]) => value);

  if (lines.length === 0) {
    description.textContent = "Select a cell in the table to see its details here.";
  } else {
    lines.forEach(([label, value]) => {
      const line = document.createElement("p");
      line.className = "explorer-selection-summary-line";
      const strong = document.createElement("span");
      strong.className = "explorer-selection-summary-label";
      strong.textContent = `${label}: `;
      line.append(strong, document.createTextNode(value));
      description.append(line);
    });
  }

  const actions = document.createElement("div");
  actions.className = "explorer-selection-summary-actions";

  const benchmarkButton = document.createElement("button");
  benchmarkButton.type = "button";
  benchmarkButton.className = "explorer-selection-summary-benchmark-button";
  benchmarkButton.classList.toggle("is-active", explorerBenchmarkViewActive);
  benchmarkButton.setAttribute("aria-pressed", String(explorerBenchmarkViewActive));
  benchmarkButton.textContent = "Benchmark";
  benchmarkButton.addEventListener("click", () => {
    if (explorerBenchmarkViewActive) {
      hideExplorerBenchmarkView();
    } else {
      showExplorerBenchmarkView();
    }
  });
  actions.append(benchmarkButton);

  const selectedRow = getSelectedExplorerRowElement();
  const canUseAsDenominator = Boolean(selectedRow?.dataset.pointCode) && selectedRow?.dataset.isParent === "true";
  const denominatorButton = document.createElement("button");
  denominatorButton.type = "button";
  denominatorButton.className = "explorer-selection-summary-benchmark-button";
  denominatorButton.textContent = "Use as denominator";
  denominatorButton.disabled = !canUseAsDenominator;
  denominatorButton.addEventListener("click", () => {
    if (selectedRow) setExplorerContributionBase(selectedRow);
  });
  actions.append(denominatorButton);

  pane.append(description, actions);
  return pane;
}

// The right-click context menu is gone (see wireExplorerUi): "Use as
// denominator" now only acts on whatever is currently selected on the
// active axis, so it needs that row's actual DOM node.
function getSelectedExplorerRowElement() {
  const selectedCode = getSelectedExplorerCodeForActiveAxis();
  if (!selectedCode) return null;
  return elements.explorerTable.querySelector(`tbody tr[data-point-code="${CSS.escape(selectedCode)}"]`);
}

// The template axis-tab is now a static display only (see index.html):
// this list is the only way left to switch templates, so it's always
// visible in the context panel rather than behind a click.
function createExplorerTemplateList(templates, activeTemplateId) {
  const section = document.createElement("section");
  section.className = "explorer-template-list-section";

  const list = document.createElement("div");
  list.className = "explorer-template-list";
  list.setAttribute("role", "listbox");
  list.setAttribute("aria-label", "Template");

  templates.forEach((template) => {
    const isActive = template.tableId === activeTemplateId;
    const option = document.createElement("button");
    option.type = "button";
    option.className = "explorer-template-option";
    option.classList.toggle("is-active", isActive);
    option.setAttribute("role", "option");
    option.setAttribute("aria-selected", String(isActive));
    option.title = template.label;

    const code = document.createElement("span");
    code.className = "explorer-template-option-code";
    code.textContent = template.tableId;
    option.append(code);

    if (template.description) {
      const description = document.createElement("span");
      description.className = "explorer-template-option-description";
      description.textContent = template.description;
      option.append(description);
    }

    option.addEventListener("click", () => setActiveExplorerTemplate(template.tableId));
    list.append(option);
  });

  section.append(list);
  return section;
}

function getExplorerAxisDisplayName(axis) {
  if (axis === "template") return "Template";
  if (axis === "x") return "Column";
  if (axis === "z") return "Tab";
  return "Row";
}

// Compact by design: the box shows only "<Row|Column|Tab> : <code>" — the
// full description (previously shown as a second line) is still available
// as a hover tooltip (see the element.title assignment in
// renderExplorerAxisTabs), it's just not duplicated inline anymore.
function createAxisCaptionLine(code, ratioCaption = "", axis = "") {
  const wrapper = document.createElement("span");
  wrapper.className = "axis-tab-lines";
  const line = document.createElement("span");
  line.className = "axis-tab-line axis-tab-main";
  line.textContent = `${getExplorerAxisDisplayName(axis)} : ${code || "none"}`;
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
    // activeTemplate.label is already "<tableId> - <description>" (see
    // getExplorerTemplateLabel), so it's used as-is here instead of going
    // through formatExplorerAxisCaption like the other axes, which would
    // double the table ID (e.g. "F_01.01 - F_01.01 - Own funds").
    template: activeTemplate?.label || activeExplorerTemplateId,
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
  const rowHeights = new Map(rows.map((row) => [row.dataset.normalizedPath, row.getBoundingClientRect().height]));

  rows.forEach((row) => {
    const path = row.dataset.normalizedPath;
    const isParent = parentPaths.has(path);
    const isExpanded = expandedPaths.has(path);
    row.dataset.treeHidden = String(hasCollapsedExplicitAncestor(path, explicitPaths));
    row.classList.toggle("is-tree-parent", isParent);
    row.classList.remove("is-sticky-parent");
    row.classList.toggle("is-tree-expanded", isParent && isExpanded);
    row.classList.toggle("is-tree-collapsed", isParent && !isExpanded);
    setStickyParentPosition(row, isParent, rowHeights);

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


// Rows don't all share the same height — descriptions can wrap onto 2 or 3
// lines — so the sticky offset for a nested parent row must be the actual
// summed height of its ancestor rows, not indentLevel * a uniform guess.
function getExplorerAncestorStickyHeight(row, rowHeights) {
  return getHierarchyAncestorPaths(row.dataset.hierarchyPath).reduce((sum, path) => {
    return sum + (rowHeights.get(path) ?? EXPLORER_STICKY_PARENT_ROW_HEIGHT);
  }, 0);
}

function setStickyParentPosition(row, isParent, rowHeights) {
  if (!isParent) {
    row.style.removeProperty("--sticky-top");
    return;
  }

  const headerHeight = elements.explorerTable.querySelector("thead")?.getBoundingClientRect().height ?? 0;
  const ancestorHeight = getExplorerAncestorStickyHeight(row, rowHeights);
  row.style.setProperty("--sticky-top", `${headerHeight + ancestorHeight}px`);
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
  const rowHeights = new Map(rows.map((row) => [row.dataset.normalizedPath, row.getBoundingClientRect().height]));
  const scrollTop = elements.explorerTableWrap.scrollTop;
  const stickyStack = new Map();

  rows.forEach((row) => {
    row.classList.remove("is-sticky-parent");

    if (!row.classList.contains("is-tree-parent") || row.hidden) return;

    const indentLevel = Number(row.dataset.indentLevel) || 0;
    const activationTop = scrollTop + headerHeight + getExplorerAncestorStickyHeight(row, rowHeights);

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
  const { shouldFocus = false, cellColumnIndex } = options;
  hasInteractedWithExplorerSelection = true;
  const context = getActiveExplorerContext();
  const activeAxis = context.activeAxis;

  // Only overwrite the highlighted cell when a specific cell was clicked
  // (see the click handler). Row-only selection — keyboard nav, hierarchy
  // toggles — leaves whichever column was last picked untouched.
  if (Number.isFinite(cellColumnIndex)) {
    context.selectedCellColumnIndex = cellColumnIndex;
  }

  if (activeAxis === "y") {
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
    row.querySelectorAll("td.is-selected-cell").forEach((cell) => cell.classList.remove("is-selected-cell"));
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

  const selectedCellColumnIndex = getActiveExplorerContext().selectedCellColumnIndex ?? 0;

  rows.forEach((row) => {
    if (row.dataset.pointCode === selectedCode) {
      row.classList.add("is-selected");
      row.setAttribute("aria-selected", "true");
      row.style.setProperty("--highlight-start", highlightStart);
      const selectedCell = row.querySelector(`td[data-explorer-cell-column="${selectedCellColumnIndex}"]`);
      if (selectedCell) selectedCell.classList.add("is-selected-cell");
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

  if (context.activeAxis === "y") {
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

function revealSelectedExplorerRowPath() {
  const selectedCode = getSelectedExplorerCodeForActiveAxis();
  const row = elements.explorerTable.querySelector(`tbody tr[data-point-code="${CSS.escape(selectedCode)}"]`);
  if (!row?.dataset.hierarchyPath) return;

  const expandedPaths = getActiveExplorerExpandedPaths();
  getHierarchyAncestorPaths(row.dataset.hierarchyPath).forEach((path) => {
    expandedPaths.add(path);
  });

  const rows = [...elements.explorerTable.querySelectorAll("tbody tr[data-normalized-path]")];
  applyExplorerTreeState(getParentPathsFromRenderedRows(rows), getExplicitPathsFromRenderedRows(rows));
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
