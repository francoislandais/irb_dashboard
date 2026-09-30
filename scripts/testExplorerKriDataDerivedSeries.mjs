import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { parseCsv } from "../app/src/data/csvParser.js";
import { parseExplorerPoints } from "../app/src/data/explorerConfig.js";
import { buildExplorerAxisSeries, getExplorerAxisPointsConfig } from "../app/src/data/timeSeries.js";

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
  assert.deepEqual(series.rows.map(({ displayDescription }) => displayDescription), ["LIQ52", "LIQ53"]);
  assert.equal(series.rows[0].values[0].value, 12.5);
}

const kriCsv = parseCsv(await readFile(new URL("../app/assets/KRI_dimension_mapping.csv", import.meta.url), "utf8"));
const kriPoints = parseExplorerPoints(kriCsv.columns, kriCsv.rows);
assert.equal(kriPoints.length, 2674);
assert.equal(kriPoints.find((point) => point.code === "LIQ55")?.description, "Liquidity buffer quality ratio");
assert.equal(kriPoints.find((point) => point.code === "LIQ55")?.format, "%");

const reportedCodes = kriPoints.slice(0, 45).map((point) => point.code);
const configuredState = {
  ...state,
  explorerPoints: kriPoints,
  rows: [
    ...reportedCodes.map((code) => ["FRSOG", "KRI", "", code, "", "12.5"]),
    ["FRSOG", "KRI", "", "NEW_KRI", "", "1"]
  ]
};
const availablePoints = getExplorerAxisPointsConfig(configuredState, "KRI", "y");
assert.equal(availablePoints.length, 46);
assert.equal(availablePoints[0].description, kriPoints[0].description);
assert.equal(availablePoints.at(-1).code, "NEW_KRI");
const pageCodes = new Set(availablePoints.slice(20, 40).map((point) => point.code));
const page = buildExplorerAxisSeries(configuredState, {
  axis: "y", tableId: "KRI", onlyCodes: pageCodes
});
assert.equal(page.rows.length, 20);
assert.deepEqual(page.rows.map((row) => row.code), [...pageCodes]);
assert.equal(page.rows[0].displayDescription, availablePoints[20].description);

console.log("PASS: KRI names, formats and 20-row pages survive the versioned ITS dictionary.");
