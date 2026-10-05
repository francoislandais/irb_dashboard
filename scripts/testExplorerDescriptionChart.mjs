import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../app/src/ui/explorerView.js", import.meta.url), "utf8");
const chartSource = source.slice(
  source.indexOf("function createExplorerSelectionHistoryChart("),
  source.indexOf("// Phrasing for the handful of functions", source.indexOf("function createExplorerSelectionHistoryChart("))
);

class Element {
  constructor(tag) {
    this.tag = tag;
    this.children = [];
    this.attributes = {};
    this.listeners = {};
    this.hidden = false;
    this.style = {};
  }
  append(...children) { this.children.push(...children); }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  addEventListener(name, callback) { this.listeners[name] = callback; }
}

const selected = [];
const sandbox = {
  document: {
    createElement: (tag) => new Element(tag),
    createElementNS: (_, tag) => new Element(tag)
  },
  getExplorerFullDateColumnLabel: (point) => point.label,
  selectExplorerBenchmarkReferenceDate: (label) => selected.push(label)
};
const context = vm.createContext(sandbox);
vm.runInContext(chartSource, context);
const points = [
  { label: "Q1 2025", status: "valid", value: 10, framework: "4.0" },
  { label: "Q2 2025", status: "valid", value: 12, framework: "4.0" },
  { label: "Q3 2025", status: "code-unavailable", value: null, framework: "4.2" },
  { label: "Q4 2025", status: "valid", value: 13, framework: "4.2" },
  { label: "Q1 2026", status: "valid", value: 15, framework: "4.2" }
];
const chart = vm.runInContext(`createExplorerSelectionHistoryChart(${JSON.stringify(points)},
  (value) => String(value), {
    selectedLabel: "Q1 2026",
    comparisons: [
      { months: 3, previous: { label: "Q4 2025" }, absolute: 2 },
      { months: 12, previous: { label: "Q1 2025" }, absolute: 5 }
    ],
    formatChange: (value) => "+" + value
  })`, context);
const svg = chart.children[0];
const byClass = (className) => svg.children.filter((child) => child.attributes.class?.split(" ").includes(className));
assert.equal(byClass("explorer-description-chart-arrow").length, 2);
assert.equal(byClass("explorer-description-chart-selected-guide").length, 1);
assert.equal(byClass("explorer-description-chart-line").length, 2,
  "a code gap interrupts the line, while a framework change by itself does not");
assert.equal(byClass("explorer-description-chart-framework").length, 0);
assert.deepEqual(byClass("explorer-description-chart-arrow-label").map((node) => node.textContent),
  ["1y  +5", "3m  +2"]);
const targets = byClass("explorer-description-chart-hit");
assert.equal(targets.filter((target) => target.attributes.role === "button").length, 4);
assert.equal(targets[2].listeners.click, undefined, "a date before this code existed is not selectable");
targets[0].listeners.click();
let prevented = false;
targets[3].listeners.keydown({ key: "Enter", preventDefault() { prevented = true; } });
assert.equal(prevented, true);
assert.deepEqual(selected, ["Q1 2025", "Q4 2025"]);

const continuous = vm.runInContext(`createExplorerSelectionHistoryChart([
  { label: "Q1", status: "valid", value: 10, framework: "4.0" },
  { label: "Q2", status: "valid", value: 11, framework: "4.2" },
  { label: "Q3", status: "missing", value: null, framework: "4.2" }
], (value) => String(value), {
  selectedLabel: "Q2", comparisons: [], formatChange: String
})`, context);
const continuousSvg = continuous.children[0];
assert.equal(continuousSvg.children.filter((node) => node.attributes.class === "explorer-description-chart-line").length, 1,
  "the line continues across a framework change when the code and value exist");
const missingTarget = continuousSvg.children.filter((node) => node.attributes.class?.includes("explorer-description-chart-hit"))[2];
assert.equal(missingTarget.attributes.role, "button", "a date remains selectable when its code exists but its value is missing");
missingTarget.listeners.click();
assert.equal(selected.at(-1), "Q3");

console.log("PASS: selected-date guide, 3m/1y arrows and keyboard/pointer date selection; framework changes alone do not break the line.");
