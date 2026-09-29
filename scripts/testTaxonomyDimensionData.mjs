import assert from "node:assert/strict";

const sourceCsv = [
  "table_id;coordinate;code;description;framework",
  "C_07.00;y_axis_rc_code;10;Example row;4.0",
  "C_07.00;y_axis_rc_code;10;Example row;4.2",
  "C_07.00;y_axis_rc_code;10;Example row;4.2.1",
  "C_08.00;y_axis_rc_code;20;Another row;3.2",
  "C_08.00;y_axis_rc_code;20;Another row;4.0"
].join("\n");

globalThis.fetch = async () => new Response(sourceCsv);
const { loadTaxonomyDimensionData } = await import("../app/src/data/taxonomyDimensionData.js");

const defaults = await loadTaxonomyDimensionData();
assert.deepEqual(defaults.selectedTaxonomiesByTemplate, {
  "C_07.00": "4.2.1",
  "C_08.00": "4.0"
});
assert.deepEqual(defaults.availableTaxonomiesByTemplate["C_07.00"], ["4.0", "4.2", "4.2.1"]);

const explicitSelection = await loadTaxonomyDimensionData({ "C_07.00": "4.0" });
assert.equal(explicitSelection.selectedTaxonomiesByTemplate["C_07.00"], "4.0");

console.log("PASS: each template defaults to its newest available taxonomy and keeps a valid explicit choice.");
