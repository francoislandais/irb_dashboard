import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { createExplorerSelectionHistory, sameExplorerSelection } from "../app/src/data/explorerSelectionHistory.js";

const a = { templateId: "F_01.01", x: "0010", y: "0020", z: "EUR" };
const b = { templateId: "F_02.00", x: "0030", y: "0040", z: "" };
const c = { ...b, y: "0050" };
const history = createExplorerSelectionHistory();
assert.equal(history.canBack, false);
assert.equal(history.move(-1), null);
history.record(a);
assert.equal(history.record({ ...a }), false);
history.record(b);
assert.deepEqual(history.move(-1), a);
assert.equal(history.canForward, true);
const restored = createExplorerSelectionHistory(JSON.parse(JSON.stringify(history.serialize())));
assert.deepEqual(restored.current, a);
assert.deepEqual(restored.move(1), b);
history.record(c);
assert.equal(history.canForward, false);
assert.deepEqual(history.serialize().entries, [a, c]);
assert.deepEqual(createExplorerSelectionHistory({ entries: [null], index: 0 }).serialize(), { entries: [], index: -1 });
const snapshot = history.serialize();
snapshot.entries[0].x = "changed";
assert.equal(history.serialize().entries[0].x, a.x);

// Exercise the actual UI navigation with a global display mode.
const source = readFileSync(new URL("../app/src/ui/explorerView.js", import.meta.url), "utf8");
const contexts = new Map([
  [a.templateId, { selectedXCode: a.x, selectedYCode: a.y, selectedZCode: a.z, activeAxis: "y" }],
  [b.templateId, { selectedXCode: b.x, selectedYCode: b.y, selectedZCode: b.z, activeAxis: "x", selectedReferenceLabel: "2025-12-31", selectedCellColumnIndex: 2 }]
]);
const storage = new Map();
let state = { rows: [[1]], fileName: "dataset.csv", activeDatasetId: "one" };
let renderCount = 0;
const sandbox = {
  createExplorerSelectionHistory, sameExplorerSelection,
  getLatestState: () => state,
  getExplorerTemplates: () => [{ id: a.templateId }, { id: b.templateId }],
  localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
  saveExplorerScrollPosition() {}, updateUrlTemplateParam() {}, updateUrlExplorerSelectionParams() {},
  rerenderApp() { renderCount++; vm.runInContext("recordExplorerSelectionHistory(getLatestState())", ctx); }
};
const ctx = vm.createContext(sandbox);
sandbox.getActiveExplorerContext = () => contexts.get(vm.runInContext("activeExplorerTemplateId", ctx));
vm.runInContext(`const explorerSelectionHistories = new Map();
let activeExplorerTemplateId = "${a.templateId}", explorerHistoryReplay = false,
explorerHistoryRestoredSelection = null, explorerAdvancedSearchQuery = "assets",
hasInteractedWithExplorerSelection = false, explorerContextTopic = "", pinnedKriFormulaCode = "",
explorerKriPageResetKey = "", explorerKriPageIndex = 0, explorerGlobalDisplayMode = "focus";
const EXPLORER_KRI_PAGE_SIZE = 20;` + source.slice(source.indexOf("function getExplorerSelectionSnapshot()"), source.indexOf("function createExplorerSelectionHistoryControls()")), ctx);
const run = code => vm.runInContext(code, ctx);
run("recordExplorerSelectionHistory(getLatestState())");
run(`activeExplorerTemplateId = "${b.templateId}"; recordExplorerSelectionHistory(getLatestState())`);
run("navigateExplorerSelectionHistory(-1)");
assert.equal(run("activeExplorerTemplateId"), a.templateId);
assert.equal(contexts.get(a.templateId).activeAxis, "x");
assert.equal(run("explorerGlobalDisplayMode"), "focus");
assert.equal(contexts.get(a.templateId).selectedReferenceLabel, "2025-12-31");
assert.equal(contexts.get(a.templateId).selectedCellColumnIndex, 2);
assert.equal(run("getExplorerSelectionHistory().history.serialize().entries.length"), 2);
assert.equal(run("isExplorerHistorySelectionActive()"), true);
run("navigateExplorerSelectionHistory(1)");
assert.equal(run("activeExplorerTemplateId"), b.templateId);
assert.equal(contexts.get(b.templateId).selectedZCode, "");
assert.equal(renderCount, 2);
run("navigateExplorerSelectionHistory(1)");
assert.equal(renderCount, 2);
// A view-only change is not a history entry.
contexts.get(b.templateId).activeAxis = "z";
run("recordExplorerSelectionHistory(getLatestState())");
assert.equal(run("getExplorerSelectionHistory().history.serialize().entries.length"), 2);
run('explorerAdvancedSearchQuery = "liquidity"');
assert.equal(run("isExplorerHistorySelectionActive()"), false);
// Separate datasets and inaccessible storage do not break navigation.
state = { ...state, fileName: "other.csv", activeDatasetId: "two" };
assert.equal(run("getExplorerSelectionHistory().history.canBack"), false);
sandbox.localStorage.setItem = () => { throw new Error("Storage denied"); };
run("recordExplorerSelectionHistory(getLatestState())");
assert.equal(run("getExplorerSelectionHistory().history.serialize().entries.length"), 1);
// Restoring a KRI on another page loads that page without changing the axis.
state = { ...state, fileName: "kri.csv", activeDatasetId: "kri" };
contexts.set("KRI", { selectedXCode: "", selectedYCode: "K45", selectedZCode: "", activeAxis: "y" });
sandbox.getExplorerTemplates = () => [{ id: "KRI" }];
sandbox.getActiveExplorerTemplate = () => ({ id: "KRI", tableId: "KRI" });
sandbox.getExplorerKriMatchingCodesInOrder = () => Array.from({ length: 60 }, (_, i) => "K" + i);
run('activeExplorerTemplateId = "KRI"; recordExplorerSelectionHistory(getLatestState())');
contexts.get("KRI").selectedYCode = "K1";
run('recordExplorerSelectionHistory(getLatestState()); explorerContextTopic = "kri-formula"; navigateExplorerSelectionHistory(-1)');
assert.equal(contexts.get("KRI").selectedYCode, "K45");
assert.equal(contexts.get("KRI").activeAxis, "y");
assert.equal(run("explorerKriPageIndex"), 2);
assert.equal(run("pinnedKriFormulaCode"), "K45");
console.log("PASS: history, persistence, deduplication, branching, dataset isolation, storage fallback, and coordinate navigation preserving the current view.");
