import { parseCsv } from "./csvParser.js?v=20260917-kri-formula";

const REQUIRED_COLUMNS = [
  "institution id",
  "jst code",
  "institution name",
  "consolidation level"
];

export function parseInstitutionDictionaryCsv(text) {
  const parsed = parseCsv(text);
  const columnIndexes = new Map(parsed.columns.map((column, index) => [
    normalizeHeader(column),
    index
  ]));
  const missingColumns = REQUIRED_COLUMNS.filter((column) => !columnIndexes.has(column));

  if (missingColumns.length > 0) {
    throw new Error(`Missing required columns: ${missingColumns.join(", ")}.`);
  }

  const dictionary = {};
  parsed.rows.forEach((row, index) => {
    const entry = Object.fromEntries(REQUIRED_COLUMNS.map((column) => [
      toPropertyName(column),
      String(row[columnIndexes.get(column)] ?? "").trim()
    ]));
    if (!entry.institutionId || !entry.jstCode) {
      throw new Error(`Row ${index + 2} must include an Institution ID and JST code.`);
    }
    if (dictionary[entry.institutionId]) {
      throw new Error(`Duplicate Institution ID: ${entry.institutionId}.`);
    }
    dictionary[entry.institutionId] = entry;
  });

  if (Object.keys(dictionary).length === 0) {
    throw new Error("The institution dictionary contains no data rows.");
  }

  return dictionary;
}

export function getInstitutionDisplayInfo(dictionary, institutionId) {
  return dictionary?.[institutionId] ?? null;
}

function normalizeHeader(value) {
  return String(value ?? "").replace(/^\uFEFF/, "").trim().toLowerCase();
}

function toPropertyName(header) {
  return {
    "institution id": "institutionId",
    "jst code": "jstCode",
    "institution name": "institutionName",
    "consolidation level": "consolidationLevel"
  }[header];
}
