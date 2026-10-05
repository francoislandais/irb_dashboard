import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { buildExplorerAxisSeries, getExplorerGeographyLatestValues } from "../app/src/data/timeSeries.js";
import { buildGeographyPagePlan } from "../app/src/data/geographyPagination.js";
import { buildDataIndexes } from "../app/src/data/dataIndex.js";
import { createVirtualExplorerRow, getParentPaths } from "../app/src/data/explorer.js";

const source = await readFile(new URL("../app/src/ui/explorerView.js", import.meta.url), "utf8");
const sharedContextSource = source.slice(
  source.indexOf("function createExplorerTemplateContext()"),
  source.indexOf("function getActiveExplorerTemplate()")
) + source.slice(
  source.indexOf("function getExplorerContextForTemplate("),
  source.indexOf("function getActiveExplorerAxis()")
);
const sharedContext = vm.createContext({
  EXPLORER_TARGET: { tableId: "TEST" },
  EXPLORER_GEOGRAPHIC_TEMPLATES: new Map([["F_20.04", "z"], ["F_20.05", "z"]]),
  explorerTemplateContexts: new Map(),
  explorerSharedGeography: {
    selectedZCode: "", expandedPaths: new Set(), treeViewMode: null,
    defaultExpandedPathsInitialized: false
  },
  explorerGlobalDisplayMode: "temporal",
  explorerGlobalReferenceLabel: ""
});
vm.runInContext(sharedContextSource, sharedContext);
const geographicA = vm.runInContext("getExplorerContextForTemplate('F_20.04')", sharedContext);
const geographicB = vm.runInContext("getExplorerContextForTemplate('F_20.05')", sharedContext);
const otherTemplate = vm.runInContext("getExplorerContextForTemplate('C_01.00')", sharedContext);
geographicA.selectedZCode = "FR";
geographicA.selectedXCode = "0010";
geographicA.expandedPathsByAxis.z.add("Euro area");
geographicA.treeViewModeByAxis.z = 2;
assert.equal(geographicB.selectedZCode, "FR", "geographic templates share their country selection");
assert.equal(geographicB.treeViewModeByAxis.z, 2, "geographic templates share their Z expansion level");
assert.equal(geographicB.expandedPathsByAxis.z.has("Euro area"), true);
assert.equal(geographicB.selectedXCode, "", "other axes remain specific to each template");
assert.equal(otherTemplate.selectedZCode, "", "non-geographic templates keep their own Z selection");
geographicB.selectedZCode = "US";
assert.equal(geographicA.selectedZCode, "US", "switching countries in either template updates the shared selection");
const existingRowSource = source.slice(
  source.indexOf("function ensureExplorerSelectionUsesExistingRow("),
  source.indexOf("function syncExplorerBenchmarkPlacement()")
);
const existingRowContext = vm.createContext({
  EXPLORER_GEOGRAPHIC_TEMPLATES: sharedContext.EXPLORER_GEOGRAPHIC_TEMPLATES,
  getExplorerRowsForTemplate: () => [["0010", "0010", "DE"]],
  hasExplorerSelectedCombination: () => false,
  getCompleteAxisColumnIndexes: () => ({ xAxisRcCode: 0, yAxisRcCode: 1, zAxisRcCode: 2 }),
  normalizeAxisCode: (code) => code
});
vm.runInContext(existingRowSource, existingRowContext);
existingRowContext.selection = geographicA;
existingRowContext.options = {
  x: { codes: ["0010"] }, y: { codes: ["0010"] }, z: { codes: ["DE", "US"] }
};
vm.runInContext("ensureExplorerSelectionUsesExistingRow({ columns: [], rows: [] }, 'F_20.04', selection, options)", existingRowContext);
assert.equal(geographicB.selectedZCode, "US", "a template's first data row must not replace the shared country");

const start = source.indexOf("function sortExplorerGeographyCountriesByCodeOrder(");
const end = source.indexOf("function getExplorerGeographyCountries(", start);
assert.ok(start >= 0 && end > start);

const countries = Array.from({ length: 45 }, (_, index) => ({
  code: `C${String(index).padStart(2, "0")}`,
  name: `Country ${String(44 - index).padStart(2, "0")}`
}));
let search = { hasQuery: false };
const context = vm.createContext({
  explorerGeographySearch: "",
  explorerGeographyLayout: "alphabetical",
  getExplorerGeographyCountries: () => countries,
  getExplorerAdvancedSearchResults: () => search,
  getExplorerGeographyLatestValues,
  normalizeAxisCode: (code) => code,
  groupExplorerCountries: (items) => [{ countries: [...items].sort((a, b) => a.name.localeCompare(b.name)) }]
});
vm.runInContext(source.slice(start, end), context);
context.template = { id: "F_20.04", tableId: "F_20.04" };
context.state = {};
context.selection = { selectedXCode: "0010", selectedYCode: "0010" };
const orderedCodes = Array.from(vm.runInContext("getExplorerGeographyMatchingCodesInOrder(state, template, selection)", context));
assert.equal(orderedCodes.length, 45);
assert.deepEqual(orderedCodes.slice(20, 40), countries.slice(5, 25).reverse().map((country) => country.code));
context.explorerGeographySearch = "C44";
assert.equal(vm.runInContext("getExplorerGeographyMatchingCodesInOrder(state, template, selection).length", context), 45,
  "country search navigates to a country without filtering out the other countries");
context.explorerGeographySearch = "";

const countrySearchStart = source.indexOf("function applyExplorerCountrySearch(");
const countrySearchEnd = source.indexOf("function isExplorerGeographyGroupedLayout(", countrySearchStart);
assert.ok(countrySearchStart >= 0 && countrySearchEnd > countrySearchStart);
let urlUpdates = 0;
let rerenders = 0;
const selectedCountryContext = { activeAxis: "y", selectedZCode: "" };
const countrySearchContext = vm.createContext({
  explorerGeographySearch: "", explorerGeographySearchDraft: "",
  elements: { explorerContextDetail: null },
  getActiveExplorerContext: () => selectedCountryContext,
  saveExplorerScrollPosition: () => {},
  updateUrlExplorerSelectionParams: () => { urlUpdates += 1; },
  getLatestState: () => ({}),
  rerenderApp: () => { rerenders += 1; }
});
vm.runInContext(source.slice(countrySearchStart, countrySearchEnd), countrySearchContext);
vm.runInContext("applyExplorerCountrySearch({ code: 'C44', name: 'Country 00' })", countrySearchContext);
assert.equal(selectedCountryContext.activeAxis, "z");
assert.equal(selectedCountryContext.selectedZCode, "C44");
assert.equal(countrySearchContext.explorerGeographySearch, "C44");
assert.equal(countrySearchContext.shouldRevealExplorerAxisSelection, true);
assert.equal(rerenders, 1, "selecting a suggestion renders the target country and its page");
vm.runInContext("clearExplorerCountrySearch()", countrySearchContext);
assert.equal(countrySearchContext.explorerGeographySearch, "");
assert.equal(selectedCountryContext.selectedZCode, "C44", "clearing transient search preserves the selected country");
assert.equal(rerenders, 1, "clearing search does not recompute the table");
assert.equal(urlUpdates, 2);

const columns = ["reporting_unit_id", "table_id", "x_axis_rc_code", "y_axis_rc_code", "z_axis_rc_code", "ref_2025_12_31"];
const state = {
  columns,
  rows: countries.map((country, index) => ["BANK", "F_20.04", "0010", "0010", country.code, String(index + 1)]),
  selectedJst: "BANK",
  explorerPoints: countries.map((country) => ({
    tableId: "F_20.04", coordinate: "z_axis_rc_code", code: country.code,
    description: country.name, displayDescription: country.name,
    hierarchyPath: country.name, indentLevel: 0, parentPath: ""
  }))
};
state.dataIndexes = buildDataIndexes(state.columns, state.rows);
const pageCodes = new Set(orderedCodes.slice(20, 40));
const page = buildExplorerAxisSeries(state, {
  tableId: "F_20.04", axis: "z", selectedXCode: "0010", selectedYCode: "0010",
  onlyCodes: pageCodes
});
assert.equal(page.rows.length, 20, "only the selected country's series should be calculated");
assert.deepEqual(page.rows.map((row) => row.code), countries.map((country) => country.code).filter((code) => pageCodes.has(code)));
assert.ok(page.rows.every((row) => row.values[0].value > 0));

search = { hasQuery: true, byTemplate: new Map([["F_20.04", {
  restrictedAxis: "z", matchesByAxis: { z: new Set(["C00", "C44"]) }
}]]) };
assert.deepEqual(Array.from(vm.runInContext("getExplorerGeographyMatchingCodesInOrder(state, template, selection)", context)), ["C44", "C00"]);

search = { hasQuery: false };
context.explorerGeographyLayout = "relevance";
const latestColumns = [...columns, "ref_2026_06_30"];
const latestRows = countries.map((country, index) => [
  "BANK", "F_20.04", "0010", "0010", country.code,
  String(index === 44 ? 1000 : index), String(index === 1 ? -5 : 45 - index)
]);
latestRows.push(["BANK", "F_20.04", "0010", "0010", "C02", "0", "1"]);
latestRows.push(["BANK", "F_20.04", "0020", "0010", "C44", "0", "500"]);
const latestState = {
  ...state, columns: latestColumns, rows: latestRows,
  dataIndexes: buildDataIndexes(latestColumns, latestRows)
};
context.state = latestState;
const ranking = Array.from(vm.runInContext("getExplorerGeographyMatchingCodesInOrder(state, template, selection)", context));
assert.equal(ranking.length, 45, "Top Contributors must include every country");
assert.deepEqual(ranking.slice(0, 3), ["C00", "C02", "C03"],
  "rank by the latest date and sum duplicate facts, rather than falling back to an older value");
assert.equal(getExplorerGeographyLatestValues(latestState, {
  tableId: "F_20.04", selectedXCode: "0010", selectedYCode: "0010"
}).get("C02"), 44);
assert.equal(ranking.at(-1), "C01", "negative values follow positive values");
assert.equal(ranking.indexOf("C44"), 43, "other X selections must not change this ranking");
assert.deepEqual(Array.from(vm.runInContext("sortExplorerGeographyCountriesByCodeOrder([{code:'C22'},{code:'C00'}], ['C00','C22'])", context)).map((country) => country.code), ["C00", "C22"]);
const rankedPageCodes = new Set(ranking.slice(20, 40));
const rankedPage = buildExplorerAxisSeries(latestState, {
  tableId: "F_20.04", axis: "z", selectedXCode: "0010", selectedYCode: "0010",
  onlyCodes: rankedPageCodes
});
assert.equal(rankedPage.rows.length, 20, "only the selected contributor page gets full time series");
context.selection = { selectedXCode: "0020", selectedYCode: "0010" };
assert.equal(vm.runInContext("getExplorerGeographyMatchingCodesInOrder(state, template, selection)[0]", context), "C44",
  "changing the selected X axis updates the contributor ranking");

const pagerStart = source.indexOf("function renderExplorerPaginationBar(");
const pagerEnd = source.indexOf("function changeExplorerKriPage(", pagerStart);
assert.ok(pagerStart >= 0 && pagerEnd > pagerStart);
const pagerContext = vm.createContext({
  document: { createElement: () => ({ addEventListener(event, handler) { this[event] = handler; } }) }
});
vm.runInContext(source.slice(pagerStart, pagerEnd), pagerContext);
const container = { replaceChildren(...children) { this.children = children; } };
let requestedPage = -1;
pagerContext.container = container;
pagerContext.onChange = (index) => { requestedPage = index; };
vm.runInContext("renderExplorerPaginationBar(container, 1, 45, 20, onChange)", pagerContext);
assert.equal(container.children[1].textContent, "Page 2 of 3");
assert.equal(container.children[0].disabled, false);
assert.equal(container.children[2].disabled, false);
container.children[2].click();
assert.equal(requestedPage, 2);
vm.runInContext("renderExplorerPaginationBar(container, 2, 45, 20, onChange)", pagerContext);
assert.equal(container.children[2].disabled, true);

const groups = [
  { label: "Euro area", countries: countries.slice(0, 15) },
  { label: "Other EU", countries: countries.slice(15, 27) },
  { label: "Other Europe", countries: countries.slice(27, 42) },
  { label: "Rest of the world", countries: countries.slice(42) }
];
const expansionStart = source.indexOf("function getExplorerGeographyExpandedGroupLabels(");
const expansionEnd = source.indexOf("function applyExplorerGeographyPresentation(", expansionStart);
assert.ok(expansionStart >= 0 && expansionEnd > expansionStart);
const expansionContext = vm.createContext({
  getExplorerDefaultExpandDepthForAxis: () => 2,
  normalizeHierarchyPath: (path) => path
});
vm.runInContext(source.slice(expansionStart, expansionEnd), expansionContext);
expansionContext.groups = groups;
expansionContext.tree = {
  treeViewModeByAxis: { z: null }, defaultExpandedPathsInitializedByAxis: { z: false },
  expandedPathsByAxis: { z: new Set() }
};
assert.deepEqual(Array.from(vm.runInContext(
  "getExplorerGeographyExpandedGroupLabels(tree, groups.slice(0, 1), groups)", expansionContext)), ["Euro area"]);
assert.deepEqual([...expansionContext.tree.expandedPathsByAxis.z], groups.map((group) => group.label),
  "default expansion must remember every group even when the first view was filtered");
expansionContext.tree.treeViewModeByAxis.z = 1;
assert.equal(vm.runInContext("getExplorerGeographyExpandedGroupLabels(tree, groups).size", expansionContext), 0);
expansionContext.tree.treeViewModeByAxis.z = 2;
assert.equal(vm.runInContext("getExplorerGeographyExpandedGroupLabels(tree, groups).size", expansionContext), 4);

const collapsed = buildGeographyPagePlan(groups, new Set(), 0, 20);
assert.equal(collapsed.pageCount, 1);
assert.deepEqual(collapsed.pageCodes, []);
assert.deepEqual(collapsed.pageGroupLabels, groups.map((group) => group.label),
  "all collapsed group headings must fit on the first page");
assert.equal(buildExplorerAxisSeries(latestState, {
  tableId: "F_20.04", axis: "z", selectedXCode: "0010", selectedYCode: "0010",
  onlyCodes: new Set(collapsed.pageCodes)
}).rows.length, 0, "collapsed countries must not have series computed");

const oneExpanded = buildGeographyPagePlan(groups, new Set(["Euro area"]), 0, 20);
assert.equal(oneExpanded.pageCount, 1);
assert.equal(oneExpanded.pageCodes.length, 15);
assert.deepEqual(oneExpanded.pageGroupLabels, groups.map((group) => group.label));

const twoExpanded = new Set(["Euro area", "Other Europe"]);
const firstPage = buildGeographyPagePlan(groups, twoExpanded, 0, 20);
const secondPage = buildGeographyPagePlan(groups, twoExpanded, 1, 20);
assert.equal(firstPage.pageCount, 2);
assert.equal(firstPage.pageCodes.length, 20);
assert.deepEqual(firstPage.pageGroupLabels, ["Euro area", "Other EU", "Other Europe", "Rest of the world"]);
assert.equal(secondPage.pageCodes.length, 10);
assert.deepEqual(secondPage.pageGroupLabels, ["Other Europe"]);

const groupRowsStart = source.indexOf("function addExplorerGeographyGroupRows(");
const groupRowsEnd = source.indexOf("function sortExplorerGeographyCountriesByCodeOrder(", groupRowsStart);
assert.ok(groupRowsStart >= 0 && groupRowsEnd > groupRowsStart);
const groupContext = vm.createContext({ createVirtualExplorerRow });
vm.runInContext(source.slice(groupRowsStart, groupRowsEnd), groupContext);
groupContext.series = {
  rows: [], dateColumns: [{ date: new Date(2026, 5, 30), label: "30/06/2026" }],
  geographyGroupLabels: collapsed.pageGroupLabels
};
groupContext.latestState = { selectedTaxonomiesByTemplate: { "F_20.04": "4.2.1" } };
groupContext.template = { tableId: "F_20.04" };
const collapsedTable = vm.runInContext("addExplorerGeographyGroupRows(series, latestState, template)", groupContext);
assert.equal(collapsedTable.rows.length, 4);
assert.ok(collapsedTable.rows.every((row) => row.isVirtual));
assert.equal(getParentPaths(collapsedTable.rows).size, 0,
  "the table must mark the explicit group headings as parents even without visible countries");

console.log("PASS: geography pages follow expanded groups; country search navigates without filtering; Top Contributors ranks every country by its latest selected value.");
