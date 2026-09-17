import assert from "node:assert/strict";

import {
  EXPLORER_ALL_CURRENCIES_CODE,
  explorerTableOffersAllCurrencies,
  getExplorerAxisOptions
} from "../app/src/data/explorer.js";
import { buildExplorerAxisSeries } from "../app/src/data/timeSeries.js";

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
const explorerPoints = ["P_02.06", "F_99.99"].flatMap((tableId) => [
  point(tableId, "x", "0010"),
  point(tableId, "y", "0010"),
  point(tableId, "z", "EUR", "Euro"),
  point(tableId, "z", "USD", "US dollar")
]);
const rows = [
  ["JST", "P_02.06", "0010", "0010", "EUR", "10"],
  ["JST", "P_02.06", "0010", "0010", "USD", "20"],
  ["JST", "F_99.99", "0010", "0010", "", "30"],
  ["JST", "F_99.99", "0010", "0010", "EUR", "10"]
];
const state = { columns, explorerPoints, rows, selectedJst: "JST" };

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

console.log("PASS: only Funding Plan currency Z axes omit the All currencies option.");
