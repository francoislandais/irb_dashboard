import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  getExplorerTemplateDescription,
  getExplorerTemplateLabel
} from "../app/src/data/explorer.js";
import { parseCsv } from "../app/src/data/csvParser.js";
import { buildDataIndexes, getAllIndexedTableIds } from "../app/src/data/dataIndex.js";
import { removeEmptyReferenceColumns, validateCsvDataset } from "../app/src/data/csvSchema.js";
import {
  groupExplorerTemplatesByFamily,
  parseExplorerTemplateGroups
} from "../app/src/data/explorerTemplateGroups.js";

const expectedFundingPlanIds = [
  "P_00.01", "P_01.01", "P_01.02", "P_01.03", "P_02.01", "P_02.02",
  "P_02.03", "P_02.04", "P_02.05", "P_02.06", "P_02.07", "P_02.08",
  "P_04.01", "P_04.02", "P_05.00"
];

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
const datasetTemplateIds = [...new Set(mapping.rows
  .map((row) => row[tableIdIndex])
  .filter(Boolean))];
const datasetFundingPlanIds = datasetTemplateIds.filter((tableId) => tableId.startsWith("P_"));

const emptyDataCsv = readFileSync(
  new URL("../app/assets/taxonomy-preview-empty-data.csv", import.meta.url),
  "utf8"
);
const rawEmptyData = parseCsv(emptyDataCsv);
const emptyData = removeEmptyReferenceColumns(rawEmptyData.columns, rawEmptyData.rows);
validateCsvDataset(emptyData.columns, emptyData.rows);
const emptyDataIndexes = buildDataIndexes(emptyData.columns, emptyData.rows);
assert.deepEqual(
  getAllIndexedTableIds({ dataIndexes: emptyDataIndexes }),
  datasetTemplateIds.slice().sort((left, right) => left.localeCompare(right, "fr", { numeric: true }))
);

const namesCsv = readFileSync(
  new URL("../app/assets/ITS_explorer_template_names.csv", import.meta.url),
  "utf8"
);
const parsedNames = parseCsv(namesCsv);
const nameIdIndex = parsedNames.columns.indexOf("table_id");
const nameIndex = parsedNames.columns.indexOf("description");
const templateNames = new Map(parsedNames.rows.map((row) => [row[nameIdIndex], row[nameIndex]]));

assert.deepEqual(datasetFundingPlanIds, expectedFundingPlanIds);
assert.equal(templateNames.size, datasetTemplateIds.length);
assert.deepEqual([...templateNames.keys()].sort(), datasetTemplateIds.slice().sort());

for (const templateId of datasetTemplateIds) {
  const description = templateNames.get(templateId);
  assert.ok(description, `Missing official EBA title for ${templateId}`);
  assert.equal(getExplorerTemplateDescription(templateId), description);
  assert.equal(getExplorerTemplateLabel(templateId), `${templateId} - ${description}`);
}

for (const templateId of expectedFundingPlanIds) {
  assert.equal(config.groupByTemplateId.get(templateId), "Funding Plan");
}
assert.equal(getExplorerTemplateDescription("P_01.01"), "Assets");
assert.equal(
  getExplorerTemplateDescription("F_18.00"),
  "Information on performing and non-performing exposures"
);

const templates = [
  { id: "C_01.00" },
  ...expectedFundingPlanIds.map((id) => ({ id })),
  { id: "KRI" }
];
const sections = groupExplorerTemplatesByFamily(templates, config);
assert.equal(sections[0].group, "Key Risk Indicator");
assert.deepEqual(sections[0].templates.map(({ id }) => id), ["KRI"]);
assert.equal(sections.at(-1).group, "Funding Plan");
assert.deepEqual(
  sections.at(-1).templates.map(({ id }) => id),
  expectedFundingPlanIds
);
assert.deepEqual(sections.at(-2).templates.map(({ id }) => id), ["C_01.00"]);

console.log("PASS: all template IDs have official names and family ordering remains correct.");
