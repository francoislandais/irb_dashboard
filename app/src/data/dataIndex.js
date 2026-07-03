import { normalizeAxisCode } from "./module2Config.js";

const KEY_SEPARATOR = "\u001f";

export function buildDataIndexes(columns, rows) {
  const indexes = getDataColumnIndexes(columns);
  if (!indexes) {
    return {
      axisCodes: new Map(),
      byCoordinates: new Map(),
      byTableJst: new Map()
    };
  }

  const axisCodes = new Map();
  const byCoordinates = new Map();
  const byTableJst = new Map();

  rows.forEach((row, rowIndex) => {
    const tableId = row[indexes.tableId];
    const jstCode = row[indexes.jstCode];
    const xCode = normalizeAxisCode(row[indexes.xAxisRcCode], "x");
    const yCode = normalizeAxisCode(row[indexes.yAxisRcCode], "y");
    const zCode = normalizeAxisCode(row[indexes.zAxisRcCode], "z");

    if (!tableId || !jstCode) return;

    pushIndexValue(byTableJst, makeDataKey(tableId, jstCode), rowIndex);
    pushIndexValue(byCoordinates, makeDataKey(tableId, jstCode, xCode, yCode, zCode), rowIndex);
    addAxisCode(axisCodes, tableId, jstCode, "x", xCode);
    addAxisCode(axisCodes, tableId, jstCode, "y", yCode);
    addAxisCode(axisCodes, tableId, jstCode, "z", zCode);
  });

  return {
    axisCodes,
    byCoordinates,
    byTableJst
  };
}

export function getIndexedRowsByTableJst(state, tableId, jstCode = state.selectedJst) {
  return getIndexedRows(state, state.dataIndexes?.byTableJst?.get(makeDataKey(tableId, jstCode)));
}

export function getIndexedRowsByCoordinates(state, tableId, selections, jstCode = state.selectedJst) {
  const rowIndexes = state.dataIndexes?.byCoordinates?.get(makeDataKey(
    tableId,
    jstCode,
    normalizeAxisCode(selections.selectedXCode ?? "", "x"),
    normalizeAxisCode(selections.selectedYCode ?? "", "y"),
    normalizeAxisCode(selections.selectedZCode ?? "", "z")
  ));

  return getIndexedRows(state, rowIndexes);
}

export function getIndexedAxisCodes(state, tableId, axis, jstCode = state.selectedJst) {
  const codes = state.dataIndexes?.axisCodes?.get(makeDataKey(tableId, jstCode, axis));
  if (!codes) return [];

  return [...codes].sort((left, right) => left.localeCompare(right, "fr"));
}

function getIndexedRows(state, rowIndexes) {
  if (!rowIndexes) return [];
  return rowIndexes.map((rowIndex) => state.rows[rowIndex]).filter(Boolean);
}

function addAxisCode(axisCodes, tableId, jstCode, axis, code) {
  if (!code) return;

  const key = makeDataKey(tableId, jstCode, axis);
  if (!axisCodes.has(key)) axisCodes.set(key, new Set());
  axisCodes.get(key).add(code);
}

function pushIndexValue(index, key, value) {
  if (!index.has(key)) index.set(key, []);
  index.get(key).push(value);
}

function makeDataKey(...parts) {
  return parts.map((part) => String(part ?? "")).join(KEY_SEPARATOR);
}

function getDataColumnIndexes(columns) {
  const indexes = {
    jstCode: columns.indexOf("jst_code"),
    tableId: columns.indexOf("table_id"),
    xAxisRcCode: columns.indexOf("x_axis_rc_code"),
    yAxisRcCode: columns.indexOf("y_axis_rc_code"),
    zAxisRcCode: columns.indexOf("z_axis_rc_code")
  };

  return Object.values(indexes).every((index) => index !== -1) ? indexes : null;
}
