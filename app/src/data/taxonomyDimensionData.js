import { parseCsv } from "./csvParser.js?v=20260917-kri-formula";
import { createDimensionMapping } from "./dimensionMapping.js?v=20260928-dictionary-casing";
import { parseExplorerPoints } from "./explorerConfig.js?v=20260928-dictionary-casing";

const TAXONOMY_DATA_URL = "./assets/ITS_all_dimension_mapping.csv";
let sourcePromise = null;

export async function loadTaxonomyDimensionData(requestedTaxonomies = {}) {
  const { columns, rows } = await loadSource();
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
    availableTaxonomiesByTemplate[tableId] = availableTaxonomies;
    selectedTaxonomiesByTemplate[tableId] = availableTaxonomies.includes(requested)
      ? requested
      : availableTaxonomies.at(-1) ?? "";
  });

  const selectedRows = deduplicateFrameworkRows(
    rows.filter((row) => selectedTaxonomiesByTemplate[row[tableIdIndex]] === String(row[frameworkIndex] ?? "").trim()),
    columns
  );

  return {
    availableTaxonomiesByTemplate,
    selectedTaxonomiesByTemplate,
    dimensionMapping: createDimensionMapping(columns, selectedRows),
    explorerPoints: parseExplorerPoints(columns, selectedRows)
  };
}

async function loadSource() {
  if (!sourcePromise) {
    sourcePromise = fetch(TAXONOMY_DATA_URL, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Le dictionnaire versionné n'a pas pu être chargé.");
        return parseCsv(await response.text());
      })
      .catch((error) => {
        sourcePromise = null;
        throw error;
      });
  }
  return sourcePromise;
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
