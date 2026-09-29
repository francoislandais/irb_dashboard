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
// Host-created Date objects do not satisfy `instanceof Date` inside the VM.
sandbox.getExplorerDateKey = (date) => date.toISOString().slice(0, 10);

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

// Open currency axes were implicit in older workbooks. A missing Z list in
// those frameworks must not grey out either currencies or their aggregate.
sandbox.getTaxonomyDataForTemplateFramework = (_state, _tableId, framework) => ({
  dimensionMapping: { framework },
  explorerPoints: [
    { tableId: "T", coordinate: "x_axis_rc_code", code: "10" },
    ...pointsByFramework.get(framework).map((code) => ({ tableId: "T", coordinate: "y_axis_rc_code", code })),
    ...(framework === "4.2" ? ["EUR", "USD", "qx46"].map((code) => ({
      tableId: "T", coordinate: "z_axis_rc_code", code
    })) : [])
  ]
});
const currencySeries = {
  dateColumns: mainSeries.dateColumns,
  rows: ["__ALL_CURRENCIES__", "EUR", "USD"].map((code) => ({
    code,
    description: code,
    displayDescription: code,
    hierarchyPath: code,
    parentPath: "",
    indentLevel: 0,
    values: dates.map((date, index) => ({ date, label: date.toISOString().slice(0, 10), value: index + 1 }))
  }))
};
const currencyOptions = {
  axis: "z", tableId: "T", templateId: "T",
  selectedXCode: "10", selectedYCode: "100", selectedZCode: "__ALL_CURRENCIES__", templates: []
};
Object.assign(sandbox, { currencySeries, currencyOptions });
const currencyResult = vm.runInContext(
  "buildExplorerTemporalTaxonomySeries(currencySeries, state, currencyOptions)", context
);
for (const code of ["__ALL_CURRENCIES__", "EUR", "USD"]) {
  const row = currencyResult.rows.find((item) => item.code === code);
  assert.deepEqual([...row.values.map((point) => point.value)], [1, 2, 3]);
  assert.ok(row.values.every((point) => !point.isTaxonomyUnavailable));
}

const selectedCurrencyOptions = { ...currencyOptions, axis: "y", selectedZCode: "EUR" };
Object.assign(sandbox, { selectedCurrencyOptions });
const selectedCurrencyResult = vm.runInContext(
  "buildExplorerTemporalTaxonomySeries(mainSeries, state, selectedCurrencyOptions)", context
);
const continuingLine = selectedCurrencyResult.rows.find((row) => row.taxonomyFramework === "4.2" && row.code === "100");
assert.equal(continuingLine.values[0].value, 0, "a selected currency does not mask a valid historical Y code");
assert.ok(!continuingLine.values[0].isTaxonomyUnavailable);
const newerLine = selectedCurrencyResult.rows.find((row) => row.taxonomyFramework === "4.2" && row.code === "200");
assert.equal(newerLine.values[0].isTaxonomyUnavailable, true, "real Y taxonomy changes remain masked");

sandbox.explorerGlobalDisplayMode = "xy";
const xyTabResult = vm.runInContext(
  "buildExplorerTemporalTaxonomySeries(currencySeries, state, currencyOptions)", context
);
assert.deepEqual([...xyTabResult.taxonomyBlocks], ["4.2"], "XY Tab keeps the temporal taxonomy sections");
for (const code of ["__ALL_CURRENCIES__", "EUR", "USD"]) {
  const row = xyTabResult.rows.find((item) => item.code === code);
  assert.deepEqual([...row.values.map((point) => point.value)], [1, 2, 3]);
}
const xyMatrix = { xy: true, dateColumns: mainSeries.dateColumns, rows: mainSeries.rows };
Object.assign(sandbox, { xyMatrix });
assert.equal(vm.runInContext(
  "buildExplorerTemporalTaxonomySeries(xyMatrix, state, selectedCurrencyOptions)", context
), xyMatrix, "the X/Y matrix remains outside the temporal taxonomy renderer");

const zCodesByFramework = new Map([
  ["3.2", ["A", "D"]], ["4.0", ["A", "C"]], ["4.2", ["A", "B"]]
]);
const zSeriesForFramework = (framework) => ({
  dateColumns: mainSeries.dateColumns,
  rows: zCodesByFramework.get(framework).map((code) => ({
    code, description: code, displayDescription: code, hierarchyPath: code,
    parentPath: "", indentLevel: 0,
    values: dates.map((date, index) => ({ date, label: date.toISOString().slice(0, 10), value: index + 1 }))
  }))
});
sandbox.getTaxonomyDataForTemplateFramework = (_state, _tableId, framework) => ({
  dimensionMapping: { framework },
  explorerPoints: [
    { tableId: "T", coordinate: "x_axis_rc_code", code: "10" },
    { tableId: "T", coordinate: "y_axis_rc_code", code: "100" },
    ...zCodesByFramework.get(framework).map((code) => ({ tableId: "T", coordinate: "z_axis_rc_code", code }))
  ]
});
sandbox.buildExplorerAxisSeries = (historicalState) => zSeriesForFramework(historicalState.dimensionMapping.framework);
Object.assign(sandbox, {
  zMainSeries: zSeriesForFramework("4.2"),
  zOptions: { ...currencyOptions, selectedZCode: "B" }
});
const xyZResult = vm.runInContext("buildExplorerTemporalTaxonomySeries(zMainSeries, state, zOptions)", context);
assert.deepEqual([...xyZResult.taxonomyBlocks], ["4.2", "4.0", "3.2"]);
assert.equal(xyZResult.rows.find((row) => row.taxonomyFramework === "4.2" && row.code === "B")
  .values[0].isTaxonomyUnavailable, true);
assert.equal(xyZResult.rows.find((row) => row.taxonomyFramework === "4.0" && row.code === "C")
  .values[1].value, 2);

console.log("PASS: Temporal and XY Tab share taxonomy blocks; XY X/Y remains a matrix.");
