import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import {
  getParentPaths,
  normalizeExplorerSeriesRow,
  normalizeHierarchyPath,
  splitHierarchyPath
} from "../app/src/data/explorer.js";

const source = readFileSync(new URL("../app/src/ui/explorerView.js", import.meta.url), "utf8");
const rows = [
  "Root", "Root > Child", "Root > Child > Grandchild", "Other", "Other > Leaf"
].map((hierarchyPath) => ({ hierarchyPath }));
const contextState = {
  activeAxis: "y",
  expandedPathsByAxis: { y: new Set(["root"]), z: new Set() },
  treeViewModeByAxis: { y: null, z: null },
  defaultExpandedPathsInitializedByAxis: { y: true, z: false }
};
let tableRenders = 0;
let scrollSaves = 0;
let geographyRenders = 0;
let geographyAxis = "";
const table = { replaceChildren() {} };

class TestElement {
  constructor() {
    this.children = [];
    this.attributes = {};
    this.listeners = {};
    this.classList = {
      values: new Set(),
      toggle(name, enabled) { enabled ? this.values.add(name) : this.values.delete(name); },
      contains(name) { return this.values.has(name); }
    };
  }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; }
  querySelector(selector) { return this.children.find((child) => `.${child.className}` === selector) ?? null; }
  addEventListener(name, listener) { this.listeners[name] = listener; }
  setAttribute(name, value) { this.attributes[name] = value; }
}

const sandbox = {
  document: { createElement: () => new TestElement() },
  elements: { explorerTable: table },
  getActiveExplorerContext: () => contextState,
  getActiveExplorerGeographyAxis: () => geographyAxis,
  isExplorerGeographyGroupedLayout: () => geographyAxis === "z",
  getExplorerGeographyCountries: () => [],
  groupExplorerCountries: () => [{ label: "Euro area" }, { label: "Rest of the world" }],
  getLatestState: () => ({}),
  rerenderApp: () => { geographyRenders += 1; },
  getActiveExplorerExpandedPaths: () => contextState.expandedPathsByAxis[contextState.activeAxis],
  getParentPaths,
  normalizeExplorerSeriesRow,
  normalizeHierarchyPath,
  splitHierarchyPath,
  saveExplorerScrollPosition: () => { scrollSaves += 1; },
  renderExplorerTable: () => { tableRenders += 1; },
  applyExplorerSelection() {},
  restoreExplorerScrollPosition() {}
};
const scope = vm.createContext(sandbox);
vm.runInContext(`
  let lastRenderedExplorerTableSeries = { rows: ${JSON.stringify(rows)} };
  let lastRenderedExplorerParentPaths = getParentPaths(lastRenderedExplorerTableSeries.rows);
  let lastRenderedExplorerSelectedUnit = "millions";
  ${source.slice(source.indexOf("function applyExplorerTreeViewMode("), source.indexOf("function createDescriptionContent("))}
  ${source.slice(source.indexOf("function toggleExplorerPath("), source.indexOf("function applyExplorerTreeState("))}
  ${source.slice(source.indexOf("function hasCollapsedExplicitAncestor("), source.indexOf("function getParentPathsFromRenderedRows("))}
`, scope);

const visiblePaths = () => rows
  .map((row) => row.hierarchyPath)
  .filter((path) => !vm.runInContext(`hasCollapsedExplicitAncestor(${JSON.stringify(normalizeHierarchyPath(path))}, new Set(${JSON.stringify(rows.map((row) => normalizeHierarchyPath(row.hierarchyPath)))}))`, scope));

const control = vm.runInContext("createExplorerTreeLevelControl()", scope);
sandbox.control = control;
const buttons = control.querySelector(".explorer-tree-level-buttons");
const refresh = () => vm.runInContext("updateExplorerTreeLevelControl(control, new Set(['root', 'root > child', 'other']))", scope);
refresh();
assert.equal(control.children.length, 1, "the control contains only the numbered buttons");
assert.equal(control.children[0].className, "explorer-tree-level-buttons");
assert.deepEqual(buttons.children.map((button) => button.textContent), ["1", "2", "3"]);
assert.ok(buttons.children.every((button) => button.attributes["aria-pressed"] === "false"),
  "a manually mixed expansion has no selected level");

const choose = (level) => {
  buttons.children[level - 1].listeners.click();
  refresh();
  assert.equal(buttons.children[level - 1].attributes["aria-pressed"], "true");
};
choose(1);
assert.deepEqual(visiblePaths(), ["Root", "Other"]);
assert.equal(contextState.treeViewModeByAxis.y, 1);
choose(2);
assert.deepEqual(visiblePaths(), ["Root", "Root > Child", "Other", "Other > Leaf"]);
assert.equal(contextState.treeViewModeByAxis.y, 2);
choose(3);
assert.deepEqual(visiblePaths(), rows.map((row) => row.hierarchyPath));
assert.equal(contextState.treeViewModeByAxis.y, 3);
assert.equal(contextState.treeViewModeByAxis.z, null);

vm.runInContext("toggleExplorerPath('root')", scope);
refresh();
assert.equal(contextState.treeViewModeByAxis.y, null, "manual branch changes leave the chosen bulk level");
assert.deepEqual(visiblePaths(), ["Root", "Other", "Other > Leaf"]);
assert.ok(buttons.children.every((button) => button.attributes["aria-pressed"] === "false"));
assert.equal(tableRenders, 4, "each action redraws only the table");
assert.equal(scrollSaves, 4);

geographyAxis = "z";
contextState.activeAxis = "z";
vm.runInContext("toggleExplorerPath('Euro area')", scope);
assert.equal(geographyRenders, 1, "a geographic group toggle recalculates the visible page");
assert.equal(tableRenders, 4, "the geographic toggle must not redraw a stale cached page");
vm.runInContext("setExplorerTreeViewLevel(1)", scope);
assert.equal(geographyRenders, 2, "collapsing all geographic groups recalculates pagination");
vm.runInContext("setExplorerTreeViewLevel(2)", scope);
assert.equal(geographyRenders, 3);
assert.deepEqual([...contextState.expandedPathsByAxis.z], ["euro area", "rest of the world"],
  "expanding all must retain groups that were absent from the current page");
vm.runInContext("applyExplorerTreeViewMode(new Set(['euro area']))", scope);
assert.deepEqual([...contextState.expandedPathsByAxis.z], ["euro area", "rest of the world"],
  "rendering one page must not forget the expansion of off-page groups");

console.log("PASS: numbered hierarchy levels show the requested depth, preserve axis state, and allow manual branches.");
