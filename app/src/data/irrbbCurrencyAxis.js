// DPM dictionaries expose the J_01.00 total as qx1, while fact extracts may
// report the same member as x1. Use the reported identifier throughout the app.
export function normalizeIrrbbCurrencyAxisCodes(columns, rows) {
  const tableIndex = columns.indexOf("table_id");
  const currencyIndex = columns.indexOf("z_axis_rc_code");
  if (tableIndex < 0 || currencyIndex < 0) return rows;
  for (const row of rows) {
    if (row[tableIndex] === "J_01.00" && ["qx1", "x1"].includes(String(row[currencyIndex]).toLowerCase())) {
      row[currencyIndex] = "x1";
    }
  }
  return rows;
}
