import { getCompleteAxisColumnIndexes } from "./core/axisColumns.js";
import { normalizeAxisCode } from "./core/axisCode.js?v=20260921-z-axis-padding";
import { getIndexedRowsByCoordinates } from "./dataIndex.js?v=20260915-stable-lists";
import { EXPLORER_ALL_CURRENCIES_CODE } from "./explorer.js?v=20260921-hierarchy-gt-escape";

// Factor an exact set of tuples, never the Cartesian product of unrelated
// selections. Siblings merge only when their remaining subtrees are identical.
function factorTuples(tuples, columns, depth = 0) {
  if (depth === columns.length) return "";
  const values = new Map();
  for (const tuple of tuples) {
    const key = tuple[depth];
    if (!values.has(key)) values.set(key, []);
    values.get(key).push(tuple);
  }
  const suffixes = new Map();
  for (const [value, rows] of [...values].sort(([a], [b]) => String(a).localeCompare(String(b)))) {
    const suffix = factorTuples(rows, columns, depth + 1);
    if (!suffixes.has(suffix)) suffixes.set(suffix, []);
    suffixes.get(suffix).push(value);
  }
  const branches = [...suffixes].map(([suffix, keys]) => {
    const condition = valueCondition(columns[depth], keys);
    return suffix ? `${condition}\nAND ${suffix}` : condition;
  });
  return branches.length === 1 ? branches[0] : `(\n${branches.map(branch => indent(`(\n${indent(branch)}\n)`)).join("\n    OR\n")}\n)`;
}

function valueCondition(column, values) {
  const nonBlank = values.filter(value => value !== "");
  const conditions = [];
  if (nonBlank.length === 1) conditions.push(`${column} = ${sqlLiteral(nonBlank[0])}`);
  if (nonBlank.length > 1) conditions.push(`${column} IN (\n${nonBlank.map(value => `    ${sqlLiteral(value)}`).join(",\n")}\n)`);
  if (values.includes("")) conditions.push(`(${column} IS NULL OR ${column} = '')`);
  return conditions.length === 1 ? conditions[0] : `(\n${conditions.map(indent).join("\n    OR\n")}\n)`;
}
function indent(text) { return text.split("\n").map(line => `    ${line}`).join("\n"); }
function sqlLiteral(value) { return `'${String(value ?? "").replaceAll("'", "''")}'`; }

export function buildExplorerQueryFromPoints(state, points, { includeDateFilter = true } = {}) {
  const indexes = getCompleteAxisColumnIndexes(state?.columns ?? []);
  if (!indexes || !state?.selectedJst) return null;
  const groups = new Map();
  for (const point of points ?? []) {
    if (!point?.tableId) continue;
    const jst = point.jstCode || state.selectedJst;
    const z = point.selectedZCode === EXPLORER_ALL_CURRENCIES_CODE ? "" : point.selectedZCode;
    const selections = { selectedXCode: point.selectedXCode, selectedYCode: point.selectedYCode, selectedZCode: z };
    const rows = state.dataIndexes ? getIndexedRowsByCoordinates(state, point.tableId, selections, jst) : (state.rows ?? []).filter(row =>
      row[indexes.tableId] === point.tableId && row[indexes.jstCode] === jst &&
      [[indexes.xAxisRcCode, selections.selectedXCode, "x"], [indexes.yAxisRcCode, selections.selectedYCode, "y"], [indexes.zAxisRcCode, z, "z"]]
        .every(([index, code, axis]) => normalizeAxisCode(row[index], axis) === normalizeAxisCode(code ?? "", axis)));
    const kri = point.tableId === "KRI";
    const dated = Boolean(includeDateFilter && point.referenceDateIso);
    const key = `${kri}:${dated}`;
    if (!groups.has(key)) groups.set(key, { kri, dated, tuples: [] });
    // Keep all raw variants matching normalized coordinates, not only the first.
    for (const row of rows) {
      const tuple = kri ? [jst, row[indexes.yAxisRcCode]] : [row[indexes.tableId], jst, row[indexes.zAxisRcCode] || "", row[indexes.xAxisRcCode] || "", row[indexes.yAxisRcCode] || ""];
      if (dated) tuple.push(point.referenceDateIso);
      groups.get(key).tuples.push(tuple);
    }
  }
  const queries = [];
  for (const { kri, dated, tuples } of groups.values()) {
    if (!tuples.length) continue;
    const columns = kri ? ["jst_code", "kri_data_point_id"] : ["regexp_replace(table_id, '\\\\.[A-Za-z]+$', '')", "jst_code", "z_axis_rc_code", "x_axis_rc_code", "y_axis_rc_code"];
    if (dated) columns.push("reference_period");
    const projection = kri ? ["'KRI' AS table_id", "jst_code", "'' AS x_axis_rc_code", "kri_data_point_id AS y_axis_rc_code", "'' AS z_axis_rc_code"] : ["table_id", "jst_code", "x_axis_rc_code", "y_axis_rc_code", "z_axis_rc_code"];
    queries.push(`SELECT\n${projection.concat(["reference_period", "value_decimal"]).map(item => `    ${item}`).join(",\n")}\nFROM crp_agora.${kri ? "agora_dm_imas_kris_raw" : "agora_its_bft_current"}\nWHERE is_group_head = 'Y'\n    AND is_highest_cons = 'Y'\n    AND (\n${indent(indent(factorTuples(tuples, columns)))}\n    )`);
  }
  return queries.length ? `${queries.join("\n\nUNION\n\n")}\nORDER BY\n    reference_period,\n    table_id,\n    y_axis_rc_code,\n    x_axis_rc_code;` : null;
}
