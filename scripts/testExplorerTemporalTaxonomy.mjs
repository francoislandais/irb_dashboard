import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const source = await readFile(new URL("../app/src/ui/explorerView.js", import.meta.url), "utf8");
const start = source.indexOf("function buildExplorerTemporalTaxonomySeries(");
const end = source.indexOf("function getCompleteExplorerSelectionsForBenchmark(", start);
assert.notEqual(start, -1);
assert.notEqual(end, -1);

const dates = ["2023-12-31", "2024-12-31", "2025-12-31"].map((value) => new Date(`${value}T00:00:00`));
const pointsByFramework = new Map([
  ["4.2", ["100", "200"]],
  ["4.0", ["100", "150"]],
  ["3.2", ["100", "140"]]
]);
const frameworkByDate = new Map(dates.map((date, index) => [date.toISOString().slice(0, 10), ["3.2", "4.0", "4.2"][index]]));
const seriesForFramework = (framework) => ({
  dateColumns: dates.map((date) => ({ date, label: date.toISOString().slice(0, 10) })),
  rows: pointsByFramework.get(framework).map((code) => ({
    code,
    description: `Line ${code}`,
    displayDescription: `Line ${code}`,
    hierarchyPath: `Line ${code}`,
    parentPath: "",
    indentLevel: 0,
    values: dates.map((date, index) => ({ date, label: date.toISOString().slice(0, 10), value: Number(code) + index }))
  }))
});
const sandbox = {
  EXPLORER_ALL_CURRENCIES_CODE: "__ALL_CURRENCIES__",
  explorerGlobalDisplayMode: "temporal",
  getTaxonomyFrameworkForDate: (_state, _tableId, date) => frameworkByDate.get(date.toISOString().slice(0, 10)),
  getTaxonomyDataForTemplateFramework: (_state, _tableId, framework) => ({
    dimensionMapping: { framework },
    explorerPoints: [
      { tableId: "T", coordinate: "x_axis_rc_code", code: "10" },
      ...pointsByFramework.get(framework).map((code) => ({ tableId: "T", coordinate: "y_axis_rc_code", code }))
    ]
  }),
  buildExplorerAxisSeries: (state) => seriesForFramework(state.dimensionMapping.framework),
  filterExplorerSeriesByAdvancedSearch: (series) => series,
  getExplorerDateKey: (date) => date.toISOString().slice(0, 10)
};
const context = vm.createContext(sandbox);
vm.runInContext(source.slice(start, end), context);

const mainSeries = {
  dateColumns: dates.map((date) => ({ date, label: date.toISOString().slice(0, 10) })),
  rows: ["100", "200"].map((code) => ({
    code,
    description: `Line ${code}`,
    displayDescription: `Line ${code}`,
    hierarchyPath: `Line ${code}`,
    parentPath: "",
    indentLevel: 0,
    values: dates.map((date, index) => ({ date, label: date.toISOString().slice(0, 10), value: code === "100" && index === 0 ? 0 : Number(code) + index }))
  }))
};
const state = {
  selectedTaxonomiesByTemplate: { T: "4.2" },
  availableTaxonomiesByTemplate: { T: ["3.2", "4.0", "4.2"] },
  taxonomyHistory: {},
  taxonomySource: {},
  dimensionMapping: { framework: "4.2" },
  explorerPoints: []
};
Object.assign(sandbox, {
  mainSeries,
  state,
  options: { axis: "y", tableId: "T", templateId: "T", selectedXCode: "10", selectedYCode: "", selectedZCode: "", templates: [] }
});
const result = vm.runInContext("buildExplorerTemporalTaxonomySeries(mainSeries, state, options)", context);

assert.deepEqual([...result.taxonomyBlocks], ["4.2", "4.0", "3.2"]);
assert.equal(result.rows[0].displayDescription, "Taxonomy framework 4.2");
assert.equal(result.rows[1].indentLevel, 0, "taxonomy rows start at their natural hierarchy depth");
const mainRows = result.rows.filter((row) => row.taxonomyFramework === "4.2");
assert.equal(mainRows.find((row) => row.code === "100").values[0].value, 0, "a real zero remains visible when the code exists");
assert.equal(mainRows.find((row) => row.code === "200").values[0].isTaxonomyUnavailable, true);
assert.equal(mainRows.find((row) => row.code === "200").values[0].value, null);

const framework40Row = result.rows.find((row) => row.taxonomyFramework === "4.0" && row.code === "150");
assert.deepEqual([...framework40Row.values.map((point) => point.isTaxonomyUnavailable === true)], [true, false, true]);
assert.equal(framework40Row.indentLevel, 0, "historical taxonomy rows retain their original indentation");
assert.equal(framework40Row.hierarchyPath, "Line 150", "taxonomy labels do not become hierarchy parents");
const framework32Row = result.rows.find((row) => row.taxonomyFramework === "3.2" && row.code === "140");
assert.deepEqual([...framework32Row.values.map((point) => point.isTaxonomyUnavailable === true)], [false, true, true]);
assert.equal(result.rows.filter((row) => row.isTaxonomySectionHeader).length, 3);

console.log("PASS: Temporal separates taxonomy-only rows, masks inapplicable dates, and preserves valid zeroes.");
