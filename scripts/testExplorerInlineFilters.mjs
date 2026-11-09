import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../app/src/ui/explorerView.js", import.meta.url), "utf8");
const dropdownSource = source.slice(
  source.indexOf("function toggleExplorerInlineFilter("),
  source.indexOf("function renderExplorerActiveFilters(")
);

class Element {
  constructor(tag) {
    this.tagName = tag;
    this.children = [];
    this.dataset = {};
    this.attributes = {};
    this.listeners = {};
    this.classes = new Set();
    this.classList = { toggle: (name, enabled) => enabled ? this.classes.add(name) : this.classes.delete(name) };
  }
  setAttribute(name, value) { this.attributes[name] = value; }
  append(child) { this.children.push(child); child.parentElement = this; }
  addEventListener(name, callback) { this.listeners[name] = callback; }
  remove() {
    this.parentElement.children = this.parentElement.children.filter(child => child !== this);
  }
  click() {
    if (!this.disabled) this.listeners.click?.({ stopPropagation() {} });
  }
}

let renderCount = 0;
let focused = false;
let selected = "";
const context = vm.createContext({
  document: { createElement: tag => new Element(tag) },
  elements: { explorerActiveFilters: { querySelector: () => ({ focus() { focused = true; } }) } },
  getLatestState: () => ({}),
  EXPLORER_INLINE_FILTER_TOPICS: new Set(["display-mode"]),
  explorerContextTopic: "",
  renderExplorerActiveFilters: () => { renderCount += 1; }
});
vm.runInContext(`let explorerInlineFilterTopic = "";\n${dropdownSource}`, context);

const options = [
  { value: "xy", label: "XY view", selected: true },
  { value: "temporal", label: "Temporal", detail: "All reference dates", selected: false }
];
const firstChip = new Element("span");
context.addExplorerInlineFilterDropdown(firstChip, "display-mode", options, value => { selected = value; });
const firstArrow = firstChip.children[0];
assert.equal(firstArrow.attributes["aria-expanded"], "false");
assert.equal(firstChip.children.length, 1);
firstArrow.click();
assert.equal(vm.runInContext("explorerInlineFilterTopic", context), "display-mode");
assert.equal(renderCount, 1);
assert.equal(focused, true);

const openChip = new Element("span");
context.addExplorerInlineFilterDropdown(openChip, "display-mode", options, value => { selected = value; });
const [openArrow, menu] = openChip.children;
assert.equal(openArrow.attributes["aria-expanded"], "true");
assert.equal(menu.attributes.role, "listbox");
assert.equal(menu.children[0].attributes["aria-selected"], "true");
menu.children[1].click();
assert.equal(selected, "temporal");
assert.equal(vm.runInContext("explorerInlineFilterTopic", context), "");
assert.equal(openArrow.attributes["aria-expanded"], "false");
assert.equal(openChip.children.length, 1);

const emptyChip = new Element("span");
context.addExplorerInlineFilterDropdown(emptyChip, "jst-code", [], () => {});
assert.equal(emptyChip.children[0].disabled, true);
console.log("PASS: Explorer filter chevron opens an inline choice list, selects and closes, while unavailable choices stay disabled.");
