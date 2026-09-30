import { getReferenceColumns } from "./referenceColumns.js";

// Exported Hive datasets may store euro amounts as integer thousands. Restore
// the original unit before any index, ratio, benchmark, or chart is built.
export function expandScaledReferenceValues({ columns, rows }) {
  const scaleIndex = columns.indexOf("value_scale");
  if (scaleIndex < 0) return { columns, rows };

  const referenceIndexes = getReferenceColumns(columns).map(({ index }) => index);
  const expandedRows = rows.map((sourceRow) => {
    const scale = String(sourceRow[scaleIndex] ?? "").trim();
    if (!scale) return sourceRow;
    if (scale !== "1000") throw new Error(`Échelle de données non reconnue : ${scale}.`);

    const row = [...sourceRow];
    referenceIndexes.forEach((index) => {
      const stored = String(row[index] ?? "").trim();
      if (!stored) return;
      if (!/^-?\d+$/.test(stored)) {
        throw new Error(`Montant compact invalide : ${stored}.`);
      }
      const amount = Number(stored) * 1000;
      if (!Number.isSafeInteger(amount)) {
        throw new Error(`Montant compact hors de la plage entière exacte : ${stored}.`);
      }
      row[index] = String(amount);
    });
    return row;
  });
  return { columns, rows: expandedRows };
}
