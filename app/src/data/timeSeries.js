import { getIndexedAxisCodesAnyJst, getIndexedRowsByAxisPoint, getIndexedRowsByCoordinates, getIndexedRowsByTableJst } from "./dataIndex.js?v=20260915-stable-lists";
import { normalizeAxisCode } from "./core/axisCode.js";
import { getCompleteAxisColumnIndexes } from "./core/axisColumns.js";
import { formatReferenceDate, getReferenceColumns, parseNumericValue } from "./core/referenceColumns.js";
import { EXPLORER_ALL_CURRENCIES_CODE, EXPLORER_ALL_CURRENCIES_LABEL, explorerTableHasCurrencyZAxis } from "./explorer.js?v=20260916-all-currency-blank-z-fix";

export const EXPLORER_TARGET = {
  tableId: "C_02.00",
  xAxisRcCode: "0010"
};

export function getUniqueValues(columns, rows, columnName) {
  const columnIndex = columns.indexOf(columnName);
  if (columnIndex === -1) return [];

  return [...new Set(rows.map((row) => row[columnIndex]).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right, "fr"));
}

export function buildExplorerSeries(state) {
  return buildExplorerAxisSeries(state, {
    axis: "y",
    selectedXCode: EXPLORER_TARGET.xAxisRcCode,
    selectedYCode: ""
  });
}

export function buildExplorerAxisSeries(state, options = {}) {
  const axis = ["x", "y", "z"].includes(options.axis) ? options.axis : "y";
  const tableId = options.tableId || EXPLORER_TARGET.tableId;
  // A template can split its y-axis reference points across several
  // selectable sections sharing the same real tableId (see
  // EXPLORER_TEMPLATE_ROW_SECTIONS) - the row config is then looked up
  // under this section-specific id while every actual data row still
  // matches on the real tableId.
  const yConfigTableId = options.yConfigTableId || tableId;
  const selectedXCode = normalizeAxisCode(options.selectedXCode || EXPLORER_TARGET.xAxisRcCode, "x");
  const selectedYCode = normalizeAxisCode(options.selectedYCode || "", "y");
  const rawSelectedZCode = normalizeAxisCode(options.selectedZCode || "", "z");
  // "All Currency" (see explorerTableHasCurrencyZAxis) resolves to an empty
  // selectedZCode, which matchesSelectedAxis then requires to be an
  // explicit blank z_axis_rc_code on the row (the pre-aggregated total the
  // source data already provides) rather than a wildcard across every
  // currency - see the requireBlankZ option threaded through below.
  const selectedZCode = rawSelectedZCode === EXPLORER_ALL_CURRENCIES_CODE ? "" : rawSelectedZCode;
  const indexes = getCompleteAxisColumnIndexes(state.columns);
  const pointsConfig = getAxisPoints(state.explorerPoints ?? [], axis === "y" ? yConfigTableId : tableId, axis);

  if (state.explorerPointsError) {
    return {
      dateColumns: [],
      matchCount: 0,
      rows: [],
      status: state.explorerPointsError
    };
  }

  if (!indexes || !state.selectedJst) {
    return {
      dateColumns: [],
      matchCount: 0,
      rows: [],
      status: "Chargez un CSV puis choisissez une JST."
    };
  }

  // The reference-date columns are a single global list shared by every
  // table in the CSV. In a dataset that mixes reporting frequencies (some
  // tables monthly, others quarterly), a quarterly table would otherwise
  // inherit every other table's monthly columns too - showing several
  // empty columns per quarter, each mislabeled with the same quarter tag.
  // Keep only the columns this table actually reports on (any JST).
  const dateColumns = axis === "template"
    ? getReferenceColumns(state.columns)
    : getReferenceColumns(state.columns).filter((reference) => (
      state.rows.some((row) => row[indexes.tableId] === tableId && String(row[reference.index] ?? "").trim() !== "")
    ));
  const selections = {
    selectedXCode,
    selectedYCode,
    selectedZCode
  };
  const inheritedFormat = getSelectedFilterFormat(state, tableId, axis, selections);
  const zPointsConfig = axis === "z" && pointsConfig.length > 0 && explorerTableHasCurrencyZAxis(state, tableId)
    ? [createAllCurrenciesPoint(), ...pointsConfig]
    : pointsConfig;
  const rowSeries = axis === "template"
    ? buildTemplateSeriesRows(state, indexes, dateColumns, options.templates ?? [], options.templateSelections ?? {})
    : pointsConfig.length === 0
      ? buildDataDerivedAxisSeriesRows(state, indexes, dateColumns, tableId, axis, selections, inheritedFormat)
      : buildConfiguredAxisSeriesRows(state, indexes, dateColumns, tableId, axis, zPointsConfig, selections, inheritedFormat);

  const matchCount = rowSeries.reduce((total, row) => total + row.matchCount, 0);

  return {
    dateColumns: dateColumns.map((column) => ({
      date: column.date,
      label: formatReferenceDate(column.date)
    })),
    matchCount,
    rows: rowSeries,
    // A row-with-no-data-for-this-JST just shows as dashes (see the
    // stability fix in getPreferredExplorerAxisCodes) rather than being
    // flagged with a banner - see the "Empty" badge on the template list
    // instead (isExplorerTemplateEmptyForJst in explorerView.js).
    status: ""
  };
}

function getAxisPoints(points, tableId, axis) {
  return points.filter((point) => (
    point.tableId === tableId
    && point.coordinate === `${axis}_axis_rc_code`
  ));
}

function createAllCurrenciesPoint() {
  return {
    code: EXPLORER_ALL_CURRENCIES_CODE,
    description: EXPLORER_ALL_CURRENCIES_LABEL,
    displayDescription: EXPLORER_ALL_CURRENCIES_LABEL,
    format: "",
    hierarchyPath: EXPLORER_ALL_CURRENCIES_LABEL,
    indentLevel: 0,
    parentPath: ""
  };
}

function buildConfiguredAxisSeriesRows(state, indexes, dateColumns, tableId, axis, pointsConfig, selections, inheritedFormat) {
  return pointsConfig.map((point) => {
    const matchedRows = getRowsForAxisPoint(state, indexes, tableId, axis, point.code, selections);
    return {
      code: point.code,
      description: point.description,
      displayDescription: point.displayDescription,
      format: point.format || inheritedFormat,
      hierarchyPath: point.hierarchyPath,
      indentLevel: point.indentLevel,
      matchCount: matchedRows.length,
      parentPath: point.parentPath,
      values: buildValues(dateColumns, matchedRows)
    };
  });
}

// Fallback for a table with no static row/column/tab reference at all for
// this axis in ITS_all_dimension_mapping.csv (e.g. C_77.00, which only has
// x-axis points defined): discover whatever codes actually appear in the
// data instead, with a plain "<AXIS> <code>" label and no hierarchy. Used
// for any of x/y/z, not just x - a table missing y-axis config previously
// bailed out entirely ("Configuration en attente") even though the y
// codes were selectable (and looked configured) via the axis dropdown,
// which came from this exact same data-derived fallback.
function buildDataDerivedAxisSeriesRows(state, indexes, dateColumns, tableId, axis, selections, inheritedFormat) {
  const axisIndexKey = `${axis}AxisRcCode`;
  const coordinate = `${axis}_axis_rc_code`;
  const matchedRowsByCode = new Map();
  const indexedCodes = getIndexedAxisCodesAnyJst(state, tableId, axis);
  const codes = indexedCodes.length > 0 || state.dataIndexes
    ? indexedCodes
    : [...new Set(state.rows
        .filter((row) => row[indexes.tableId] === tableId)
        .map((row) => normalizeAxisCode(row[indexes[axisIndexKey]], axis))
        .filter(Boolean))]
      .sort((left, right) => left.localeCompare(right, "fr"));
  const rowsToGroup = getRowsForPartialSelection(state, indexes, tableId, {
    ...selections,
    [`selected${axis.toUpperCase()}Code`]: ""
  });

  rowsToGroup.forEach((row) => {
    const code = normalizeAxisCode(row[indexes[axisIndexKey]], axis);
    if (!code) return;

    if (!matchedRowsByCode.has(code)) matchedRowsByCode.set(code, []);
    matchedRowsByCode.get(code).push(row);
  });

  return codes
    .map((code) => {
      const matchedRows = matchedRowsByCode.get(code) ?? [];
      const mapping = state.dimensionMapping?.find(tableId, coordinate, code);
      const description = mapping?.description || `${axis.toUpperCase()} ${code}`;
      const hierarchy = parseDescriptionHierarchy(description);

      return {
        code,
        description,
        displayDescription: hierarchy.label,
        format: mapping?.format || inheritedFormat,
        hierarchyPath: hierarchy.path,
        indentLevel: hierarchy.level,
        matchCount: matchedRows.length,
        parentPath: hierarchy.parentPath,
        values: buildValues(dateColumns, matchedRows)
      };
    });
}

function buildTemplateSeriesRows(state, indexes, dateColumns, templates, templateSelections) {
  return templates.map((template) => {
    const templateId = template.id ?? template.tableId;
    const tableId = template.tableId;
    const selections = normalizeTemplateSelections(templateSelections[templateId]);
    const matchedRows = getRowsForCompleteSelection(state, indexes, tableId, selections);
    const format = getSelectedFilterFormat(state, tableId, "template", selections);

    return {
      code: templateId,
      description: template.label || templateId,
      displayDescription: template.label || templateId,
      format,
      hierarchyPath: template.label || templateId,
      indentLevel: 0,
      matchCount: matchedRows.length,
      parentPath: "",
      values: buildValues(dateColumns, matchedRows)
    };
  });
}

function normalizeTemplateSelections(selections = {}) {
  return {
    selectedXCode: normalizeAxisCode(selections.selectedXCode || EXPLORER_TARGET.xAxisRcCode, "x"),
    selectedYCode: normalizeAxisCode(selections.selectedYCode || "", "y"),
    selectedZCode: normalizeAxisCode(selections.selectedZCode || "", "z")
  };
}

function getRowsForAxisPoint(state, indexes, tableId, axis, pointCode, selections) {
  // Building the synthetic "All Currency" row itself (only reachable when
  // z is the browsed axis - see createAllCurrenciesPoint): match x/y, and
  // (see matchesSelectedAxis) the row whose own z_axis_rc_code is blank -
  // not a real z_axis_rc_code value, which this sentinel will never equal.
  if (axis === "z" && pointCode === EXPLORER_ALL_CURRENCIES_CODE) {
    return getRowsForPartialSelection(state, indexes, tableId, { ...selections, selectedZCode: "" });
  }

  const pointSelections = {
    selectedXCode: axis === "x" ? pointCode : selections.selectedXCode,
    selectedYCode: axis === "y" ? pointCode : selections.selectedYCode,
    selectedZCode: axis === "z" ? pointCode : selections.selectedZCode
  };

  if (canUseCompleteCoordinateIndex(pointSelections)) {
    return getRowsForCompleteSelection(state, indexes, tableId, pointSelections);
  }

  const indexedRows = getIndexedRowsByAxisPoint(state, tableId, axis, pointCode);
  const rowsToFilter = indexedRows.length > 0 || state.dataIndexes
    ? indexedRows
    : getRowsForTableJst(state, indexes, tableId);

  const zMatchOptions = { requireBlankZ: explorerTableHasCurrencyZAxis(state, tableId) };
  return rowsToFilter.filter((row) => (
    matchesSelectedAxis(row, indexes, "x", selections.selectedXCode, axis)
    && matchesSelectedAxis(row, indexes, "y", selections.selectedYCode, axis)
    && matchesSelectedAxis(row, indexes, "z", selections.selectedZCode, axis, zMatchOptions)
    && normalizeAxisCode(row[indexes[`${axis}AxisRcCode`]], axis) === pointCode
  ));
}

function getRowsForCompleteSelection(state, indexes, tableId, selections) {
  if (canUseCompleteCoordinateIndex(selections)) {
    return getIndexedRowsByCoordinates(state, tableId, selections);
  }

  return getRowsForPartialSelection(state, indexes, tableId, selections);
}

function getRowsForPartialSelection(state, indexes, tableId, selections) {
  const anchor = getBestPartialSelectionAnchor(state, tableId, selections);
  const rowsToFilter = anchor
    ? getIndexedRowsByAxisPoint(state, tableId, anchor.axis, anchor.code)
    : getRowsForTableJst(state, indexes, tableId);

  if ((anchor && rowsToFilter.length === 0 && state.dataIndexes) || rowsToFilter.length === 0) return [];

  const zMatchOptions = { requireBlankZ: explorerTableHasCurrencyZAxis(state, tableId) };
  return rowsToFilter.filter((row) => (
    matchesSelectedAxis(row, indexes, "x", selections.selectedXCode, "template")
    && matchesSelectedAxis(row, indexes, "y", selections.selectedYCode, "template")
    && matchesSelectedAxis(row, indexes, "z", selections.selectedZCode, "template", zMatchOptions)
  ));
}

function getBestPartialSelectionAnchor(state, tableId, selections) {
  return [
    { axis: "z", code: selections.selectedZCode },
    { axis: "y", code: selections.selectedYCode },
    { axis: "x", code: selections.selectedXCode }
  ].find((selection) => (
    selection.code
    && getIndexedRowsByAxisPoint(state, tableId, selection.axis, selection.code).length > 0
  ));
}

function getRowsForTableJst(state, indexes, tableId) {
  const indexedRows = getIndexedRowsByTableJst(state, tableId);
  if (indexedRows.length > 0 || state.dataIndexes) return indexedRows;

  return state.rows.filter((row) => (
    row[indexes.jstCode] === state.selectedJst
    && row[indexes.tableId] === tableId
  ));
}

function canUseCompleteCoordinateIndex(selections) {
  return Boolean(
    selections.selectedXCode
    && selections.selectedYCode
    && selections.selectedZCode
  );
}

function parseDescriptionHierarchy(description) {
  const parts = String(description ?? "")
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);

  return {
    label: parts.at(-1) ?? "",
    level: Math.max(0, parts.length - 1),
    parentPath: parts.slice(0, -1).join(" > "),
    path: parts.join(" > ")
  };
}

function getSelectedFilterFormat(state, tableId, activeAxis, selections) {
  const axisSelections = [
    { axis: "y", code: selections.selectedYCode, coordinate: "y_axis_rc_code" },
    { axis: "z", code: selections.selectedZCode, coordinate: "z_axis_rc_code" },
    { axis: "x", code: selections.selectedXCode, coordinate: "x_axis_rc_code" }
  ];

  for (const selection of axisSelections) {
    if (selection.axis === activeAxis || !selection.code) continue;

    const format = getAxisCodeFormat(state, tableId, selection.coordinate, selection.code);
    if (format) return format;
  }

  return "";
}

function getAxisCodeFormat(state, tableId, coordinate, code) {
  const configuredPoint = (state.explorerPoints ?? []).find((point) => (
    point.tableId === tableId
    && point.coordinate === coordinate
    && point.code === code
  ));

  if (configuredPoint?.format) return configuredPoint.format;

  return state.dimensionMapping?.find(tableId, coordinate, code)?.format || "";
}

function matchesSelectedAxis(row, indexes, axis, selectedCode, activeAxis, { requireBlankZ = false } = {}) {
  if (axis === activeAxis) return true;
  if (!selectedCode) {
    // A currency Z-axis table's "All Currency" selection resolves to an
    // empty selectedZCode (see buildExplorerAxisSeries), meaning "match
    // only the row whose own z_axis_rc_code is blank" - the pre-aggregated
    // total the source data already provides. Treating it as "ignore Z"
    // instead would sum that total together with every individual
    // currency row on top of it.
    return axis === "z" && requireBlankZ ? isBlankAxisCode(row, indexes, axis) : true;
  }
  return normalizeAxisCode(row[indexes[`${axis}AxisRcCode`]], axis) === selectedCode;
}

function isBlankAxisCode(row, indexes, axis) {
  return normalizeAxisCode(row[indexes[`${axis}AxisRcCode`]], axis) === "";
}

function buildValues(dateColumns, matchedRows) {
  return dateColumns.map((column) => ({
    date: column.date,
    label: formatReferenceDate(column.date),
    value: matchedRows.length === 0
      ? null
      : matchedRows.reduce((total, row) => total + parseNumericValue(row[column.index]), 0)
  }));
}
