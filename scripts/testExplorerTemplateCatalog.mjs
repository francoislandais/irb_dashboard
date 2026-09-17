import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  getExplorerTemplateDescription,
  getExplorerTemplateLabel
} from "../app/src/data/explorer.js";
import { parseCsv } from "../app/src/data/csvParser.js";
import {
  groupExplorerTemplatesByFamily,
  parseExplorerTemplateGroups
} from "../app/src/data/explorerTemplateGroups.js";

const expectedFundingPlanLabels = {
  "P_00.01": "Nature of report (Funding Plans)",
  "P_01.01": "Assets",
  "P_01.02": "Liabilities",
  "P_01.03": "Liquidity ratios",
  "P_02.01": "Insured and uninsured deposits and uninsured deposit-like financial instruments",
  "P_02.02": "Public sector and central bank sources of funding",
  "P_02.03": "Innovative funding structures",
  "P_02.04": "Pricing: loan assets",
  "P_02.05": "Pricing: deposits and other liabilities",
  "P_02.06": "Two largest significant currencies and reporting currency",
  "P_02.07": "Loan asset acquisitions, run-offs and disposal plans",
  "P_02.08": "Deposit liability acquisitions and disposal plans",
  "P_04.01": "Statement of profit or loss",
  "P_04.02": "Statement of profit or loss for small and non-complex credit institutions",
  "P_05.00": "Debt securities: issuances and redemptions"
};

const catalogCsv = readFileSync(
  new URL("../app/assets/ITS_explorer_template_groups.csv", import.meta.url),
  "utf8"
);
const parsed = parseCsv(catalogCsv);
const config = parseExplorerTemplateGroups(parsed.columns, parsed.rows);
const mappingCsv = readFileSync(
  new URL("../app/assets/ITS_all_dimension_mapping.csv", import.meta.url),
  "latin1"
);
const mapping = parseCsv(mappingCsv);
const tableIdIndex = mapping.columns.indexOf("table_id");
const datasetFundingPlanIds = [...new Set(mapping.rows
  .map((row) => row[tableIdIndex])
  .filter((tableId) => tableId?.startsWith("P_")))];

assert.deepEqual(datasetFundingPlanIds, Object.keys(expectedFundingPlanLabels));

for (const [templateId, description] of Object.entries(expectedFundingPlanLabels)) {
  assert.equal(config.groupByTemplateId.get(templateId), "Funding Plan");
  assert.equal(getExplorerTemplateDescription(templateId), description);
  assert.equal(getExplorerTemplateLabel(templateId), `${templateId} - ${description}`);
}

const templates = [
  { id: "C_01.00" },
  ...Object.keys(expectedFundingPlanLabels).map((id) => ({ id })),
  { id: "KRI" }
];
const sections = groupExplorerTemplatesByFamily(templates, config);
assert.equal(sections[0].group, "Key Risk Indicator");
assert.deepEqual(sections[0].templates.map(({ id }) => id), ["KRI"]);
assert.equal(sections.at(-1).group, "Funding Plan");
assert.deepEqual(
  sections.at(-1).templates.map(({ id }) => id),
  Object.keys(expectedFundingPlanLabels)
);
assert.deepEqual(sections.at(-2).templates.map(({ id }) => id), ["C_01.00"]);

console.log("PASS: Funding Plan catalog labels, KRI-first ordering, and Funding Plan-last ordering.");
