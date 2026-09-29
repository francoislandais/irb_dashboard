import { getCompleteAxisColumnIndexes } from "./core/axisColumns.js?v=20260925-institution-id";
import { getReferenceColumns } from "./core/referenceColumns.js";
import { getIndexedRowsByTableJst } from "./dataIndex.js";

// Dataset rows and columns are replaced on load/switch, but retained across
// selection changes. Weak keys release cached dates when a dataset is unloaded.
const datesByRows = new WeakMap();

export function getExplorerTemplateReferenceDates(state, tableId) {
  const columns = state?.columns ?? [];
  const indexes = getCompleteAxisColumnIndexes(columns);
  if (!indexes || !tableId || !state?.rows) return getReferenceColumns(columns);
  let byColumns = datesByRows.get(state.rows);
  if (!byColumns) datesByRows.set(state.rows, byColumns = new WeakMap());
  let byTable = byColumns.get(columns);
  if (!byTable) byColumns.set(columns, byTable = new Map());
  if (byTable.has(tableId)) return byTable.get(tableId);

  const references = getReferenceColumns(columns);
  const pending = new Set(references);
  const inspect = row => {
    for (const reference of pending) {
      if (String(row[reference.index] ?? "").trim() !== "") pending.delete(reference);
    }
  };
  // Preserve the existing union across all JSTs, including numeric zero and
  // non-numeric nonblank cells. Only the traversal changes, not availability.
  if (state.dataIndexes?.tableIdsByJst && state.dataIndexes?.byTableJst) {
    for (const [jstCode, tableIds] of state.dataIndexes.tableIdsByJst) {
      if (!tableIds.has(tableId)) continue;
      for (const row of getIndexedRowsByTableJst({ ...state, selectedJst: jstCode }, tableId)) {
        inspect(row);
        if (!pending.size) break;
      }
      if (!pending.size) break;
    }
  } else {
    for (const row of state.rows) {
      if (row[indexes.tableId] === tableId) inspect(row);
      if (!pending.size) break;
    }
  }
  const dates = references.filter(reference => !pending.has(reference));
  byTable.set(tableId, dates);
  return dates;
}

// The temporal table has already resolved the applicable taxonomy for each
// date. Reuse those masks for the reference-date panel instead of treating a
// raw zero in the benchmark series as a reported value. A code can appear in
// several historical blocks, so a date is unavailable only if every matching
// row marks it as such.
export function getExplorerTaxonomyUnavailableReferenceLabels(series, selectedCode) {
  const unavailable = new Set();
  if (series?.xy || !series?.taxonomyBlocks?.length || !selectedCode) return unavailable;
  const matchingRows = series.rows.filter((row) => row.code === selectedCode && !row.isVirtual);
  if (!matchingRows.length) return unavailable;
  series.dateColumns.forEach((column, index) => {
    if (matchingRows.every((row) => row.values?.[index]?.isTaxonomyUnavailable === true)) {
      unavailable.add(column.label);
    }
  });
  return unavailable;
}
