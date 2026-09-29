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
  getSelectedExplorerReference: () => ({ name: "ref_2025_12_31" })
};
const context = vm.createContext(sandbox);
vm.runInContext(source.slice(start, end), context);

vm.runInContext("syncExplorerTaxonomyForView({ columns: ['ref_2025_12_31'] })", context);
assert.deepEqual(calls, ["ref_2025_12_31"]);
vm.runInContext("syncExplorerTaxonomyForView({ columns: ['ref_2025_12_31'] })", context);
assert.deepEqual(calls, ["ref_2025_12_31"], "the same template/date pair must not reload the dictionary");

sandbox.isExplorerXYView = () => false;
vm.runInContext("syncExplorerTaxonomyForView({ columns: ['ref_2025_12_31'] })", context);
assert.deepEqual(calls, ["ref_2025_12_31", ""], "leaving XY restores the existing temporal default");
vm.runInContext("syncExplorerTaxonomyForView({ columns: ['ref_2025_12_31'] })", context);
assert.deepEqual(calls, ["ref_2025_12_31", ""], "temporal renders do not repeatedly reload taxonomies");

console.log("PASS: XY taxonomy follows the selected template/date and Temporal restores its prior default once.");
