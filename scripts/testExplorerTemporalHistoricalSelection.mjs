import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const source = await readFile(new URL("../app/src/ui/explorerView.js", import.meta.url), "utf8");
const start = source.indexOf("function ensureExplorerTemplateSelections(");
const end = source.indexOf("function ensureExplorerSelectionUsesExistingRow(", start);
assert.notEqual(start, -1);
assert.notEqual(end, -1);

const selection = {
  activeAxis: "y",
  selectedXCode: "current-x",
  selectedYCode: "legacy-001",
  selectedZCode: ""
};
let fallbackCount = 0;
const historicalState = {
  rows: [],
  taxonomyHistory: { columns: [], rows: [] },
  taxonomySource: { columns: [], rows: [] },
  selectedTaxonomiesByTemplate: { T: "4.2" }
};
const sandbox = {
  EXPLORER_TARGET: { tableId: "T" },
  explorerGlobalDisplayMode: "temporal",
  explorerGlobalEvolutionFrequency: "quarterly",
  explorerHasDetectedEvolutionFrequency: true,
  explorerTemporalHistoricalAxisCodesByRows: new WeakMap(),
  isExplorerHistorySelectionActive: () => false,
  getExplorerContextForTemplate: () => selection,
  getActiveExplorerContext: () => selection,
  getExplorerAxisOptions: () => ({
    x: { codes: ["current-x"] },
    y: { codes: ["current-y"] },
    z: { codes: [] }
  }),
  getExplorerTemplateReferenceDates: () => [
    { date: new Date(2024, 11, 31) },
    { date: new Date(2025, 11, 31) }
  ],
  getTaxonomyFrameworkForDate: (_state, _tableId, date) => date.getFullYear() === 2024 ? "3.2" : "4.2",
  getTaxonomyDataForTemplateFramework: (_state, _tableId, framework) => framework === "3.2"
    ? { explorerPoints: [
      { tableId: "T", coordinate: "y_axis_rc_code", code: "legacy-001" },
      { tableId: "T", coordinate: "z_axis_rc_code", code: "legacy-z" }
    ] }
    : { explorerPoints: [] },
  getVisibleExplorerAxes: () => ["y", "x", "z"],
  ensureExplorerSelectionUsesExistingRow: () => { fallbackCount += 1; },
  getExplorerRowsForTemplate: () => [],
  detectExplorerTemplateEvolutionFrequency: () => "quarterly"
};
const context = vm.createContext(sandbox);
vm.runInContext(source.slice(start, end), context);

context.historicalState = historicalState;
context.template = { id: "T", tableId: "T" };
vm.runInContext("ensureExplorerTemplateSelections(historicalState, template)", context);
assert.equal(selection.selectedYCode, "legacy-001", "a selectable historical code remains selected in Temporal");
assert.equal(fallbackCount, 0, "the normal-current-axis fallback must not replace the historical selection");

sandbox.explorerGlobalDisplayMode = "xy";
vm.runInContext("ensureExplorerTemplateSelections(historicalState, template)", context);
assert.equal(selection.selectedYCode, "current-y", "codes from hidden historical blocks are not retained in XY mode");
assert.equal(fallbackCount, 1);

selection.activeAxis = "z";
selection.selectedAxis = "z";
selection.selectedZCode = "legacy-z";
vm.runInContext("ensureExplorerTemplateSelections(historicalState, template)", context);
assert.equal(selection.selectedZCode, "legacy-z", "XY Tab retains selectable historical Z codes");
assert.equal(fallbackCount, 1);

console.log("PASS: historical codes remain selectable in Temporal and XY Tab, but not in the XY matrix.");
