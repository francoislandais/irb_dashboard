import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseCsv } from "../app/src/data/csvParser.js";
import { buildDataIndexes } from "../app/src/data/dataIndex.js";
import { APPROACHES, APPROACH_FRAMEWORKS, APPROACH_PORTFOLIOS, APPROACH_TAXONOMY_MAP, approachMetricValue, buildApproachBenchmarkModel, standardShare } from "../app/src/data/approachBenchmark.js";

const source = parseCsv(readFileSync(new URL("../app/assets/ITS_all_dimension_mapping.csv", import.meta.url), "latin1"));
const column = Object.fromEntries(source.columns.map((name, index) => [name, index]));
const available = new Set(source.rows.map((row) => [row[column.framework], row[column.table_id], row[column.coordinate],
  String(row[column.code]).padStart(/^\d+$/.test(row[column.code]) ? 4 : 0, "0")].join("|")));
for (const framework of APPROACH_FRAMEWORKS) {
  for (const [approach, definition] of Object.entries(APPROACHES)) {
    for (const code of Object.values(definition.stages)) {
      assert.ok(available.has(`${framework}|${definition.tableId}|x_axis_rc_code|${code}`), `${framework} ${approach} X ${code}`);
    }
    for (const portfolio of APPROACH_PORTFOLIOS) {
      const mapping = APPROACH_TAXONOMY_MAP[framework][approach][portfolio.id];
      for (const code of mapping.z) {
        assert.ok(available.has(`${framework}|${definition.tableId}|z_axis_rc_code|${code}`), `${framework} ${approach} ${portfolio.id} Z ${code}`);
      }
      assert.ok(available.has(`${framework}|${definition.tableId}|y_axis_rc_code|${mapping.y}`), `${framework} ${approach} ${portfolio.id} Y ${mapping.y}`);
    }
  }
}

const columns = ["reporting_unit_id", "table_id", "x_axis_rc_code", "y_axis_rc_code", "z_axis_rc_code", "ref_2024_12_31", "ref_2025_03_31", "ref_2026_06_30"];
const rows = [];
function add(id, table, x, y, z, value, old = "", transition = "") {
  rows.push([id, table, x, y, z, old, transition, String(value)]);
}
for (const [id, standard, irb, standardRwa, irbRwa] of [
  ["BANK_A", 600, 400, 120, 80],
  ["BANK_B", 300, 700, 90, 110]
]) {
  for (const [approach, ead, rwa] of [["standard", standard, standardRwa], ["irb", irb, irbRwa]]) {
    const definition = APPROACHES[approach];
    for (const [stage, value] of [["original", ead + 100], ["afterCrm", ead + 50], ["ead", ead], ["rwa", rwa]]) {
      if (approach === "standard" || id === "BANK_A") {
        add(id, definition.tableId, definition.stages[stage], "0010", "qx01", value, "", value * 2);
      }
      if (approach === "irb") {
        const advancedShare = id === "BANK_A" ? 0.55 : 0.6;
        add(id, definition.tableId, definition.stages[stage], "0010", "qx2023", value * advancedShare, "", value * advancedShare * 2);
        add(id, definition.tableId, definition.stages[stage], "0010", "qx2022", value * 0.4, "", value * 0.8);
        if (id === "BANK_A") add(id, definition.tableId, definition.stages[stage], "0010", "qx2082", value * 0.05, "", value * 0.1);
      }
    }
  }
}
for (const [id, standard, foundation, advanced] of [["BANK_A", 60, 15, 25], ["BANK_B", 20, 35, 45]]) {
  add(id, "C_07.00", "0200", "0010", "qx16", standard);
  add(id, "C_08.01", "0110", "0010", "qx2020", foundation);
  add(id, "C_08.01", "0110", "0010", "qx2021", advanced);
}
// The narrow retail group has one standard class but several IRB classes. The available IRB
// constituents are summed without blocking the share on absent classes.
add("BANK_A", "C_07.00", "0200", "0010", "qx26", 100);
add("BANK_A", "C_08.01", "0110", "0010", "qx2009", 40);
add("BANK_B", "C_08.01", "0110", "0010", "qx2009", 30);
add("BANK_A", "C_07.00", "0200", "0010", "qx2036", 90);
add("BANK_A", "C_07.00", "0200", "0010", "qx2037", 10);
add("BANK_A", "C_08.01", "0110", "0010", "qx2012", 100);
for (const [stage, standard, irbA, irbF] of [
  ["ead", 700, 200, 300], ["rwa", 140, 50, 60]
]) {
  add("BANK_A", "C_07.00", APPROACHES.standard.stages[stage], "0010", "0001", "", standard);
  add("BANK_A", "C_08.01", APPROACHES.irb.stages[stage], "0010", "0001", "", irbA);
  add("BANK_A", "C_08.01", APPROACHES.irb.stages[stage], "0010", "0002", "", irbF);
}
add("BANK_A", "C_07.00", "0200", "0020", "0001", "", 70);
add("BANK_A", "C_08.01", "0110", "0010", "0007", "", 20);
add("BANK_A", "C_08.01", "0110", "0010", "0013", "", 10);
add("BANK_A", "C_07.00", "0200", "0010", "0003", "", 40);
add("BANK_A", "C_08.01", "0110", "0010", "0003", "", 30);
for (const [z, ead, rwa, pd, lgd] of [["qx2077", 60, 24, 0.01, 0.3], ["qx2078", 40, 24, 0.03, 0.5]]) {
  add("BANK_A", "C_08.01", "0110", "0010", z, ead);
  add("BANK_A", "C_08.01", "0260", "0010", z, rwa);
  add("BANK_A", "C_08.01", "0110", "0070", z, ead);
  add("BANK_A", "C_08.01", "0010", "0070", z, pd);
  add("BANK_A", "C_08.01", "0230", "0070", z, lgd);
}
const state = {
  columns,
  rows,
  dataIndexes: buildDataIndexes(columns, rows),
  selectedJst: "BANK_A",
  jstOptions: ["BANK_A", "BANK_B"],
  peerJstCodes: ["BANK_A", "BANK_B"],
  availableTaxonomiesByTemplate: { "C_07.00": ["3.2", "4.0", "4.2"], "C_08.01": ["3.2", "4.0", "4.2"] },
  taxonomyHistory: {
    columns: ["table_id", "framework", "effective_from", "effective_to"],
    rows: [
      ["C_07.00", "3.2", "2023-06-30", ""],
      ["C_07.00", "4.0", "2025-03-31", "2026-06-30"],
      ["C_07.00", "4.2", "2026-06-30", ""],
      ["C_08.01", "3.2", "2023-06-30", ""],
      ["C_08.01", "4.0", "2025-03-31", "2026-06-30"],
      ["C_08.01", "4.2", "2026-06-30", ""]
    ]
  }
};
const model = buildApproachBenchmarkModel(state);
assert.equal(model.status, "ready");
assert.deepEqual(model.references.map((reference) => [reference.name, reference.framework]), [
  ["ref_2024_12_31", "3.2"], ["ref_2025_03_31", "4.0"], ["ref_2026_06_30", "4.2"]
]);
assert.equal(model.total.stages.ead.standard.value, 600);
assert.equal(model.total.stages.ead.irb.value, 400);
assert.equal(model.total.eadShare, 0.6);
assert.equal(model.total.rwaShare, 0.6);
assert.deepEqual(model.timeline.map((item) => item.reference.framework), ["3.2", "4.0", "4.2"]);
assert.equal(model.timeline[0].eadShare, 700 / 1200);
assert.equal(model.timeline[1].eadShare, 0.6);
assert.equal(model.peers.length, 1);
assert.equal(model.distribution.eadShare.median, 0.3);
assert.equal(model.benchmark.isPercent, true);
assert.deepEqual(model.benchmark.series.find((serie) => serie.jstCode === "BANK_A").values.map((point) => point.value), [700 / 1200 * 100, 60, 60]);
assert.deepEqual(model.benchmark.series.find((serie) => serie.jstCode === "BANK_B").values.map((point) => point.value), [null, 30, 30]);
const rwaBenchmark = buildApproachBenchmarkModel(state, "ref_2024_12_31", "total", "rwaShare");
assert.equal(rwaBenchmark.benchmark.series.find((serie) => serie.jstCode === "BANK_A").values[0].value, 140 / 250 * 100);
const amountBenchmark = buildApproachBenchmarkModel(state, "", "total", "ead.irb");
assert.equal(amountBenchmark.benchmark.isPercent, false);
assert.deepEqual(amountBenchmark.benchmark.series.find((serie) => serie.jstCode === "BANK_B").values.map((point) => point.value), [null, 1400, 700]);
const sovereignModel = buildApproachBenchmarkModel(state, "", "sovereign");
assert.equal(sovereignModel.selectedPortfolio.eadShare, 0.6);
assert.equal(sovereignModel.peers[0].eadShare, 0.2);
const retail = model.portfolios.find((portfolio) => portfolio.id === "retail");
assert.equal(retail.stages.ead.irb.value, 40);
assert.equal(retail.stages.ead.irb.present, 1);
assert.equal(retail.stages.ead.irb.expected, 3);
assert.equal(retail.eadShare, 100 / 140);
const retailPeer = buildApproachBenchmarkModel(state, "", "retail").peers[0];
assert.equal(retailPeer.stages.ead.standard.present, 0);
assert.equal(retailPeer.eadShare, 0);
const corporates = buildApproachBenchmarkModel(state, "", "corporates").selectedPortfolio;
assert.equal(corporates.stages.ead.standard.value, 100);
assert.equal(corporates.eadShare, 0.5);
const oldModel = buildApproachBenchmarkModel(state, "ref_2024_12_31", "sme");
assert.equal(oldModel.framework, "3.2");
assert.equal(oldModel.total.stages.ead.standard.value, 700);
assert.equal(oldModel.total.stages.ead.irb.value, 500);
assert.equal(oldModel.total.eadShare, 700 / 1200);
assert.equal(oldModel.selectedPortfolio.stages.ead.irb.value, 30);
assert.equal(oldModel.selectedPortfolio.eadShare, 0.7);
assert.equal(oldModel.timeline[0].eadShare, 0.7);
const oldRegional = buildApproachBenchmarkModel(state, "ref_2024_12_31", "regional").selectedPortfolio;
assert.equal(oldRegional.stages.ead.standard.value, 40);
assert.equal(oldRegional.stages.ead.irb.expected, 0);
assert.equal(oldRegional.eadShare, null);
const transitionModel = buildApproachBenchmarkModel(state, "ref_2025_03_31");
assert.equal(transitionModel.framework, "4.0");
assert.equal(transitionModel.total.eadShare, 0.6);
assert.equal(standardShare(0, 100), 0);
assert.equal(standardShare(null, 100), null);
const large = buildApproachBenchmarkModel(state, "", "largeCorporates", "pd.irb");
assert.equal(large.selectedPortfolio.eadShare, null);
assert.equal(large.selectedPortfolio.stages.ead.irb.value, 100);
assert.equal(large.selectedPortfolio.density.irb, 0.48);
assert.equal(large.selectedPortfolio.getParameter("pd").value, 0.018);
assert.equal(large.selectedPortfolio.getParameter("lgd").value, 0.38);
assert.equal(large.selectedPortfolio.getParameter("pd").present, 2);
assert.equal(large.benchmark.isPercent, true);
assert.ok(Math.abs(large.benchmark.series.find((serie) => serie.jstCode === "BANK_A").values.at(-1).value - 1.8) < 1e-10);
assert.equal(large.timeline[0].getParameter("pd").value, null);
assert.equal(large.timeline[0].getParameter("pd").expected, 0);
assert.equal(approachMetricValue(large.selectedPortfolio, "density.irb"), 0.48);
const partialParameterRows = rows.filter((row) => !(row[1] === "C_08.01" && row[4] === "qx2078" && row[2] === "0010" && row[3] === "0070"));
const partialParameterState = { ...state, rows: partialParameterRows, dataIndexes: buildDataIndexes(columns, partialParameterRows) };
const partialLarge = buildApproachBenchmarkModel(partialParameterState, "", "largeCorporates", "pd.irb").selectedPortfolio;
assert.equal(partialLarge.getParameter("pd").value, 0.01);
assert.equal(partialLarge.getParameter("pd").present, 1);

// Conflicting duplicates must not inflate an institution's EAD.
const duplicateRows = [...rows, ["BANK_A", "C_07.00", "0200", "0010", "qx01", "", "", "999"]];
const duplicateState = { ...state, rows: duplicateRows, dataIndexes: buildDataIndexes(columns, duplicateRows) };
assert.equal(buildApproachBenchmarkModel(duplicateState).total.eadShare, null);

console.log("PASS: 3.2/4.0/4.2 crosswalk, EAD/RWA shares, SME history, peers and incomplete data safeguards.");
