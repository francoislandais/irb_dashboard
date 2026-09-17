import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../app/src/ui/explorerView.js", import.meta.url), "utf8");
const selectSource = source.slice(
  source.indexOf("function selectExplorerReferenceDate("),
  source.indexOf("function selectExplorerBenchmarkReferenceDate(")
);

const state = { id: "state" };
const context = { selectedCellColumnIndex: 4, selectedReferenceLabel: "31/03/2025" };
let isXY = false;
let fastRefreshes = 0;
let renders = 0;
let renderOptions = null;
let saved = 0;
const sandbox = {
  getActiveExplorerContext: () => context,
  getLatestState: () => state,
  isExplorerXYView: () => isXY,
  refreshExplorerSelectionOnly: (value) => {
    assert.equal(value, state);
    fastRefreshes += 1;
  },
  renderExplorer: (value, options) => {
    assert.equal(value, state);
    renders += 1;
    renderOptions = options;
  },
  saveExplorerScrollPosition: () => { saved += 1; }
};
const vmContext = vm.createContext(sandbox);
vm.runInContext(selectSource, vmContext);

assert.equal(vm.runInContext('selectExplorerReferenceDate("30/06/2025")', vmContext), true);
assert.equal(context.selectedReferenceLabel, "30/06/2025");
assert.equal(context.selectedCellColumnIndex, 0);
assert.equal(fastRefreshes, 1);
assert.equal(renders, 0);

isXY = true;
assert.equal(vm.runInContext('selectExplorerReferenceDate("30/09/2025")', vmContext), true);
assert.equal(fastRefreshes, 1);
assert.equal(renders, 1);
assert.equal(renderOptions.deferChromeUntilTable, true);
assert.equal(saved, 2);

assert.equal(vm.runInContext('selectExplorerReferenceDate("30/09/2025")', vmContext), false);
assert.equal(renders, 1);
assert.doesNotMatch(
  source.slice(source.indexOf("function buildExplorerBenchmark("), source.indexOf("function renderExplorerActiveFilters(")),
  /state\.rows\.some/
);
assert.match(source, /const dates = indexes \? getExplorerTemplateReferenceDates\(state, tableId\) : \[\];/);

console.log("PASS: reference-date clicks use the temporal fast path, targeted XY rebuild, and cached template dates.");
