import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const source = await readFile(new URL("../app/src/ui/explorerView.js", import.meta.url), "utf8");
const topicDefinitions = source.slice(
  source.indexOf("const EXPLORER_CONTEXT_TOPICS ="),
  source.indexOf("// The expanded description can be restored")
);
const declaration = (prefix) => source.split("\n").find((line) => line.startsWith(prefix));
const initialStateSource = [
  declaration("const initialExplorerContext ="),
  declaration("let explorerContextDetailCollapsed ="),
  declaration("let explorerContextTopic =")
].join("\n");
const panelStateSource = source.slice(
  source.indexOf("function setExplorerContextDetailCollapsed("),
  source.indexOf("function syncExplorerContextDetailVisibility()")
);
assert.ok(topicDefinitions && initialStateSource && panelStateSource);

for (const [initialValue, expectedTopic, expectedCollapsed] of [
  ["geography", "geography", false],
  ["benchmark-mode", "benchmark-mode", false],
  ["collapsed", "", true],
  ["unknown", "", false]
]) {
  let url = new URL(`https://example.test/?explorer_context=${initialValue}`);
  const state = vm.createContext({
    EXPLORER_CONTEXT_URL_PARAM: "explorer_context",
    readUrlStateParams: () => new URLSearchParams(`explorer_context=${initialValue}`),
    createUrlState: () => new URL(url),
    replaceUrlState: (next) => { url = next; },
    syncExplorerContextDetailVisibility: () => {}
  });
  vm.runInContext(`${topicDefinitions}\n${initialStateSource}\n${panelStateSource}`, state);
  assert.equal(vm.runInContext("explorerContextTopic", state), expectedTopic);
  assert.equal(vm.runInContext("explorerContextDetailCollapsed", state), expectedCollapsed);

  if (expectedCollapsed) vm.runInContext("setExplorerContextDetailCollapsed(false)", state);
  vm.runInContext('explorerContextTopic = "geography"; updateUrlExplorerContextPanel()', state);
  assert.equal(url.searchParams.get("explorer_context"), "geography");
  vm.runInContext('explorerContextTopic = ""; updateUrlExplorerContextPanel()', state);
  assert.equal(url.searchParams.has("explorer_context"), false);
  vm.runInContext('explorerContextTopic = "geography"; setExplorerContextDetailCollapsed(true)', state);
  assert.equal(url.searchParams.get("explorer_context"), "collapsed");
  vm.runInContext("setExplorerContextDetailCollapsed(false)", state);
  assert.equal(url.searchParams.get("explorer_context"), "geography");
}

const summarySource = source.slice(
  source.indexOf("function createExplorerSelectionSummaryCard()"),
  source.indexOf("function createExplorerTaxonomyStatus()")
);
assert.match(summarySource, /if \(!EXPLORER_SELECTION_DESCRIPTION_ENABLED\) \{\s*pane\.append\(description\);\s*return pane;/,
  "the summary remains visible while the description expander is disabled");
console.log("PASS: context panel topics survive URL reloads and the selection description expander stays hidden.");
