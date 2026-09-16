import { parseCsv } from "./csvParser.js?v=20260917-kri-formula";

const EXPLORER_DEFAULT_EXPAND_DEPTH_URL = "./assets/ITS_explorer_default_expand_depth.csv";

export async function loadExplorerDefaultExpandDepth() {
  const response = await fetch(EXPLORER_DEFAULT_EXPAND_DEPTH_URL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("La configuration interne des niveaux de dépliement par défaut n'a pas pu être chargée.");
  }

  const parsed = parseCsv(await response.text());
  return parseExplorerDefaultExpandDepth(parsed.columns, parsed.rows);
}

// One row per template, keyed by the template's own selection id (the one
// picked in the template list / carried in the URL) - for a table split
// into row-sections (EXPLORER_TEMPLATE_ROW_SECTIONS in explorer.js), that's
// the section id (e.g. "C_75.01#central-bank"), not the shared table_id.
export function parseExplorerDefaultExpandDepth(columns, rows) {
  const indexes = {
    tableId: columns.indexOf("table_id"),
    x: columns.indexOf("x_axis_default_depth"),
    y: columns.indexOf("y_axis_default_depth"),
    z: columns.indexOf("z_axis_default_depth")
  };

  if (indexes.tableId === -1) {
    throw new Error("La configuration interne des niveaux de dépliement par défaut n'a pas la structure attendue.");
  }

  const depthByTableId = new Map();

  rows.forEach((row) => {
    const tableId = row[indexes.tableId];
    if (!tableId) return;

    depthByTableId.set(tableId, {
      x: parseDepth(indexes.x === -1 ? "" : row[indexes.x]),
      y: parseDepth(indexes.y === -1 ? "" : row[indexes.y]),
      z: parseDepth(indexes.z === -1 ? "" : row[indexes.z])
    });
  });

  return depthByTableId;
}

function parseDepth(value) {
  const trimmed = String(value ?? "").trim();
  if (trimmed === "") return null;

  const parsed = Number(trimmed);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

export function getExplorerDefaultExpandDepth(depthByTableId, tableId, axis) {
  return depthByTableId?.get(tableId)?.[axis] ?? null;
}
