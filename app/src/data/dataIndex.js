import { normalizeAxisCode } from "./core/axisCode.js?v=20260921-z-axis-padding";
import { getCompleteAxisColumnIndexes } from "./core/axisColumns.js?v=20260925-institution-id";

const KEY_SEPARATOR = "\u001f";

export function buildDataIndexes(columns, rows) {
  const indexes = getCompleteAxisColumnIndexes(columns);
  if (!indexes) {
    const emptyInstitutionIds = new Set();
    const emptyTableMap = new Map();
    return {
      axisCodes: new Map(),
      byAxisPoint: new Map(),
      byCoordinates: new Map(),
      byTableInstitution: emptyTableMap,
      byTableJst: emptyTableMap,
      detailKeys: new Set(),
      institutionIds: emptyInstitutionIds,
      indexes: null,
      jstCodes: emptyInstitutionIds,
      tableIdsByInstitution: emptyTableMap,
      tableIdsByJst: emptyTableMap
    };
  }

  const axisCodes = new Map();
  const byAxisPoint = new Map();
  const byCoordinates = new Map();
  const byTableJst = new Map();
  const institutionIds = new Set();
  const detailKeys = new Set();
  const jstCodes = institutionIds;
  const tableIdsByJst = new Map();

  rows.forEach((row, rowIndex) => {
    const tableId = row[indexes.tableId];
    const institutionId = row[indexes.institutionId];

    if (!tableId || !institutionId) return;

    institutionIds.add(institutionId);
    pushIndexValue(byTableJst, makeDataKey(tableId, institutionId), rowIndex);
    addTableId(tableIdsByJst, institutionId, tableId);
  });

  return {
    axisCodes,
    byAxisPoint,
    byCoordinates,
    byTableInstitution: byTableJst,
    byTableJst,
    detailKeys,
    institutionIds,
    indexes,
    jstCodes,
    tableIdsByInstitution: tableIdsByJst,
    tableIdsByJst
  };
}

export function getIndexedRowsByTableJst(state, tableId, jstCode = state.selectedJst) {
  return getIndexedRows(state, state.dataIndexes?.byTableJst?.get(makeDataKey(tableId, jstCode)));
}

export function getIndexedRowsByCoordinates(state, tableId, selections, jstCode = state.selectedJst) {
  ensureDetailedTableJstIndex(state, tableId, jstCode);
  const rowIndexes = state.dataIndexes?.byCoordinates?.get(makeDataKey(
    tableId,
    jstCode,
    normalizeAxisCode(selections.selectedXCode ?? "", "x"),
    normalizeAxisCode(selections.selectedYCode ?? "", "y"),
    normalizeAxisCode(selections.selectedZCode ?? "", "z")
  ));

  return getIndexedRows(state, rowIndexes);
}

export function getIndexedRowsByAxisPoint(state, tableId, axis, pointCode, jstCode = state.selectedJst) {
  ensureDetailedTableJstIndex(state, tableId, jstCode);
  const rowIndexes = state.dataIndexes?.byAxisPoint?.get(makeDataKey(
    tableId,
    jstCode,
    axis,
    normalizeAxisCode(pointCode ?? "", axis)
  ));

  return getIndexedRows(state, rowIndexes);
}

export function getIndexedAxisCodes(state, tableId, axis, jstCode = state.selectedJst) {
  ensureDetailedTableJstIndex(state, tableId, jstCode);
  const codes = state.dataIndexes?.axisCodes?.get(makeDataKey(tableId, jstCode, axis));
  if (!codes) return [];

  return [...codes].sort((left, right) => left.localeCompare(right, "fr"));
}

// Union across every JST in the dataset, so the template list stays stable
// regardless of which JST is currently selected.
export function getAllIndexedTableIds(state) {
  const tableIds = new Set();
  state.dataIndexes?.tableIdsByJst?.forEach((ids) => ids?.forEach((tableId) => tableIds.add(tableId)));
  return [...tableIds].sort((left, right) => left.localeCompare(right, "fr", { numeric: true }));
}

// Union across every JST that reports this table, so a row/column/tab code
// stays selectable even for a JST that has no data for it.
export function getIndexedAxisCodesAnyJst(state, tableId, axis) {
  const codes = new Set();
  state.dataIndexes?.tableIdsByJst?.forEach((tableIdsForJst, jstCode) => {
    if (!tableIdsForJst?.has(tableId)) return;

    ensureDetailedTableJstIndex(state, tableId, jstCode);
    const tableCodes = state.dataIndexes?.axisCodes?.get(makeDataKey(tableId, jstCode, axis));
    tableCodes?.forEach((code) => codes.add(code));
  });
  return [...codes].sort((left, right) => left.localeCompare(right, "fr"));
}

export function getIndexedJstCodes(state) {
  const jstCodes = state.dataIndexes?.jstCodes;
  if (!jstCodes) return [];

  return [...jstCodes].sort((left, right) => left.localeCompare(right, "fr"));
}

export function getIndexedInstitutionIds(state) {
  const institutionIds = state.dataIndexes?.institutionIds ?? state.dataIndexes?.jstCodes;
  if (!institutionIds) return [];
  return [...institutionIds].sort((left, right) => left.localeCompare(right, "fr"));
}

function getIndexedRows(state, rowIndexes) {
  if (!rowIndexes) return [];
  return rowIndexes.map((rowIndex) => state.rows[rowIndex]).filter(Boolean);
}

function ensureDetailedTableJstIndex(state, tableId, jstCode) {
  if (!state?.dataIndexes || !state.rows || !tableId || !jstCode) return;

  const indexes = state.dataIndexes.indexes ?? getCompleteAxisColumnIndexes(state.columns ?? []);
  if (!indexes) return;

  const detailKey = makeDataKey(tableId, jstCode);
  if (!state.dataIndexes.detailKeys) state.dataIndexes.detailKeys = new Set();
  if (state.dataIndexes.detailKeys.has(detailKey)) return;

  state.dataIndexes.detailKeys.add(detailKey);
  const rowIndexes = state.dataIndexes.byTableJst?.get(detailKey) ?? [];
  rowIndexes.forEach((rowIndex) => {
    const row = state.rows[rowIndex];
    if (!row) return;

    const xCode = normalizeAxisCode(row[indexes.xAxisRcCode], "x");
    const yCode = normalizeAxisCode(row[indexes.yAxisRcCode], "y");
    const zCode = normalizeAxisCode(row[indexes.zAxisRcCode], "z");

    pushIndexValue(state.dataIndexes.byCoordinates, makeDataKey(tableId, jstCode, xCode, yCode, zCode), rowIndex);
    pushAxisPointIndex(state.dataIndexes.byAxisPoint, tableId, jstCode, "x", xCode, rowIndex);
    pushAxisPointIndex(state.dataIndexes.byAxisPoint, tableId, jstCode, "y", yCode, rowIndex);
    pushAxisPointIndex(state.dataIndexes.byAxisPoint, tableId, jstCode, "z", zCode, rowIndex);
    addAxisCode(state.dataIndexes.axisCodes, tableId, jstCode, "x", xCode);
    addAxisCode(state.dataIndexes.axisCodes, tableId, jstCode, "y", yCode);
    addAxisCode(state.dataIndexes.axisCodes, tableId, jstCode, "z", zCode);
  });
}

function addTableId(tableIdsByJst, jstCode, tableId) {
  const key = String(jstCode ?? "");
  if (!tableIdsByJst.has(key)) tableIdsByJst.set(key, new Set());
  tableIdsByJst.get(key).add(tableId);
}

function addAxisCode(axisCodes, tableId, jstCode, axis, code) {
  if (!code) return;

  const key = makeDataKey(tableId, jstCode, axis);
  if (!axisCodes.has(key)) axisCodes.set(key, new Set());
  axisCodes.get(key).add(code);
}

function pushAxisPointIndex(index, tableId, jstCode, axis, code, rowIndex) {
  if (!code) return;
  pushIndexValue(index, makeDataKey(tableId, jstCode, axis, code), rowIndex);
}

function pushIndexValue(index, key, value) {
  if (!index.has(key)) index.set(key, []);
  index.get(key).push(value);
}

function makeDataKey(...parts) {
  return parts.map((part) => String(part ?? "")).join(KEY_SEPARATOR);
}
