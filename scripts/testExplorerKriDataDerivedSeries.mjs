import assert from "node:assert/strict";

import { buildExplorerAxisSeries } from "../app/src/data/timeSeries.js";

const state = {
  columns: [
    "reporting_unit_id",
    "table_id",
    "x_axis_rc_code",
    "y_axis_rc_code",
    "z_axis_rc_code",
    "ref_2026_06_30"
  ],
  rows: [
    ["FRSOG", "KRI", "", "LIQ52", "", "12.5"],
    ["FRSOG", "KRI", "", "LIQ53", "", "8"]
  ],
  selectedJst: "FRSOG",
  explorerPoints: []
};

for (const dimensionMapping of [undefined, { list: () => [], find: () => undefined, hasParentCoordinateCode: true }]) {
  const series = buildExplorerAxisSeries({ ...state, dimensionMapping }, {
    axis: "y",
    tableId: "KRI",
    selectedXCode: "",
    selectedZCode: ""
  });

  assert.deepEqual(series.rows.map(({ code }) => code), ["LIQ52", "LIQ53"]);
  assert.deepEqual(series.rows.map(({ fullDescription }) => fullDescription), ["Y LIQ52", "Y LIQ53"]);
  assert.deepEqual(series.rows[0].pathComponents, ["Y LIQ52"]);
  assert.equal(series.rows[0].values[0].value, 12.5);
}

console.log("PASS: KRI data-derived series renders without dimension mappings.");
