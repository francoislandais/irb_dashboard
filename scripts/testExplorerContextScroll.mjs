import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../app/src/ui/explorerView.js", import.meta.url), "utf8");
const revealSource = source.slice(
  source.indexOf("function scheduleExplorerContextOptionReveal("),
  source.indexOf("function createExplorerTemplateGroupHeader(")
);

let scheduled = null;
const target = { getBoundingClientRect: () => ({ top: 700, bottom: 740, height: 40 }) };
const container = {
  scrollTop: 100,
  querySelector: (selector) => selector === ".explorer-template-option.is-active" ? target : null,
  getBoundingClientRect: () => ({ top: 100, bottom: 500, height: 400 })
};
const context = vm.createContext({
  elements: { explorerContextDetail: container },
  requestAnimationFrame: (callback) => { scheduled = callback; }
});
vm.runInContext(revealSource, context);
vm.runInContext('scheduleExplorerContextOptionReveal(".explorer-template-option.is-active")', context);
assert.equal(container.scrollTop, 100);
scheduled();
assert.equal(container.scrollTop, 520);

container.scrollTop = 250;
target.getBoundingClientRect = () => ({ top: 250, bottom: 290, height: 40 });
vm.runInContext('scheduleExplorerContextOptionReveal(".explorer-template-option.is-active")', context);
scheduled();
assert.equal(container.scrollTop, 250);

const axisHandlerStart = source.indexOf('if (button.disabled) return;', source.indexOf('elements.explorerAxisButtons.forEach'));
const axisHandler = source.slice(axisHandlerStart, source.indexOf('    });', axisHandlerStart));
const axisContext = vm.createContext({
  button: { disabled: false, getAttribute: () => "x" },
  hasInteractedWithExplorerSelection: false,
  shouldRevealExplorerAxisSelection: false,
  shouldCenterExplorerReferenceColumn: false,
  saveExplorerScrollPosition() {},
  isExplorerXYView: () => true,
  getActiveExplorerContext: () => axisContext.selection,
  actions: { getState: () => ({}) },
  rerenderApp() {}
});
axisContext.selection = { activeAxis: "y" };
vm.runInContext(`(function () { ${axisHandler} })()`, axisContext);
assert.equal(axisContext.selection.activeAxis, "x");
assert.equal(axisContext.shouldRevealExplorerAxisSelection, true);
assert.equal(axisContext.shouldCenterExplorerReferenceColumn, true);

const scrollSource = source.slice(
  source.indexOf("function focusSelectedExplorerRow("),
  source.indexOf("export function saveExplorerScrollPosition()")
);
let scrolledCell = null;
const cell = { scrollIntoView: () => { scrolledCell = cell; } };
const row = { hidden: false, focus() {}, querySelector: () => cell };
const scrollContext = vm.createContext({
  CSS: { escape: (value) => value },
  elements: { explorerTable: { querySelector: () => row } },
  getSelectedExplorerCodeForActiveAxis: () => "0020"
});
vm.runInContext(scrollSource, scrollContext);
vm.runInContext("focusSelectedExplorerRow()", scrollContext);
assert.equal(scrolledCell, cell);
scrolledCell = null;
vm.runInContext("focusSelectedExplorerRow(false)", scrollContext);
assert.equal(scrolledCell, null);

const templateListSource = source.slice(
  source.indexOf("function createExplorerTemplateList("),
  source.indexOf("function scheduleExplorerContextOptionReveal(")
);
assert.doesNotMatch(templateListSource, /scheduleExplorerContextOptionReveal\(/);
const templateControlSource = source.slice(
  source.indexOf('elements.explorerTemplateControl?.addEventListener("click"'),
  source.indexOf('elements.explorerContextDetailToggle?.addEventListener("click"')
);
assert.match(templateControlSource, /if \(openingTemplatePanel\) scheduleExplorerContextOptionReveal\(/);
console.log("PASS: template reveal only on opening, preserved list scroll, axis reveal flag and selected-row scrolling.");
