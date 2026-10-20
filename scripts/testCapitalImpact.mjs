import assert from "node:assert/strict";
import { buildCapitalImpactModel } from "../app/src/data/capitalImpact.js";

const columns = [
  "reporting_unit_id", "table_id", "x_axis_rc_code", "y_axis_rc_code", "z_axis_rc_code",
  "ref_2025_12_31", "ref_2026_03_31"
];
const state = {
  columns,
  selectedJst: "BANK",
  rows: [
    ["BANK", "C_02.00", "0010", "0010", "", "1000", "1200"],
    ["BANK", "C_03.00", "0010", "0010", "", "0.12", "0.125"],
    ["BANK", "C_03.00", "0010", "0030", "", "0.15", "0.155"],
    ["BANK", "C_03.00", "0010", "0050", "", "0.18", "0.185"],
    ["OTHER", "C_02.00", "0010", "0010", "", "9000", "9000"]
  ]
};

const increase = buildCapitalImpactModel(state, "ref_2025_12_31", 250);
assert.equal(increase.status, "");
assert.equal(increase.currentRwa, 1000);
assert.equal(increase.projectedRwa, 1250);
assert.equal(increase.ratios[0].projected, 0.096);
assert.ok(Math.abs(increase.ratios[0].impactBps + 240) < 1e-9);
assert.ok(Math.abs(increase.ratios[1].impactBps + 300) < 1e-9);

const decrease = buildCapitalImpactModel(state, "ref_2025_12_31", -200);
assert.equal(decrease.ratios[0].projected, 0.15);
assert.ok(Math.abs(decrease.ratios[0].impactBps - 300) < 1e-9);

const latest = buildCapitalImpactModel(state, "", 0);
assert.equal(latest.reference.name, "ref_2026_03_31");
assert.equal(latest.ratios[0].current, 0.125);
assert.equal(latest.ratios[0].impactBps, 0);

const invalid = buildCapitalImpactModel(state, "ref_2025_12_31", -1000);
assert.match(invalid.status, /greater than zero/);
assert.equal(invalid.ratios[0].projected, null);

const percentState = { ...state, rows: state.rows.map((row) => [...row]) };
percentState.rows[1][5] = "12";
assert.equal(buildCapitalImpactModel(percentState, "ref_2025_12_31").ratios[0].current, 0.12);

console.log("PASS: CET1, Tier 1 and total capital impacts use the selected date, institution and a positive RWA denominator.");
