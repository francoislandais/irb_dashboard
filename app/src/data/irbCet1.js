import { normalizeAxisCode } from "./core/axisCode.js";
import { getRequiredAxisColumnIndexes } from "./core/axisColumns.js";
import { getReferenceColumns, parseNumericValue } from "./core/referenceColumns.js";
import { getIndexedJstCodes, getIndexedRowsByTableJst } from "./dataIndex.js?v=20260804-lazy-index";

const C01_TABLE_ID = "C_01.00";
const C02_TABLE_ID = "C_02.00";
const AMOUNT_X_CODE = "0010";
const CET1_Y_CODE = "0020";
const TOTAL_TREA_Y_CODE = "0010";
const CAPITAL_RATIO_DEFINITIONS = {
  cet1: { capitalLabel: "CET1 capital", key: "cet1", label: "CET1 ratio", numeratorComponentCodes: null, numeratorYCode: "0020" },
  tier1: { capitalLabel: "Tier 1 capital", key: "tier1", label: "Tier 1 capital ratio", numeratorComponentCodes: ["0020", "0530"], numeratorYCode: "0015" },
  total: { capitalLabel: "Total capital", key: "total", label: "Total capital ratio", numeratorComponentCodes: ["0015", "0750"], numeratorYCode: "0010" }
};

export function getIrbCet1RatioModel(state, currentReferenceName = "", previousReferenceName = "", ratioKey = "cet1") {
  const indexes = getRequiredAxisColumnIndexes(state.columns);
  const referenceDates = getReferenceColumns(state.columns);
  const ratioDefinition = getCapitalRatioDefinition(ratioKey);
  if (!indexes || !state.selectedJst) return { status: "Load a CSV and select a JST." };
  if (referenceDates.length < 2) return { status: "At least two reference dates are required to explain the CET1 ratio movement." };

  const availableCurrentDates = referenceDates.slice(1);
  const currentReference = availableCurrentDates.find((item) => item.name === currentReferenceName)
    ?? availableCurrentDates.at(-1);
  const currentIndex = referenceDates.findIndex((item) => item.name === currentReference.name);
  const eligiblePreviousDates = referenceDates.slice(0, currentIndex);
  const previousReference = eligiblePreviousDates.find((item) => item.name === previousReferenceName)
    ?? eligiblePreviousDates.at(-1);
  if (!previousReference) return { status: "Select a reference date with an earlier comparison quarter." };

  const numerator = readPointPair(state, indexes, C01_TABLE_ID, ratioDefinition.numeratorYCode, currentReference, previousReference);
  const denominator = readPointPair(state, indexes, C02_TABLE_ID, TOTAL_TREA_Y_CODE, currentReference, previousReference);
  if (!numerator || !denominator || denominator.current === 0 || denominator.previous === 0) {
    return { status: "C01 CET1 capital and C02 total RWA are required for both selected dates." };
  }

  const previousRatio = numerator.previous / denominator.previous;
  const currentRatio = numerator.current / denominator.current;
  const attribution = calculateShapleyAttribution(numerator, denominator);
  const numeratorComponents = buildComponentBreakdown(
    state, indexes, C01_TABLE_ID, ratioDefinition.numeratorYCode, currentReference, previousReference,
    attribution.numeratorBasisPoints, numerator.current - numerator.previous, ratioDefinition.numeratorComponentCodes
  );
  const denominatorComponents = buildComponentBreakdown(
    state, indexes, C02_TABLE_ID, TOTAL_TREA_Y_CODE, currentReference, previousReference,
    attribution.denominatorBasisPoints, denominator.current - denominator.previous
  );

  return {
    attribution,
    availableCurrentDates,
    currentRatio,
    currentReference,
    denominator: { ...denominator, change: denominator.current - denominator.previous },
    denominatorComponents,
    eligiblePreviousDates,
    jstCode: state.selectedJst,
    numerator: { ...numerator, change: numerator.current - numerator.previous },
    numeratorComponents,
    previousRatio,
    previousReference,
    ratioDefinition,
    ratioChangeBasisPoints: (currentRatio - previousRatio) * 10000,
    referenceDates
  };
}

export function getIrbCet1TimeSeriesModel(state, selection = { kind: "ratio" }) {
  const indexes = getRequiredAxisColumnIndexes(state.columns);
  const referenceDates = getReferenceColumns(state.columns);
  if (!indexes || !state.selectedJst || !referenceDates.length) return { status: "No CET1 time series is available." };

  const definition = getTimeSeriesDefinition(selection);
  const series = getIndexedJstCodes(state).map((jstCode) => {
    const ratioDefinition = getCapitalRatioDefinition(selection.ratioKey);
    const ratios = referenceDates.map((reference) => readRatioValue(state, indexes, reference, jstCode, ratioDefinition.numeratorYCode));
    const data = referenceDates.map((reference, index) => {
      if (definition.kind === "ratio") return Number.isFinite(ratios[index]) ? ratios[index] * 100 : null;
      if (definition.kind === "movement") {
        return index > 0 && Number.isFinite(ratios[index]) && Number.isFinite(ratios[index - 1])
          ? (ratios[index] - ratios[index - 1]) * 10000
          : null;
      }
      return readPointValue(state, indexes, definition.tableId, definition.yCode, reference, jstCode);
    });
    return { data, jstCode };
  }).filter((item) => item.data.some(Number.isFinite));

  return {
    categories: referenceDates.map(formatQuarter),
    label: definition.label,
    referenceDates,
    selectedJst: state.selectedJst,
    series,
    valueKind: definition.valueKind
  };
}

function getTimeSeriesDefinition(selection) {
  const ratioDefinition = getCapitalRatioDefinition(selection.ratioKey);
  if (selection.kind === "movement") return { kind: "movement", label: `${ratioDefinition.label} movement`, valueKind: "bps" };
  if (selection.kind === "numerator") {
    const ratioDefinition = getCapitalRatioDefinition(selection.ratioKey);
    return { kind: "amount", label: ratioDefinition.capitalLabel, tableId: C01_TABLE_ID, valueKind: "amount", yCode: ratioDefinition.numeratorYCode };
  }
  if (selection.kind === "denominator") return { kind: "amount", label: "Total RWA", tableId: C02_TABLE_ID, valueKind: "amount", yCode: TOTAL_TREA_Y_CODE };
  if (selection.kind === "component") {
    return { kind: "amount", label: selection.label || selection.yCode, tableId: selection.tableId, valueKind: "amount", yCode: selection.yCode };
  }
  return { kind: "ratio", label: ratioDefinition.label, valueKind: "ratio" };
}

function readRatioValue(state, indexes, reference, jstCode, numeratorYCode = CET1_Y_CODE) {
  const numerator = readPointValue(state, indexes, C01_TABLE_ID, numeratorYCode, reference, jstCode);
  const denominator = readPointValue(state, indexes, C02_TABLE_ID, TOTAL_TREA_Y_CODE, reference, jstCode);
  return Number.isFinite(numerator) && Number.isFinite(denominator) && denominator !== 0 ? numerator / denominator : null;
}

function readPointValue(state, indexes, tableId, yCode, reference, jstCode) {
  const rows = getIndexedRowsByTableJst(state, tableId, jstCode).filter((row) => (
    normalizeAxisCode(row[indexes.xAxisRcCode], "x") === AMOUNT_X_CODE
    && normalizeAxisCode(row[indexes.yAxisRcCode], "y") === normalizeAxisCode(yCode, "y")
  ));
  return rows.length ? sumRows(rows, reference.index) : null;
}

function formatQuarter(reference) {
  return `Q${Math.floor(reference.date.getMonth() / 3) + 1} ${reference.date.getFullYear()}`;
}

function getCapitalRatioDefinition(ratioKey = "cet1") {
  return CAPITAL_RATIO_DEFINITIONS[ratioKey] ?? CAPITAL_RATIO_DEFINITIONS.cet1;
}

function calculateShapleyAttribution(numerator, denominator) {
  const n0 = numerator.previous;
  const n1 = numerator.current;
  const d0 = denominator.previous;
  const d1 = denominator.current;
  const numeratorEffect = 0.5 * (((n1 / d0) - (n0 / d0)) + ((n1 / d1) - (n0 / d1)));
  const denominatorEffect = 0.5 * (((n0 / d1) - (n0 / d0)) + ((n1 / d1) - (n1 / d0)));
  return {
    denominatorBasisPoints: denominatorEffect * 10000,
    numeratorBasisPoints: numeratorEffect * 10000
  };
}

function buildComponentBreakdown(state, indexes, tableId, totalCode, currentReference, previousReference, totalBasisPoints, totalChange, componentCodes = null) {
  const mappings = state.dimensionMapping?.list?.(tableId, "y_axis_rc_code") ?? [];
  const totalMapping = mappings.find((mapping) => normalizeAxisCode(mapping.code, "y") === totalCode);
  const totalPath = splitPath(totalMapping?.description);
  const rows = getIndexedRowsByTableJst(state, tableId);
  const rowByCode = new Map();
  rows.forEach((row) => {
    if (normalizeAxisCode(row[indexes.xAxisRcCode], "x") !== AMOUNT_X_CODE) return;
    rowByCode.set(normalizeAxisCode(row[indexes.yAxisRcCode], "y"), row);
  });

  const components = mappings
    .map((mapping) => ({ ...mapping, code: normalizeAxisCode(mapping.code, "y"), path: splitPath(mapping.description) }))
    .filter((mapping) => mapping.code !== totalCode && (
      Array.isArray(componentCodes)
        ? componentCodes.includes(mapping.code)
        : mapping.path.length === totalPath.length + 1
          && totalPath.every((segment, index) => segment === mapping.path[index])
          && !/^(of which|total risk exposure amount pre-floor)/i.test(mapping.path.at(-1))
    ))
    .map((mapping) => {
      const row = rowByCode.get(mapping.code);
      if (!row) return null;
      const current = parseNumericValue(row[currentReference.index], null);
      const previous = parseNumericValue(row[previousReference.index], null);
      if (!Number.isFinite(current) && !Number.isFinite(previous)) return null;
      const change = (current ?? 0) - (previous ?? 0);
      return {
        basisPoints: totalChange !== 0 ? totalBasisPoints * change / totalChange : 0,
        change,
        code: mapping.code,
        current: current ?? 0,
        label: mapping.path.at(-1),
        previous: previous ?? 0
      };
    })
    .filter(Boolean);

  const explainedChange = components.reduce((sum, component) => sum + component.change, 0);
  const residualChange = totalChange - explainedChange;
  if (Math.abs(residualChange) > Math.max(1e-8, Math.abs(totalChange) * 1e-8)) {
    components.push({
      basisPoints: totalChange !== 0 ? totalBasisPoints * residualChange / totalChange : totalBasisPoints,
      change: residualChange,
      code: "residual",
      current: null,
      label: "Other and reconciliation effects",
      previous: null
    });
  }

  return components.sort((left, right) => Math.abs(right.basisPoints) - Math.abs(left.basisPoints));
}

function readPointPair(state, indexes, tableId, yCode, currentReference, previousReference) {
  const rows = getIndexedRowsByTableJst(state, tableId).filter((row) => (
    normalizeAxisCode(row[indexes.xAxisRcCode], "x") === AMOUNT_X_CODE
    && normalizeAxisCode(row[indexes.yAxisRcCode], "y") === yCode
  ));
  if (!rows.length) return null;
  const current = sumRows(rows, currentReference.index);
  const previous = sumRows(rows, previousReference.index);
  return Number.isFinite(current) && Number.isFinite(previous) ? { current, previous } : null;
}

function sumRows(rows, columnIndex) {
  const values = rows.map((row) => parseNumericValue(row[columnIndex], null)).filter(Number.isFinite);
  return values.length ? values.reduce((sum, value) => sum + value, 0) : null;
}

function splitPath(description = "") {
  return String(description).split("/").map((part) => part.trim()).filter(Boolean);
}
