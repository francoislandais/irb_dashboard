import { getCompleteAxisColumnIndexes } from "./core/axisColumns.js";
import { getReferenceColumns } from "./core/referenceColumns.js";

const REQUIRED_AXIS_COLUMN_LABELS = {
  jstCode: "jst_code",
  tableId: "table_id",
  xAxisRcCode: "x_axis_rc_code",
  yAxisRcCode: "y_axis_rc_code",
  zAxisRcCode: "z_axis_rc_code"
};

export function validateCsvDataset(columns, rows) {
  const missingColumns = getMissingAxisColumns(columns);
  if (missingColumns.length > 0) {
    throw new Error(`CSV invalide : colonnes obligatoires manquantes (${missingColumns.join(", ")}).`);
  }

  if (getReferenceColumns(columns).length === 0) {
    throw new Error("CSV invalide : aucune colonne de date de référence au format ref_YYYY_MM_DD n'a été trouvée.");
  }

  if (rows.length === 0) {
    throw new Error("CSV invalide : aucune ligne de données exploitable n'a été trouvée.");
  }
}

function getMissingAxisColumns(columns) {
  const indexes = getCompleteAxisColumnIndexes(columns);
  if (indexes) return [];

  return Object.entries(REQUIRED_AXIS_COLUMN_LABELS)
    .filter(([, label]) => !columns.includes(label))
    .map(([, label]) => label);
}
