import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseCsv } from "../app/src/data/csvParser.js";
import { buildDataIndexes } from "../app/src/data/dataIndex.js";
import { assetCorrelation, buildIrbMechanicsModel, calculateIrbMechanics, conditionalLossAtShock, expectedLossShock, simulateSystemicShocks, IRB_SEGMENTS } from "../app/src/data/irbMechanics.js";

const mapping = parseCsv(readFileSync(new URL("../app/assets/ITS_all_dimension_mapping.csv", import.meta.url), "latin1"));
const idx = Object.fromEntries(mapping.columns.map((name, i) => [name, i]));
const codes = new Set(mapping.rows.map((row) => [row[idx.framework], row[idx.table_id], row[idx.coordinate],
  /^\d+$/.test(row[idx.code]) ? String(row[idx.code]).padStart(4, "0") : row[idx.code]].join("|")));
for (const segment of IRB_SEGMENTS) {
  for (const framework of ["4.0", "4.2"]) {
    assert(codes.has(`${framework}|C_08.01|z_axis_rc_code|${segment.z}`), `${framework} ${segment.z}`);
  }
}

const basic = { pd: 0.01, lgd: 0.45, ead: 100, maturity: 2.5 };
for (const [kind, expected] of [["corporate", 0.9232], ["mortgage", 0.5640], ["revolving", 0.1722], ["retail", 0.4577]]) {
  const output = calculateIrbMechanics({ ...basic, kind });
  assert(Math.abs(output.riskWeight - expected) < 0.0002, `${kind}: ${output.riskWeight}`);
  assert(Math.abs(output.rwa - expected * 100) < 0.02);
  assert(Math.abs(output.expectedLoss - 0.45) < 1e-8);
  assert(output.stressRate > output.expectedRate);
}
assert(assetCorrelation(0.01, "corporate", 5) < assetCorrelation(0.01, "corporate"));
assert.equal(assetCorrelation(0.01, "corporate", null, true), assetCorrelation(0.01, "corporate") * 1.25);
assert.equal(calculateIrbMechanics({ ...basic, pd: 1, kind: "corporate" }), null);
assert.equal(calculateIrbMechanics({ ...basic, pd: 0, kind: "corporate" }), null);
assert.equal(calculateIrbMechanics({ ...basic, lgd: -1, kind: "corporate" }), null);
const baselineR = assetCorrelation(basic.pd, "corporate");
assert(Math.abs(conditionalLossAtShock(basic.pd, basic.lgd, baselineR, expectedLossShock(basic.pd, baselineR)) - basic.pd * basic.lgd) < 1e-7);
const lowR = calculateIrbMechanics({ ...basic, correlation: 0.05 });
const highR = calculateIrbMechanics({ ...basic, correlation: 0.25 });
assert.equal(lowR.expectedRate, highR.expectedRate);
assert(highR.stressRate > lowR.stressRate);
assert(highR.unexpectedRate > lowR.unexpectedRate);
const zeroR = calculateIrbMechanics({ ...basic, correlation: 0 });
assert.equal(zeroR.correlation, 0);
assert.equal(zeroR.stressRate, zeroR.expectedRate);
assert.equal(zeroR.unexpectedRate, 0);
assert.equal(zeroR.riskWeight, 0);
assert.equal(expectedLossShock(basic.pd, 0), 0);
assert.equal(conditionalLossAtShock(basic.pd, basic.lgd, 0, 3.090232306), basic.pd * basic.lgd);
const extremeR = calculateIrbMechanics({ ...basic, correlation: 0.8 });
assert.equal(extremeR.correlation, 0.8);
assert(extremeR.stressRate > highR.stressRate);
assert.equal(calculateIrbMechanics({ ...basic, correlation: 1 }), null);
const pdFour = calculateIrbMechanics({ ...basic, pd: 0.04, lgd: 0.3 });
const pdOne = calculateIrbMechanics({ ...basic, pd: 0.01, lgd: 0.3 });
assert(pdOne.expectedRate < pdFour.expectedRate);
assert(expectedLossShock(0.01, assetCorrelation(0.01, "corporate"))
  > expectedLossShock(0.04, assetCorrelation(0.04, "corporate")));
const simulated = simulateSystemicShocks(10_000, 42);
assert.deepEqual(simulateSystemicShocks(5, 42), simulated.slice(0, 5));
assert.notDeepEqual(simulateSystemicShocks(5, 43), simulated.slice(0, 5));
const simulatedMean = simulated.reduce((sum, value) => sum + value, 0) / simulated.length;
const simulatedVariance = simulated.reduce((sum, value) => sum + (value - simulatedMean) ** 2, 0) / simulated.length;
assert(Math.abs(simulatedMean) < 0.04);
assert(Math.abs(simulatedVariance - 1) < 0.05);

const columns = ["reporting_unit_id", "table_id", "x_axis_rc_code", "y_axis_rc_code", "z_axis_rc_code", "ref_2026_06_30"];
const rows = [
  ["BANK_A", "C_08.01", "0010", "0070", "qx2013", "0.01"],
  ["BANK_A", "C_08.01", "0230", "0070", "qx2013", "0.45"],
  ["BANK_A", "C_08.01", "0250", "0070", "qx2013", "913"],
  ["BANK_A", "C_08.01", "0110", "0010", "qx2013", "100000000"],
  ["BANK_A", "C_08.01", "0255", "0010", "qx2013", "90000000"],
  ["BANK_B", "C_08.01", "0110", "0010", "qx2013", "200000000"],
  ["BANK_B", "C_08.01", "0255", "0010", "qx2013", "150000000"]
];
const state = {
  columns, rows, dataIndexes: buildDataIndexes(columns, rows), selectedJst: "BANK_A",
  jstOptions: ["BANK_A", "BANK_B"], peerJstCodes: new Set(["BANK_B"]),
  availableTaxonomiesByTemplate: { "C_08.01": ["4.0", "4.2"] },
  taxonomyHistory: { columns: ["table_id", "framework", "effective_from", "effective_to"],
    rows: [["C_08.01", "4.2", "2026-01-01", ""]] }
};
const model = buildIrbMechanicsModel(state);
assert.equal(model.status, "ready");
assert.equal(model.segment.id, "corporateA");
assert.equal(model.reported.pd.value, 0.01);
assert.equal(model.reported.pd.y, "0070");
assert.equal(model.reported.ead.value, 100000000);
assert.equal(model.peers[0].riskWeight, 0.75);
console.log("PASS: Basel CRE31 numerical examples, C_08.01 sources, and peer weights.");
