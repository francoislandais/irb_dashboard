import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const source = await readFile(new URL("../app/src/ui/explorerView.js", import.meta.url), "utf8");
const start = source.indexOf("function buildExplorerTemporalTaxonomySeries(");
const end = source.indexOf("function addExplorerTaxonomySection(", start);
assert.ok(start >= 0 && end > start);

const pointsByTemplate = {
  "F_20.04": {
    "4.2": [
      ["x_axis_rc_code", "0010"],
      ["y_axis_rc_code", "0010"],
      ["z_axis_rc_code", "FR"]
    ],
    "3.2": [
      ["x_axis_rc_code", "0010"],
      ["y_axis_rc_code", "0010"],
      ["z_axis_rc_code", "FR"]
    ]
  },
  "C_03.00": {
    "4.2": [["x_axis_rc_code", "0010"], ["y_axis_rc_code", "0070"]],
    "3.2": [["x_axis_rc_code", "0010"]]
  }
};

const context = vm.createContext({
  explorerGlobalDisplayMode: "temporal",
  EXPLORER_ALL_CURRENCIES_CODE: "__all_currencies__",
  getTaxonomyFrameworkForDate: (_state, _tableId, date) => date.getFullYear() === 2026 ? "4.2" : "3.2",
  getTaxonomyDataForTemplateFramework: (_state, tableId, framework) => ({
    explorerPoints: pointsByTemplate[tableId][framework].map(([coordinate, code]) => ({ tableId, coordinate, code }))
  })
});
vm.runInContext(source.slice(start, end), context);

function check(tableId, axis, code, selectedZCode = "") {
  const dates = [new Date(2026, 5, 30), new Date(2025, 11, 31)];
  context.state = {
    selectedTaxonomiesByTemplate: { [tableId]: "4.2" },
    taxonomyHistory: {},
    taxonomySource: {}
  };
  context.series = {
    dateColumns: dates.map((date) => ({ date, label: date.toISOString() })),
    rows: [{ code, values: dates.map((date, index) => ({ date, value: index + 1 })) }]
  };
  context.options = { tableId, templateId: tableId, axis, selectedXCode: "0010", selectedYCode: "0010", selectedZCode };
  return vm.runInContext("buildExplorerTemporalTaxonomySeries(series, state, options)", context).rows[0].values;
}

assert.equal(check("F_20.04", "z", "FR")[1].value, 2,
  "the fixed country axis must preserve 2025 values in the Z view");
assert.equal(check("F_20.04", "y", "0010", "FR")[1].value, 2,
  "a selected country must also preserve 2025 values in the Y view");
assert.equal(check("C_03.00", "y", "0070")[1].isTaxonomyUnavailable, true,
  "a genuinely new code must remain unavailable in an older taxonomy");

console.log("PASS: fixed F_20.04 country values survive historical taxonomy masking; new codes remain masked.");
