import { getCompleteAxisColumnIndexes } from "./core/axisColumns.js";
import { normalizeAxisCode } from "./core/axisCode.js";
import { getIndexedRowsByCoordinates } from "./dataIndex.js?v=20260915-stable-lists";
import { EXPLORER_ALL_CURRENCIES_CODE } from "./explorer.js?v=20260915-all-currency";

// Builds a Hive query that reproduces one or several selected Explorer
// cells, against the same table used by scripts/hive_to_dataset.py. Values
// are read back from each point's matched raw CSV row rather than the
// app's normalized axis codes, so the filters match whatever Hive
// actually stores (no zero-padding guesswork). Each point becomes its own
// parenthesized AND-group, combined with OR.
export function buildExplorerQueryFromPoints(state, points, { includeDateFilter = true } = {}) {
  const indexes = getCompleteAxisColumnIndexes(state?.columns ?? []);
  if (!indexes || !state?.selectedJst) return null;

  const groups = (points ?? [])
    .map((point) => buildPointCondition(state, indexes, point, includeDateFilter))
    .filter(Boolean);
  if (groups.length === 0) return null;

  const pointsFilter = groups.length === 1
    ? groups[0]
    : `(\n    ${groups.join("\n    OR ")}\n  )`;

  return `SELECT
    table_id,
    jst_code,
    x_axis_rc_code,
    y_axis_rc_code,
    z_axis_rc_code,
    reference_period,
    value_decimal
FROM crp_agora.agora_its_bft_current
WHERE is_group_head = 'Y'
  AND is_highest_cons = 'Y'
  AND ${pointsFilter}
ORDER BY reference_period;`;
}

function buildPointCondition(state, indexes, point, includeDateFilter) {
  if (!point?.tableId) return null;

  // "All Currency" (see explorer.js) has no single matching row to look
  // up by exact coordinates - find any row for this x/y instead and drop
  // the z filter entirely, matching every currency.
  const isAllCurrencies = point.selectedZCode === EXPLORER_ALL_CURRENCIES_CODE;
  const matchedRows = isAllCurrencies
    ? (state.rows ?? []).filter((row) => (
      row[indexes.tableId] === point.tableId
      && row[indexes.jstCode] === state.selectedJst
      && normalizeAxisCode(row[indexes.xAxisRcCode], "x") === normalizeAxisCode(point.selectedXCode, "x")
      && normalizeAxisCode(row[indexes.yAxisRcCode], "y") === normalizeAxisCode(point.selectedYCode, "y")
    ))
    : getIndexedRowsByCoordinates(state, point.tableId, {
      selectedXCode: point.selectedXCode,
      selectedYCode: point.selectedYCode,
      selectedZCode: point.selectedZCode
    }, state.selectedJst);
  const row = matchedRows[0];
  if (!row) return null;

  const rawTableId = row[indexes.tableId];
  const rawJstCode = row[indexes.jstCode];
  const rawXCode = row[indexes.xAxisRcCode];
  const rawYCode = row[indexes.yAxisRcCode];
  const rawZCode = isAllCurrencies ? "" : row[indexes.zAxisRcCode];

  const conditions = [
    `regexp_replace(table_id, '\\.[A-Za-z]+$', '') = ${sqlLiteral(rawTableId)}`,
    `jst_code = ${sqlLiteral(rawJstCode)}`,
    `x_axis_rc_code = ${sqlLiteral(rawXCode)}`,
    `y_axis_rc_code = ${sqlLiteral(rawYCode)}`
  ];
  if (rawZCode) conditions.push(`z_axis_rc_code = ${sqlLiteral(rawZCode)}`);
  if (includeDateFilter && point.referenceDateIso) {
    conditions.push(`reference_period = ${sqlLiteral(point.referenceDateIso)}`);
  }

  return `(${conditions.join(" AND ")})`;
}

function sqlLiteral(value) {
  return `'${String(value ?? "").replaceAll("'", "''")}'`;
}
