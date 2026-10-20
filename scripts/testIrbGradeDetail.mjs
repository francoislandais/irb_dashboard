import assert from "node:assert/strict";
import { buildDataIndexes } from "../app/src/data/dataIndex.js";
import { buildIrbGradeDetailModel, compareIrbGradeIds } from "../app/src/data/irbGradeDetail.js";

assert.deepEqual(["10", "012", "2", "1", "12"].sort(compareIrbGradeIds), ["1", "2", "10", "12", "012"]);

const columns = ["reporting_unit_id", "table_id", "x_axis_rc_code", "y_axis_rc_code", "z_axis_rc_code", "ref_2025_12_31", "ref_2026_06_30"];
const rows = [
  ["A", "C_08.02", "0010", "1", "qx2020", "0.01", ""],
  ["A", "C_08.02", "0110", "1", "qx2020", "100", ""],
  ["A", "C_08.02", "0010", "1", "qx2021", "0.03", ""],
  ["A", "C_08.02", "0110", "1", "qx2021", "300", ""],
  ["A", "C_08.02", "0010", "2", "qx2020", "0.02", ""],
  ["A", "C_08.02", "0010", "10", "qx2020", "0.1", ""],
  ["A", "C_08.02", "0010", "012", "qx2020", "0.12", ""],
  ["A", "C_08.02", "0010", "", "qx2020", "", "0.05"],
  ["B", "C_08.02", "0010", "99", "qx2020", "0.99", ""]
];
const state = {
  columns, rows, selectedJst: "A", dataIndexes: buildDataIndexes(columns, rows),
  availableTaxonomiesByTemplate: { "C_08.02": ["4.0", "4.2"] },
  taxonomyHistory: { columns: ["table_id", "framework", "effective_from", "effective_to"], rows: [
    ["C_08.02", "4.0", "2025-01-01", "2026-03-31"],
    ["C_08.02", "4.2", "2026-04-01", ""]
  ] }
};
const model = buildIrbGradeDetailModel(state, "", "sovereign");
assert.equal(model.status, "ready");
assert.equal(model.reference.name, "ref_2025_12_31");
assert.deepEqual(model.references.map((item) => item.name), ["ref_2025_12_31"]);
assert.deepEqual(model.grades, ["1", "2", "10", "012"]);
assert.deepEqual(model.series.map((series) => series.zCode), ["qx2020", "qx2021"]);
assert.equal(model.series[0].points[0].pd, 0.01);
assert.equal(model.series[1].points[0].pd, 0.03);
assert.equal(model.pointCount, 5);
assert.equal(model.series.some((series) => series.points.some((point) => point.gradeId === "99")), false);
console.log("PASS: IRB grade detail dates, natural ID order, institution scope and raw PDs by exposure class.");
