import { parseCsv } from "./csvParser.js?v=20260917-kri-formula";
import { createDimensionMapping } from "./dimensionMapping.js?v=20260928-dictionary-casing";
import { parseExplorerPoints } from "./explorerConfig.js?v=20260928-dictionary-casing";
import { readResponseTextWithProgress } from "./core/downloadProgress.js";

const TAXONOMY_DATA_URL = "./assets/ITS_all_dimension_mapping.csv";
const TAXONOMY_HISTORY_URL = "./assets/ITS_template_taxonomy_history.csv";
const KRI_DIMENSION_DATA_URL = "./assets/KRI_dimension_mapping.csv";
let sourcePromise = null;
let historyPromise = null;
let kriPointsPromise = null;
const resolvedTaxonomyDataCache = new Map();
const frameworkDimensionCache = new Map();

export async function loadTaxonomyDimensionData(requestedTaxonomies = {}, { referenceDate = "", onDownloadProgress } = {}) {
  const [{ columns, rows }, history, kriPoints] = await Promise.all([
    loadSource(onDownloadProgress), loadTaxonomyHistory(), loadKriDimensionPoints()
  ]);
  const frameworkIndex = columns.indexOf("framework");
  const tableIdIndex = columns.indexOf("table_id");
  if (frameworkIndex === -1 || tableIdIndex === -1) {
    throw new Error("Le dictionnaire des taxonomies doit contenir les colonnes framework et table_id.");
  }

  const taxonomiesByTemplate = new Map();
  rows.forEach((row) => {
    const tableId = String(row[tableIdIndex] ?? "").trim();
    const framework = String(row[frameworkIndex] ?? "").trim();
    if (!tableId || !framework) return;
    if (!taxonomiesByTemplate.has(tableId)) taxonomiesByTemplate.set(tableId, new Set());
    taxonomiesByTemplate.get(tableId).add(framework);
  });

  const availableTaxonomiesByTemplate = {};
  const selectedTaxonomiesByTemplate = {};
  taxonomiesByTemplate.forEach((taxonomies, tableId) => {
    const availableTaxonomies = [...taxonomies]
      .sort((left, right) => left.localeCompare(right, "en", { numeric: true }));
    const requested = requestedTaxonomies?.[tableId];
    const dateScoped = referenceDate
      ? getTaxonomyForReferenceDate(tableId, referenceDate, history, availableTaxonomies)
      : "";
    availableTaxonomiesByTemplate[tableId] = availableTaxonomies;
    selectedTaxonomiesByTemplate[tableId] = availableTaxonomies.includes(dateScoped)
      ? dateScoped
      : availableTaxonomies.includes(requested)
        ? requested
        : availableTaxonomies.at(-1) ?? "";
  });

  const selectionKey = Object.entries(selectedTaxonomiesByTemplate)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([tableId, framework]) => `${tableId}\u001f${framework}`)
    .join("\u001e");
  const cached = resolvedTaxonomyDataCache.get(selectionKey);
  if (cached) return cached;

  const selectedRows = deduplicateFrameworkRows(
    rows.filter((row) => selectedTaxonomiesByTemplate[row[tableIdIndex]] === String(row[frameworkIndex] ?? "").trim()),
    columns
  );

  const resolvedData = {
    availableTaxonomiesByTemplate,
    selectedTaxonomiesByTemplate,
    dimensionMapping: createDimensionMapping(columns, selectedRows),
    // KRI is not an EBA taxonomy. Its names, order and formats must survive
    // every regeneration of the versioned ITS dimension mapping.
    explorerPoints: [...parseExplorerPoints(columns, selectedRows), ...kriPoints],
    taxonomySource: { columns, rows },
    taxonomyHistory: history
  };
  resolvedTaxonomyDataCache.set(selectionKey, resolvedData);
  if (resolvedTaxonomyDataCache.size > 12) {
    resolvedTaxonomyDataCache.delete(resolvedTaxonomyDataCache.keys().next().value);
  }
  return resolvedData;
}

export function getTaxonomyFrameworkForDate(state, tableId, referenceDate) {
  const available = state?.availableTaxonomiesByTemplate?.[tableId] ?? [];
  return getTaxonomyForReferenceDate(tableId, referenceDate, state?.taxonomyHistory, available);
}

export function getTaxonomyDataForTemplateFramework(state, tableId, framework) {
  if (!tableId || !framework) return null;
  if (state?.selectedTaxonomiesByTemplate?.[tableId] === framework) {
    return { dimensionMapping: state.dimensionMapping, explorerPoints: state.explorerPoints };
  }

  const source = state?.taxonomySource;
  if (!source?.columns || !source?.rows) return null;
  const cacheKey = `${tableId}\u001f${framework}`;
  if (frameworkDimensionCache.has(cacheKey)) return frameworkDimensionCache.get(cacheKey);

  const tableIndex = source.columns.indexOf("table_id");
  const frameworkIndex = source.columns.indexOf("framework");
  if (tableIndex < 0 || frameworkIndex < 0) return null;
  const rows = source.rows.filter((row) => (
    String(row[tableIndex] ?? "").trim() === tableId
    && String(row[frameworkIndex] ?? "").trim() === framework
  ));
  if (rows.length === 0) return null;
  const uniqueRows = deduplicateFrameworkRows(rows, source.columns);
  const data = {
    dimensionMapping: createDimensionMapping(source.columns, uniqueRows),
    explorerPoints: parseExplorerPoints(source.columns, uniqueRows)
  };
  frameworkDimensionCache.set(cacheKey, data);
  if (frameworkDimensionCache.size > 48) {
    frameworkDimensionCache.delete(frameworkDimensionCache.keys().next().value);
  }
  return data;
}

async function loadSource(onDownloadProgress) {
  if (!sourcePromise) {
    sourcePromise = fetch(TAXONOMY_DATA_URL, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Le dictionnaire versionné n'a pas pu être chargé.");
        return parseCsv(await readResponseTextWithProgress(response, onDownloadProgress));
      })
      .catch((error) => {
        sourcePromise = null;
        throw error;
      });
  }
  return sourcePromise;
}

async function loadTaxonomyHistory() {
  if (!historyPromise) {
    historyPromise = fetchCsv(TAXONOMY_HISTORY_URL).catch((error) => {
      historyPromise = null;
      throw error;
    });
  }
  return historyPromise;
}

async function loadKriDimensionPoints() {
  if (!kriPointsPromise) {
    kriPointsPromise = fetchCsv(KRI_DIMENSION_DATA_URL, "Le référentiel KRI n'a pas pu être chargé.")
      .then(({ columns, rows }) => parseExplorerPoints(columns, rows))
      .catch((error) => {
        kriPointsPromise = null;
        throw error;
      });
  }
  return kriPointsPromise;
}

async function fetchCsv(url, errorMessage = "L'historique des taxonomies n'a pas pu être chargé.") {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(errorMessage);
  return parseCsv(await response.text());
}

function getTaxonomyForReferenceDate(tableId, referenceDate, history, availableTaxonomies) {
  if (!history?.columns || !history?.rows || availableTaxonomies.length === 0) return "";
  const tableIndex = history.columns.indexOf("table_id");
  const frameworkIndex = history.columns.indexOf("framework");
  const fromIndex = history.columns.indexOf("effective_from");
  const toIndex = history.columns.indexOf("effective_to");
  if ([tableIndex, frameworkIndex, fromIndex, toIndex].some((index) => index < 0)) return "";

  const date = normalizeReferenceDate(referenceDate);
  if (!date) return "";
  const candidates = history.rows
    .filter((row) => {
      if (String(row[tableIndex] ?? "").trim() !== tableId) return false;
      if (!availableTaxonomies.includes(String(row[frameworkIndex] ?? "").trim())) return false;
      const from = String(row[fromIndex] ?? "").trim();
      const to = String(row[toIndex] ?? "").trim();
      return from && from <= date && (!to || date <= to);
    })
    .sort((left, right) => {
      const byStartDate = String(right[fromIndex] ?? "").localeCompare(String(left[fromIndex] ?? ""));
      if (byStartDate) return byStartDate;
      return String(right[frameworkIndex] ?? "").localeCompare(String(left[frameworkIndex] ?? ""), "en", { numeric: true });
    });
  if (candidates.length) return String(candidates[0][frameworkIndex] ?? "").trim();

  // A reference date before the recorded history uses the earliest available release.
  const first = history.rows
    .filter((row) => String(row[tableIndex] ?? "").trim() === tableId
      && availableTaxonomies.includes(String(row[frameworkIndex] ?? "").trim()))
    .sort((left, right) => String(left[fromIndex] ?? "").localeCompare(String(right[fromIndex] ?? "")))[0];
  return String(first?.[frameworkIndex] ?? "").trim();
}

function normalizeReferenceDate(value) {
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    // Reference-column dates are constructed at local midnight by
    // getReferenceColumns. Converting that instant to UTC first can move a
    // quarter-end to the previous day in positive time zones (e.g. Paris),
    // which would select the wrong framework on an effective-date boundary.
    const year = String(value.getFullYear()).padStart(4, "0");
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  const normalized = String(value ?? "").trim().replace(/^ref_/, "").replaceAll("_", "-");
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : "";
}

function deduplicateFrameworkRows(rows, columns) {
  const indexes = ["table_id", "coordinate", "code"]
    .map((column) => columns.indexOf(column));
  if (indexes.some((index) => index === -1)) return rows;

  const seen = new Set();
  return rows.filter((row) => {
    const key = indexes.map((index) => row[index] ?? "").join("\u001f");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
