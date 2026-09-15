import { getCompleteAxisColumnIndexes } from "./core/axisColumns.js";
import { getIndexedRowsByCoordinates } from "./dataIndex.js?v=20260804-lazy-index";

// Builds a Hive query that reproduces exactly one selected Explorer cell,
// against the same table used by scripts/hive_to_dataset.py. Values are
// read back from the matched raw CSV row rather than the app's normalized
// axis codes, so the filters match whatever Hive actually stores (no
// zero-padding guesswork).
export function buildExplorerSelectionHiveQuery(state, selection, { includeDateFilter = true } = {}) {
  const indexes = getCompleteAxisColumnIndexes(state?.columns ?? []);
  if (!indexes || !selection?.tableId || !state?.selectedJst) return null;

  const matchedRows = getIndexedRowsByCoordinates(state, selection.tableId, {
    selectedXCode: selection.selectedXCode,
    selectedYCode: selection.selectedYCode,
    selectedZCode: selection.selectedZCode
  }, state.selectedJst);
  const row = matchedRows[0];
  if (!row) return null;

  const rawTableId = row[indexes.tableId];
  const rawJstCode = row[indexes.jstCode];
  const rawXCode = row[indexes.xAxisRcCode];
  const rawYCode = row[indexes.yAxisRcCode];
  const rawZCode = row[indexes.zAxisRcCode];

  const conditions = [
    `regexp_replace(table_id, '\\.[A-Za-z]+$', '') = ${sqlLiteral(rawTableId)}`,
    `jst_code = ${sqlLiteral(rawJstCode)}`,
    `x_axis_rc_code = ${sqlLiteral(rawXCode)}`,
    `y_axis_rc_code = ${sqlLiteral(rawYCode)}`,
    "is_group_head = 'Y'",
    "is_highest_cons = 'Y'"
  ];
  if (rawZCode) conditions.push(`z_axis_rc_code = ${sqlLiteral(rawZCode)}`);
  if (includeDateFilter && selection.referenceDateIso) {
    conditions.push(`reference_period = ${sqlLiteral(selection.referenceDateIso)}`);
  }

  return `SELECT
    table_id,
    jst_code,
    x_axis_rc_code,
    y_axis_rc_code,
    z_axis_rc_code,
    reference_period,
    value_decimal
FROM crp_agora.agora_its_bft_current
WHERE ${conditions.join("\n  AND ")}
ORDER BY reference_period;`;
}

function sqlLiteral(value) {
  return `'${String(value ?? "").replaceAll("'", "''")}'`;
}
