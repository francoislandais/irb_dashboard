import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../app/src/ui/explorerView.js", import.meta.url), "utf8");
const optionsSource = source.slice(
  source.indexOf("const EXPLORER_EVOLUTION_OPTIONS ="),
  source.indexOf("// \"template\" used")
);
assert.ok(optionsSource.indexOf('value: "xy"') < optionsSource.indexOf('value: "temporal"'));
assert.doesNotMatch(source, /explorer-filter-chip-evolution/);
assert.doesNotMatch(source, /explorerContextTopic === "evolution-frequency"/);

const displayParamSource = source.slice(
  source.indexOf("function getUrlDisplayModeParam()"),
  source.indexOf("function getUrlAxisParam()")
);
for (const [parameter, expected] of [[null, "xy"], ["xy", "xy"], ["temporal", "temporal"], ["focus", "xy"]]) {
  const context = vm.createContext({
    EXPLORER_DISPLAY_URL_PARAM: "explorer_display",
    readUrlStateParams: () => new URLSearchParams(parameter ? `explorer_display=${parameter}` : "")
  });
  vm.runInContext(displayParamSource, context);
  assert.equal(vm.runInContext("getUrlDisplayModeParam()", context), expected);
}

class Element {
  constructor(tag) {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.listeners = {};
    this.dataset = {};
    this.className = "";
    this.value = "";
  }
  append(...children) { this.children.push(...children); }
  addEventListener(type, listener) { this.listeners[type] = listener; }
  setAttribute(name, value) { this[name] = value; }
}

let rerenders = 0;
const sandbox = {
  document: { createElement: (tag) => new Element(tag) },
  getLatestState: () => ({}),
  rerenderApp: () => { rerenders += 1; },
  saveExplorerScrollPosition() {}
};
const context = vm.createContext(sandbox);
vm.runInContext(`
const EXPLORER_EVOLUTION_OPTIONS = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "semiannual", label: "Semiannual" },
  { value: "annual", label: "Annual" }
];
let explorerGlobalEvolutionFrequency = "quarterly";
${source.slice(
  source.indexOf("function createExplorerEvolutionFrequencyControl()"),
  source.indexOf("function renderExplorerBenchmarkModePanel(")
)}`,
context);
sandbox.control = vm.runInContext("createExplorerEvolutionFrequencyControl()", context);
const input = sandbox.control.children[1];
const ticks = sandbox.control.children[2];
assert.equal(input.value, "1");
assert.deepEqual(ticks.children.map((tick) => tick.textContent), ["Monthly", "Quarterly", "Semiannual", "Annual"]);
input.value = "3";
input.listeners.input();
assert.equal(sandbox.control.children[0].children[1].textContent, "Annual");
input.listeners.change();
assert.equal(vm.runInContext("explorerGlobalEvolutionFrequency", context), "annual");
assert.equal(rerenders, 1);

const panelSource = source.slice(
  source.indexOf("function renderExplorerDisplayModePanel()"),
  source.indexOf("// The unit of \"history depth\"")
);
assert.match(panelSource, /createExplorerHistoryDepthControl\(\), createExplorerEvolutionFrequencyControl\(\)/);
assert.match(panelSource, /if \(!isExplorerXYView\(\)\)/);
console.log("PASS: XY-first default, explicit Temporal URL, removed frequency chip, and consolidated discrete frequency slider.");
