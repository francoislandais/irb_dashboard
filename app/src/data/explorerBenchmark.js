import { getIndexedRowsByCoordinates } from "./dataIndex.js";
import { normalizeAxisCode } from "./core/axisCode.js";
import { parseNumericValue } from "./core/referenceColumns.js";

export function getExplorerSelectionsForAxisCode(context, activeAxis, axisCode) {
  return {
    selectedXCode: normalizeAxisCode(activeAxis === "x" ? axisCode : context.selectedXCode, "x"),
    selectedYCode: normalizeAxisCode(activeAxis === "y" ? axisCode : context.selectedYCode, "y"),
    selectedZCode: normalizeAxisCode(activeAxis === "z" ? axisCode : context.selectedZCode, "z")
  };
}

export function getPeerBenchmarkJstCodes(state) {
  const jstOptions = state?.jstOptions ?? [];
  const peers = state?.peerJstCodes ?? jstOptions;
  const requested = [state?.selectedJst, ...peers].filter(Boolean);

  return requested.filter((jstCode, index) => (
    jstOptions.includes(jstCode) && requested.indexOf(jstCode) === index
  ));
}

export function getBenchmarkPointValue(rows, baseRows, dateColumnIndex, isContribution) {
  const value = rows.reduce((total, row) => total + parseNumericValue(row[dateColumnIndex]), 0);
  if (!isContribution) return value;

  const baseValue = baseRows.reduce((total, row) => total + parseNumericValue(row[dateColumnIndex]), 0);
  if (baseRows.length === 0 || baseValue === 0) return null;

  return value / baseValue;
}

export function getBenchmarkRows(state, indexes, tableId, selections, jstCode) {
  if (hasCompleteBenchmarkSelection(selections)) {
    const indexedRows = getIndexedRowsByCoordinates(state, tableId, selections, jstCode);
    if (indexedRows.length > 0 || state.dataIndexes) return indexedRows;
  }

  return state.rows.filter((row) => (
    row[indexes.jstCode] === jstCode
    && row[indexes.tableId] === tableId
    && matchesBenchmarkSelection(row, indexes, "x", selections.selectedXCode)
    && matchesBenchmarkSelection(row, indexes, "y", selections.selectedYCode)
    && matchesBenchmarkSelection(row, indexes, "z", selections.selectedZCode)
  ));
}

function hasCompleteBenchmarkSelection(selections) {
  return Boolean(selections.selectedXCode && selections.selectedYCode && selections.selectedZCode);
}

function matchesBenchmarkSelection(row, indexes, axis, selectedCode) {
  if (!selectedCode) return true;
  return normalizeAxisCode(row[indexes[`${axis}AxisRcCode`]], axis) === selectedCode;
}

export function getBenchmarkLabel(state, tableId, context, activeAxis, activeTemplateLabel) {
  if (activeAxis === "template") return activeTemplateLabel || tableId;
  if (activeAxis === "x") {
    return state?.dimensionMapping?.find(tableId, "x_axis_rc_code", context.selectedXCode)?.description
      || `Column ${context.selectedXCode}`;
  }
  if (activeAxis === "z") {
    return state?.explorerPoints?.find((point) => (
      point.tableId === tableId
      && point.coordinate === "z_axis_rc_code"
      && point.code === context.selectedZCode
    ))?.description || `Tab ${context.selectedZCode}`;
  }
  return state?.explorerPoints?.find((point) => (
    point.tableId === tableId
    && point.coordinate === "y_axis_rc_code"
    && point.code === context.selectedYCode
  ))?.description || `Row ${context.selectedYCode}`;
}

export function getBenchmarkValueFormat(state, tableId, context) {
  const candidates = [
    { axis: "y", code: context.selectedYCode, coordinate: "y_axis_rc_code" },
    { axis: "z", code: context.selectedZCode, coordinate: "z_axis_rc_code" },
    { axis: "x", code: context.selectedXCode, coordinate: "x_axis_rc_code" }
  ];

  for (const candidate of candidates) {
    if (!candidate.code) continue;

    const configuredFormat = state?.explorerPoints?.find((point) => (
      point.tableId === tableId
      && point.coordinate === candidate.coordinate
      && point.code === candidate.code
    ))?.format;
    if (configuredFormat) return configuredFormat;

    const mappingFormat = state?.dimensionMapping?.find(tableId, candidate.coordinate, candidate.code)?.format;
    if (mappingFormat) return mappingFormat;
  }

  return "";
}
