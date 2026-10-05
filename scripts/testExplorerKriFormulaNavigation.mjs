import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { normalizeAxisCode } from "../app/src/data/core/axisCode.js";
import { normalizeKriFormulaTemplateId, parseKriFormula } from "../app/src/data/explorerKriFormula.js";

for (const [input, expected] of [
  ["F_18.00.a_dp", "F_18.00"],
  ["F_18.00.a.dp", "F_18.00"],
  ["C_69.00.b", "C_69.00"],
  ["F_04.02.1", "F_04.02.1"]
]) {
  assert.equal(normalizeKriFormulaTemplateId(input), expected);
}

const source = readFileSync(new URL("../app/src/ui/explorerView.js", import.meta.url), "utf8");
const screenSource = readFileSync(new URL("../app/src/ui/dataScreen.js", import.meta.url), "utf8");
const creditRiskSource = readFileSync(new URL("../app/src/ui/creditRiskView.js", import.meta.url), "utf8");
const explorerImport = /["'](\.\/explorerView\.js\?v=[^"']+)["']/;
assert.equal(screenSource.match(explorerImport)?.[1], creditRiskSource.match(explorerImport)?.[1]);
const start = source.indexOf("const EXPLORER_KRI_FORMULA_AXIS_COORDINATES =");
const end = source.indexOf("function createExplorerKriFormulaChip(", start);
assert.ok(start > 0 && end > start);

function navigate(formula, { section = false, missingColumn = false } = {}) {
  const node = parseKriFormula(formula);
  assert.equal(node.type, "cellref");
  const sectionId = section ? "F_18.00-section" : "F_18.00";
  const points = [
    { tableId: sectionId, coordinate: "y_axis_rc_code", code: "0070" },
    ...missingColumn ? [] : [{ tableId: "F_18.00", coordinate: "x_axis_rc_code", code: "0130" }]
  ];
  const state = { explorerPoints: points };
  const contexts = new Map();
  const sandbox = {
    normalizeAxisCode,
    normalizeKriFormulaTemplateId,
    getLatestState: () => state,
    getExplorerTemplates: () => section
      ? [{ id: "F_18.00-section", tableId: "F_18.00" }, { id: "F_18.00-other", tableId: "F_18.00" }]
      : [{ id: "F_18.00", tableId: "F_18.00" }],
    getExplorerContextForTemplate: (id) => {
      if (!contexts.has(id)) contexts.set(id, {});
      return contexts.get(id);
    },
    clearExplorerAdvancedSearch: () => {
      sandbox.cleared += 1;
      vm.runInContext('explorerAdvancedSearchQuery = ""', context);
    },
    updateUrlTemplateParam: (id) => { sandbox.urlTemplate = id; },
    updateUrlExplorerSelectionParams: () => {},
    rerenderApp: () => { sandbox.rendered += 1; },
    cleared: 0,
    rendered: 0,
    urlTemplate: ""
  };
  const context = vm.createContext(sandbox);
  vm.runInContext(`let explorerAdvancedSearchQuery = "old KRI search";
    let activeExplorerTemplateId = "KRI";
    let hasInteractedWithExplorerSelection = false;
    let shouldFocusOpenedExplorerPoint = false;
    let pendingExplorerCellRefPeekCodes = null;
    ${source.slice(start, end)}`, context);
  vm.runInContext(`openExplorerKriFormulaCellRef(${JSON.stringify(node)})`, context);
  return { sandbox, context, contexts };
}

for (const section of [false, true]) {
  const { sandbox, context, contexts } = navigate("{T(F_18.00.a_dp)R(0070)C(0130)}", { section });
  const expected = section ? "F_18.00-section" : "F_18.00";
  assert.equal(sandbox.urlTemplate, expected);
  assert.equal(vm.runInContext("activeExplorerTemplateId", context), expected);
  assert.equal(contexts.get(expected).selectedYCode, "0070");
  assert.equal(contexts.get(expected).selectedXCode, "0130");
  assert.equal(sandbox.cleared, 1);
  assert.equal(vm.runInContext("explorerAdvancedSearchQuery", context), "");
  assert.equal(sandbox.rendered, 1);
}

const missing = navigate("{T(F_18.00.a)R(0070)C(0130)}", { missingColumn: true });
assert.equal(missing.sandbox.rendered, 0);
assert.equal(missing.sandbox.cleared, 0);

console.log("PASS: formula template links resolve annexes, sections and coordinates without search redirects.");
