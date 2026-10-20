import assert from "node:assert/strict";
import { buildDataIndexes } from "../app/src/data/dataIndex.js";
import { buildIrbGradeDensityModel } from "../app/src/data/irbGradeDensity.js";

const columns = ["reporting_unit_id", "table_id", "x_axis_rc_code", "y_axis_rc_code", "z_axis_rc_code", "ref_2025_09_30", "ref_2025_12_31"];
const cell = (institution, x, grade, z, q3, q4 = "") => [institution, "C_08.02", x, grade, z, q3, q4];
const rows = [
  cell("A", "0010", "001", "qx2023", "0.01", "0.02"),
  cell("A", "0110", "001", "qx2023", "100", "100"),
  cell("A", "0260", "001", "qx2023", "50", "80"),
  cell("B", "0010", "001", "qx2023", "0.03", ""),
  cell("B", "0110", "001", "qx2023", "200", ""),
  cell("B", "0260", "001", "qx2023", "100", ""),
  cell("A", "0010", "002", "qx2023", "0.04"),
  cell("A", "0110", "002", "qx2023", "0"),
  cell("A", "0260", "002", "qx2023", "20"),
  cell("A", "0010", "010", "qx2021", "0.2"),
  cell("A", "0110", "010", "qx2021", "10"),
  cell("A", "0260", "010", "qx2021", "5"),
  cell("A", "0010", "003", "qx2023", "0.05"),
  cell("A", "0110", "003", "qx2023", "10"),
  cell("A", "0260", "003", "qx2023", "5"),
  cell("A", "0260", "003", "qx2023", "6"),
  cell("A", "0010", "", "qx2023", "0.5"),
  cell("A", "0110", "", "qx2023", "100"),
  cell("A", "0260", "", "qx2023", "50")
];
const state = {
  columns, rows, selectedJst: "A", dataIndexes: buildDataIndexes(columns, rows),
  availableTaxonomiesByTemplate: { "C_08.02": ["4.0"] },
  taxonomyHistory: { columns: ["table_id", "framework", "effective_from", "effective_to"], rows: [
    ["C_08.02", "4.0", "2025-01-01", ""]
  ] }
};
const model = buildIrbGradeDensityModel(state, "ref_2025_09_30", "qx2023");
assert.equal(model.status, "ready");
assert.deepEqual(model.portfolios.map((item) => item.zCode), ["qx2021", "qx2023"]);
assert.equal(model.series.length, 2);
assert.equal(model.pointCount, 2);
assert.deepEqual(model.series.map((item) => item.points[0].pd), [0.01, 0.03]);
assert.deepEqual(model.series.map((item) => item.points[0].density), [0.5, 0.5]);
assert.equal(model.conflictingPoints, 1);
const later = buildIrbGradeDensityModel(state, "ref_2025_12_31", "qx2023");
assert.equal(later.pointCount, 1);
assert.equal(later.series[0].points[0].density, 0.8);
console.log("PASS: raw institution/grade PD and RWA/EAD, Z selection, dates, incomplete and conflicting points.");
