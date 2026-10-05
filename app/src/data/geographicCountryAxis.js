const GEOGRAPHIC_COUNTRY_TEMPLATES = new Set([
  "F_20.04", "F_20.05", "F_20.06", "F_20.07.1"
]);

export function normalizeGeographicCountryCode(tableId, code) {
  return GEOGRAPHIC_COUNTRY_TEMPLATES.has(tableId) && code === "x28" ? "qx2000" : code;
}

// DPM 1.0 reported this member as x28; DPM 2.0 renamed it qx2000.
// Normalize the fact rows once, before indexing, so one fixed Z choice
// retrieves the same "Other countries" series across the transition.
export function normalizeGeographicCountryAxisCodes(columns, rows) {
  const tableIndex = columns.indexOf("table_id");
  const zIndex = columns.indexOf("z_axis_rc_code");
  if (tableIndex < 0 || zIndex < 0) return rows;

  for (const row of rows) {
    row[zIndex] = normalizeGeographicCountryCode(row[tableIndex], row[zIndex]);
  }
  return rows;
}
