export function getAxisColumnIndexes(columns) {
  return {
    jstCode: columns.indexOf("jst_code"),
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
  return [indexes.jstCode, indexes.tableId, indexes.xAxisRcCode, indexes.yAxisRcCode]
    .every((index) => index !== -1)
    ? indexes
    : null;
}
