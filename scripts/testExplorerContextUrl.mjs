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

const contextRenderSource = source.slice(
  source.indexOf("function renderExplorerContextPanel("),
  source.indexOf("function renderExplorerJstSelectionPanel(")
);
assert.ok(contextRenderSource.includes("function renderExplorerContextPanel("));
for (const [topic, hasRows, geographicTemplate, expectedTopic] of [
  ["geography", false, false, "geography"],
  ["geography", true, true, "geography"],
  ["geography", true, false, ""],
  ["benchmark-mode", false, false, "benchmark-mode"]
]) {
  let recordedUrl = new URL(`https://example.test/?explorer_context=${topic}`);
  const context = vm.createContext({
    elements: { explorerContextPanel: {} },
    explorerContextTopic: topic,
    explorerGeographySearch: "US",
    explorerGeographySearchDraft: "United States",
    explorerContextDetailCollapsed: false,
    EXPLORER_CONTEXT_URL_PARAM: "explorer_context",
    getActiveExplorerGeographyAxis: () => geographicTemplate ? "z" : "",
    revealExplorerContextDetail: () => {},
    syncExplorerContextDetailVisibility: () => {},
    createUrlState: () => new URL(recordedUrl),
    replaceUrlState: (next) => { recordedUrl = next; },
    syncExplorerBenchmarkPlacement: () => {},
    destroyExplorerBenchmarkChart: () => {},
    renderExplorerSelectionPane: () => {},
    renderExplorerGeographyPanel: () => {},
    renderExplorerBenchmarkPanel: () => {},
    renderExplorerTemplatePanel: () => {},
    explorerBenchmarkExpanded: false
  });
  // Keep this focused on the pre-render state transition: the lower panel's
  // rendering depends on unrelated DOM and data fixtures.
  const prelude = contextRenderSource.slice(0, contextRenderSource.indexOf("  syncExplorerBenchmarkPlacement();")) + "}";
  vm.runInContext(`${panelStateSource}\n${prelude}`, context);
  vm.runInContext(`renderExplorerContextPanel({ rows: ${hasRows ? "[{}]" : "[]"} })`, context);
  assert.equal(vm.runInContext("explorerContextTopic", context), expectedTopic);
  assert.equal(recordedUrl.searchParams.get("explorer_context"), expectedTopic || null);
}

const geographyPageSource = source.slice(
  source.indexOf("function setUrlExplorerGeographyPage("),
  source.indexOf("function setOrDeleteUrlParam(")
) + source.slice(
  source.indexOf("function getUrlGeographyPageIndex("),
  source.indexOf("function updateUrlTemplateParam(")
);
for (const [pageValue, expectedIndex] of [["3", 2], ["1", 0], ["-1", 0], ["oops", 0]]) {
  let pageUrl = new URL(`https://example.test/?explorer_geography_page=${pageValue}&tab=US`);
  const context = vm.createContext({
    EXPLORER_GEOGRAPHY_PAGE_URL_PARAM: "explorer_geography_page",
    readUrlStateParams: () => pageUrl.searchParams,
    createUrlState: () => new URL(pageUrl),
    replaceExplorerUrlState: (next) => { pageUrl = next; },
    explorerGeographyPageIndex: 0
  });
  vm.runInContext(geographyPageSource, context);
  assert.equal(vm.runInContext("getUrlGeographyPageIndex()", context), expectedIndex);
  vm.runInContext("explorerGeographyPageIndex = 4; updateUrlExplorerGeographyPage()", context);
  assert.equal(pageUrl.searchParams.get("explorer_geography_page"), "5");
  assert.equal(pageUrl.searchParams.get("tab"), "US", "page changes retain the selected country");
}

const templateRestoreSource = source.slice(
  source.indexOf("function ensureActiveExplorerTemplate("),
  source.indexOf("function updateUrlExplorerSelectionParams(")
);
const restoredSelection = { activeAxis: "y", selectedXCode: "", selectedYCode: "", selectedZCode: "" };
let writtenTemplate = "";
const templateContext = vm.createContext({
  hasAppliedUrlTemplate: false,
  hasInteractedWithExplorerSelection: false,
  activeExplorerTemplateId: "C_01.00",
  shouldRevealExplorerAxisSelection: false,
  pendingUrlAxis: "z",
  pendingUrlRow: "0010",
  pendingUrlColumn: "0010",
  pendingUrlTab: "US",
  explorerGeographySearch: "",
  EXPLORER_AXIS_VALUES: new Set(["x", "y", "z"]),
  getExplorerTemplates: () => [{ id: "F_20.04" }, { id: "C_01.00" }],
  getUrlTemplateParam: () => "F_20.04",
  findMatchingExplorerTemplateId: (templates, id) => templates.find((template) => template.id === id)?.id ?? "",
  updateUrlTemplateParam: (id) => { writtenTemplate = id; },
  getActiveExplorerContext: () => restoredSelection,
  getActiveExplorerGeographyAxis: () => "z",
  normalizeAxisCode: (code) => code
});
vm.runInContext(templateRestoreSource, templateContext);
vm.runInContext("ensureActiveExplorerTemplate({ rows: [] })", templateContext);
assert.equal(vm.runInContext("hasAppliedUrlTemplate", templateContext), false,
  "the empty startup render must not consume the deep link");
assert.equal(writtenTemplate, "");
vm.runInContext("ensureActiveExplorerTemplate({ rows: [{}] })", templateContext);
assert.equal(vm.runInContext("activeExplorerTemplateId", templateContext), "F_20.04");
assert.equal(restoredSelection.activeAxis, "z");
assert.equal(restoredSelection.selectedZCode, "US");
assert.equal(writtenTemplate, "F_20.04");
console.log("PASS: context panel topics survive URL reloads and the selection description expander stays hidden.");
