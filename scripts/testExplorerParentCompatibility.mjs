import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { parseCsv } from "../app/src/data/csvParser.js";
import { createImpossibleXYCombinations } from "../app/src/data/impossibleXYCombinations.js";
import { getHierarchyAncestorPaths, getParentPaths, normalizeHierarchyPath } from "../app/src/data/explorer.js";

const csv = parseCsv(readFileSync(new URL("../app/assets/ITS_impossible_x_y.csv", import.meta.url), "utf8"));
const impossibleXYCombinations = createImpossibleXYCombinations(csv.columns, csv.rows);
assert.equal(impossibleXYCombinations.isImpossible("C_08.01", "0020", "0180"), false);
assert.equal(impossibleXYCombinations.isImpossible("C_08.01", "0030", "0180"), true);

const source = readFileSync(new URL("../app/src/ui/explorerView.js", import.meta.url), "utf8");
const start = source.indexOf("function isExplorerRowAxisImpossible(");
const end = source.indexOf("function isExplorerXYView(", start);
assert.ok(start > 0 && end > start);
const context = vm.createContext({
  getLatestState: () => ({ impossibleXYCombinations }),
  getActiveExplorerTemplate: () => ({ tableId: "C_08.01" }),
  getActiveExplorerContext: () => ({ selectedYCode: "0180" }),
  getHierarchyAncestorPaths,
  normalizeHierarchyPath
});
vm.runInContext(source.slice(start, end), context);

const rows = [
  { code: "0020", hierarchyPath: "Original exposure pre conversion factors", values: [{ value: 2279 }] },
  { code: "0030", hierarchyPath: "Original exposure pre conversion factors > Of which: large financial sector entities", values: [{ value: null }] }
];
const result = context.getExplorerAxisImpossiblePaths(rows, "x", getParentPaths(rows));
assert.equal(result.get(normalizeHierarchyPath(rows[0].hierarchyPath)), false,
  "The coded parent must display its own reported 2 279 value");
assert.equal(result.get(normalizeHierarchyPath(rows[1].hierarchyPath)), true,
  "The forbidden child remains unavailable");

const headingRows = [
  { code: "", isVirtual: true, hierarchyPath: "Heading" },
  { code: "0030", hierarchyPath: "Heading > Forbidden child" }
];
const headingResult = context.getExplorerAxisImpossiblePaths(headingRows, "x", getParentPaths(headingRows));
assert.equal(headingResult.get("heading"), true,
  "An uncoded heading inherits the lack of compatible descendants");

console.log("PASS: C_08.01 parent 0020 keeps its value while child 0030 is incompatible.");
