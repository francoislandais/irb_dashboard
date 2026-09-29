import assert from "node:assert/strict";

const sourceCsv = [
  "table_id;coordinate;code;description;framework",
  "C_07.00;y_axis_rc_code;10;Example row;4.0",
  "C_07.00;y_axis_rc_code;10;Example row;4.2",
  "C_07.00;y_axis_rc_code;10;Example row;4.2.1",
  "C_08.00;y_axis_rc_code;20;Another row;3.2",
  "C_08.00;y_axis_rc_code;20;Another row;4.0"
].join("\n");
const historyCsv = [
  "table_id;framework;effective_from;effective_to",
  "C_07.00;3.2;2023-06-30;",
  "C_07.00;4.0;2025-03-31;2026-06-30",
  "C_07.00;4.2;2026-06-30;",
  "C_08.00;3.2;2023-06-30;",
  "C_08.00;4.0;2025-03-31;"
].join("\n");

globalThis.fetch = async (url) => new Response(String(url).includes("taxonomy_history") ? historyCsv : sourceCsv);
const { loadTaxonomyDimensionData } = await import("../app/src/data/taxonomyDimensionData.js");

const defaults = await loadTaxonomyDimensionData();
assert.deepEqual(defaults.selectedTaxonomiesByTemplate, {
  "C_07.00": "4.2.1",
  "C_08.00": "4.0"
});
assert.deepEqual(defaults.availableTaxonomiesByTemplate["C_07.00"], ["4.0", "4.2", "4.2.1"]);

const explicitSelection = await loadTaxonomyDimensionData({ "C_07.00": "4.0" });
assert.equal(explicitSelection.selectedTaxonomiesByTemplate["C_07.00"], "4.0");

const xyHistoricalRelease = await loadTaxonomyDimensionData({}, { referenceDate: "ref_2025_12_31" });
assert.equal(xyHistoricalRelease.selectedTaxonomiesByTemplate["C_07.00"], "4.0");
assert.equal(xyHistoricalRelease.selectedTaxonomiesByTemplate["C_08.00"], "4.0");

const xyNewRelease = await loadTaxonomyDimensionData({}, { referenceDate: "2026-06-30" });
assert.equal(xyNewRelease.selectedTaxonomiesByTemplate["C_07.00"], "4.2");
assert.equal(xyNewRelease.selectedTaxonomiesByTemplate["C_08.00"], "4.0");

console.log("PASS: template defaults, explicit selections, and date-specific taxonomy selection are correct.");
