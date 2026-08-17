import { normalizeAxisCode } from "./core/axisCode.js";
import { getRequiredAxisColumnIndexes } from "./core/axisColumns.js";
import { getReferenceColumns, parseNumericValue } from "./core/referenceColumns.js";
import { getIndexedJstCodes, getIndexedRowsByTableJst } from "./dataIndex.js?v=20260804-lazy-index";

const C01_TABLE_ID = "C_01.00";
const C02_TABLE_ID = "C_02.00";
const C03_TABLE_ID = "C_03.00";
const C04_TABLE_ID = "C_04.00";

const CET1_CAPITAL_Y_CODE = "0020";
const CET1_RATIO_Y_CODE = "0010";
const CURRENT_TREA_X_CODE = "0010";
const OUTPUT_FLOOR_STREA_X_CODE = "0020";
const TOTAL_TREA_Y_CODE = "0010";
const MARKET_RISK_Y_CODE = "0520";
const MARKET_RISK_ADD_ON_Y_CODES = ["0755", "0770"];
const FULLY_LOADED_FLOOR_ADJUSTMENT_X_CODE = "0010";
const FULLY_LOADED_FLOOR_ADJUSTMENT_Y_CODE = "0890";
const FULLY_LOADED_FACTOR = 0.725;

export function getIrbOutputFloorModel(
  state,
  referenceName = ""
) {
  const indexes = getRequiredAxisColumnIndexes(state.columns);
  const referenceColumns = getReferenceColumns(state.columns);
  const selectedReference = referenceColumns.find((reference) => reference.name === referenceName)
    ?? referenceColumns.at(-1)
    ?? null;

  if (!indexes || !state.selectedJst) {
    return {
      status: "Load a CSV and select a JST."
    };
  }

  if (!selectedReference) {
    return {
      status: "No reference date is available in the dataset."
    };
  }

  const selectedSnapshot = buildOutputFloorSnapshot(state, indexes, selectedReference, state.selectedJst);
  const benchmarkRows = getIndexedJstCodes(state)
    .map((jstCode) => buildOutputFloorSnapshot(state, indexes, selectedReference, jstCode))
    .filter((snapshot) => snapshot.available);

  return {
    benchmarkRows,
    referenceDate: selectedReference,
    referenceDates: referenceColumns,
    selectedSnapshot,
    status: selectedSnapshot.status || ""
  };
}

function buildOutputFloorSnapshot(state, indexes, referenceColumn, jstCode) {
  const cet1Capital = readDataPoint(state, indexes, C01_TABLE_ID, {
    xCode: CURRENT_TREA_X_CODE,
    yCode: CET1_CAPITAL_Y_CODE
  }, referenceColumn, jstCode);
  const reportedCet1Ratio = readDataPoint(state, indexes, C03_TABLE_ID, {
    xCode: CURRENT_TREA_X_CODE,
    yCode: CET1_RATIO_Y_CODE
  }, referenceColumn, jstCode);
  const fullyLoadedFloorAdjustment = readDataPoint(state, indexes, C04_TABLE_ID, {
    xCode: FULLY_LOADED_FLOOR_ADJUSTMENT_X_CODE,
    yCode: FULLY_LOADED_FLOOR_ADJUSTMENT_Y_CODE
  }, referenceColumn, jstCode);
  const totalTrea = readDataPoint(state, indexes, C02_TABLE_ID, {
    xCode: CURRENT_TREA_X_CODE,
    yCode: TOTAL_TREA_Y_CODE
  }, referenceColumn, jstCode);
  const totalStandardisedTrea = readDataPoint(state, indexes, C02_TABLE_ID, {
    xCode: OUTPUT_FLOOR_STREA_X_CODE,
    yCode: TOTAL_TREA_Y_CODE
  }, referenceColumn, jstCode);
  const currentMarketCoreRwa = readDataPoint(state, indexes, C02_TABLE_ID, {
    xCode: CURRENT_TREA_X_CODE,
    yCode: MARKET_RISK_Y_CODE
  }, referenceColumn, jstCode);
  const currentMarketAddOns = MARKET_RISK_ADD_ON_Y_CODES.map((yCode) => (
    readDataPoint(state, indexes, C02_TABLE_ID, {
      xCode: CURRENT_TREA_X_CODE,
      yCode
    }, referenceColumn, jstCode)
  ));
  const currentMarketAddOnRwa = currentMarketAddOns
    .filter((value) => Number.isFinite(value))
    .reduce((total, value) => total + value, 0);
  const currentMarketRwa = Number.isFinite(currentMarketCoreRwa)
    ? currentMarketCoreRwa + currentMarketAddOnRwa
    : null;
  const standardisedMarketRwa = readDataPoint(state, indexes, C02_TABLE_ID, {
    xCode: OUTPUT_FLOOR_STREA_X_CODE,
    yCode: MARKET_RISK_Y_CODE
  }, referenceColumn, jstCode);
  const reportedRatioAsFraction = Number.isFinite(reportedCet1Ratio)
    ? (Math.abs(reportedCet1Ratio) > 1 ? reportedCet1Ratio / 100 : reportedCet1Ratio)
    : null;
  const effectiveCet1Capital = Number.isFinite(reportedRatioAsFraction) && Number.isFinite(totalTrea)
    ? reportedRatioAsFraction * totalTrea
    : cet1Capital;
  const required = [totalTrea, fullyLoadedFloorAdjustment, currentMarketRwa, standardisedMarketRwa];
  if (required.some((value) => !Number.isFinite(value))) {
    return {
      available: false,
      jstCode,
      referenceLabel: referenceColumn.label,
      status: "The analysis requires C02 total and market RWA in columns 0010/0020, plus C04 row 0890."
    };
  }

  const currentCet1Ratio = Number.isFinite(reportedRatioAsFraction)
    ? reportedRatioAsFraction
    : Number.isFinite(effectiveCet1Capital) && totalTrea !== 0
      ? effectiveCet1Capital / totalTrea
      : null;
  const fullyLoadedTrea = totalTrea + fullyLoadedFloorAdjustment;
  const fullyLoadedCet1Ratio = Number.isFinite(effectiveCet1Capital) && fullyLoadedTrea > 0
    ? effectiveCet1Capital / fullyLoadedTrea
    : null;
  // The current market perimeter includes the core market-risk amount and the
  // two market-specific add-ons reported under "Other". Full standardisation
  // replaces that complete current perimeter with C02 row 0520 in S-TREA.
  const marketRwaImpact = standardisedMarketRwa - currentMarketRwa;
  const currentMarketRwaShare = totalTrea !== 0
    ? currentMarketRwa / totalTrea
    : null;
  const marketAdjustedTrea = totalTrea + marketRwaImpact;
  const marketAdjustedCet1Ratio = Number.isFinite(effectiveCet1Capital) && marketAdjustedTrea > 0
    ? effectiveCet1Capital / marketAdjustedTrea
    : null;
  const fullyLoadedImpactBasisPoints = Number.isFinite(currentCet1Ratio) && Number.isFinite(fullyLoadedCet1Ratio)
    ? (fullyLoadedCet1Ratio - currentCet1Ratio) * 10000
    : null;
  const fullyLoadedFloorAdjustmentShare = totalTrea !== 0
    ? fullyLoadedFloorAdjustment / totalTrea
    : null;
  const marketImpactBasisPoints = Number.isFinite(currentCet1Ratio) && Number.isFinite(marketAdjustedCet1Ratio)
    ? (marketAdjustedCet1Ratio - currentCet1Ratio) * 10000
    : null;
  const scenarioDifferenceBasisPoints = Number.isFinite(fullyLoadedCet1Ratio) && Number.isFinite(marketAdjustedCet1Ratio)
    ? (fullyLoadedCet1Ratio - marketAdjustedCet1Ratio) * 10000
    : null;
  const netHeadroom = marketRwaImpact - fullyLoadedFloorAdjustment;
  const residualFloorBite = Math.max(0, -netHeadroom);
  const irbHeadroom = Math.max(0, netHeadroom);

  return {
    available: true,
    cet1Capital: effectiveCet1Capital,
    currentCet1Ratio,
    currentMarketAddOnRwa,
    currentMarketCoreRwa,
    currentMarketRwa,
    currentMarketRwaShare,
    fullyLoadedCet1Ratio,
    fullyLoadedFactor: FULLY_LOADED_FACTOR,
    fullyLoadedFloorAdjustment,
    fullyLoadedFloorAdjustmentShare,
    fullyLoadedImpactBasisPoints,
    fullyLoadedTrea,
    irbHeadroom,
    jstCode,
    marketAdjustedCet1Ratio,
    marketAdjustedTrea,
    marketImpactBasisPoints,
    marketRwaImpact,
    netHeadroom,
    referenceLabel: referenceColumn.label,
    reportedCet1Ratio: reportedRatioAsFraction,
    residualFloorBite,
    scenarioDifferenceBasisPoints,
    standardisedMarketRwa,
    totalStandardisedTrea,
    totalTrea
  };
}

function readDataPoint(state, indexes, tableId, coordinates, referenceColumn, jstCode) {
  const rows = getIndexedRowsByTableJst(state, tableId, jstCode);
  const matchedRows = rows.filter((row) => (
    matchesAxis(row, indexes, "x", coordinates.xCode)
    && matchesAxis(row, indexes, "y", coordinates.yCode)
    && matchesAxis(row, indexes, "z", coordinates.zCode)
  ));

  if (matchedRows.length === 0) return null;
  const values = matchedRows
    .map((row) => parseNumericValue(row[referenceColumn.index], null))
    .filter((value) => Number.isFinite(value));
  if (values.length === 0) return null;

  return values.reduce((total, value) => total + value, 0);
}

function matchesAxis(row, indexes, axis, code) {
  if (!code) return true;
  const index = indexes[`${axis}AxisRcCode`];
  if (index === -1 || index === undefined) return false;
  return normalizeAxisCode(row[index], axis) === normalizeAxisCode(code, axis);
}
