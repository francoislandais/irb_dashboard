import { parseCsv } from "./csvParser.js";
import { normalizeAxisCode } from "./core/axisCode.js";

const MODULE_2_CONFIG_URL = "./assets/ITS_all_dimension_mapping.csv";

export async function loadModule2Points() {
  const response = await fetch(MODULE_2_CONFIG_URL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("La configuration interne du module 2 n'a pas pu être chargée.");
  }

  const parsed = parseCsv(await response.text());
  return parseModule2Points(parsed.columns, parsed.rows);
}

export function parseModule2Points(columns, rows) {
  const indexes = {
    tableId: columns.indexOf("table_id"),
    coordinate: columns.indexOf("coordinate"),
    code: columns.indexOf("code"),
    description: columns.indexOf("description"),
    format: columns.indexOf("format"),
    ignore: columns.indexOf("ignore"),
    orderFirst: columns.indexOf("order_first")
  };

  if ([indexes.tableId, indexes.coordinate, indexes.code, indexes.description].some((index) => index === -1)) {
    throw new Error("La configuration interne du module 2 n'a pas la structure attendue.");
  }

  return rows
    .map((row, index) => {
      const description = row[indexes.description];
      const hierarchy = parseDescriptionHierarchy(description);

      return {
        code: normalizeAxisCode(row[indexes.code], row[indexes.coordinate]),
        description,
        displayDescription: hierarchy.label,
        format: indexes.format === -1 ? "" : String(row[indexes.format] ?? "").trim(),
        hierarchyPath: hierarchy.path,
        parentPath: hierarchy.parentPath,
        indentLevel: hierarchy.level,
        ignore: indexes.ignore === -1 ? "" : String(row[indexes.ignore] ?? "").trim(),
        order: parseOrder(indexes.orderFirst === -1 ? "" : row[indexes.orderFirst], index),
        tableId: row[indexes.tableId],
        coordinate: row[indexes.coordinate]
      };
    })
    .filter((point) => (
      ["x_axis_rc_code", "y_axis_rc_code", "z_axis_rc_code"].includes(point.coordinate)
      && point.code
      && point.description
      && point.ignore !== "Y"
    ))
    .sort((left, right) => left.order - right.order);
}

function parseDescriptionHierarchy(description) {
  const parts = String(description ?? "")
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);

  return {
    label: parts.at(-1) ?? "",
    level: Math.max(0, parts.length - 1),
    parentPath: parts.slice(0, -1).join(" > "),
    path: parts.join(" > ")
  };
}

function parseOrder(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
