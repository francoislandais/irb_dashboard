export function parseCsv(text) {
  const normalizedText = text.trimStart();
  const delimiter = detectDelimiter(normalizedText);
  const records = parseRecords(normalizedText, delimiter);
  if (records.length === 0) {
    return { columns: [], rows: [] };
  }

  const columns = records[0].map((column, index) => column || `Colonne ${index + 1}`);
  const rows = records.slice(1).filter((record) => record.some((value) => value !== ""));

  return {
    columns,
    rows: rows.map((record) => normalizeRecord(record, columns.length))
  };
}

function normalizeRecord(record, columnCount) {
  return Array.from({ length: columnCount }, (_, index) => record[index] ?? "");
}

function detectDelimiter(text) {
  const firstLine = readFirstLine(text);
  const candidates = [",", ";", "\t"];
  return candidates
    .map((delimiter) => ({ delimiter, count: countDelimiter(firstLine, delimiter) }))
    .sort((left, right) => right.count - left.count)[0].delimiter;
}

function readFirstLine(text) {
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      return text.slice(0, index);
    }
  }

  return text;
}

function countDelimiter(line, delimiter) {
  let count = 0;
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === delimiter && !inQuotes) count += 1;
  }

  return count;
}

function parseRecords(text, delimiter) {
  const records = [];
  let record = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      field += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === delimiter && !inQuotes) {
      record.push(field);
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      record.push(field);
      records.push(record);
      record = [];
      field = "";
      continue;
    }

    field += char;
  }

  record.push(field);
  records.push(record);
  return records;
}
