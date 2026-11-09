import assert from "node:assert/strict";
import { analyzeExplorerQuarterlyContributors } from "../app/src/data/explorerSelectionInsights.js";

const increase = analyzeExplorerQuarterlyContributors(110, 100, [
  { label: "A", previous: 60, current: 68 },
  { label: "B", previous: 40, current: 42 }
]);
assert.equal(increase.isAdditive, true);
assert.deepEqual(increase.contributors.map(({ label, points }) => [label, points]),
  [["A", 8], ["B", 2]]);

const partial = analyzeExplorerQuarterlyContributors(110, 100, [
  { label: "A", previous: 60, current: 68 },
  { label: "small", previous: 1, current: 1.4 },
  { label: "missing", previous: null, current: 3 }
]);
assert.equal(partial.isAdditive, false);
assert.deepEqual(partial.contributors.map(({ label }) => label), ["A"]);

const decrease = analyzeExplorerQuarterlyContributors(90, 100, [
  { label: "A", previous: 60, current: 54 },
  { label: "B", previous: 40, current: 36 }
]);
assert.deepEqual(decrease.contributors.map(({ points }) => points), [-6, -4]);
assert.equal(analyzeExplorerQuarterlyContributors(10, 0, []), null);

console.log("PASS: quarterly child movements are expressed in parent percentage points, ranked, and limited to significant reported contributions.");
