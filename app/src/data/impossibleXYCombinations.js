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

  const entriesByTable = new Map();
  const scopedIndexes = new Map();

  rows.forEach((row) => {
    const tableId = row[indexes.tableId];
    const xCode = normalizeAxisCode(row[indexes.xCode], "x");
    const yCode = normalizeAxisCode(row[indexes.yCode], "y");

    if (!tableId || !xCode || !yCode) return;
    if (!entriesByTable.has(tableId)) entriesByTable.set(tableId, []);
    entriesByTable.get(tableId).push({ tableId, xCode, yCode });
  });

  function createScopedIndex(tableIds = null) {
    const selectedTableIds = tableIds
      ? [...new Set(tableIds)].filter((tableId) => entriesByTable.has(tableId)).sort()
      : [...entriesByTable.keys()].sort();
    const cacheKey = selectedTableIds.join("\u001f");
    if (scopedIndexes.has(cacheKey)) return scopedIndexes.get(cacheKey);

    const impossibleYCodesByX = new Map();
    const impossibleXCodesByY = new Map();

    selectedTableIds.forEach((tableId) => {
      (entriesByTable.get(tableId) ?? []).forEach((entry) => {
        const xKey = makeCombinationKey(entry.tableId, entry.xCode);
        if (!impossibleYCodesByX.has(xKey)) impossibleYCodesByX.set(xKey, new Set());
        impossibleYCodesByX.get(xKey).add(entry.yCode);

        const yKey = makeCombinationKey(entry.tableId, entry.yCode);
        if (!impossibleXCodesByY.has(yKey)) impossibleXCodesByY.set(yKey, new Set());
        impossibleXCodesByY.get(yKey).add(entry.xCode);
      });
    });

    const scopedIndex = {
      forTableIds(nextTableIds) {
        return createScopedIndex(nextTableIds);
      },

      isImpossible(tableId, xCode, yCode) {
        if (!tableId || !xCode || !yCode) return false;
        return impossibleYCodesByX
          .get(makeCombinationKey(tableId, normalizeAxisCode(xCode, "x")))
          ?.has(normalizeAxisCode(yCode, "y")) ?? false;
      },

      stats: {
        combinationCount: selectedTableIds.reduce((total, tableId) => total + (entriesByTable.get(tableId)?.length ?? 0), 0),
        tableCount: selectedTableIds.length
      }
    };

    scopedIndexes.set(cacheKey, scopedIndex);
    return scopedIndex;
  }

  return {
    forTableIds(tableIds) {
      return createScopedIndex(tableIds);
    },

    isImpossible(tableId, xCode, yCode) {
      return createScopedIndex().isImpossible(tableId, xCode, yCode);
    },

    stats: {
      combinationCount: rows.length,
      tableCount: entriesByTable.size
    }
  };
}

function makeCombinationKey(tableId, code) {
  return `${tableId}::${code}`;
}
