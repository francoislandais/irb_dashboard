import { normalizeAxisCode } from "./core/axisCode.js";
import { getRequiredAxisColumnIndexes } from "./core/axisColumns.js";
import { formatBasisPointsValue, formatMetricValue } from "./core/formatting.js";
import { getReferenceColumns, parseNumericValue } from "./core/referenceColumns.js";

export function getCet1RatioSnapshot(state) {
  const indexes = getRequiredAxisColumnIndexes(state.columns);
  if (!indexes || !state.selectedJst) {
    return { status: "Load a CSV and select a JST." };
  }

  const referenceColumns = getReferenceColumns(state.columns);
  const latestReferenceColumn = referenceColumns.at(-1);
  const previousReferenceColumn = referenceColumns.at(-2);
  if (!latestReferenceColumn || !previousReferenceColumn) {
    return { status: "At least two reference dates are required to compute the CET1 movement." };
  }

  const ratio = getCet1DataPoint(state, indexes, {
    tableId: "C_03.00",
    xCode: "0010",
    yCode: "0010"
  }, latestReferenceColumn, previousReferenceColumn);
  const numerator = getCet1DataPoint(state, indexes, {
    tableId: "C_01.00",
    yCode: "0020"
  }, latestReferenceColumn, previousReferenceColumn);
  const denominator = getCet1DataPoint(state, indexes, {
    tableId: "C_02.00",
    xCode: "0010",
    yCode: "0010"
  }, latestReferenceColumn, previousReferenceColumn);

  if (!ratio) {
    return { status: "CET1 capital ratio is not available for the selected JST." };
  }
  if (!numerator) {
    return { status: "Common Equity Tier 1 capital is not available for the selected JST." };
  }
  if (!denominator) {
    return { status: "Total risk exposure amount is not available for the selected JST." };
  }

  return {
    currentDateLabel: latestReferenceColumn.label,
    jstCode: state.selectedJst,
    denominator,
    numerator,
    previousDateLabel: previousReferenceColumn.label,
    ratio: {
      ...ratio,
      changeBasisPoints: calculateBasisPointChange(ratio.currentValue, ratio.previousValue)
    }
  };
}

function getCet1DataPoint(state, indexes, coordinates, latestReferenceColumn, previousReferenceColumn) {
  const matchedRows = state.rows.filter((row) => (
    row[indexes.jstCode] === state.selectedJst
    && row[indexes.tableId] === coordinates.tableId
    && matchesCet1Axis(row, indexes, "x", coordinates.xCode)
    && matchesCet1Axis(row, indexes, "y", coordinates.yCode)
    && matchesCet1Axis(row, indexes, "z", coordinates.zCode)
  ));

  if (matchedRows.length === 0) return null;

  const currentValue = sumCet1Rows(matchedRows, latestReferenceColumn.index);
  const previousValue = sumCet1Rows(matchedRows, previousReferenceColumn.index);
  if (currentValue === null || previousValue === null) return null;

  return {
    currentValue,
    previousValue
  };
}

function matchesCet1Axis(row, indexes, axis, code) {
  if (!code) return true;
  const index = indexes[`${axis}AxisRcCode`];
  if (index === -1 || index === undefined) return false;
  return normalizeAxisCode(row[index], axis) === normalizeAxisCode(code, axis);
}

function sumCet1Rows(rows, columnIndex) {
  const values = rows
    .map((row) => parseNumericValue(row[columnIndex], null))
    .filter((value) => value !== null);

  if (values.length === 0) return null;
  return values.reduce((total, value) => total + value, 0);
}

function calculateBasisPointChange(currentValue, previousValue) {
  const valuesLookLikeFractions = Math.abs(currentValue) <= 1 && Math.abs(previousValue) <= 1;
  return (currentValue - previousValue) * (valuesLookLikeFractions ? 10000 : 100);
}

export function formatBasisPointChange(value) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatBasisPointsValue(value)}`;
}

export function formatCet1Amount(value, selectedUnit) {
  return formatMetricValue(value, selectedUnit || "millions");
}
