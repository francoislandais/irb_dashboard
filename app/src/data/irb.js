import { normalizeAxisCode } from "./core/axisCode.js";
import { getRequiredAxisColumnIndexes } from "./core/axisColumns.js";
import { getReferenceColumns, parseNumericValue } from "./core/referenceColumns.js";
import { getIndexedRowsByTableJst } from "./dataIndex.js?v=20260804-lazy-index";

export const IRB_OUTPUT_FLOOR_HORIZONS = [
  { id: "2025", label: "2025", factor: 0.50 },
  { id: "2026", label: "2026", factor: 0.55 },
  { id: "2027", label: "2027", factor: 0.60 },
  { id: "2028", label: "2028", factor: 0.65 },
  { id: "2029", label: "2029", factor: 0.70 },
  { id: "fully-loaded", label: "Fully loaded", factor: 0.725 }
];

const C01_TABLE_ID = "C_01.00";
const C02_TABLE_ID = "C_02.00";
const C03_TABLE_ID = "C_03.00";

const CET1_CAPITAL_Y_CODE = "0020";
const CET1_RATIO_Y_CODE = "0010";
const CURRENT_TREA_X_CODE = "0010";
const OUTPUT_FLOOR_STREA_X_CODE = "0020";
const TOTAL_TREA_Y_CODE = "0010";
const CREDIT_RISK_Y_CODE = "0040";

const CREDIT_DIAGNOSTIC_ROWS = [
  { code: "0040", label: "Credit risk" },
  { code: "0050", label: "Standardised approach" },
  { code: "0240", label: "IRB approach" },
  { code: "0250", label: "Foundation IRB" },
  { code: "0310", label: "Advanced IRB" },
  { code: "0370", label: "Retail real estate SME" },
  { code: "0380", label: "Retail real estate non-SME" },
  { code: "0390", label: "Qualifying revolving retail" },
  { code: "0400", label: "Retail other SME" },
  { code: "0410", label: "Retail other non-SME" },
  { code: "0450", label: "Other non-credit obligation assets" }
];

export function getIrbOutputFloorModel(state, horizonId = "fully-loaded") {
  const indexes = getRequiredAxisColumnIndexes(state.columns);
  const referenceColumns = getReferenceColumns(state.columns);
  const selectedHorizon = getIrbOutputFloorHorizon(horizonId);
  const selectedReference = referenceColumns.at(-1) ?? null;

  if (!indexes || !state.selectedJst) {
    return {
      benchmarkSeries: [],
      diagnosticRows: [],
      horizons: IRB_OUTPUT_FLOOR_HORIZONS,
      selectedHorizon,
      status: "Load a CSV and select a JST."
    };
  }

  if (!selectedReference) {
    return {
      benchmarkSeries: [],
      diagnosticRows: [],
      horizons: IRB_OUTPUT_FLOOR_HORIZONS,
      selectedHorizon,
      status: "No reference date is available in the dataset."
    };
  }

  const selectedSnapshot = buildOutputFloorSnapshot(state, indexes, selectedReference, state.selectedJst, selectedHorizon.factor);
  const selectedDateHorizonImpacts = IRB_OUTPUT_FLOOR_HORIZONS.map((horizon) => (
    buildOutputFloorSnapshot(state, indexes, selectedReference, state.selectedJst, horizon.factor)
  ));
  const benchmarkSeries = buildOutputFloorBenchmarkSeries(state, indexes, referenceColumns, selectedHorizon.factor);
  const diagnosticRows = buildCreditDiagnosticRows(state, indexes, selectedReference, state.selectedJst, selectedHorizon.factor, selectedSnapshot);

  return {
    benchmarkSeries,
    diagnosticRows,
    horizons: IRB_OUTPUT_FLOOR_HORIZONS,
    referenceDate: selectedReference,
    selectedDateHorizonImpacts,
    selectedHorizon,
    selectedSnapshot,
    status: selectedSnapshot.status || ""
  };
}

export function getIrbOutputFloorHorizon(horizonId) {
  return IRB_OUTPUT_FLOOR_HORIZONS.find((horizon) => horizon.id === horizonId) ?? IRB_OUTPUT_FLOOR_HORIZONS.at(-1);
}

function buildOutputFloorBenchmarkSeries(state, indexes, referenceColumns, factor) {
  const peerCodes = state.peerJstCodes?.length ? state.peerJstCodes : state.jstOptions;
  const jstCodes = [...new Set([state.selectedJst, ...(peerCodes ?? [])].filter(Boolean))];

  return jstCodes.map((jstCode) => ({
    jstCode,
    points: referenceColumns
      .map((referenceColumn) => {
        const snapshot = buildOutputFloorSnapshot(state, indexes, referenceColumn, jstCode, factor);
        if (snapshot.status || !Number.isFinite(snapshot.impactBasisPoints)) return null;
        return {
          date: referenceColumn.date,
          label: referenceColumn.label,
          smoothedRatioBasisPoints: snapshot.impactBasisPoints,
          smoothedValue: snapshot.impactBasisPoints
        };
      })
      .filter(Boolean)
  })).filter((serie) => serie.points.length > 0);
}

function buildOutputFloorSnapshot(state, indexes, referenceColumn, jstCode, factor) {
  const cet1Capital = readDataPoint(state, indexes, C01_TABLE_ID, {
    xCode: CURRENT_TREA_X_CODE,
    yCode: CET1_CAPITAL_Y_CODE
  }, referenceColumn, jstCode);
  const reportedCet1Ratio = readDataPoint(state, indexes, C03_TABLE_ID, {
    xCode: CURRENT_TREA_X_CODE,
    yCode: CET1_RATIO_Y_CODE
  }, referenceColumn, jstCode);
  const totalTrea = readDataPoint(state, indexes, C02_TABLE_ID, {
    xCode: CURRENT_TREA_X_CODE,
    yCode: TOTAL_TREA_Y_CODE
  }, referenceColumn, jstCode);
  const creditCurrentTrea = readDataPoint(state, indexes, C02_TABLE_ID, {
    xCode: CURRENT_TREA_X_CODE,
    yCode: CREDIT_RISK_Y_CODE
  }, referenceColumn, jstCode);
  const creditStandardisedTrea = readDataPoint(state, indexes, C02_TABLE_ID, {
    xCode: OUTPUT_FLOOR_STREA_X_CODE,
    yCode: CREDIT_RISK_Y_CODE
  }, referenceColumn, jstCode);

  const required = [cet1Capital, totalTrea, creditCurrentTrea, creditStandardisedTrea];
  if (required.some((value) => !Number.isFinite(value))) {
    return {
      factor,
      jstCode,
      referenceLabel: referenceColumn.label,
      status: "Output floor simulation is not available for this JST/date because CET1 capital, total TREA, credit TREA or credit S-TREA is missing."
    };
  }

  const creditFloorThreshold = factor * creditStandardisedTrea;
  const creditFloorAddOn = Math.max(0, creditFloorThreshold - creditCurrentTrea);
  const flooredTrea = totalTrea + creditFloorAddOn;
  const currentCet1Ratio = cet1Capital / totalTrea;
  const flooredCet1Ratio = cet1Capital / flooredTrea;
  const impactBasisPoints = (flooredCet1Ratio - currentCet1Ratio) * 10000;
  const reportedRatioAsFraction = Number.isFinite(reportedCet1Ratio)
    ? (Math.abs(reportedCet1Ratio) > 1 ? reportedCet1Ratio / 100 : reportedCet1Ratio)
    : null;

  return {
    cet1Capital,
    creditCurrentTrea,
    creditFloorAddOn,
    creditFloorThreshold,
    creditStandardisedTrea,
    currentCet1Ratio,
    factor,
    flooredCet1Ratio,
    flooredTrea,
    impactBasisPoints,
    isBinding: creditFloorAddOn > 0,
    jstCode,
    referenceLabel: referenceColumn.label,
    reportedCet1Ratio: reportedRatioAsFraction,
    totalTrea
  };
}

function buildCreditDiagnosticRows(state, indexes, referenceColumn, jstCode, factor, selectedSnapshot) {
  return CREDIT_DIAGNOSTIC_ROWS.map((row) => {
    const currentTrea = readDataPoint(state, indexes, C02_TABLE_ID, {
      xCode: CURRENT_TREA_X_CODE,
      yCode: row.code
    }, referenceColumn, jstCode);
    const standardisedTrea = readDataPoint(state, indexes, C02_TABLE_ID, {
      xCode: OUTPUT_FLOOR_STREA_X_CODE,
      yCode: row.code
    }, referenceColumn, jstCode);
    const threshold = Number.isFinite(standardisedTrea) ? factor * standardisedTrea : null;
    const gap = Number.isFinite(currentTrea) && Number.isFinite(threshold)
      ? threshold - currentTrea
      : null;
    const floorAddOn = Number.isFinite(gap) ? Math.max(0, gap) : null;
    const impactBasisPoints = computeIncrementalCet1ImpactBasisPoints(selectedSnapshot, floorAddOn);

    return {
      code: row.code,
      currentTrea,
      floorAddOn,
      gap,
      impactBasisPoints,
      label: row.label,
      standardisedTrea,
      threshold
    };
  }).filter((row) => (
    Number.isFinite(row.currentTrea)
    || Number.isFinite(row.standardisedTrea)
    || Number.isFinite(row.threshold)
  ));
}

function computeIncrementalCet1ImpactBasisPoints(snapshot, floorAddOn) {
  if (
    !snapshot
    || !Number.isFinite(snapshot.cet1Capital)
    || !Number.isFinite(snapshot.totalTrea)
    || !Number.isFinite(floorAddOn)
  ) {
    return null;
  }

  const addOn = Math.max(0, floorAddOn);
  const currentRatio = snapshot.cet1Capital / snapshot.totalTrea;
  const flooredRatio = snapshot.cet1Capital / (snapshot.totalTrea + addOn);
  return (flooredRatio - currentRatio) * 10000;
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
