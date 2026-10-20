import { normalizeAxisCode } from "./core/axisCode.js";
import { getRequiredAxisColumnIndexes } from "./core/axisColumns.js";
import { getReferenceColumns, parseNumericValue } from "./core/referenceColumns.js";
import { getIndexedRowsByTableJst } from "./dataIndex.js";

const AMOUNT_COLUMN = "0010";
const TOTAL_RWA_ROW = "0010";
const RATIOS = [
  { key: "cet1", label: "CET1", row: "0010" },
  { key: "tier1", label: "Tier 1", row: "0030" },
  { key: "total", label: "Total capital", row: "0050" }
];

function readReportedPoint(state, indexes, tableId, rowCode, reference) {
  const indexed = getIndexedRowsByTableJst(state, tableId);
  const rows = indexed.length || state.dataIndexes ? indexed : (state.rows ?? []).filter((row) => (
    row[indexes.tableId] === tableId && row[indexes.institutionId] === state.selectedJst
  ));
  const values = rows.filter((row) => (
    normalizeAxisCode(row[indexes.xAxisRcCode], "x") === AMOUNT_COLUMN
    && normalizeAxisCode(row[indexes.yAxisRcCode], "y") === rowCode
    && (indexes.zAxisRcCode < 0 || !String(row[indexes.zAxisRcCode] ?? "").trim())
  )).map((row) => String(row[reference.index] ?? "").trim())
    .filter(Boolean)
    .map((raw) => parseNumericValue(raw, NaN))
    .filter(Number.isFinite);
  // A ratio is one reported point. Conflicting duplicates cannot safely be
  // summed, so leave that date unavailable rather than inventing a value.
  return values.length && values.every((value) => value === values[0]) ? values[0] : null;
}

function readSnapshot(state, indexes, reference) {
  const rwa = readReportedPoint(state, indexes, "C_02.00", TOTAL_RWA_ROW, reference);
  const reported = RATIOS.map((ratio) => {
    const value = readReportedPoint(state, indexes, "C_03.00", ratio.row, reference);
    return { ...ratio, current: value === null ? null : Math.abs(value) > 1 ? value / 100 : value };
  });
  return { reference, rwa, reported };
}

export function buildCapitalImpactModel(state, referenceName = "", deltaRwa = 0) {
  const indexes = getRequiredAxisColumnIndexes(state?.columns ?? []);
  if (!indexes || !state?.selectedJst) return { status: "Select an institution and load COREP data.", references: [] };

  const snapshots = getReferenceColumns(state.columns)
    .map((reference) => readSnapshot(state, indexes, reference))
    .filter((snapshot) => snapshot.rwa > 0 && Number.isFinite(snapshot.reported[0].current));
  const references = snapshots.map(({ reference }) => reference);
  if (!snapshots.length) return { status: "C_02.00 total RWA and C_03.00 CET1 ratio are unavailable for this institution.", references };

  const selected = snapshots.find(({ reference }) => reference.name === referenceName) ?? snapshots.at(-1);
  const projectedRwa = selected.rwa + deltaRwa;
  const status = !Number.isFinite(deltaRwa)
    ? "Enter a valid RWA change."
    : projectedRwa <= 0
      ? "The resulting RWA must remain greater than zero."
      : "";
  const ratios = selected.reported.map((ratio) => {
    if (!Number.isFinite(ratio.current) || status) return { ...ratio, projected: null, impactBps: null };
    // Capital stays unchanged: capital = reported ratio × current RWA.
    const projected = ratio.current * selected.rwa / projectedRwa;
    return { ...ratio, projected, impactBps: (projected - ratio.current) * 10_000 };
  });
  return {
    status,
    reference: selected.reference,
    references,
    currentRwa: selected.rwa,
    deltaRwa,
    projectedRwa: status ? null : projectedRwa,
    ratios
  };
}
