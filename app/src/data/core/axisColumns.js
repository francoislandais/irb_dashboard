export function getAxisColumnIndexes(columns) {
  const reportingUnitId = findReportingUnitIdColumn(columns);
  return {
    institutionId: reportingUnitId,
    jstCode: reportingUnitId,
    tableId: columns.indexOf("table_id"),
    xAxisRcCode: columns.indexOf("x_axis_rc_code"),
    yAxisRcCode: columns.indexOf("y_axis_rc_code"),
    zAxisRcCode: columns.indexOf("z_axis_rc_code")
  };
}

export function getCompleteAxisColumnIndexes(columns) {
  const indexes = getAxisColumnIndexes(columns);
  return Object.values(indexes).every((index) => index !== -1) ? indexes : null;
}

export function getRequiredAxisColumnIndexes(columns) {
  const indexes = getAxisColumnIndexes(columns);
  return [indexes.institutionId, indexes.tableId, indexes.xAxisRcCode, indexes.yAxisRcCode]
    .every((index) => index !== -1)
    ? indexes
    : null;
}

function findReportingUnitIdColumn(columns) {
  const normalizedColumns = columns.map((column) => String(column ?? "").trim().toLowerCase());
  const canonicalIndex = normalizedColumns.indexOf("reporting_unit_id");
  return canonicalIndex !== -1 ? canonicalIndex : normalizedColumns.indexOf("jst_code");
}
