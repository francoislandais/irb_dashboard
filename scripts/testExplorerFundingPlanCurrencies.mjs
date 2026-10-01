import assert from "node:assert/strict";

import {
  EXPLORER_ALL_CURRENCIES_CODE,
  explorerTableOffersAllCurrencies,
  getExplorerAxisOptions
} from "../app/src/data/explorer.js";
import { buildDataIndexes } from "../app/src/data/dataIndex.js";
import { buildExplorerAxisSeries } from "../app/src/data/timeSeries.js";
import { buildExplorerXYSeries } from "../app/src/data/explorerXY.js";

const columns = [
  "jst_code",
  "table_id",
  "x_axis_rc_code",
  "y_axis_rc_code",
  "z_axis_rc_code",
  "ref_2025_12_31"
];
const point = (tableId, axis, code, description = code) => ({
  code,
  coordinate: `${axis}_axis_rc_code`,
  description,
  displayDescription: description,
  format: "",
  hierarchyPath: description,
  indentLevel: 0,
  parentPath: "",
  tableId
});
const explorerPoints = ["P_02.06", "F_99.99", "C_66.01", "C_72.00"].flatMap((tableId) => [
  point(tableId, "x", "0010"),
  point(tableId, "y", "0010"),
  ...(tableId === "C_66.01" ? [point(tableId, "z", "0010", "All currencies")] : []),
  point(tableId, "z", "EUR", "Euro"),
  point(tableId, "z", "USD", "US dollar")
]);
const rows = [
  ["JST", "P_02.06", "0010", "0010", "EUR", "10"],
  ["JST", "P_02.06", "0010", "0010", "USD", "20"],
  ["JST", "F_99.99", "0010", "0010", "", "30"],
  ["JST", "F_99.99", "0010", "0010", "EUR", "10"],
  ["JST", "C_66.01", "0010", "0010", "", "999"],
  ["JST", "C_66.01", "0010", "0010", "0010", "40"],
  ["JST", "C_66.01", "0010", "0010", "EUR", "10"],
  ["JST", "C_72.00", "0010", "0010", "", "50"]
];
const state = { columns, explorerPoints, rows, selectedJst: "JST", dataIndexes: buildDataIndexes(columns, rows) };

assert.equal(explorerTableOffersAllCurrencies(state, "P_02.06"), false);
assert.deepEqual(getExplorerAxisOptions(state, "P_02.06").z.codes, ["EUR", "USD"]);
assert.deepEqual(
  buildExplorerAxisSeries(state, {
    axis: "z",
    selectedXCode: "0010",
    selectedYCode: "0010",
    tableId: "P_02.06"
  }).rows.map(({ code }) => code),
  ["EUR", "USD"]
);

assert.equal(explorerTableOffersAllCurrencies(state, "F_99.99"), true);
assert.equal(getExplorerAxisOptions(state, "F_99.99").z.codes[0], EXPLORER_ALL_CURRENCIES_CODE);
assert.equal(
  buildExplorerAxisSeries(state, {
    axis: "z",
    selectedXCode: "0010",
    selectedYCode: "0010",
    tableId: "F_99.99"
  }).rows[0].code,
  EXPLORER_ALL_CURRENCIES_CODE
);

assert.equal(explorerTableOffersAllCurrencies(state, "C_66.01"), false);
assert.deepEqual(getExplorerAxisOptions(state, "C_66.01").z.codes, ["0010", "EUR", "USD"]);
const almTotal = buildExplorerAxisSeries(state, {
  axis: "z", selectedXCode: "0010", selectedYCode: "0010", tableId: "C_66.01"
}).rows[0];
assert.equal(almTotal.code, "0010");
assert.equal(almTotal.values[0].value, 40, "the native total reads Z=0010, never blank Z");
assert.equal(buildExplorerXYSeries(state, {
  tableId: "C_66.01", selectedZCode: "0010"
}).rows[0].values[0].value, 40, "XY view also reads the native Z=0010 total");
assert.equal(explorerTableOffersAllCurrencies(state, "C_72.00"), true);
assert.equal(getExplorerAxisOptions(state, "C_72.00").z.codes[0], EXPLORER_ALL_CURRENCIES_CODE);
const totalLabelState = {
  ...state,
  explorerPoints: state.explorerPoints.map((entry) => entry.tableId === "C_66.01" && entry.code === "0010"
    ? { ...entry, description: "Total currencies" } : entry)
};
assert.equal(explorerTableOffersAllCurrencies(totalLabelState, "C_66.01"), false);

console.log("PASS: native ALM currency totals and synthetic open-currency totals stay distinct.");
