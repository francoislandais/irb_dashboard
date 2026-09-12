import { buildExplorerAxisSeries, EXPLORER_TARGET } from "../data/timeSeries.js?v=20260804-lazy-index";
import { normalizeAxisCode } from "../data/core/axisCode.js";
import { createUrlState, readUrlStateParams, replaceUrlState } from "./urlState.js";
import { getCompleteAxisColumnIndexes } from "../data/core/axisColumns.js";
import { formatContributionPercentValue, formatMetricValue, formatSignedMetricValue, getUnitDefinition, isPercentFormat } from "../data/core/formatting.js?v=20260710-bp-format";
import { getReferenceColumns, parseNumericValue } from "../data/core/referenceColumns.js";
import { clampCostOfRiskSmoothingWindow, formatReferenceQuarterLabel } from "../data/costOfRisk.js?v=20260812-costofrisk-domain-split";
import {
  getBenchmarkLabel,
  getBenchmarkPointValue,
  getBenchmarkRows,
  getBenchmarkValueFormat,
  getExplorerSelectionsForAxisCode,
  getPeerBenchmarkJstCodes
} from "../data/explorerBenchmark.js?v=20260804-lazy-index";
import { destroyExplorerBenchmarkChart, renderExplorerBenchmarkView } from "./explorerBenchmarkView.js?v=20260911-benchmark-axis-font";
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
} from "../data/explorer.js?v=20260912-finrep-labels";
import { getLatestState } from "./appState.js";
import { createUnitFilterChip, createUnitSelectionPanel, getUnitFilterLabel } from "./unitFilterView.js?v=20260910-context-title-only";
import { downloadExcelWorkbook } from "./excelWorkbook.js?v=20260910-explorer-excel";
import { showContextMenu } from "./contextMenu.js?v=20260911-explorer-denominator";

let rerenderApp = () => {};
let setActiveModule = () => {};
let updateSelectedJst = () => {};
let updateSelectedUnit = () => {};
let updatePeerDisplayMode = () => {};
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
const EXPLORER_SEARCH_URL_PARAM = "explorer_search";
const EXPLORER_HISTORY_YEARS_URL_PARAM = "explorer_history_years";
const EXPLORER_GEOGRAPHY_LAYOUT_URL_PARAM = "explorer_geography_layout";
const EXPLORER_GEOGRAPHY_SEARCH_URL_PARAM = "explorer_geography_search";
const DEFAULT_EXPLORER_HISTORY_YEARS = 2;
const EXPLORER_GEOGRAPHIC_TEMPLATES = new Map([
  ["F_20.04", "z"],
  ["F_20.05", "z"],
  ["F_20.06", "z"],
  ["F_20.07.1", "z"]
]);
const EXPLORER_GEOGRAPHY_LAYOUTS = [
  { value: "euro-first", label: "Euro area first", description: "Euro area, other EU countries, then the rest of the world" },
  { value: "world-regions", label: "World regions", description: "Countries grouped into broad geographical areas" },
  { value: "alphabetical", label: "Alphabetical", description: "A flat A–Z list of all available countries" },
  { value: "relevance", label: "Top 10 contributors", description: "The ten largest country values at the latest reference date" }
];
const EURO_AREA_CODES = new Set("AT BE HR CY EE FI FR DE GR IE IT LV LT LU MT NL PT SK SI ES".split(" "));
const EU_CODES = new Set("AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE".split(" "));
const EUROPE_CODES = new Set("AD AL AM AT AX BA BE BG BY CH CY CZ DE DK EE ES FI FO FR GB GE GG GI GR HR HU IE IM IS IT JE LI LT LU LV MC MD ME MK MT NL NO PL PT RO RS RU SE SI SJ SK SM TR UA VA XK".split(" "));
const AFRICA_CODES = new Set("AO BF BI BJ BW CD CF CG CI CM CV DJ DZ EG EH ER ET GA GH GM GN GQ GW KE KM LR LS LY MA MG ML MR MU MW MZ NA NE NG RE RW SC SD SH SL SN SO SS ST SZ TD TG TN TZ UG YT ZA ZM ZW".split(" "));
const AMERICAS_CODES = new Set("AG AI AR AW BB BL BM BO BQ BR BS BZ CA CL CO CR CU CW DM DO EC FK GD GF GL GP GS GT GY HN HT JM KN KY LC MF MQ MS MX NI PA PE PM PR PY SR SV SX TC TT US UY VC VE VG VI".split(" "));
const MIDDLE_EAST_CODES = new Set("AE BH EG IL IQ IR JO KW LB OM PS QA SA SY YE".split(" "));
const EXPLORER_COUNTRY_SEARCH_ALIASES = new Map([
  ["GB", "uk united kingdom great britain britain england"],
  ["US", "usa united states america"],
  ["KR", "south korea korea republic"],
  ["KP", "north korea democratic peoples republic korea"],
  ["CZ", "czech republic czechia"],
  ["NL", "holland netherlands"],
  ["AE", "uae united arab emirates"],
  ["RU", "russia russian federation"]
]);
const REGION_DISPLAY_NAMES = typeof Intl.DisplayNames === "function"
  ? new Intl.DisplayNames(["en"], { type: "region" })
  : null;
const EXPLORER_EVOLUTION_OPTIONS = [
  { value: "quarterly", label: "Quarterly", step: 1, description: "Every reporting quarter" },
  { value: "semiannual", label: "Semiannual", step: 2, description: "Every six months" },
  { value: "annual", label: "Annual", step: 4, description: "Every twelve months" }
];
const EXPLORER_DISPLAY_OPTIONS = [
  { value: "temporal", label: "Temporal", description: "All reference dates at the selected frequency" },
  { value: "focus", label: "Date focus", description: "Selected date with absolute and relative changes" }
];
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
const pendingUrlHistoryYears = getUrlHistoryYearsParam();
let explorerStickyFrame = 0;
let explorerBenchmarkExpanded = false;
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
let explorerAdvancedSearchQuery = readUrlStateParams().get(EXPLORER_SEARCH_URL_PARAM) ?? "";
let explorerGeographyLayout = getUrlGeographyLayoutParam();
let explorerGeographySearch = readUrlStateParams().get(EXPLORER_GEOGRAPHY_SEARCH_URL_PARAM) ?? "";
let explorerGeographySearchDraft = explorerGeographySearch;
let explorerAdvancedSearchTimer = 0;
let explorerAdvancedSearchCache = null;
let explorerAdvancedSearchAutoFocusKey = "";
let explorerConceptIndexCache = null;
let explorerSearchSuggestionIndex = -1;
let shouldCenterExplorerReferenceColumn = false;

const elements = {
  explorerAxisButtons: [...document.querySelectorAll("[data-explorer-axis]")],
  explorerAxisCaptions: {
    template: document.querySelector('[data-axis-caption="template"]'),
    x: document.querySelector('[data-axis-caption="x"]'),
    y: document.querySelector('[data-axis-caption="y"]'),
    z: document.querySelector('[data-axis-caption="z"]')
  },
  explorerActiveFilters: document.querySelector("#explorer-active-filters"),
  explorerAdvancedSearch: document.querySelector("#explorer-advanced-search"),
  explorerSearchControl: document.querySelector(".explorer-search-control"),
  explorerSearchSuggestions: document.querySelector("#explorer-search-suggestions"),
  explorerBenchmarkChart: document.querySelector("#explorer-benchmark-chart"),
  explorerBenchmarkCollapse: document.querySelector("#explorer-benchmark-collapse"),
  explorerBenchmarkExpand: document.querySelector("#explorer-benchmark-expand"),
  explorerBenchmarkExpandedChart: document.querySelector("#explorer-benchmark-expanded-chart"),
  explorerBenchmarkExpandedSlot: document.querySelector("#explorer-benchmark-expanded-slot"),
  explorerBenchmarkPreviewSlot: document.querySelector("#explorer-benchmark-preview-slot"),
  explorerBenchmarkPreview: document.querySelector(".explorer-benchmark-preview"),
  explorerBenchmarkView: document.querySelector("#explorer-benchmark-view"),
  explorerContextDetail: document.querySelector("#explorer-context-detail"),
  explorerContextPanel: document.querySelector("#explorer-context-panel"),
  explorerContextSelection: document.querySelector("#explorer-context-selection"),
  explorerEmpty: document.querySelector("#explorer-empty"),
  explorerExcelExport: document.querySelector("#explorer-excel-export"),
  explorerMainPane: document.querySelector(".explorer-main-pane"),
  explorerTable: document.querySelector("#explorer-table"),
  explorerTableWrap: document.querySelector(".metric-table-wrap"),
  explorerTemplateControl: document.querySelector("[data-explorer-template-control]"),
  unitSelect: document.querySelector("#unit-select")
};

export function wireExplorerUi(actions, rerender) {
  rerenderApp = rerender;
  setActiveModule = actions.setActiveModule;
  updateSelectedJst = actions.updateSelectedJst;
  updateSelectedUnit = actions.updateSelectedUnit;
  updatePeerDisplayMode = actions.updatePeerDisplayMode;
  elements.explorerAxisButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (button.disabled) return;

      hasInteractedWithExplorerSelection = true;
      saveExplorerScrollPosition();
      getActiveExplorerContext().activeAxis = button.getAttribute("data-explorer-axis") || "y";
      rerenderApp(actions.getState());
    });
  });
  elements.explorerTemplateControl?.addEventListener("click", () => {
    explorerContextTopic = "";
    renderExplorerAxisTabs();
    renderExplorerActiveFilters(actions.getState());
    renderExplorerContextPanel(actions.getState());
  });
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
      const cell = event.target.closest("td[data-explorer-cell-column]");
      const cellColumnIndex = cell ? Number(cell.dataset.explorerCellColumn) : 0;
      const cellDate = cell?.dataset.explorerCellDate ?? "";
      selectExplorerRow(row.dataset.pointCode, { shouldToggle: true, shouldFocus: true, cellColumnIndex, cellDate });
    }
  });
  elements.explorerTable.addEventListener("contextmenu", (event) => {
    const row = event.target.closest("tbody tr[data-point-code]");
    if (!row) return;
    showContextMenu([{
      label: "Use as denominator",
      action: () => setExplorerContributionBase(row)
    }], event);
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
  document.addEventListener("pointerup", finishExplorerCellRangeSelection, true);
  elements.explorerExcelExport?.addEventListener("click", exportVisibleExplorerTable);
  if (elements.explorerAdvancedSearch) {
    elements.explorerAdvancedSearch.value = explorerAdvancedSearchQuery;
    elements.explorerAdvancedSearch.addEventListener("input", updateExplorerAdvancedSearch);
    elements.explorerAdvancedSearch.addEventListener("search", updateExplorerAdvancedSearch);
    elements.explorerAdvancedSearch.addEventListener("focus", renderExplorerSearchSuggestions);
    elements.explorerAdvancedSearch.addEventListener("keydown", handleExplorerSearchKeydown);
  }
  document.addEventListener("pointerdown", (event) => {
    if (!elements.explorerSearchControl?.contains(event.target)) hideExplorerSearchSuggestions();
  });
  elements.explorerBenchmarkExpand?.addEventListener("click", () => {
    saveExplorerScrollPosition();
    explorerBenchmarkExpanded = !explorerBenchmarkExpanded;
    if (getLatestState()) rerenderApp(getLatestState());
  });
  elements.explorerBenchmarkCollapse?.addEventListener("click", () => {
    saveExplorerScrollPosition();
    explorerBenchmarkExpanded = false;
    if (getLatestState()) rerenderApp(getLatestState());
  });
}

export function showExplorerPeerSelection(actions) {
  explorerPeerSelectionActions = actions;
  explorerContextTopic = "peer-selection";
  renderExplorerContextPanel(actions.getState());
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
    selectedCellColumnIndex: 0,
    selectedReferenceLabel: "",
    evolutionFrequency: "quarterly",
    displayMode: "temporal",
    historyYears: pendingUrlHistoryYears
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
  if (context.historyYears === DEFAULT_EXPLORER_HISTORY_YEARS) {
    url.searchParams.delete(EXPLORER_HISTORY_YEARS_URL_PARAM);
  } else {
    url.searchParams.set(EXPLORER_HISTORY_YEARS_URL_PARAM, String(context.historyYears));
  }
  if (explorerGeographyLayout === "euro-first") {
    url.searchParams.delete(EXPLORER_GEOGRAPHY_LAYOUT_URL_PARAM);
  } else {
    url.searchParams.set(EXPLORER_GEOGRAPHY_LAYOUT_URL_PARAM, explorerGeographyLayout);
  }
  setOrDeleteUrlParam(url, EXPLORER_GEOGRAPHY_SEARCH_URL_PARAM, explorerGeographySearch.trim());
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

function getUrlHistoryYearsParam() {
  const rawParam = readUrlStateParams().get(EXPLORER_HISTORY_YEARS_URL_PARAM);
  if (rawParam === null || rawParam === "") return DEFAULT_EXPLORER_HISTORY_YEARS;
  const rawValue = Number(rawParam);
  return Number.isInteger(rawValue) && rawValue >= 0
    ? rawValue
    : DEFAULT_EXPLORER_HISTORY_YEARS;
}

function getUrlGeographyLayoutParam() {
  const value = readUrlStateParams().get(EXPLORER_GEOGRAPHY_LAYOUT_URL_PARAM) ?? "";
  return EXPLORER_GEOGRAPHY_LAYOUTS.some((option) => option.value === value)
    ? value
    : "euro-first";
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

function updateExplorerAdvancedSearch(event) {
  explorerAdvancedSearchQuery = event.target.value;
  explorerSearchSuggestionIndex = -1;
  renderExplorerSearchSuggestions();
  const url = createUrlState();
  setOrDeleteUrlParam(url, EXPLORER_SEARCH_URL_PARAM, explorerAdvancedSearchQuery.trim());
  replaceExplorerUrlState(url);
  window.clearTimeout(explorerAdvancedSearchTimer);
  explorerAdvancedSearchTimer = window.setTimeout(() => {
    explorerAdvancedSearchCache = null;
    saveExplorerScrollPosition();
    if (getLatestState()) rerenderApp(getLatestState());
  }, 110);
}

function getExplorerConceptIndex(state = getLatestState()) {
  const templates = getExplorerTemplates(state);
  const templateIds = new Set(templates.map((template) => template.tableId));
  const templateKey = [...templateIds].join("|");
  if (explorerConceptIndexCache
      && explorerConceptIndexCache.points === state?.explorerPoints
      && explorerConceptIndexCache.templateKey === templateKey) {
    return explorerConceptIndexCache.items;
  }

  const concepts = new Map();
  const addConcept = (label, tableId, kind) => {
    const normalized = normalizeExplorerMetadataSearchText(label);
    if (!normalized || normalized.length < 2) return;
    const key = normalized;
    if (!concepts.has(key)) {
      concepts.set(key, { kinds: new Set(), label: String(label).trim(), normalized, tableIds: new Set() });
    }
    const concept = concepts.get(key);
    if (tableId) concept.tableIds.add(tableId);
    if (kind) concept.kinds.add(kind);
  };

  const addSegmentConcepts = (segment, tableId, kind) => {
    const cleanSegment = String(segment ?? "").trim();
    if (!cleanSegment) return;

    // Parenthetical regulatory concepts such as "stage 1" are useful on
    // their own, whereas the sentence containing them often is not.
    [...cleanSegment.matchAll(/\(([^)]+)\)/g)].forEach((match) => {
      const parenthetical = match[1].trim();
      if (parenthetical.length <= 40) addConcept(parenthetical, tableId, kind);
    });

    const withoutQualifier = cleanSegment.replace(/^of which\s*:\s*/i, "").trim();
    const wordCount = normalizeExplorerMetadataSearchText(withoutQualifier).split(/\s+/).filter(Boolean).length;
    if (withoutQualifier.length <= 64 && wordCount <= 9) addConcept(withoutQualifier, tableId, kind);
  };

  (state?.explorerPoints ?? []).forEach((point) => {
    if (!templateIds.has(point.tableId)) return;
    const axis = String(point.coordinate ?? "").charAt(0).toUpperCase();
    const kind = /^[XYZ]$/.test(axis) ? `Axis ${axis}` : "Metadata";
    const description = String(point.description ?? "").trim();
    const segments = description.split(/\s*(?:>|\/)\s*/).filter(Boolean);
    (segments.length > 0 ? segments : [description]).forEach((segment) => addSegmentConcepts(segment, point.tableId, kind));
  });

  const items = [...concepts.values()].sort((left, right) => left.label.localeCompare(right.label, "en", {
    numeric: true,
    sensitivity: "base"
  }));
  explorerConceptIndexCache = { items, points: state?.explorerPoints, templateKey };
  return items;
}

function rankExplorerConcept(concept, query, tokens) {
  if (concept.normalized === query) return 0;
  if (concept.normalized.startsWith(query)) return 1;
  if (concept.normalized.split(" ").some((word) => word.startsWith(query))) return 2;
  if (tokens.every((token) => concept.normalized.includes(token))) return 3;
  const compactConcept = concept.normalized.replaceAll(" ", "");
  const compactQuery = query.replaceAll(" ", "");
  if (compactConcept.includes(compactQuery)) return 4;
  return Number.POSITIVE_INFINITY;
}

function getExplorerConceptSuggestions(state = getLatestState()) {
  const query = normalizeExplorerMetadataSearchText(elements.explorerAdvancedSearch?.value);
  if (!query) return [];
  const tokens = query.split(/\s+/).filter(Boolean);
  return getExplorerConceptIndex(state)
    .map((concept) => ({ concept, score: rankExplorerConcept(concept, query, tokens) }))
    .filter(({ score }) => Number.isFinite(score))
    .sort((left, right) => left.score - right.score
      || left.concept.label.length - right.concept.label.length
      || left.concept.label.localeCompare(right.concept.label, "en", { sensitivity: "base" }))
    .slice(0, 8)
    .map(({ concept }) => concept);
}

function renderExplorerSearchSuggestions() {
  const list = elements.explorerSearchSuggestions;
  const input = elements.explorerAdvancedSearch;
  if (!list || !input || document.activeElement !== input) return;
  const suggestions = getExplorerConceptSuggestions();
  list.replaceChildren();
  explorerSearchSuggestionIndex = Math.min(explorerSearchSuggestionIndex, suggestions.length - 1);
  if (suggestions.length === 0) {
    hideExplorerSearchSuggestions();
    return;
  }

  suggestions.forEach((concept, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "explorer-search-suggestion";
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", String(index === explorerSearchSuggestionIndex));
    button.classList.toggle("is-active", index === explorerSearchSuggestionIndex);
    const label = document.createElement("span");
    label.className = "explorer-search-suggestion-label";
    label.textContent = concept.label;
    button.append(label);
    button.addEventListener("pointerdown", (event) => event.preventDefault());
    button.addEventListener("click", () => selectExplorerSearchSuggestion(concept.label));
    list.append(button);
  });
  list.hidden = false;
  input.setAttribute("aria-expanded", "true");
}

function selectExplorerSearchSuggestion(label) {
  if (!elements.explorerAdvancedSearch) return;
  elements.explorerAdvancedSearch.value = label;
  explorerAdvancedSearchQuery = label;
  explorerAdvancedSearchCache = null;
  explorerAdvancedSearchAutoFocusKey = "";
  explorerSearchSuggestionIndex = -1;
  const url = createUrlState();
  setOrDeleteUrlParam(url, EXPLORER_SEARCH_URL_PARAM, label);
  replaceExplorerUrlState(url);
  hideExplorerSearchSuggestions();
  saveExplorerScrollPosition();
  if (getLatestState()) rerenderApp(getLatestState());
  elements.explorerAdvancedSearch.focus();
}

function handleExplorerSearchKeydown(event) {
  const suggestions = getExplorerConceptSuggestions();
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    if (suggestions.length === 0) return;
    event.preventDefault();
    const direction = event.key === "ArrowDown" ? 1 : -1;
    explorerSearchSuggestionIndex = (explorerSearchSuggestionIndex + direction + suggestions.length) % suggestions.length;
    renderExplorerSearchSuggestions();
    return;
  }
  if (event.key === "Enter" && explorerSearchSuggestionIndex >= 0) {
    event.preventDefault();
    selectExplorerSearchSuggestion(suggestions[explorerSearchSuggestionIndex]?.label ?? "");
    return;
  }
  if (event.key === "Escape") hideExplorerSearchSuggestions();
}

function hideExplorerSearchSuggestions() {
  if (elements.explorerSearchSuggestions) elements.explorerSearchSuggestions.hidden = true;
  elements.explorerAdvancedSearch?.setAttribute("aria-expanded", "false");
  explorerSearchSuggestionIndex = -1;
}

function normalizeExplorerMetadataSearchText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr-FR")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function explorerMetadataMatches(values, tokens) {
  const text = normalizeExplorerMetadataSearchText(values.join(" "));
  const compactText = text.replaceAll(" ", "");
  return tokens.every((token) => text.includes(token) || compactText.includes(token.replaceAll(" ", "")));
}

function getExplorerAdvancedSearchResults(state) {
  const query = normalizeExplorerMetadataSearchText(explorerAdvancedSearchQuery);
  const templates = getExplorerTemplates(state);
  if (!query) return { byTemplate: new Map(), hasQuery: false, templates };

  const templateKey = templates.map((template) => template.tableId).join("|");
  if (explorerAdvancedSearchCache
      && explorerAdvancedSearchCache.query === query
      && explorerAdvancedSearchCache.points === state?.explorerPoints
      && explorerAdvancedSearchCache.selectedJst === state?.selectedJst
      && explorerAdvancedSearchCache.templateKey === templateKey) {
    return explorerAdvancedSearchCache.results;
  }

  const tokens = query.split(/\s+/).filter(Boolean);
  const pointsByTemplate = new Map();
  (state?.explorerPoints ?? []).forEach((point) => {
    if (!pointsByTemplate.has(point.tableId)) pointsByTemplate.set(point.tableId, []);
    pointsByTemplate.get(point.tableId).push(point);
  });

  const byTemplate = new Map();
  const matchingTemplates = [];
  templates.forEach((template) => {
    const axisOptions = getExplorerAxisOptions(state, template.tableId);
    const availableByAxis = Object.fromEntries(["x", "y", "z"].map((axis) => [axis, new Set(axisOptions[axis]?.codes ?? [])]));
    const matchesByAxis = { x: new Set(), y: new Set(), z: new Set() };
    const templateMatch = explorerMetadataMatches([template.tableId, template.label, template.description], tokens);

    (pointsByTemplate.get(template.tableId) ?? []).forEach((point) => {
      const axis = String(point.coordinate ?? "").charAt(0).toLowerCase();
      if (!matchesByAxis[axis]) return;
      const code = normalizeAxisCode(point.code, axis);
      if (!availableByAxis[axis].has(code)) return;
      if (explorerMetadataMatches([point.code, code, point.description, point.coordinate], tokens)) {
        matchesByAxis[axis].add(code);
      }
    });

    const matchedAxes = ["x", "y", "z"].filter((axis) => matchesByAxis[axis].size > 0);
    if (!templateMatch && matchedAxes.length === 0) return;

    // Union semantics: a dimension is restricted only when it is the sole
    // source of matches. A match in another dimension makes every value of
    // this one potentially relevant to that result.
    const restrictedAxis = !templateMatch && matchedAxes.length === 1 ? matchedAxes[0] : "";
    const result = { matchesByAxis, restrictedAxis, templateMatch };
    byTemplate.set(template.tableId, result);
    matchingTemplates.push(template);
  });

  const results = { byTemplate, hasQuery: true, templates: matchingTemplates };
  explorerAdvancedSearchCache = {
    points: state?.explorerPoints,
    query,
    results,
    selectedJst: state?.selectedJst,
    templateKey
  };
  return results;
}

function ensureActiveExplorerTemplateMatchesSearch(state) {
  const results = getExplorerAdvancedSearchResults(state);
  if (!results.hasQuery || results.templates.length === 0) {
    explorerAdvancedSearchAutoFocusKey = "";
    return;
  }
  if (!results.byTemplate.has(activeExplorerTemplateId)) {
    activeExplorerTemplateId = results.templates[0].tableId;
    updateUrlTemplateParam(activeExplorerTemplateId);
  }
  const templateResult = results.byTemplate.get(activeExplorerTemplateId);
  const autoFocusKey = `${normalizeExplorerMetadataSearchText(explorerAdvancedSearchQuery)}|${activeExplorerTemplateId}`;
  if (templateResult?.restrictedAxis && explorerAdvancedSearchAutoFocusKey !== autoFocusKey) {
    getActiveExplorerContext().activeAxis = templateResult.restrictedAxis;
  }
  explorerAdvancedSearchAutoFocusKey = autoFocusKey;
}

function filterExplorerSeriesByAdvancedSearch(series, state, tableId, activeAxis) {
  const results = getExplorerAdvancedSearchResults(state);
  const templateResult = results.byTemplate.get(tableId);
  if (!results.hasQuery) return series;
  if (!templateResult) return { ...series, rows: [], status: "No metadata matches this search." };
  if (templateResult.restrictedAxis !== activeAxis) return series;
  const matchingCodes = templateResult.matchesByAxis[activeAxis];
  const rows = series.rows.filter((row) => matchingCodes.has(normalizeExplorerSeriesRow(row).code));
  return {
    ...series,
    rows,
    status: rows.length > 0 ? series.status : "No metadata matches this search."
  };
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

function syncExplorerBenchmarkPlacement() {
  const benchmarkVisible = explorerContextTopic === "benchmark-mode";
  if (!benchmarkVisible) explorerBenchmarkExpanded = false;
  if (elements.explorerBenchmarkPreview) elements.explorerBenchmarkPreview.hidden = !benchmarkVisible;
  elements.explorerContextPanel?.classList.toggle("has-benchmark-preview", benchmarkVisible);
  if (elements.explorerMainPane) {
    elements.explorerMainPane.classList.toggle("is-benchmark-expanded", explorerBenchmarkExpanded);
  }
  if (elements.explorerTableWrap) elements.explorerTableWrap.hidden = explorerBenchmarkExpanded;
  if (elements.explorerBenchmarkExpandedSlot) elements.explorerBenchmarkExpandedSlot.hidden = !explorerBenchmarkExpanded;
  if (elements.explorerBenchmarkExpand) {
    elements.explorerBenchmarkExpand.setAttribute("aria-expanded", String(explorerBenchmarkExpanded));
    elements.explorerBenchmarkExpand.setAttribute("aria-label", explorerBenchmarkExpanded ? "Collapse benchmark" : "Expand benchmark");
    elements.explorerBenchmarkExpand.setAttribute("title", explorerBenchmarkExpanded ? "Return to table" : "Expand benchmark");
    elements.explorerBenchmarkExpand.classList.toggle("is-expanded", explorerBenchmarkExpanded);
  }
}

export function renderExplorer(state) {
  clearExplorerCellRangeSelection();
  ensureActiveExplorerTemplate(state);
  ensureActiveExplorerTemplateMatchesSearch(state);
  const context = getActiveExplorerContext();
  const template = getActiveExplorerTemplate();
  const templates = getExplorerTemplates(state);
  ensureExplorerSelections(state);
  updateUrlExplorerSelectionParams();
  elements.unitSelect.value = state.selectedUnit;
  renderExplorerAxisTabs();
  renderExplorerActiveFilters(state);
  renderExplorerContextPanel(state);

  syncExplorerBenchmarkPlacement();
  const benchmarkVisible = explorerContextTopic === "benchmark-mode";
  const benchmark = benchmarkVisible ? buildExplorerBenchmark() : null;
  if (benchmarkVisible) {
    renderExplorerBenchmarkView({
      benchmark,
      compact: true,
      container: elements.explorerBenchmarkChart,
      focusYAxis: explorerBenchmarkFocusYAxis,
      formatValue: (value) => formatBenchmarkValue(value, benchmark),
      onClearSmoothing: clearExplorerBenchmarkSmoothing,
      onChangeSmoothing: updateExplorerBenchmarkSmoothingWindow,
      onSelectJst: selectExplorerBenchmarkJst,
      onSelectReference: selectExplorerBenchmarkReferenceDate,
      onToggleYAxisFocus: toggleExplorerBenchmarkFocusYAxis,
      peerDisplayMode: "anonymised",
      selectedReferenceLabel: context.selectedReferenceLabel,
      selectedJst: state.selectedJst,
      smoothingWindow: explorerBenchmarkSmoothingWindow
    });
  } else {
    destroyExplorerBenchmarkChart(elements.explorerBenchmarkChart);
  }
  if (benchmarkVisible && explorerBenchmarkExpanded) {
    renderExplorerBenchmarkView({
      benchmark,
      compact: false,
      container: elements.explorerBenchmarkExpandedChart,
      focusYAxis: explorerBenchmarkFocusYAxis,
      formatValue: (value) => formatBenchmarkValue(value, benchmark),
      onClearSmoothing: clearExplorerBenchmarkSmoothing,
      onChangeSmoothing: updateExplorerBenchmarkSmoothingWindow,
      onSelectJst: selectExplorerBenchmarkJst,
      onSelectReference: selectExplorerBenchmarkReferenceDate,
      onToggleYAxisFocus: toggleExplorerBenchmarkFocusYAxis,
      peerDisplayMode: state.peerDisplayMode,
      selectedReferenceLabel: context.selectedReferenceLabel,
      selectedJst: state.selectedJst,
      smoothingWindow: explorerBenchmarkSmoothingWindow
    });
  } else {
    destroyExplorerBenchmarkChart(elements.explorerBenchmarkExpandedChart);
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
  const searchedTableSeries = filterExplorerSeriesByAdvancedSearch(tableSeries, state, template?.tableId, context.activeAxis);
  const geographicTableSeries = applyExplorerGeographyPresentation(searchedTableSeries, state);
  const displayedTableSeries = buildExplorerEvolutionSeries(geographicTableSeries, state);
  elements.explorerTable.replaceChildren();
  if (elements.explorerExcelExport) {
    elements.explorerExcelExport.disabled = displayedTableSeries.rows.length === 0 || displayedTableSeries.dateColumns.length === 0;
  }

  elements.explorerEmpty.hidden = !searchedTableSeries.status;
  elements.explorerEmpty.textContent = searchedTableSeries.status;

  if (displayedTableSeries.rows.length === 0 || displayedTableSeries.dateColumns.length === 0) return;

  renderExplorerTable(displayedTableSeries, state.selectedUnit);
  applyExplorerSelection();
  if (shouldFocusOpenedExplorerPoint) {
    shouldFocusOpenedExplorerPoint = false;
    revealSelectedExplorerRowPath();
    applyExplorerSelection();
    focusSelectedExplorerRow();
  } else {
    restoreExplorerScrollPosition();
  }
  scheduleExplorerReferenceColumnCentering();
}

function exportVisibleExplorerTable() {
  const state = getLatestState();
  const table = elements.explorerTable;
  if (!state || !table?.tHead || !table.tBodies[0]) return;

  const payload = buildVisibleExplorerExcelPayload(state, table);
  if (payload.rows.length === 0 || payload.columns.length === 0) return;

  const button = elements.explorerExcelExport;
  if (button) button.disabled = true;
  try {
    downloadExcelWorkbook(payload);
  } finally {
    window.setTimeout(() => {
      if (button) button.disabled = false;
    }, 350);
  }
}

function buildVisibleExplorerExcelPayload(state, table) {
  const activeAxis = getActiveExplorerAxis();
  const axisLabels = { x: "Column", y: "Row", z: "Tab" };
  const displayedDimension = axisLabels[activeAxis] ?? activeAxis.toUpperCase();
  const captions = getExplorerAxisCaptions();
  const template = getActiveExplorerTemplate();
  const selectedReference = getSelectedExplorerReference(state);
  const headerCells = [...table.tHead.querySelectorAll("th[data-explorer-export-column]")];
  const columns = headerCells.map((cell, index) => ({
    label: index === 0 ? displayedDimension : cell.dataset.explorerExportLabel || cell.textContent.trim(),
    width: index === 0 ? 54 : index === 1 ? 13 : 20
  }));
  const rows = [...table.tBodies[0].rows]
    .filter((row) => !row.hidden && window.getComputedStyle(row).display !== "none")
    .map((row) => ({
      cells: [...row.cells].map((cell, index) => buildExplorerExcelCell(cell, index, row, state))
    }));
  const templateTitle = template?.description || String(template?.label || "").replace(`${template?.tableId || ""} - `, "") || "Regulatory template";
  const unitLabel = getUnitFilterLabel(state.selectedUnit);
  const metadata = [
    { label: "Template", value: template?.tableId || activeExplorerTemplateId || "-" },
    { label: "Template title", value: templateTitle },
    { label: "Displayed dimension", value: displayedDimension },
    { label: "Row selection", value: captions.y || "Not used" },
    { label: "Column selection", value: captions.x || "Not used" },
    { label: "Tab selection", value: captions.z || "Not used" },
    { label: "JST code", value: state.selectedJst || "-" },
    { label: "Display unit", value: unitLabel },
    { label: "Table display", value: getActiveExplorerDisplayOption().label },
    { label: "Evolution frequency", value: getActiveExplorerEvolutionOption().label }
  ];
  if (getActiveExplorerContext().displayMode === "focus" && selectedReference) {
    metadata.push({ label: "Reference date", value: formatReferenceQuarterLabel(selectedReference.label) });
  }

  const templateId = template?.tableId || activeExplorerTemplateId || "Template";
  return {
    columns,
    fileName: sanitizeExcelFileName(`Agora Explorer_${templateId}_${displayedDimension}.xlsx`),
    metadata,
    rows,
    subtitle: `Visible table · ${state.selectedJst || "JST not selected"} · ${unitLabel}`,
    title: `${templateId} — ${templateTitle} — ${displayedDimension} dimension`
  };
}

function buildExplorerExcelCell(cell, index, row, state) {
  if (index === 0) {
    return {
      type: "text",
      value: cell.querySelector(".tree-label")?.textContent.trim() || cell.textContent.trim(),
      indent: Number(row.dataset.indentLevel) || 0
    };
  }
  if (index === 1) {
    return { type: "text", value: cell.querySelector(".code-column-badge")?.textContent.trim() || cell.textContent.trim() };
  }

  const rawValue = Number(cell.dataset.explorerCellValue);
  if (!Number.isFinite(rawValue)) return { type: "text", value: cell.textContent.trim() };

  const columnKind = cell.dataset.explorerExportKind || "current";
  const valueFormat = cell.dataset.explorerExportFormat || "";
  const isRatio = cell.dataset.explorerCellKind === "ratio" || columnKind === "relative-change" || isPercentFormat(valueFormat);
  const value = isRatio
    ? (cell.dataset.explorerCellKind === "ratio" || columnKind === "relative-change" || Math.abs(rawValue) <= 1 ? rawValue : rawValue / 100)
    : rawValue / getUnitDefinition(state.selectedUnit).divisor;
  const opacity = Number(cell.style.getPropertyValue("--date-focus-value-opacity")) || 0;
  const emphasis = opacity >= 0.115 ? 3 : opacity >= 0.075 ? 2 : opacity > 0 ? 1 : 0;
  return { type: "number", value, numberFormat: isRatio ? "percent" : "amount", emphasis };
}

function sanitizeExcelFileName(fileName) {
  return fileName.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").trim();
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
  const isDateFocus = getActiveExplorerContext().displayMode === "focus";
  const focusSelection = isDateFocus ? getExplorerDateFocusSelection(series) : null;
  const orderedDates = isDateFocus
    ? [
        { ...focusSelection.currentColumn, kind: "current" },
        { label: "Absolute change", kind: "absolute-change" },
        { label: "Relative change", kind: "relative-change" }
      ]
    : [...series.dateColumns].reverse();
  const tableRows = series.rows.map(normalizeExplorerSeriesRow);
  const displayRows = buildExplorerDisplayRows(tableRows);
  const contributionBase = getExplorerContributionBase(displayRows, activeAxis);
  const propagatedContribution = getExplorerPropagatedContribution(activeAxis);
  const parentPaths = getParentPaths(tableRows);
  const nodePaths = getExplicitPaths(displayRows);
  const axisImpossibleByPath = getExplorerAxisImpossiblePaths(displayRows, activeAxis, parentPaths);
  const dateFocusPrimaryCells = [];
  const thead = document.createElement("thead");
  const yearHeaderRow = document.createElement("tr");
  const headerRow = document.createElement("tr");
  yearHeaderRow.className = "explorer-year-header-row";
  headerRow.className = isDateFocus ? "explorer-focus-header-row" : "explorer-quarter-header-row";
  const tbody = document.createElement("tbody");

  expandDefaultExplorerPaths(displayRows, parentPaths);

  const descriptionHeader = document.createElement("th");
  descriptionHeader.scope = "col";
  descriptionHeader.className = "description-column";
  descriptionHeader.dataset.explorerExportColumn = "true";
  if (!isDateFocus) descriptionHeader.rowSpan = 2;
  descriptionHeader.textContent = getExplorerAxisDisplayName(activeAxis);
  headerRow.append(descriptionHeader);

  const codeHeader = document.createElement("th");
  codeHeader.scope = "col";
  codeHeader.className = "code-column";
  codeHeader.textContent = "Code";
  codeHeader.dataset.explorerExportColumn = "true";
  if (!isDateFocus) codeHeader.rowSpan = 2;
  headerRow.append(codeHeader);

  if (!isDateFocus) {
    let yearColumnOffset = 0;
    buildExplorerYearGroups(orderedDates).forEach(({ count, year }) => {
      const th = document.createElement("th");
      th.className = "explorer-year-header";
      th.colSpan = count;
      th.scope = "colgroup";
      th.dataset.explorerYearColumnStart = String(yearColumnOffset);
      th.dataset.explorerYearColumnEnd = String(yearColumnOffset + count - 1);
      th.textContent = year;
      yearHeaderRow.append(th);
      yearColumnOffset += count;
    });
    yearHeaderRow.prepend(descriptionHeader, codeHeader);
  }

  orderedDates.forEach((dateColumn, index) => {
    const th = document.createElement("th");
    th.scope = "col";
    th.className = index === 0 ? "latest-column" : "";
    if (isDateFocus) th.classList.add("date-focus-column");
    if (isDateFocus && index > 0) th.classList.add("date-focus-variation-column");
    if (isDateFocus && index === 1) th.classList.add("variation-column-start");
    th.dataset.explorerExportColumn = "true";
    th.dataset.explorerExportLabel = isDateFocus ? dateColumn.label : formatReferenceQuarterLabel(dateColumn.label);
    th.dataset.explorerDateColumn = String(index);
    th.textContent = isDateFocus ? dateColumn.label : getExplorerQuarterLabel(dateColumn);
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

    const isContributionFocus = isDateFocus && isContributionChild;
    const reversedValues = isContributionFocus
      ? buildExplorerDateFocusContributionValues(seriesRow.values, contributionValues, focusSelection)
      : isDateFocus
        ? buildExplorerDateFocusValues(seriesRow.values, focusSelection)
      : [...seriesRow.values].reverse();
    const reversedBaseValues = contributionValues && !isContributionFocus
      ? isDateFocus
        ? buildExplorerDateFocusValues(contributionValues, focusSelection)
        : [...contributionValues].reverse()
      : [];

    reversedValues.forEach((point, index) => {
      const td = document.createElement("td");
      td.className = index === 0 ? "latest-column" : "";
      if (isDateFocus) td.classList.add("date-focus-column");
      if (isDateFocus && index > 0) td.classList.add("date-focus-variation-column");
      if (isDateFocus && index === 1) td.classList.add("variation-column-start");
      const columnKind = orderedDates[index]?.kind ?? "current";
      td.dataset.explorerExportKind = columnKind;
      td.dataset.explorerExportFormat = seriesRow.format ?? "";
      const contributionValue = isContributionFocus
        ? point.value
        : isContributionChild
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
            : formatExplorerFocusedValue({
                columnKind,
                contributionValue,
                pointValue: point.value,
                selectedUnit,
                valueFormat: seriesRow.format
              });
      }
      if (!seriesRow.isVirtual) {
        td.dataset.explorerCellRow = String(rowIndex);
        td.dataset.explorerCellColumn = String(index);
        td.dataset.explorerCellKind = contributionValue === null ? "amount" : "ratio";
        td.dataset.explorerCellDate = columnKind === "current" ? orderedDates[index]?.label ?? "" : "";
        td.dataset.explorerCellLabel = seriesRow.description || seriesRow.code || "";
      }
      if (!seriesRow.isVirtual && Number.isFinite(displayValue)) {
        td.dataset.explorerCellValue = String(displayValue);
        if (isDateFocus && index === 0 && !isAxisImpossible) {
          dateFocusPrimaryCells.push({
            cell: td,
            kind: contributionValue === null ? "amount" : "ratio",
            value: displayValue
          });
        }
      }
      valueRow.append(td);
    });

    tbody.append(valueRow);
  });

  applyExplorerDateFocusValueIntensity(dateFocusPrimaryCells);

  thead.append(...(isDateFocus ? [headerRow] : [yearHeaderRow, headerRow]));
  elements.explorerTable.append(thead, tbody);
  applyExplorerTreeState(parentPaths, nodePaths);
}

function buildExplorerYearGroups(dateColumns) {
  return dateColumns.reduce((groups, dateColumn) => {
    const year = String(dateColumn.date?.getFullYear?.() || formatReferenceQuarterLabel(dateColumn.label).match(/\d{4}/)?.[0] || "-");
    const currentGroup = groups.at(-1);
    if (currentGroup?.year === year) currentGroup.count += 1;
    else groups.push({ year, count: 1 });
    return groups;
  }, []);
}

function getExplorerQuarterLabel(dateColumn) {
  return formatReferenceQuarterLabel(dateColumn.label).match(/^Q[1-4]/)?.[0] || dateColumn.label;
}

function applyExplorerDateFocusValueIntensity(entries) {
  const maximumByKind = new Map();
  entries.forEach(({ kind, value }) => {
    const magnitude = Math.abs(value);
    if (!Number.isFinite(magnitude) || magnitude === 0) return;
    maximumByKind.set(kind, Math.max(maximumByKind.get(kind) ?? 0, magnitude));
  });

  entries.forEach(({ cell, kind, value }) => {
    const magnitude = Math.abs(value);
    const maximum = maximumByKind.get(kind) ?? 0;
    if (!Number.isFinite(magnitude) || magnitude === 0 || maximum === 0) return;
    const relativeImportance = Math.pow(Math.min(1, magnitude / maximum), 0.45);
    const opacity = 0.025 + (relativeImportance * 0.12);
    cell.classList.add("date-focus-primary-value");
    cell.style.setProperty("--date-focus-value-opacity", opacity.toFixed(3));
  });
}

function getExplorerDateFocusSelection(series) {
  const selectedReference = getSelectedExplorerReference();
  const latestIndex = Math.max(0, series.dateColumns.length - 1);
  const selectedIndex = series.dateColumns.findIndex((column) => column.label === selectedReference?.label);
  const currentIndex = selectedIndex >= 0 ? selectedIndex : latestIndex;
  const comparisonIndex = currentIndex - getActiveExplorerEvolutionOption().step;
  const context = getActiveExplorerContext();
  context.selectedReferenceLabel = series.dateColumns[currentIndex]?.label ?? "";
  context.selectedCellColumnIndex = 0;
  return {
    comparisonIndex: comparisonIndex >= 0 ? comparisonIndex : -1,
    currentColumn: series.dateColumns[currentIndex],
    currentIndex
  };
}

function buildExplorerDateFocusValues(values, selection) {
  const currentValue = values[selection.currentIndex]?.value ?? null;
  const comparisonValue = selection.comparisonIndex >= 0
    ? values[selection.comparisonIndex]?.value ?? null
    : null;
  const absoluteChange = Number.isFinite(currentValue) && Number.isFinite(comparisonValue)
    ? currentValue - comparisonValue
    : null;
  const relativeChange = Number.isFinite(absoluteChange) && comparisonValue !== 0
    ? absoluteChange / Math.abs(comparisonValue)
    : null;
  return [
    { value: currentValue },
    { value: absoluteChange },
    { value: relativeChange }
  ];
}

function buildExplorerDateFocusContributionValues(values, baseValues, selection) {
  const currentRatio = getExplorerContributionRatio(
    values[selection.currentIndex]?.value,
    baseValues[selection.currentIndex]?.value
  );
  const comparisonRatio = selection.comparisonIndex >= 0
    ? getExplorerContributionRatio(
        values[selection.comparisonIndex]?.value,
        baseValues[selection.comparisonIndex]?.value
      )
    : null;
  const absoluteChange = Number.isFinite(currentRatio) && Number.isFinite(comparisonRatio)
    ? currentRatio - comparisonRatio
    : null;
  const relativeChange = Number.isFinite(absoluteChange) && comparisonRatio !== 0
    ? absoluteChange / Math.abs(comparisonRatio)
    : null;
  return [{ value: currentRatio }, { value: absoluteChange }, { value: relativeChange }];
}

function formatExplorerFocusedValue({ columnKind, contributionValue, pointValue, selectedUnit, valueFormat }) {
  if (columnKind === "relative-change") {
    return Number.isFinite(pointValue) ? formatSignedPercent(pointValue) : "-";
  }
  if (contributionValue !== null) {
    return Number.isFinite(contributionValue)
      ? `${contributionValue > 0 && columnKind === "absolute-change" ? "+" : ""}${formatContributionPercentValue(contributionValue)}`
      : "-";
  }
  if (columnKind === "absolute-change") {
    if (!Number.isFinite(pointValue)) return "-";
    if (isPercentFormat(valueFormat)) {
      return `${pointValue > 0 ? "+" : ""}${formatMetricValue(pointValue, selectedUnit, valueFormat)}`;
    }
    return formatSignedMetricValue(pointValue, selectedUnit);
  }
  return formatMetricValue(pointValue, selectedUnit, valueFormat);
}

function formatSignedPercent(value) {
  return `${new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
    signDisplay: "exceptZero"
  }).format(value * 100)} %`;
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
  return target?.closest?.("td[data-explorer-cell-column]");
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

  return [...elements.explorerTable.querySelectorAll("td[data-explorer-cell-column]")]
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

function buildExplorerBenchmark(jstCodes = null) {
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

  const benchmarkJstCodes = jstCodes ?? getPeerBenchmarkJstCodes(state);
  const series = benchmarkJstCodes.map((jstCode) => {
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

function renderExplorerActiveFilters(state) {
  if (!elements.explorerActiveFilters) return;

  const jstChip = document.createElement("span");
  jstChip.className = "cost-of-risk-filter-chip explorer-filter-chip-jst";
  jstChip.classList.toggle("is-open", explorerContextTopic === "jst-code");

  const jstToggle = document.createElement("button");
  jstToggle.type = "button";
  jstToggle.className = "cost-of-risk-filter-chip-toggle";
  jstToggle.setAttribute("aria-expanded", String(explorerContextTopic === "jst-code"));
  jstToggle.setAttribute("aria-controls", "explorer-context-detail");

  const jstValue = document.createElement("span");
  jstValue.className = "cost-of-risk-filter-chip-label cost-of-risk-filter-chip-value";
  jstValue.textContent = state?.selectedJst || "JST";
  jstToggle.append(jstValue);
  jstToggle.addEventListener("click", () => {
    explorerContextTopic = "jst-code";
    renderExplorerAxisTabs();
    renderExplorerActiveFilters(getLatestState());
    renderExplorerContextPanel(getLatestState());
  });

  jstChip.append(jstToggle);

  const reference = getSelectedExplorerReference(state);
  const dateChip = document.createElement("span");
  dateChip.className = "cost-of-risk-filter-chip cost-of-risk-filter-chip--date explorer-filter-chip-date";
  dateChip.classList.toggle("is-open", explorerContextTopic === "reference-date");

  const dateToggle = document.createElement("button");
  dateToggle.type = "button";
  dateToggle.className = "cost-of-risk-filter-chip-toggle";
  dateToggle.setAttribute("aria-expanded", String(explorerContextTopic === "reference-date"));
  dateToggle.setAttribute("aria-controls", "explorer-context-detail");
  dateToggle.setAttribute("aria-label", "Change reference date");

  const dateValue = document.createElement("span");
  dateValue.className = "cost-of-risk-filter-chip-label cost-of-risk-filter-chip-value";
  dateValue.textContent = reference ? formatReferenceQuarterLabel(reference.label) : "Reference date";
  dateToggle.append(dateValue);
  dateToggle.addEventListener("click", () => {
    explorerContextTopic = "reference-date";
    renderExplorerAxisTabs();
    renderExplorerActiveFilters(getLatestState());
    renderExplorerContextPanel(getLatestState());
  });

  dateChip.append(dateToggle);
  const unitChip = createUnitFilterChip({
    selectedUnit: state?.selectedUnit,
    isOpen: explorerContextTopic === "unit",
    onOpen: () => {
      explorerContextTopic = "unit";
      renderExplorerAxisTabs();
      renderExplorerActiveFilters(getLatestState());
      renderExplorerContextPanel(getLatestState());
    }
  });
  const geographyChip = createExplorerGeographyFilterChip();
  const evolutionOption = getActiveExplorerEvolutionOption();
  const evolutionChip = document.createElement("span");
  evolutionChip.className = "cost-of-risk-filter-chip explorer-filter-chip-evolution";
  evolutionChip.classList.toggle("is-open", explorerContextTopic === "evolution-frequency");
  const evolutionToggle = document.createElement("button");
  evolutionToggle.type = "button";
  evolutionToggle.className = "cost-of-risk-filter-chip-toggle";
  evolutionToggle.setAttribute("aria-expanded", String(explorerContextTopic === "evolution-frequency"));
  evolutionToggle.setAttribute("aria-controls", "explorer-context-detail");
  evolutionToggle.setAttribute("aria-label", "Change evolution frequency");
  const evolutionLabel = document.createElement("span");
  evolutionLabel.className = "cost-of-risk-filter-chip-label cost-of-risk-filter-chip-value";
  evolutionLabel.textContent = evolutionOption.label;
  evolutionToggle.append(evolutionLabel);
  evolutionToggle.addEventListener("click", () => {
    explorerContextTopic = "evolution-frequency";
    renderExplorerAxisTabs();
    renderExplorerActiveFilters(getLatestState());
    renderExplorerContextPanel(getLatestState());
  });
  evolutionChip.append(evolutionToggle);

  const displayOption = getActiveExplorerDisplayOption();
  const displayChip = document.createElement("span");
  displayChip.className = "cost-of-risk-filter-chip explorer-filter-chip-display";
  displayChip.classList.toggle("is-open", explorerContextTopic === "display-mode");
  const displayToggle = document.createElement("button");
  displayToggle.type = "button";
  displayToggle.className = "cost-of-risk-filter-chip-toggle";
  displayToggle.setAttribute("aria-expanded", String(explorerContextTopic === "display-mode"));
  displayToggle.setAttribute("aria-controls", "explorer-context-detail");
  displayToggle.setAttribute("aria-label", "Change table display");
  const displayLabel = document.createElement("span");
  displayLabel.className = "cost-of-risk-filter-chip-label cost-of-risk-filter-chip-value";
  displayLabel.textContent = displayOption.label;
  displayToggle.append(displayLabel);
  displayToggle.addEventListener("click", () => {
    explorerContextTopic = "display-mode";
    renderExplorerAxisTabs();
    renderExplorerActiveFilters(getLatestState());
    renderExplorerContextPanel(getLatestState());
  });
  displayChip.append(displayToggle);

  const benchmarkChip = document.createElement("span");
  benchmarkChip.className = "cost-of-risk-filter-chip explorer-filter-chip-benchmark";
  benchmarkChip.classList.toggle("is-open", explorerContextTopic === "benchmark-mode");
  const benchmarkToggle = document.createElement("button");
  benchmarkToggle.type = "button";
  benchmarkToggle.className = "cost-of-risk-filter-chip-toggle";
  benchmarkToggle.setAttribute("aria-expanded", String(explorerContextTopic === "benchmark-mode"));
  benchmarkToggle.setAttribute("aria-controls", "explorer-context-detail");
  benchmarkToggle.setAttribute("aria-label", "Change benchmark display");
  const benchmarkLabel = document.createElement("span");
  benchmarkLabel.className = "cost-of-risk-filter-chip-label cost-of-risk-filter-chip-value";
  benchmarkLabel.textContent = "Benchmark display";
  benchmarkToggle.append(benchmarkLabel);
  benchmarkToggle.addEventListener("click", () => {
    explorerContextTopic = "benchmark-mode";
    if (getLatestState()) rerenderApp(getLatestState());
  });
  benchmarkChip.append(benchmarkToggle);

  const descriptionChip = document.createElement("span");
  descriptionChip.className = "cost-of-risk-filter-chip explorer-filter-chip-description";
  descriptionChip.classList.toggle("is-open", explorerContextTopic === "description");
  const descriptionToggle = document.createElement("button");
  descriptionToggle.type = "button";
  descriptionToggle.className = "cost-of-risk-filter-chip-toggle";
  descriptionToggle.setAttribute("aria-expanded", String(explorerContextTopic === "description"));
  descriptionToggle.setAttribute("aria-controls", "explorer-context-detail");
  descriptionToggle.setAttribute("aria-label", "Show selection description");
  const descriptionLabel = document.createElement("span");
  descriptionLabel.className = "cost-of-risk-filter-chip-label cost-of-risk-filter-chip-value";
  descriptionLabel.textContent = "Description";
  descriptionToggle.append(descriptionLabel);
  descriptionToggle.addEventListener("click", () => {
    explorerContextTopic = "description";
    renderExplorerAxisTabs();
    renderExplorerActiveFilters(getLatestState());
    renderExplorerContextPanel(getLatestState());
  });
  descriptionChip.append(descriptionToggle);

  const chips = [
    jstChip,
    dateChip,
    unitChip
  ];
  if (geographyChip) chips.push(geographyChip);
  chips.push(
    evolutionChip,
    displayChip,
    benchmarkChip,
    descriptionChip
  );
  elements.explorerActiveFilters.replaceChildren(...chips);
}

function createExplorerGeographyFilterChip() {
  if (!getActiveExplorerGeographyAxis()) return null;
  const option = EXPLORER_GEOGRAPHY_LAYOUTS.find((candidate) => candidate.value === explorerGeographyLayout)
    ?? EXPLORER_GEOGRAPHY_LAYOUTS[0];
  const chip = document.createElement("span");
  chip.className = "cost-of-risk-filter-chip explorer-filter-chip-geography";
  chip.classList.toggle("is-open", explorerContextTopic === "geography");
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "cost-of-risk-filter-chip-toggle";
  toggle.setAttribute("aria-expanded", String(explorerContextTopic === "geography"));
  toggle.setAttribute("aria-controls", "explorer-context-detail");
  toggle.setAttribute("aria-label", "Change geography layout");
  const label = document.createElement("span");
  label.className = "cost-of-risk-filter-chip-label cost-of-risk-filter-chip-value";
  label.textContent = option.label;
  toggle.append(label);
  toggle.addEventListener("click", () => {
    explorerContextTopic = "geography";
    const context = getActiveExplorerContext();
    const geographyAxis = getActiveExplorerGeographyAxis();
    if (geographyAxis && context.activeAxis !== geographyAxis) {
      context.activeAxis = geographyAxis;
      updateUrlExplorerSelectionParams();
    }
    renderExplorerAxisTabs();
    if (getLatestState()) rerenderApp(getLatestState());
  });
  chip.append(toggle);
  return chip;
}

function getActiveExplorerGeographyAxis() {
  return EXPLORER_GEOGRAPHIC_TEMPLATES.get(getActiveExplorerTemplate()?.tableId) ?? "";
}

function getSelectedExplorerReference(state = getLatestState()) {
  const references = getReferenceColumns(state?.columns ?? []);
  const selectedLabel = getActiveExplorerContext().selectedReferenceLabel;
  if (selectedLabel) {
    const selectedReference = references.find((reference) => reference.label === selectedLabel);
    if (selectedReference) return selectedReference;
  }
  const selectedColumnIndex = Math.max(0, Number(getActiveExplorerContext().selectedCellColumnIndex) || 0);
  return references[references.length - 1 - selectedColumnIndex] ?? references.at(-1) ?? null;
}

function getActiveExplorerEvolutionOption() {
  const frequency = getActiveExplorerContext().evolutionFrequency;
  return EXPLORER_EVOLUTION_OPTIONS.find((option) => option.value === frequency) ?? EXPLORER_EVOLUTION_OPTIONS[0];
}

function getActiveExplorerDisplayOption() {
  const displayMode = getActiveExplorerContext().displayMode;
  return EXPLORER_DISPLAY_OPTIONS.find((option) => option.value === displayMode) ?? EXPLORER_DISPLAY_OPTIONS[0];
}

function buildExplorerEvolutionSeries(series, state) {
  if (!series?.dateColumns?.length) return series;
  const context = getActiveExplorerContext();
  const selectedReference = getSelectedExplorerReference(state);
  const latestIndex = series.dateColumns.length - 1;
  const selectedIndex = series.dateColumns.findIndex((column) => column.label === selectedReference?.label);
  const resolvedSelectedIndex = selectedIndex >= 0 ? selectedIndex : latestIndex;
  if (context.displayMode === "focus") {
    context.selectedReferenceLabel = series.dateColumns[resolvedSelectedIndex]?.label ?? "";
    context.selectedCellColumnIndex = 0;
    return series;
  }
  const step = getActiveExplorerEvolutionOption().step;
  // Temporal visibility is a stable window anchored on the latest available
  // reference date. The selected reference only controls highlighting. Using
  // it as the window anchor progressively discarded every newer column each
  // time an older cell was clicked.
  const anchorYear = series.dateColumns[latestIndex]?.date?.getFullYear();
  const oldestYear = Number.isFinite(anchorYear) ? anchorYear - context.historyYears : Number.NEGATIVE_INFINITY;
  const selectedIndexes = [];
  for (let index = latestIndex; index >= 0; index -= step) {
    const year = series.dateColumns[index]?.date?.getFullYear();
    if (Number.isFinite(year) && year < oldestYear) break;
    selectedIndexes.push(index);
  }
  selectedIndexes.sort((left, right) => left - right);

  context.selectedReferenceLabel = series.dateColumns[resolvedSelectedIndex]?.label ?? "";
  const visibleSelectedIndex = [...selectedIndexes].reverse().indexOf(resolvedSelectedIndex);
  context.selectedCellColumnIndex = visibleSelectedIndex >= 0 ? visibleSelectedIndex : 0;

  return {
    ...series,
    dateColumns: selectedIndexes.map((index) => series.dateColumns[index]),
    rows: series.rows.map((row) => ({
      ...row,
      values: selectedIndexes.map((index) => row.values[index])
    }))
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
  const activeAxis = getActiveExplorerAxis();
  const context = getActiveExplorerContext();
  const axisCodes = { x: context.selectedXCode, y: context.selectedYCode, z: context.selectedZCode };
  const tableId = getActiveExplorerTemplate()?.tableId ?? EXPLORER_TARGET.tableId;
  const axisOptions = getExplorerAxisOptions(getLatestState() ?? { columns: [], rows: [], explorerPoints: [] }, tableId);

  if (elements.explorerTemplateControl) {
    const showsTemplates = explorerContextTopic === "";
    elements.explorerTemplateControl.classList.toggle("is-panel-active", showsTemplates);
    elements.explorerTemplateControl.setAttribute("aria-expanded", String(showsTemplates));
  }

  elements.explorerAxisButtons.forEach((button) => {
    const axis = button.getAttribute("data-explorer-axis");
    const isActive = axis === activeAxis;
    const isAvailable = Boolean(axisOptions[axis]?.isVisible);
    const isUnusedTabAxis = axis === "z" && (axisOptions.z?.codes?.length ?? 0) === 0;
    button.classList.toggle("is-active", isActive);
    button.classList.toggle("is-disabled", !isAvailable);
    button.disabled = !isAvailable;
    button.hidden = isUnusedTabAxis;
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

    element.title = captions[axis];
    element.replaceChildren(createAxisCaptionLine(axisCodes[axis], axis));
  });
}

// The template uses the same compact pill shape as the switchable axes, but
// deliberately remains static: template changes still happen in the panel.
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

  if (explorerContextTopic === "geography" && !getActiveExplorerGeographyAxis()) {
    explorerContextTopic = "";
    explorerGeographySearch = "";
  }

  syncExplorerBenchmarkPlacement();
  if (explorerContextTopic !== "benchmark-mode") {
    destroyExplorerBenchmarkChart(elements.explorerBenchmarkChart);
    destroyExplorerBenchmarkChart(elements.explorerBenchmarkExpandedChart);
  }
  renderExplorerSelectionPane();

  if (explorerContextTopic === "jst-code") {
    renderExplorerJstSelectionPanel(state);
    return;
  }

  if (explorerContextTopic === "reference-date") {
    renderExplorerReferenceDatePanel(state);
    return;
  }

  if (explorerContextTopic === "unit") {
    replaceExplorerContextDetail(createUnitSelectionPanel({
      selectedUnit: state?.selectedUnit,
      onSelect: (unit) => updateSelectedUnit(unit)
    }));
    return;
  }

  if (explorerContextTopic === "geography") {
    renderExplorerGeographyPanel(state);
    return;
  }

  if (explorerContextTopic === "evolution-frequency") {
    renderExplorerEvolutionFrequencyPanel();
    return;
  }

  if (explorerContextTopic === "display-mode") {
    renderExplorerDisplayModePanel();
    return;
  }

  if (explorerContextTopic === "benchmark-mode") {
    renderExplorerBenchmarkModePanel(state);
    return;
  }

  if (explorerContextTopic === "description") {
    renderExplorerDescriptionPanel();
    return;
  }

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

  // The lower pane shows templates by default. The selection and its actions
  // live in a separate, permanent pane above and cannot be replaced here.
  const searchResults = getExplorerAdvancedSearchResults(state);
  article.append(createExplorerTemplateList(searchResults.templates, activeTemplate?.tableId ?? activeExplorerTemplateId));
  replaceExplorerContextDetail(article);
}

function renderExplorerSelectionPane() {
  if (!elements.explorerContextSelection) return;
  elements.explorerContextSelection.replaceChildren(createExplorerSelectionSummaryCard());
}

function replaceExplorerContextDetail(...nodes) {
  if (!elements.explorerContextDetail) return;
  elements.explorerContextDetail.replaceChildren(...nodes);
}

function renderExplorerJstSelectionPanel(state) {
  const article = document.createElement("article");
  article.className = "explorer-context-article explorer-jst-selection-panel";

  const title = document.createElement("h2");
  title.className = "explorer-context-title";
  title.textContent = "JST code";

  const benchmark = buildExplorerBenchmark(state?.jstOptions ?? []);
  const selectedReference = getSelectedExplorerReference(state);
  const valuesByJst = new Map(benchmark.series.map((item) => {
    const point = item.values.find((candidate) => candidate.label === selectedReference?.label) ?? null;
    return [item.jstCode, point?.value ?? null];
  }));
  const list = document.createElement("div");
  list.className = "explorer-jst-selection-list";
  list.setAttribute("role", "listbox");
  list.setAttribute("aria-label", "JST code");

  (state?.jstOptions ?? []).forEach((jstCode) => {
    const isActive = jstCode === state?.selectedJst;
    const row = document.createElement("button");
    row.type = "button";
    row.className = "explorer-jst-selection-row";
    row.classList.toggle("is-active", isActive);
    row.setAttribute("role", "option");
    row.setAttribute("aria-selected", String(isActive));
    row.dataset.explorerJstCode = jstCode;

    const label = document.createElement("span");
    label.textContent = jstCode;
    const metric = document.createElement("span");
    const rawValue = valuesByJst.get(jstCode);
    metric.textContent = Number.isFinite(rawValue) ? formatBenchmarkValue(rawValue, benchmark) : "—";
    row.append(label, metric);
    row.addEventListener("click", () => {
      if (jstCode === getLatestState()?.selectedJst) return;
      updateSelectedJst(jstCode);
    });
    list.append(row);
  });

  article.append(title, list);
  replaceExplorerContextDetail(article);
}

function renderExplorerReferenceDatePanel(state) {
  const article = document.createElement("article");
  article.className = "explorer-context-article explorer-reference-date-panel";

  const title = document.createElement("h2");
  title.className = "explorer-context-title";
  title.textContent = "Reference date";

  const benchmark = buildExplorerBenchmark(state?.selectedJst ? [state.selectedJst] : []);
  const selectedReference = getSelectedExplorerReference(state);
  const valuesByReference = new Map((benchmark.series[0]?.values ?? []).map((point) => [point.label, point.value]));
  const list = document.createElement("div");
  list.className = "explorer-jst-selection-list explorer-reference-date-list";
  list.setAttribute("role", "listbox");
  list.setAttribute("aria-label", "Reference date");

  [...benchmark.dates].reverse().forEach((reference) => {
    const isActive = reference.label === selectedReference?.label;
    const row = document.createElement("button");
    row.type = "button";
    row.className = "explorer-jst-selection-row explorer-reference-date-row";
    row.classList.toggle("is-active", isActive);
    row.setAttribute("role", "option");
    row.setAttribute("aria-selected", String(isActive));

    const label = document.createElement("span");
    label.textContent = formatReferenceQuarterLabel(reference.label);
    const metric = document.createElement("span");
    const rawValue = valuesByReference.get(reference.label);
    metric.textContent = Number.isFinite(rawValue) ? formatBenchmarkValue(rawValue, benchmark) : "—";
    row.append(label, metric);
    row.addEventListener("click", () => {
      selectExplorerReferenceDate(reference.label);
    });
    list.append(row);
  });

  article.append(title, list);
  replaceExplorerContextDetail(article);
}

function selectExplorerReferenceDate(referenceLabel) {
  const context = getActiveExplorerContext();
  if (!referenceLabel || context.selectedReferenceLabel === referenceLabel) return false;
  context.selectedReferenceLabel = referenceLabel;
  context.selectedCellColumnIndex = 0;
  saveExplorerScrollPosition();
  if (getLatestState()) rerenderApp(getLatestState());
  return true;
}

function selectExplorerBenchmarkReferenceDate(referenceLabel) {
  shouldCenterExplorerReferenceColumn = true;
  const changed = selectExplorerReferenceDate(referenceLabel);
  if (!changed) scheduleExplorerReferenceColumnCentering();
}

function scheduleExplorerReferenceColumnCentering() {
  if (!shouldCenterExplorerReferenceColumn || elements.explorerTableWrap?.hidden) return;
  requestAnimationFrame(() => {
    if (!shouldCenterExplorerReferenceColumn || elements.explorerTableWrap?.hidden) return;
    const context = getActiveExplorerContext();
    const selectedColumnIndex = Math.max(0, Number(context.selectedCellColumnIndex) || 0);
    const selectedHeader = elements.explorerTable.querySelector(`thead th[data-explorer-date-column="${selectedColumnIndex}"]`);
    if (!selectedHeader) return;

    shouldCenterExplorerReferenceColumn = false;
    const viewport = elements.explorerTableWrap.getBoundingClientRect();
    const column = selectedHeader.getBoundingClientRect();
    const isFullyVisible = column.left >= viewport.left && column.right <= viewport.right;
    if (isFullyVisible) return;

    const targetLeft = Math.max(0, Math.min(
      elements.explorerTableWrap.scrollWidth - elements.explorerTableWrap.clientWidth,
      elements.explorerTableWrap.scrollLeft
        + column.left - viewport.left
        + (column.width / 2)
        - (viewport.width / 2)
    ));
    context.scrollByAxis[context.activeAxis] = {
      left: targetLeft,
      top: elements.explorerTableWrap.scrollTop
    };
    elements.explorerTableWrap.scrollTo({ left: targetLeft, behavior: "smooth" });
  });
}

function renderExplorerEvolutionFrequencyPanel() {
  const context = getActiveExplorerContext();
  const article = document.createElement("article");
  article.className = "explorer-context-article explorer-evolution-frequency-panel";

  const title = document.createElement("h2");
  title.className = "explorer-context-title";
  title.textContent = "Evolution frequency";
  const list = document.createElement("div");
  list.className = "explorer-jst-selection-list explorer-evolution-frequency-list";
  list.setAttribute("role", "listbox");
  list.setAttribute("aria-label", "Evolution frequency");

  EXPLORER_EVOLUTION_OPTIONS.forEach((option) => {
    const isActive = option.value === context.evolutionFrequency;
    const row = document.createElement("button");
    row.type = "button";
    row.className = "explorer-jst-selection-row explorer-evolution-frequency-row";
    row.classList.toggle("is-active", isActive);
    row.setAttribute("role", "option");
    row.setAttribute("aria-selected", String(isActive));
    const label = document.createElement("span");
    label.textContent = option.label;
    const detail = document.createElement("span");
    detail.textContent = option.description;
    row.append(label, detail);
    row.addEventListener("click", () => {
      if (context.evolutionFrequency === option.value) return;
      context.evolutionFrequency = option.value;
      saveExplorerScrollPosition();
      if (getLatestState()) rerenderApp(getLatestState());
    });
    list.append(row);
  });

  article.append(title, list);
  replaceExplorerContextDetail(article);
}

function renderExplorerGeographyPanel(state) {
  const article = document.createElement("article");
  article.className = "explorer-context-article explorer-geography-panel";
  const title = document.createElement("h2");
  title.className = "explorer-context-title";
  title.textContent = "Geography layout";

  const layoutList = document.createElement("div");
  layoutList.className = "explorer-geography-layout-list";
  EXPLORER_GEOGRAPHY_LAYOUTS.forEach((option) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "explorer-geography-layout-option";
    button.classList.toggle("is-active", option.value === explorerGeographyLayout);
    button.setAttribute("aria-pressed", String(option.value === explorerGeographyLayout));
    const label = document.createElement("span");
    label.textContent = option.label;
    const detail = document.createElement("span");
    detail.textContent = option.description;
    button.append(label, detail);
    button.addEventListener("click", () => {
      if (explorerGeographyLayout === option.value) return;
      explorerGeographyLayout = option.value;
      updateUrlExplorerSelectionParams();
      saveExplorerScrollPosition();
      if (getLatestState()) rerenderApp(getLatestState());
    });
    layoutList.append(button);
  });

  const countries = getExplorerGeographyCountries(state);
  const selectedCountry = countries.find((country) => country.code === explorerGeographySearch);
  if (selectedCountry && explorerGeographySearchDraft === explorerGeographySearch) {
    explorerGeographySearchDraft = selectedCountry.name;
  }
  const searchControl = document.createElement("div");
  searchControl.className = "explorer-geography-search-control";
  const search = document.createElement("input");
  search.type = "search";
  search.className = "explorer-geography-search";
  search.placeholder = "Search for a country…";
  search.setAttribute("aria-label", "Search for a country by name or ISO code");
  search.autocomplete = "off";
  search.value = explorerGeographySearchDraft;
  const suggestions = document.createElement("div");
  suggestions.className = "explorer-geography-suggestions";
  suggestions.setAttribute("role", "listbox");
  suggestions.hidden = true;
  const renderSuggestions = () => {
    const matches = getExplorerCountrySearchMatches(countries, explorerGeographySearchDraft).slice(0, 8);
    suggestions.replaceChildren();
    matches.forEach((country) => {
      const option = document.createElement("button");
      option.type = "button";
      option.className = "explorer-geography-suggestion";
      option.setAttribute("role", "option");
      const name = document.createElement("span");
      name.textContent = country.name;
      const code = document.createElement("span");
      code.textContent = country.code;
      option.append(name, code);
      option.addEventListener("mousedown", (event) => event.preventDefault());
      option.addEventListener("click", () => applyExplorerCountrySearch(country));
      suggestions.append(option);
    });
    suggestions.hidden = explorerGeographySearchDraft.trim().length === 0 || matches.length === 0;
  };
  search.addEventListener("input", () => {
    explorerGeographySearchDraft = search.value;
    renderSuggestions();
  });
  search.addEventListener("focus", renderSuggestions);
  search.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    const firstSuggestion = suggestions.querySelector(".explorer-geography-suggestion");
    if (!firstSuggestion) return;
    event.preventDefault();
    firstSuggestion.click();
  });
  search.addEventListener("blur", () => window.setTimeout(() => { suggestions.hidden = true; }, 0));
  searchControl.append(search, suggestions);

  article.append(title, layoutList, searchControl);
  if (explorerGeographySearch) {
    const clear = document.createElement("button");
    clear.type = "button";
    clear.className = "explorer-geography-clear";
    clear.textContent = "Clear country filter";
    clear.addEventListener("click", () => applyExplorerCountrySearch(null));
    article.append(clear);
  }
  replaceExplorerContextDetail(article);
}

function getExplorerCountrySearchMatches(countries, query) {
  const normalizedQuery = normalizeExplorerMetadataSearchText(query);
  if (!normalizedQuery) return [];
  return countries.map((country) => {
    const code = normalizeExplorerMetadataSearchText(country.code);
    const name = normalizeExplorerMetadataSearchText(country.name);
    const aliases = normalizeExplorerMetadataSearchText(EXPLORER_COUNTRY_SEARCH_ALIASES.get(country.code) ?? "");
    const terms = `${code} ${name} ${aliases}`;
    let score = 0;
    if (code === normalizedQuery || aliases.split(" ").includes(normalizedQuery)) score = 100;
    else if (name === normalizedQuery) score = 95;
    else if (name.startsWith(normalizedQuery)) score = 80;
    else if (aliases.split(" ").some((term) => term.startsWith(normalizedQuery))) score = 70;
    else if (terms.includes(normalizedQuery)) score = 50;
    return { ...country, score };
  }).filter((country) => country.score > 0)
    .sort((left, right) => right.score - left.score || left.name.localeCompare(right.name, "en"));
}

function applyExplorerCountrySearch(country) {
  explorerGeographySearch = country?.code ?? "";
  explorerGeographySearchDraft = country?.name ?? "";
  updateUrlExplorerSelectionParams();
  saveExplorerScrollPosition();
  if (getLatestState()) rerenderApp(getLatestState());
}

function applyExplorerGeographyPresentation(series, state) {
  const geographyAxis = getActiveExplorerGeographyAxis();
  if (!geographyAxis || getActiveExplorerAxis() !== geographyAxis) return series;

  const countriesByCode = new Map(getExplorerGeographyCountries(state).map((country) => [country.code, country]));
  const query = normalizeExplorerMetadataSearchText(explorerGeographySearch);
  const countries = series.rows.map((row) => {
    const code = normalizeAxisCode(row.code, geographyAxis);
    const country = countriesByCode.get(code) ?? { code, name: row.displayDescription || row.description || code };
    return {
      ...country,
      row
    };
  }).filter((country) => (
    !query || normalizeExplorerMetadataSearchText(`${country.code} ${country.name}`).includes(query)
  ));
  const groups = explorerGeographyLayout === "relevance"
    ? [{ label: "", countries: getTopExplorerGeographyCountries(countries, series.dateColumns.length - 1) }]
    : groupExplorerCountries(countries);
  const groupedLayout = explorerGeographyLayout === "euro-first" || explorerGeographyLayout === "world-regions";
  const rows = groups.flatMap(({ label, countries: groupedCountries }) => groupedCountries.map((country) => ({
    ...country.row,
    description: groupedLayout ? `${label} > ${country.name}` : country.name,
    displayDescription: country.name,
    hierarchyPath: groupedLayout ? `${label} > ${country.name}` : country.name,
    indentLevel: groupedLayout ? 1 : 0,
    parentPath: groupedLayout ? label : ""
  })));
  return {
    ...series,
    rows,
    status: rows.length === 0 && query ? "No country matches this search." : series.status
  };
}

function getTopExplorerGeographyCountries(countries, latestDateIndex) {
  return countries
    .map((country) => ({
      ...country,
      latestValue: country.row.values[latestDateIndex]?.value
    }))
    .filter((country) => Number.isFinite(country.latestValue))
    .sort((left, right) => right.latestValue - left.latestValue || left.name.localeCompare(right.name, "en"))
    .slice(0, 10);
}

function getExplorerGeographyCountries(state) {
  const tableId = getActiveExplorerTemplate()?.tableId;
  const axis = getActiveExplorerGeographyAxis();
  if (!tableId || !axis) return [];
  const codes = getExplorerAxisOptions(state, tableId)[axis]?.codes ?? [];
  const descriptions = new Map((state?.explorerPoints ?? [])
    .filter((point) => point.tableId === tableId && point.coordinate === `${axis}_axis_rc_code`)
    .map((point) => [normalizeAxisCode(point.code, axis), point.description]));
  return codes.map((code) => {
    const normalizedCode = normalizeAxisCode(code, axis);
    let displayName = "";
    try {
      displayName = REGION_DISPLAY_NAMES?.of(normalizedCode) ?? "";
    } catch {
      displayName = "";
    }
    return {
      code: normalizedCode,
      name: displayName && displayName !== normalizedCode
        ? displayName
        : descriptions.get(normalizedCode) || normalizedCode
    };
  });
}

function groupExplorerCountries(countries) {
  const alphabetic = (values) => [...values].sort((left, right) => left.name.localeCompare(right.name, "en", { sensitivity: "base" }));
  if (explorerGeographyLayout === "alphabetical") {
    return [{ label: "", countries: alphabetic(countries) }];
  }
  const definitions = explorerGeographyLayout === "world-regions"
    ? [
        ["Europe", (code) => EUROPE_CODES.has(code)],
        ["Middle East", (code) => MIDDLE_EAST_CODES.has(code)],
        ["Africa", (code) => AFRICA_CODES.has(code)],
        ["Americas", (code) => AMERICAS_CODES.has(code)],
        ["Asia-Pacific", () => true]
      ]
    : [
        ["Euro area", (code) => EURO_AREA_CODES.has(code)],
        ["European Union outside the euro area", (code) => EU_CODES.has(code)],
        ["Other European countries", (code) => EUROPE_CODES.has(code)],
        ["Rest of the world", () => true]
      ];
  const remaining = new Set(countries);
  return definitions.map(([label, matches]) => {
    const matchesForGroup = alphabetic([...remaining].filter((country) => matches(country.code)));
    matchesForGroup.forEach((country) => remaining.delete(country));
    return { countries: matchesForGroup, label };
  }).filter((group) => group.countries.length > 0);
}

function renderExplorerDisplayModePanel() {
  const context = getActiveExplorerContext();
  const article = document.createElement("article");
  article.className = "explorer-context-article explorer-display-mode-panel";
  const title = document.createElement("h2");
  title.className = "explorer-context-title";
  title.textContent = "Table display";
  const list = document.createElement("div");
  list.className = "explorer-jst-selection-list explorer-display-mode-list";
  list.setAttribute("role", "listbox");
  list.setAttribute("aria-label", "Table display");

  EXPLORER_DISPLAY_OPTIONS.forEach((option) => {
    const isActive = option.value === context.displayMode;
    const row = document.createElement("button");
    row.type = "button";
    row.className = "explorer-jst-selection-row explorer-display-mode-row";
    row.classList.toggle("is-active", isActive);
    row.setAttribute("role", "option");
    row.setAttribute("aria-selected", String(isActive));
    const label = document.createElement("span");
    label.textContent = option.label;
    const detail = document.createElement("span");
    detail.textContent = option.description;
    row.append(label, detail);
    row.addEventListener("click", () => {
      if (context.displayMode === option.value) return;
      context.displayMode = option.value;
      context.selectedCellColumnIndex = 0;
      saveExplorerScrollPosition();
      if (getLatestState()) rerenderApp(getLatestState());
    });
    list.append(row);
  });

  article.append(title, list);
  if (context.displayMode === "temporal") {
    article.append(createExplorerHistoryDepthControl());
  }
  replaceExplorerContextDetail(article);
}

function createExplorerHistoryDepthControl() {
  const context = getActiveExplorerContext();
  const references = getReferenceColumns(getLatestState()?.columns ?? []);
  const selectedReference = getSelectedExplorerReference();
  const anchorYear = selectedReference?.date?.getFullYear() ?? references.at(-1)?.date?.getFullYear();
  const firstYear = references[0]?.date?.getFullYear() ?? anchorYear;
  const maximumYears = Math.max(0, (anchorYear ?? firstYear ?? 0) - (firstYear ?? anchorYear ?? 0));
  context.historyYears = Math.min(context.historyYears, maximumYears);

  const section = document.createElement("section");
  section.className = "explorer-history-depth-control";
  const heading = document.createElement("div");
  heading.className = "explorer-history-depth-heading";
  const label = document.createElement("span");
  label.textContent = "History depth";
  const value = document.createElement("span");
  value.className = "explorer-history-depth-value";
  const updateValue = (years) => {
    value.textContent = years === 0
      ? "Current year"
      : `Current year + ${years} prior ${years === 1 ? "year" : "years"}`;
  };
  updateValue(context.historyYears);
  heading.append(label, value);

  const input = document.createElement("input");
  input.type = "range";
  input.min = "0";
  input.max = String(maximumYears);
  input.step = "1";
  input.value = String(context.historyYears);
  input.disabled = maximumYears === 0;
  input.setAttribute("aria-label", "History depth in prior calendar years");
  input.addEventListener("input", () => updateValue(Number(input.value)));
  input.addEventListener("change", () => {
    context.historyYears = Number(input.value);
    saveExplorerScrollPosition();
    if (getLatestState()) rerenderApp(getLatestState());
  });

  const hint = document.createElement("p");
  hint.textContent = "Limits the table only. The benchmark always uses the full available history.";
  section.append(heading, input, hint);
  return section;
}

function renderExplorerBenchmarkModePanel(state) {
  const article = document.createElement("article");
  article.className = "explorer-context-article explorer-benchmark-mode-panel";
  const title = document.createElement("h2");
  title.className = "explorer-context-title";
  title.textContent = "Benchmark display";
  const list = document.createElement("div");
  list.className = "explorer-jst-selection-list explorer-benchmark-mode-list";
  list.setAttribute("role", "listbox");
  list.setAttribute("aria-label", "Benchmark display");

  [
    { value: "explicit", label: "Benchmark", detail: "Named institutions and peer curves" },
    { value: "anonymised", label: "Anonymous benchmark", detail: "Anonymized peer percentile distribution" }
  ].forEach((option) => {
    const activeMode = state?.peerDisplayMode === "anonymised" ? "anonymised" : "explicit";
    const isActive = activeMode === option.value;
    const row = document.createElement("button");
    row.type = "button";
    row.className = "explorer-jst-selection-row explorer-benchmark-mode-row";
    row.classList.toggle("is-active", isActive);
    row.setAttribute("role", "option");
    row.setAttribute("aria-selected", String(isActive));
    const label = document.createElement("span");
    label.textContent = option.label;
    const detail = document.createElement("span");
    detail.textContent = option.detail;
    row.append(label, detail);
    row.addEventListener("click", () => {
      if (activeMode === option.value) return;
      hasInteractedWithExplorerSelection = true;
      saveExplorerScrollPosition();
      updatePeerDisplayMode(option.value);
    });
    list.append(row);
  });

  article.append(title, list);
  replaceExplorerContextDetail(article);
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

  replaceExplorerContextDetail(article);
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
  const update = explorerPeerSelectionActions?.updatePeerDisplayMode ?? updatePeerDisplayMode;
  update?.(peerDisplayMode);
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

// Mirrors the size/shape of Credit Risk's small selected-data card. Benchmark
// display is controlled exclusively from the filter row; this permanent pane
// now retains only the action tied directly to the selected hierarchy node.
function createExplorerSelectionSummaryCard() {
  const captions = getExplorerAxisCaptions();
  const selectedReference = getSelectedExplorerReference();
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
      const content = document.createElement("span");
      content.className = "explorer-selection-summary-content";
      content.textContent = value;
      line.append(strong, content);
      description.append(line);
    });
  }

  const metrics = getExplorerSelectedPointMetrics();
  if (metrics) description.append(createExplorerSelectionMetrics(metrics));
  if (selectedReference) {
    const referenceLine = document.createElement("p");
    referenceLine.className = "explorer-selection-summary-line";
    const referenceLabel = document.createElement("span");
    referenceLabel.className = "explorer-selection-summary-label";
    referenceLabel.textContent = "Reference date: ";
    const referenceValue = document.createElement("span");
    referenceValue.className = "explorer-selection-summary-content";
    referenceValue.textContent = formatReferenceQuarterLabel(selectedReference.label);
    referenceLine.append(referenceLabel, referenceValue);
    description.append(referenceLine);
  }

  pane.append(description);
  return pane;
}

function getExplorerSelectedPointMetrics() {
  const state = getLatestState();
  const template = getActiveExplorerTemplate();
  const context = getActiveExplorerContext();
  const selectedCode = getSelectedExplorerCodeForActiveAxis();
  if (!state || !selectedCode) return null;

  const series = buildExplorerAxisSeries(state, {
    axis: context.activeAxis,
    selectedXCode: context.selectedXCode,
    selectedYCode: context.selectedYCode,
    selectedZCode: context.selectedZCode,
    tableId: template?.tableId,
    templateSelections: getExplorerTemplateSelections(),
    templates: getExplorerTemplates(state)
  });
  const rows = series.rows.map(normalizeExplorerSeriesRow);
  const row = rows.find((item) => item.code === selectedCode);
  const selectedReference = getSelectedExplorerReference(state);
  const currentIndex = series.dateColumns.findIndex((column) => column.label === selectedReference?.label);
  if (!row || currentIndex < 0) return null;

  const currentValue = row.values[currentIndex]?.value ?? null;
  const changes = [
    { label: "Quarter-on-quarter", offset: 1 },
    { label: "Six-month change", offset: 2 },
    { label: "Year-on-year", offset: 4 }
  ].map(({ label, offset }) => {
    const previousValue = currentIndex >= offset ? row.values[currentIndex - offset]?.value ?? null : null;
    const absolute = Number.isFinite(currentValue) && Number.isFinite(previousValue)
      ? currentValue - previousValue
      : null;
    const relative = Number.isFinite(absolute) && previousValue !== 0
      ? absolute / Math.abs(previousValue)
      : null;
    return { absolute, label, previousValue, relative };
  });
  const parentPath = normalizeHierarchyPath(row.parentPath);
  const parentRow = parentPath
    ? rows.find((item) => normalizeHierarchyPath(item.hierarchyPath) === parentPath)
    : null;
  const parentValue = parentRow?.values?.[currentIndex]?.value ?? null;
  const parentShare = Number.isFinite(currentValue) && Number.isFinite(parentValue) && parentValue !== 0
    ? currentValue / Math.abs(parentValue)
    : null;
  return {
    changes,
    currentValue,
    format: row.format,
    parentLabel: parentRow?.description ?? "",
    parentShare,
    parentValue,
    selectedUnit: state.selectedUnit
  };
}

function createExplorerSelectionMetrics(metrics) {
  const value = document.createElement("p");
  value.className = "explorer-selection-summary-line explorer-selection-summary-value-line";
  const valueLabel = document.createElement("span");
  valueLabel.className = "explorer-selection-summary-value-label";
  valueLabel.textContent = "Value: ";
  const valueText = document.createElement("span");
  valueText.className = "explorer-selection-summary-value";
  valueText.textContent = Number.isFinite(metrics.currentValue)
    ? formatMetricValue(metrics.currentValue, metrics.selectedUnit, metrics.format)
    : "-";
  value.append(valueLabel, valueText);
  return value;
}

function renderExplorerDescriptionPanel() {
  const article = document.createElement("article");
  article.className = "explorer-context-article explorer-description-panel";

  const title = document.createElement("h2");
  title.className = "explorer-context-title";
  title.textContent = "Description";
  article.append(title);

  const metrics = getExplorerSelectedPointMetrics();
  if (!metrics || !Number.isFinite(metrics.currentValue)) {
    const empty = document.createElement("p");
    empty.className = "explorer-description-empty";
    empty.textContent = "No value is available for the current selection.";
    article.append(empty);
    replaceExplorerContextDetail(article);
    return;
  }

  const formatValue = (value, signed = false) => {
    if (!Number.isFinite(value)) return "-";
    if (isPercentFormat(metrics.format)) {
      const formatted = formatMetricValue(value, "euros", metrics.format);
      return signed && value > 0 ? `+${formatted}` : formatted;
    }
    return signed
      ? formatSignedMetricValue(value, metrics.selectedUnit)
      : formatMetricValue(value, metrics.selectedUnit, metrics.format);
  };

  const lead = document.createElement("p");
  lead.className = "explorer-description-lead";
  lead.textContent = `The selected figure is ${formatValue(metrics.currentValue)}.`;
  article.append(lead);

  const movements = document.createElement("div");
  movements.className = "explorer-description-movements";
  metrics.changes.forEach((change) => {
    const section = document.createElement("section");
    section.className = "explorer-description-movement";
    const heading = document.createElement("h3");
    heading.textContent = change.label;
    const copy = document.createElement("p");
    if (!Number.isFinite(change.previousValue) || !Number.isFinite(change.absolute)) {
      copy.textContent = "No comparable figure is available for this horizon.";
    } else if (change.absolute === 0) {
      copy.textContent = `The selected figure remained unchanged at ${formatValue(metrics.currentValue)}.`;
    } else {
      const direction = change.absolute > 0 ? "increased" : "decreased";
      const relativeText = Number.isFinite(change.relative) ? ` (${formatSignedPercent(change.relative)})` : "";
      copy.textContent = `The selected figure ${direction} from ${formatValue(change.previousValue)} to ${formatValue(metrics.currentValue)}: ${formatValue(change.absolute, true)}${relativeText}.`;
    }
    section.append(heading, copy);
    movements.append(section);
  });
  article.append(movements);

  if (Number.isFinite(metrics.parentShare) && metrics.parentLabel) {
    const parent = document.createElement("p");
    parent.className = "explorer-description-parent";
    const share = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(metrics.parentShare * 100);
    parent.textContent = `The selected figure represents ${share} % of its parent, ${metrics.parentLabel}.`;
    article.append(parent);
  }

  replaceExplorerContextDetail(article);
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

  if (templates.length === 0) {
    const empty = document.createElement("div");
    empty.className = "explorer-template-search-empty";
    empty.textContent = "No metadata matches this search.";
    list.append(empty);
  }

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
function createAxisCaptionLine(code, axis = "") {
  const wrapper = document.createElement("span");
  wrapper.className = "axis-tab-lines";
  const line = document.createElement("span");
  line.className = "axis-tab-line axis-tab-main";
  line.textContent = `${getExplorerAxisDisplayName(axis)} : ${code || "none"}`;
  wrapper.append(line);

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
  const { shouldFocus = false, cellColumnIndex, cellDate = "" } = options;
  hasInteractedWithExplorerSelection = true;
  const context = getActiveExplorerContext();
  const activeAxis = context.activeAxis;

  // Only overwrite the highlighted cell when a specific cell was clicked
  // (see the click handler). Row-only selection — keyboard nav, hierarchy
  // toggles — leaves whichever column was last picked untouched.
  if (Number.isFinite(cellColumnIndex)) {
    context.selectedCellColumnIndex = cellColumnIndex;
  }
  if (cellDate) {
    context.selectedReferenceLabel = cellDate;
    context.selectedCellColumnIndex = 0;
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

  elements.explorerTable.querySelectorAll(".is-selected-date-column, .is-selected-date-header, .is-selected-year-header").forEach((element) => {
    element.classList.remove("is-selected-date-column", "is-selected-date-header", "is-selected-year-header");
  });

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

  if (getActiveExplorerContext().displayMode !== "focus") {
    const selectedColumnIndex = Math.max(0, Number(getActiveExplorerContext().selectedCellColumnIndex) || 0);
    const selectedHeader = elements.explorerTable.querySelector(`thead th[data-explorer-date-column="${selectedColumnIndex}"]`);
    selectedHeader?.classList.add("is-selected-date-header");
    const selectedYearHeader = [...elements.explorerTable.querySelectorAll("thead th.explorer-year-header")].find((header) => (
      selectedColumnIndex >= Number(header.dataset.explorerYearColumnStart)
      && selectedColumnIndex <= Number(header.dataset.explorerYearColumnEnd)
    ));
    selectedYearHeader?.classList.add("is-selected-year-header");
  }

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
