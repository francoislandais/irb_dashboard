import assert from "node:assert/strict";
import { normalizeAxisCode } from "../app/src/data/core/axisCode.js";
import { getCompleteAxisColumnIndexes } from "../app/src/data/core/axisColumns.js";
import { buildDataIndexes } from "../app/src/data/dataIndex.js";
import { getExplorerAxisOptions } from "../app/src/data/explorer.js";
import { getBenchmarkRows } from "../app/src/data/explorerBenchmark.js";
import { buildExplorerAxisSeries, getExplorerAxisPointsConfig } from "../app/src/data/timeSeries.js";
import { buildExplorerXYSeries } from "../app/src/data/explorerXY.js";

const columns = ["reporting_unit_id", "table_id", "x_axis_rc_code", "y_axis_rc_code", "z_axis_rc_code", "ref_2025_12_31", "ref_2026_06_30"];
const rows = [
  ["A", "C_08.02", "0010", "12", "qx01", "10", ""],
  ["A", "C_08.02", "0010", "012", "qx01", "20", ""],
  ["A", "C_08.02", "0010", "099", "qx01", "30", ""],
  ["A", "C_08.02", "0010", "", "qx01", "", "100"],
  ["B", "C_08.02", "0010", "0999", "qx01", "40", ""],
  ["B", "C_08.02", "0010", "12", "qx01", "50", ""],
];
const state = {
  columns, rows, dataIndexes: buildDataIndexes(columns, rows), selectedJst: "A",
  explorerPoints: [
    { tableId: "C_08.02", coordinate: "x_axis_rc_code", code: "0010", description: "PD", displayDescription: "PD", hierarchyPath: "PD", indentLevel: 0, parentPath: "" },
    { tableId: "C_08.02", coordinate: "y_axis_rc_code", code: "0999", description: "Obligor Grade", displayDescription: "Obligor Grade", hierarchyPath: "Obligor Grade", indentLevel: 0, parentPath: "" },
    { tableId: "C_08.02", coordinate: "z_axis_rc_code", code: "qx01", description: "All classes", displayDescription: "All classes", hierarchyPath: "All classes", indentLevel: 0, parentPath: "" },
  ],
};

assert.equal(normalizeAxisCode("012", "y", "C_08.02"), "012");
assert.equal(normalizeAxisCode("012", "y", "C_08.01"), "0012");
assert.deepEqual(getExplorerAxisPointsConfig(state, "C_08.02", "y"), []);
assert.deepEqual(getExplorerAxisOptions(state, "C_08.02").y.codes, ["012", "099", "12"]);

const temporal = buildExplorerAxisSeries(state, {
  tableId: "C_08.02", axis: "y", selectedXCode: "0010", selectedZCode: "qx01",
});
assert.deepEqual(temporal.rows.map((row) => [row.code, row.values.map((point) => point.value)]), [
  ["012", [20, null]], ["099", [30, null]], ["12", [10, null]],
]);

const xy = buildExplorerXYSeries(state, { tableId: "C_08.02", selectedZCode: "qx01", referenceLabel: "31/12/2025" });
assert.deepEqual(xy.rows.map((row) => [row.code, row.values[0].value]), [["012", 20], ["099", 30], ["12", 10]]);

const indexes = getCompleteAxisColumnIndexes(columns);
const selected = (yCode) => getBenchmarkRows(state, indexes, "C_08.02", {
  selectedXCode: "0010", selectedYCode: yCode, selectedZCode: "qx01",
}, "A");
assert.deepEqual(selected("12").map((row) => row[5]), ["10"]);
assert.deepEqual(selected("012").map((row) => row[5]), ["20"]);

const otherInstitution = { ...state, selectedJst: "B" };
assert.deepEqual(getExplorerAxisOptions(otherInstitution, "C_08.02").y.codes, ["0999", "12"]);
assert.deepEqual(buildExplorerXYSeries(otherInstitution, {
  tableId: "C_08.02", selectedZCode: "qx01", referenceLabel: "31/12/2025",
}).rows.map((row) => [row.code, row.values[0].value]), [["0999", 40], ["12", 50]]);

const withoutIndexes = { ...state, dataIndexes: null };
assert.deepEqual(getExplorerAxisOptions(withoutIndexes, "C_08.02").y.codes, ["012", "099", "12"]);
assert.deepEqual(buildExplorerAxisSeries(withoutIndexes, {
  tableId: "C_08.02", axis: "y", selectedXCode: "0010", selectedZCode: "qx01",
}).rows.map((row) => [row.code, row.values[0].value]), [["012", 20], ["099", 30], ["12", 10]]);

console.log("PASS: C_08.02 keeps exact OGR grade IDs and lists only the selected institution's grades.");
