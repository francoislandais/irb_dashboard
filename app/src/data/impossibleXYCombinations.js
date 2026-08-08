import { parseCsv } from "./csvParser.js";
import { normalizeAxisCode } from "./core/axisCode.js";

const IMPOSSIBLE_COMBINATIONS_URL = "./assets/ITS_impossible_x_y.csv";

export async function loadImpossibleXYCombinations() {
  const response = await fetch(IMPOSSIBLE_COMBINATIONS_URL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Le fichier interne des combinaisons x/y impossibles n'a pas pu être chargé.");
  }

  const parsed = parseCsv(await response.text());
  return createImpossibleXYCombinations(parsed.columns, parsed.rows);
}

export function createImpossibleXYCombinations(columns, rows) {
  const indexes = {
    tableId: columns.indexOf("table_id"),
    xCode: columns.indexOf("x_axis_rc_code"),
    yCode: columns.indexOf("y_axis_rc_code")
  };

  if ([indexes.tableId, indexes.xCode, indexes.yCode].some((index) => index === -1)) {
    throw new Error("Le fichier interne des combinaisons x/y impossibles n'a pas la structure attendue.");
  }

  const impossibleYCodesByX = new Map();
  const impossibleXCodesByY = new Map();

  rows.forEach((row) => {
    const tableId = row[indexes.tableId];
    const xCode = normalizeAxisCode(row[indexes.xCode], "x");
    const yCode = normalizeAxisCode(row[indexes.yCode], "y");

    if (!tableId || !xCode || !yCode) return;

    const xKey = makeCombinationKey(tableId, xCode);
    if (!impossibleYCodesByX.has(xKey)) impossibleYCodesByX.set(xKey, new Set());
    impossibleYCodesByX.get(xKey).add(yCode);

    const yKey = makeCombinationKey(tableId, yCode);
    if (!impossibleXCodesByY.has(yKey)) impossibleXCodesByY.set(yKey, new Set());
    impossibleXCodesByY.get(yKey).add(xCode);
  });

  return {
    isImpossible(tableId, xCode, yCode) {
      if (!tableId || !xCode || !yCode) return false;
      return impossibleYCodesByX
        .get(makeCombinationKey(tableId, normalizeAxisCode(xCode, "x")))
        ?.has(normalizeAxisCode(yCode, "y")) ?? false;
    }
  };
}

function makeCombinationKey(tableId, code) {
  return `${tableId}::${code}`;
}
