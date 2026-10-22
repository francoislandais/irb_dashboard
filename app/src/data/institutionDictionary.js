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
  const id = String(institutionId ?? "").trim();
  if (!id || !dictionary) return null;
  if (dictionary[id]) return dictionary[id];
  // Older extracts use LEI_CONS while the current Hive export writes
  // LEI_CONSO for the same consolidation level. Never substitute SOLO.
  const match = /^(.*)_(CONS|CONSO)$/i.exec(id);
  if (!match) return null;
  const alternate = `${match[1]}_${match[2].toUpperCase() === "CONS" ? "CONSO" : "CONS"}`;
  return dictionary[alternate] ?? null;
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
