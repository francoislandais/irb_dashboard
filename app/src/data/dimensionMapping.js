import { parseCsv } from "./csvParser.js";
import { normalizeAxisCode } from "./core/axisCode.js";

const MAPPING_URL = "./assets/ITS_all_dimension_mapping.csv";

export async function loadDimensionMapping() {
  const response = await fetch(MAPPING_URL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Le fichier interne de mapping n'a pas pu être chargé.");
  }

  const parsed = parseCsv(await response.text());
  return createDimensionMapping(parsed.columns, parsed.rows);
}

export function createDimensionMapping(columns, rows) {
  const indexes = {
    tableId: columns.indexOf("table_id"),
    coordinate: columns.indexOf("coordinate"),
    code: columns.indexOf("code"),
    description: columns.indexOf("description"),
    format: columns.indexOf("format")
  };

  if ([indexes.tableId, indexes.coordinate, indexes.code, indexes.description].some((index) => index === -1)) {
    throw new Error("Le fichier interne de mapping n'a pas la structure attendue.");
  }

  const byCoordinate = new Map();
  const entries = [];
  rows.forEach((row) => {
    const tableId = row[indexes.tableId];
    const coordinate = row[indexes.coordinate];
    const sourceCode = row[indexes.code];
    const description = row[indexes.description];
    const format = indexes.format === -1 ? "" : String(row[indexes.format] ?? "").trim();

    if (!tableId || !coordinate || !sourceCode || !description) return;

    const entry = {
      code: normalizeMappingCode(sourceCode, coordinate),
      coordinate,
      description,
      format,
      tableId
    };

    entries.push(entry);
    byCoordinate.set(makeMappingKey(tableId, coordinate, sourceCode), entry);
  });

  return {
    find(tableId, coordinate, code) {
      return byCoordinate.get(makeMappingKey(tableId, coordinate, code)) ?? null;
    },

    list(tableId, coordinate) {
      return entries.filter((entry) => (
        entry.tableId === tableId
        && entry.coordinate === coordinate
      ));
    },

    describePoint({ tableId, xAxisRcCode, yAxisRcCode, zAxisRcCode }) {
      const coordinates = [
        ["x_axis_rc_code", xAxisRcCode],
        ["y_axis_rc_code", yAxisRcCode],
        ["z_axis_rc_code", zAxisRcCode]
      ];

      return coordinates
        .filter(([, code]) => code)
        .map(([coordinate, code]) => this.find(tableId, coordinate, code))
        .filter(Boolean);
    }
  };
}

function makeMappingKey(tableId, coordinate, code) {
  return `${tableId}::${coordinate}::${normalizeMappingCode(code, coordinate)}`;
}

function normalizeMappingCode(code, coordinate = "") {
  return normalizeAxisCode(code, coordinate);
}
