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
const rows = ["Root", "Root > Child", "Root > Child > Grandchild", "Other"].map((hierarchyPath) => ({ hierarchyPath }));
const parentPaths = getParentPaths(rows);
const contextState = {
  activeAxis: "y",
  expandedPathsByAxis: { y: new Set(["root"]), z: new Set() },
  treeViewModeByAxis: { y: null, z: null },
  defaultExpandedPathsInitializedByAxis: { y: true, z: false }
};
let tableRenders = 0;
let scrollSaves = 0;
const table = { replaceChildren() {} };
const sandbox = {
  document: { createElement: () => ({ dataset: {}, setAttribute(name, value) { this[name] = value; } }) },
  elements: { explorerTable: table },
  getActiveExplorerContext: () => contextState,
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
  let lastRenderedExplorerSelectedUnit = "millions";
  ${source.slice(source.indexOf("function applyExplorerTreeViewMode("), source.indexOf("function createDescriptionContent("))}
  ${source.slice(source.indexOf("function toggleExplorerPath("), source.indexOf("function applyExplorerTreeState("))}
  ${source.slice(source.indexOf("function hasCollapsedExplicitAncestor("), source.indexOf("function getParentPathsFromRenderedRows("))}
`, scope);

const visiblePaths = () => rows
  .map((row) => row.hierarchyPath)
  .filter((path) => !vm.runInContext(`hasCollapsedExplicitAncestor(${JSON.stringify(normalizeHierarchyPath(path))}, new Set(${JSON.stringify(rows.map((row) => normalizeHierarchyPath(row.hierarchyPath)))}))`, scope));

assert.deepEqual(visiblePaths(), ["Root", "Root > Child", "Other"]);
assert.equal(vm.runInContext("createExplorerTreeViewToggle(new Set(['root', 'root > child'])).textContent", scope), "Expanded view");

vm.runInContext("toggleExplorerTreeView()", scope);
assert.deepEqual([...contextState.expandedPathsByAxis.y], ["root", "root > child"]);
assert.deepEqual(visiblePaths(), rows.map((row) => row.hierarchyPath));
assert.equal(contextState.treeViewModeByAxis.y, "expanded");
assert.equal(vm.runInContext("createExplorerTreeViewToggle(new Set(['root', 'root > child'])).textContent", scope), "Compact view");

vm.runInContext("toggleExplorerTreeView()", scope);
assert.equal(contextState.expandedPathsByAxis.y.size, 0);
assert.deepEqual(visiblePaths(), ["Root", "Other"]);
assert.equal(contextState.treeViewModeByAxis.y, "compact");
assert.equal(contextState.treeViewModeByAxis.z, null);

vm.runInContext("toggleExplorerPath('root')", scope);
assert.equal(contextState.treeViewModeByAxis.y, null, "manual branch changes leave the bulk mode");
assert.deepEqual(visiblePaths(), ["Root", "Root > Child", "Other"]);
assert.equal(tableRenders, 3, "each action redraws only the table");
assert.equal(scrollSaves, 3);

console.log("PASS: compact and expanded views control descendants, preserve axis state, and allow manual reopening.");
