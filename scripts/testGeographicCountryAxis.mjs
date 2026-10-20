import assert from "node:assert/strict";
import { normalizeGeographicCountryAxisCodes, normalizeGeographicCountryCode } from "../app/src/data/geographicCountryAxis.js";

const columns = ["table_id", "z_axis_rc_code", "ref_2025_12_31"];
const rows = [
  ["F_20.04", "x28", "100"],
  ["F_20.05", "x28", "200"],
  ["F_20.04", "FR", "300"],
  ["C_09.01", "qx1", "500"],
  ["C_09.02", "qx28", "600"],
  ["C_33.00", "FR", "700"],
  ["C_20.04", "x28", "400"]
];
normalizeGeographicCountryAxisCodes(columns, rows);
assert.deepEqual(rows.map((row) => row[1]), ["qx2000", "qx2000", "FR", "qx2014", "qx2000", "FR", "x28"]);
assert.equal(normalizeGeographicCountryCode("F_20.04", "x28"), "qx2000",
  "old links to Other countries must retain their selection");
assert.equal(normalizeGeographicCountryCode("C_09.04", "qx1"), "qx2014");
console.log("PASS: legacy geographical Other countries codes use the fixed Z identifier.");
