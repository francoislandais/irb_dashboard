import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const source = await readFile(new URL("../app/src/ui/explorerView.js", import.meta.url), "utf8");
const start = source.indexOf("function syncExplorerTaxonomyForView(");
const end = source.indexOf("function getSelectedExplorerReference(", start);
assert.notEqual(start, -1);
assert.notEqual(end, -1);

const calls = [];
const sandbox = {
  explorerTaxonomyUsesReferenceDate: false,
  lastExplorerTaxonomyRequestKey: "",
  updateExplorerTaxonomy: (date) => calls.push(date),
  isExplorerXYView: () => true,
  getActiveExplorerTemplate: () => ({ tableId: "C_07.00" }),
  getSelectedExplorerReference: () => ({ name: "ref_2025_12_31" }),
  getExplorerTemplateReferenceDates: (state, tableId) => state.columns
    .map((name, index) => ({ name, index }))
    .filter((reference) => reference.name.startsWith("ref_")
      && state.rows.some((row) => row[0] === tableId && String(row[reference.index] ?? "").trim() !== "")),
  getReferenceColumns: (columns) => columns
    .map((name, index) => ({ name, label: name, index }))
    .filter((column) => column.name.startsWith("ref_"))
};
const context = vm.createContext(sandbox);
vm.runInContext(source.slice(start, end), context);

const temporalState = {
  columns: ["table_id", "ref_2025_06_30", "ref_2025_12_31"],
  rows: [["C_07.00", "1", "2"]]
};
vm.runInContext("syncExplorerTaxonomyForView({ columns: ['ref_2025_12_31'] })", context);
assert.deepEqual(calls, ["ref_2025_12_31"]);
vm.runInContext("syncExplorerTaxonomyForView({ columns: ['ref_2025_12_31'] })", context);
assert.deepEqual(calls, ["ref_2025_12_31"], "the same template/date pair must not reload the dictionary");

sandbox.isExplorerXYView = () => false;
context.temporalState = temporalState;
vm.runInContext("syncExplorerTaxonomyForView(temporalState)", context);
assert.deepEqual(calls, ["ref_2025_12_31", "ref_2025_12_31"], "Temporal uses the template's latest populated date");
vm.runInContext("syncExplorerTaxonomyForView(temporalState)", context);
assert.deepEqual(calls, ["ref_2025_12_31", "ref_2025_12_31"], "temporal renders do not repeatedly reload taxonomies");

console.log("PASS: XY taxonomy follows the selected date and Temporal uses the template's latest populated date once.");
