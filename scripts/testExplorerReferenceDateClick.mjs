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
  getExplorerTaxonomyUnavailableReferenceLabels: () => new Set(["31/12/2024"]),
  getSelectedExplorerCodeForActiveAxis: () => "0070",
  lastRenderedExplorerTableSeries: { taxonomyBlocks: ["4.2"] },
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

assert.equal(vm.runInContext('selectExplorerReferenceDate("31/12/2024")', vmContext), false);
assert.equal(context.selectedReferenceLabel, "31/03/2025");
assert.equal(saved, 0);
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

const panelSource = source.slice(
  source.indexOf("function renderExplorerReferenceDatePanel("),
  source.indexOf("function selectExplorerReferenceDate(")
);
let renderedPanel;
const createElement = (tagName) => {
  const classes = new Set();
  return {
    tagName, children: [], disabled: false, classList: {
      contains: (name) => classes.has(name),
      toggle: (name, enabled) => enabled ? classes.add(name) : classes.delete(name)
    },
    append(...children) { this.children.push(...children); },
    setAttribute(name, value) { this[name] = value; },
    addEventListener() {}
  };
};
const references = [{label: "Q2 2026"}, {label: "Q1 2026"}, {label: "Q4 2024"}];
const panelContext = vm.createContext({
  document: {createElement},
  lastRenderedExplorerTableSeries: {taxonomyBlocks: ["4.2"]},
  getSelectedExplorerCodeForActiveAxis: () => "0070",
  getExplorerTaxonomyUnavailableReferenceLabels: () => new Set(["Q4 2024"]),
  buildExplorerBenchmark: () => ({dates: references, series: [{values: [
    {label: "Q2 2026", value: 13.18}, {label: "Q1 2026", value: 0}, {label: "Q4 2024", value: 0}
  ]}]}),
  getSelectedExplorerReference: () => references[0],
  getExplorerReferencePanelDates: (dates) => dates,
  getExplorerFullDateColumnLabel: (reference) => reference.label,
  formatBenchmarkValue: (value) => `${value} %`,
  replaceExplorerContextDetail: (panel) => { renderedPanel = panel; }
});
vm.runInContext(panelSource, panelContext);
vm.runInContext("renderExplorerReferenceDatePanel({selectedJst: 'A'})", panelContext);
const panelRows = renderedPanel.children[1].children;
assert.equal(panelRows[1].disabled, false);
assert.equal(panelRows[1].children[1].textContent, "0 %", "a genuine zero stays available");
assert.equal(panelRows[2].disabled, true);
assert.equal(panelRows[2].children[1].textContent, "—", "an unavailable date must not show a raw zero");
assert.equal(panelRows[2].classList.contains("is-taxonomy-unavailable"), true);

console.log("PASS: reference-date clicks use the temporal fast path, targeted XY rebuild, and cached template dates.");
