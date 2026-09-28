import { parseCsv } from "./csvParser.js?v=20260917-kri-formula";
import { normalizeAxisCode } from "./core/axisCode.js?v=20260921-z-axis-padding";
import { createCoordinateHierarchyResolver } from "./core/coordinateHierarchy.js?v=20260928-local-description";

const EXPLORER_CONFIG_URL = "./assets/ITS_all_dimension_mapping.csv";

export async function loadExplorerPoints() {
  const response = await fetch(EXPLORER_CONFIG_URL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("La configuration interne du module Explorer n'a pas pu être chargée.");
  }

  const parsed = parseCsv(await response.text());
  return parseExplorerPoints(parsed.columns, parsed.rows);
}

export function parseExplorerPoints(columns, rows) {
  const indexes = {
    tableId: columns.indexOf("table_id"),
    coordinate: columns.indexOf("coordinate"),
    code: columns.indexOf("code"),
    parentCoordinateCode: columns.indexOf("parent_coordinate_code"),
    description: columns.indexOf("description"),
    format: columns.indexOf("format"),
    ignore: columns.indexOf("ignore"),
    orderFirst: columns.indexOf("order_first")
  };

  if ([indexes.tableId, indexes.coordinate, indexes.code, indexes.description].some((index) => index === -1)) {
    throw new Error("La configuration interne du module Explorer n'a pas la structure attendue.");
  }

  const points = rows
    .map((row, index) => {
      const description = row[indexes.description];

      return {
        code: normalizeAxisCode(row[indexes.code], row[indexes.coordinate]),
        description,
        parentCoordinateCode: indexes.parentCoordinateCode === -1
          ? ""
          : normalizeAxisCode(row[indexes.parentCoordinateCode], row[indexes.coordinate]),
        format: indexes.format === -1 ? "" : String(row[indexes.format] ?? "").trim(),
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
    ))
    .sort((left, right) => left.order - right.order);

  const hierarchyResolver = createCoordinateHierarchyResolver(points, {
    legacySlashPaths: indexes.parentCoordinateCode === -1
  });
  return points.map((point) => {
    const hierarchy = hierarchyResolver.resolve(point);
    return {
      ...point,
      fullDescription: hierarchy.components.join(" / "),
      displayDescription: hierarchy.label,
      hierarchyPath: hierarchy.path,
      pathComponents: hierarchy.components,
      parentPath: hierarchy.parentPath,
      indentLevel: hierarchy.level
    };
  }).filter((point) => point.ignore !== "Y");
}

function parseOrder(value, fallback) {
  const trimmed = String(value ?? "").trim();
  if (trimmed === "") return fallback;

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : fallback;
}
