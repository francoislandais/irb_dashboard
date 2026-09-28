import { parseCsv } from "./csvParser.js?v=20260917-kri-formula";
import { createDimensionMapping } from "./dimensionMapping.js?v=20260917-kri-formula";
import { parseExplorerPoints } from "./explorerConfig.js?v=20260921-hierarchy-gt-escape";

const TAXONOMY_DATA_URL = "./assets/ITS_all_dimension_mapping.csv";
let sourcePromise = null;

export async function loadTaxonomyDimensionData(requestedTaxonomy = "") {
  const { columns, rows } = await loadSource();
  const frameworkIndex = columns.indexOf("framework");
  if (frameworkIndex === -1) {
    throw new Error("Le dictionnaire de test doit contenir une colonne framework.");
  }

  const availableTaxonomies = [...new Set(rows
    .map((row) => String(row[frameworkIndex] ?? "").trim())
    .filter(Boolean))]
    .sort((left, right) => left.localeCompare(right, "en", { numeric: true }));
  const selectedTaxonomy = availableTaxonomies.includes(requestedTaxonomy)
    ? requestedTaxonomy
    : availableTaxonomies.at(-1) ?? "";
  if (!selectedTaxonomy) throw new Error("Aucune taxonomie n'a été trouvée dans le dictionnaire.");

  const selectedRows = deduplicateFrameworkRows(
    rows.filter((row) => String(row[frameworkIndex] ?? "").trim() === selectedTaxonomy),
    columns
  );

  return {
    availableTaxonomies,
    selectedTaxonomy,
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
