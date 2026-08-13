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

export const IRB_OUTPUT_FLOOR_DEFAULT_SCOPE = "global";

const OUTPUT_FLOOR_SCOPE_DEFINITIONS = [
  { id: "global", label: "Global perimeter", yCodes: [TOTAL_TREA_Y_CODE] },
  { id: "credit-total", label: "Credit risk - total", yCodes: [CREDIT_RISK_Y_CODE] },
  { id: "credit-sa-irb", label: "Credit risk - SA + IRB", yCodes: ["0050", "0240"] },
  { id: "credit-irb", label: "Credit risk - IRB", yCodes: ["0240"] },
  { id: "other-risks", label: "Non-credit risks - total", derivedFrom: ["global", "credit-total"] },
  { id: "settlement-delivery", label: "Settlement and delivery risk", yCodes: ["0490"] },
  { id: "market-risk", label: "Market risk", yCodes: ["0520"] },
  { id: "operational-risk", label: "Operational risk", yCodes: ["0590"] },
  { id: "fixed-overheads", label: "Fixed overheads risk", yCodes: ["0630"] },
  { id: "cva", label: "Credit valuation adjustment", yCodes: ["0640"] },
  { id: "large-exposures", label: "Large exposures in the trading book", yCodes: ["0680"] },
  { id: "other", label: "Other risk exposure amounts", yCodes: ["0690"] }
];

export function getIrbOutputFloorModel(state, horizonId = "fully-loaded", scopeId = IRB_OUTPUT_FLOOR_DEFAULT_SCOPE) {
  const indexes = getRequiredAxisColumnIndexes(state.columns);
  const referenceColumns = getReferenceColumns(state.columns);
  const selectedHorizon = getIrbOutputFloorHorizon(horizonId);
  const selectedReference = referenceColumns.at(-1) ?? null;

  if (!indexes || !state.selectedJst) {
    return {
      horizons: IRB_OUTPUT_FLOOR_HORIZONS,
      selectedHorizon,
      status: "Load a CSV and select a JST."
    };
  }

  if (!selectedReference) {
    return {
      horizons: IRB_OUTPUT_FLOOR_HORIZONS,
      selectedHorizon,
      status: "No reference date is available in the dataset."
    };
  }

  const selectedSnapshot = buildOutputFloorSnapshot(state, indexes, selectedReference, state.selectedJst, selectedHorizon.factor);
  const selectedDateHorizonImpacts = IRB_OUTPUT_FLOOR_HORIZONS.map((horizon) => (
    buildOutputFloorSnapshot(state, indexes, selectedReference, state.selectedJst, horizon.factor)
  ));
  const selectedScope = getSnapshotScope(selectedSnapshot, scopeId);

  return {
    horizons: IRB_OUTPUT_FLOOR_HORIZONS,
    referenceDate: selectedReference,
    selectedDateHorizonImpacts,
    selectedHorizon,
    selectedScope,
    selectedSnapshot,
    scopeRows: selectedSnapshot.scopes ?? [],
    status: selectedSnapshot.status || ""
  };
}

export function getIrbOutputFloorHorizon(horizonId) {
  return IRB_OUTPUT_FLOOR_HORIZONS.find((horizon) => horizon.id === horizonId) ?? IRB_OUTPUT_FLOOR_HORIZONS.at(-1);
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
  const totalStandardisedTrea = readDataPoint(state, indexes, C02_TABLE_ID, {
    xCode: OUTPUT_FLOOR_STREA_X_CODE,
    yCode: TOTAL_TREA_Y_CODE
  }, referenceColumn, jstCode);
  // The output floor binds at consolidated level. Credit-risk values are only
  // used by the diagnostic table below and must not block the global result.
  const required = [totalTrea, totalStandardisedTrea];
  if (required.some((value) => !Number.isFinite(value))) {
    return {
      factor,
      jstCode,
      referenceLabel: referenceColumn.label,
      status: "Output floor simulation is not available for this JST/date because total TREA or total S-TREA is missing."
    };
  }

  const totalFloorThreshold = factor * totalStandardisedTrea;
  const totalFloorGap = totalFloorThreshold - totalTrea;
  const totalFloorAddOn = Math.max(0, totalFloorGap);
  const flooredTrea = totalTrea + totalFloorAddOn;
  const currentCet1Ratio = Number.isFinite(cet1Capital) && totalTrea !== 0
    ? cet1Capital / totalTrea
    : null;
  const flooredCet1Ratio = Number.isFinite(cet1Capital) && flooredTrea !== 0
    ? cet1Capital / flooredTrea
    : null;
  const impactBasisPoints = Number.isFinite(currentCet1Ratio) && Number.isFinite(flooredCet1Ratio)
    ? (flooredCet1Ratio - currentCet1Ratio) * 10000
    : null;
  const distanceBasisPoints = Number.isFinite(cet1Capital) && totalFloorThreshold > 0 && Number.isFinite(currentCet1Ratio)
    ? totalFloorAddOn > 0
      ? impactBasisPoints
      : -Math.abs((cet1Capital / totalFloorThreshold - currentCet1Ratio) * 10000)
    : null;
  const reportedRatioAsFraction = Number.isFinite(reportedCet1Ratio)
    ? (Math.abs(reportedCet1Ratio) > 1 ? reportedCet1Ratio / 100 : reportedCet1Ratio)
    : null;

  const scopes = buildOutputFloorScopes(state, indexes, referenceColumn, jstCode, factor, {
    cet1Capital,
    totalStandardisedTrea,
    totalTrea
  });

  return {
    cet1Capital,
    currentCet1Ratio,
    distanceBasisPoints,
    factor,
    flooredCet1Ratio,
    flooredTrea,
    impactBasisPoints,
    isBinding: totalFloorAddOn > 0,
    jstCode,
    referenceLabel: referenceColumn.label,
    reportedCet1Ratio: reportedRatioAsFraction,
    scopes,
    totalFloorAddOn,
    totalFloorGap,
    totalFloorThreshold,
    totalStandardisedTrea,
    totalTrea
  };
}

function buildOutputFloorScopes(state, indexes, referenceColumn, jstCode, factor, totals) {
  const directScopes = new Map();

  OUTPUT_FLOOR_SCOPE_DEFINITIONS.filter((definition) => definition.yCodes).forEach((definition) => {
    const currentTrea = definition.id === IRB_OUTPUT_FLOOR_DEFAULT_SCOPE
      ? totals.totalTrea
      : readDataPoints(state, indexes, C02_TABLE_ID, definition.yCodes, CURRENT_TREA_X_CODE, referenceColumn, jstCode);
    const standardisedTrea = definition.id === IRB_OUTPUT_FLOOR_DEFAULT_SCOPE
      ? totals.totalStandardisedTrea
      : readDataPoints(state, indexes, C02_TABLE_ID, definition.yCodes, OUTPUT_FLOOR_STREA_X_CODE, referenceColumn, jstCode);
    directScopes.set(definition.id, buildOutputFloorScope(definition, currentTrea, standardisedTrea, factor, totals));
  });

  const globalScope = directScopes.get("global");
  const creditScope = directScopes.get("credit-total");
  const otherDefinition = OUTPUT_FLOOR_SCOPE_DEFINITIONS.find((definition) => definition.id === "other-risks");
  const otherCurrentTrea = subtractFinite(globalScope?.currentTrea, creditScope?.currentTrea);
  const otherStandardisedTrea = subtractFinite(globalScope?.standardisedTrea, creditScope?.standardisedTrea);
  directScopes.set("other-risks", buildOutputFloorScope(otherDefinition, otherCurrentTrea, otherStandardisedTrea, factor, totals));

  return OUTPUT_FLOOR_SCOPE_DEFINITIONS
    .map((definition) => directScopes.get(definition.id))
    .filter((scope) => Number.isFinite(scope?.currentTrea) || Number.isFinite(scope?.standardisedTrea));
}

function buildOutputFloorScope(definition, currentTrea, standardisedTrea, factor, totals) {
  const threshold = Number.isFinite(standardisedTrea) ? factor * standardisedTrea : null;
  const gap = Number.isFinite(currentTrea) && Number.isFinite(threshold) ? threshold - currentTrea : null;
  const floorAddOn = Number.isFinite(gap) ? Math.max(0, gap) : null;
  const flooredScopeTrea = Number.isFinite(currentTrea) && Number.isFinite(floorAddOn) ? currentTrea + floorAddOn : null;
  const flooredTotalTrea = Number.isFinite(totals.totalTrea) && Number.isFinite(floorAddOn)
    ? totals.totalTrea + floorAddOn
    : null;
  const currentCet1Ratio = Number.isFinite(totals.cet1Capital) && totals.totalTrea !== 0
    ? totals.cet1Capital / totals.totalTrea
    : null;
  const flooredCet1Ratio = Number.isFinite(totals.cet1Capital) && flooredTotalTrea
    ? totals.cet1Capital / flooredTotalTrea
    : null;
  const thresholdTotalTrea = Number.isFinite(totals.totalTrea) && Number.isFinite(gap)
    ? totals.totalTrea + gap
    : null;
  const thresholdCet1Ratio = Number.isFinite(totals.cet1Capital) && thresholdTotalTrea > 0
    ? totals.cet1Capital / thresholdTotalTrea
    : null;
  const impactBasisPoints = Number.isFinite(currentCet1Ratio) && Number.isFinite(flooredCet1Ratio)
    ? (flooredCet1Ratio - currentCet1Ratio) * 10000
    : null;
  const distanceBasisPoints = Number.isFinite(currentCet1Ratio) && Number.isFinite(thresholdCet1Ratio)
    ? floorAddOn > 0
      ? impactBasisPoints
      : -Math.abs((thresholdCet1Ratio - currentCet1Ratio) * 10000)
    : null;

  return {
    currentCet1Ratio,
    currentTrea,
    factor,
    floorAddOn,
    flooredCet1Ratio,
    flooredScopeTrea,
    flooredTotalTrea,
    gap,
    id: definition.id,
    impactBasisPoints,
    distanceBasisPoints,
    isBinding: Number.isFinite(gap) && gap > 0,
    label: definition.label,
    standardisedTrea,
    threshold
  };
}

function getSnapshotScope(snapshot, scopeId) {
  return snapshot?.scopes?.find((scope) => scope.id === scopeId)
    ?? snapshot?.scopes?.find((scope) => scope.id === IRB_OUTPUT_FLOOR_DEFAULT_SCOPE)
    ?? { id: IRB_OUTPUT_FLOOR_DEFAULT_SCOPE, label: "Global perimeter" };
}

function readDataPoints(state, indexes, tableId, yCodes, xCode, referenceColumn, jstCode) {
  const values = yCodes.map((yCode) => readDataPoint(state, indexes, tableId, { xCode, yCode }, referenceColumn, jstCode));
  return values.every(Number.isFinite) ? values.reduce((total, value) => total + value, 0) : null;
}

function subtractFinite(total, part) {
  return Number.isFinite(total) && Number.isFinite(part) ? total - part : null;
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
