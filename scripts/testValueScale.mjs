import assert from "node:assert/strict";
import { expandScaledReferenceValues } from "../app/src/data/core/valueScale.js";

const columns = ["table_id", "ref_2026_06_30", "ref_2024_12_31", "value_scale"];
const original = {
  columns,
  rows: [
    ["C_03.00", "1234", "-1234", "1000"],
    ["C_03.00", "0.1319", "", ""],
    ["R_08.00", "4567.25", "", ""],
  ],
};
const expanded = expandScaledReferenceValues(original);
assert.deepEqual(expanded.rows[0], ["C_03.00", "1234000", "-1234000", "1000"]);
assert.deepEqual(expanded.rows[1], original.rows[1]);
assert.deepEqual(expanded.rows[2], original.rows[2]);
assert.deepEqual(original.rows[0], ["C_03.00", "1234", "-1234", "1000"]);
assert.throws(() => expandScaledReferenceValues({ columns, rows: [["C_03.00", "12.5", "", "1000"]] }), /Montant compact invalide/);
assert.deepEqual(expandScaledReferenceValues({ columns: columns.slice(0, 3), rows: [["C_03.00", "1234", ""]] }).rows,
  [["C_03.00", "1234", ""]]);
