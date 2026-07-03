import { getIndexedRowsByCoordinates, getIndexedRowsByTableJst } from "./dataIndex.js";
import { normalizeAxisCode } from "./module2Config.js";

const REFERENCE_COLUMN_PATTERN = /^ref_(\d{4})_(\d{2})_(\d{2})$/;

export const MODULE_2_TARGET = {
  tableId: "C_02.00",
  xAxisRcCode: "0010"
};

export function getUniqueValues(columns, rows, columnName) {
  const columnIndex = columns.indexOf(columnName);
  if (columnIndex === -1) return [];

  return [...new Set(rows.map((row) => row[columnIndex]).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right, "fr"));
}

export function buildModule2Series(state) {
  return buildModule2AxisSeries(state, {
    axis: "y",
    selectedXCode: MODULE_2_TARGET.xAxisRcCode,
    selectedYCode: ""
  });
}

export function buildModule2AxisSeries(state, options = {}) {
  const axis = ["template", "x", "y", "z"].includes(options.axis) ? options.axis : "y";
  const tableId = options.tableId || MODULE_2_TARGET.tableId;
  const selectedXCode = normalizeAxisCode(options.selectedXCode || MODULE_2_TARGET.xAxisRcCode, "x");
  const selectedYCode = normalizeAxisCode(options.selectedYCode || "", "y");
  const selectedZCode = normalizeAxisCode(options.selectedZCode || "", "z");
  const indexes = getRequiredIndexes(state.columns);
  const pointsConfig = getAxisPoints(state.module2Points ?? [], tableId, axis);

  if (state.module2PointsError) {
    return {
      dateColumns: [],
      matchCount: 0,
      rows: [],
      status: state.module2PointsError
    };
  }

  if (axis !== "template" && pointsConfig.length === 0) {
    return {
      dateColumns: [],
      matchCount: 0,
      rows: [],
      status: "Configuration du module 2 en attente."
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

  const dateColumns = getReferenceColumns(state.columns);
  const selections = {
    selectedXCode,
    selectedYCode,
    selectedZCode
  };
  const inheritedFormat = getSelectedFilterFormat(state, tableId, axis, selections);
  const rowSeries = axis === "template"
    ? buildTemplateSeriesRows(state, indexes, dateColumns, options.templates ?? [], options.templateSelections ?? {})
    : axis === "x"
      ? buildXAxisSeriesRows(state, indexes, dateColumns, tableId, selectedYCode, selectedZCode, inheritedFormat)
      : buildConfiguredAxisSeriesRows(state, indexes, dateColumns, tableId, axis, pointsConfig, {
      selectedXCode,
      selectedYCode,
      selectedZCode
    }, inheritedFormat);

  const matchCount = rowSeries.reduce((total, row) => total + row.matchCount, 0);

  return {
    dateColumns: dateColumns.map((column) => ({
      date: column.date,
      label: formatReferenceDate(column.date)
    })),
    matchCount,
    rows: rowSeries,
    status: matchCount === 0 ? "Aucune ligne ne correspond aux points configurés pour la JST sélectionnée." : ""
  };
}

function getAxisPoints(points, tableId, axis) {
  return points.filter((point) => (
    point.tableId === tableId
    && point.coordinate === `${axis}_axis_rc_code`
  ));
}

function buildConfiguredAxisSeriesRows(state, indexes, dateColumns, tableId, axis, pointsConfig, selections, inheritedFormat) {
  const effectivePoints = getEffectiveAxisPoints(state, indexes, tableId, axis, pointsConfig);

  return effectivePoints.map((point) => {
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

function getEffectiveAxisPoints(state, indexes, tableId, axis, pointsConfig) {
  const configuredCodes = new Set(pointsConfig.map((point) => point.code));
  const availableCodes = getAvailableAxisCodesFromRows(state, indexes, tableId, axis);
  const missingPoints = availableCodes
    .filter((code) => !configuredCodes.has(code))
    .map((code) => createFallbackAxisPoint(state, tableId, axis, code));

  return [...pointsConfig, ...missingPoints];
}

function getAvailableAxisCodesFromRows(state, indexes, tableId, axis) {
  return [...new Set(getRowsForTableJst(state, indexes, tableId)
    .map((row) => normalizeAxisCode(row[indexes[`${axis}AxisRcCode`]], axis))
    .filter(Boolean))]
    .sort((left, right) => left.localeCompare(right, "fr"));
}

function createFallbackAxisPoint(state, tableId, axis, code) {
  const coordinate = `${axis}_axis_rc_code`;
  const description = state.dimensionMapping?.find(tableId, coordinate, code)?.description || `${axis.toUpperCase()} ${code}`;
  const hierarchy = parseDescriptionHierarchy(description);

  return {
    code,
    description,
    displayDescription: hierarchy.label,
    format: state.dimensionMapping?.find(tableId, coordinate, code)?.format || "",
    hierarchyPath: hierarchy.path,
    indentLevel: hierarchy.level,
    parentPath: hierarchy.parentPath
  };
}

function buildXAxisSeriesRows(state, indexes, dateColumns, tableId, selectedYCode, selectedZCode, inheritedFormat) {
  const allRowsByXCode = new Map();
  const matchedRowsByXCode = new Map();
  const tableRows = getRowsForTableJst(state, indexes, tableId);

  tableRows.forEach((row) => {
    const xCode = normalizeAxisCode(row[indexes.xAxisRcCode], "x");
    if (!xCode) return;

    if (!allRowsByXCode.has(xCode)) allRowsByXCode.set(xCode, []);
    allRowsByXCode.get(xCode).push(row);

    if (
      (!selectedYCode || normalizeAxisCode(row[indexes.yAxisRcCode], "y") === selectedYCode)
      && (!selectedZCode || normalizeAxisCode(row[indexes.zAxisRcCode], "z") === selectedZCode)
    ) {
      if (!matchedRowsByXCode.has(xCode)) matchedRowsByXCode.set(xCode, []);
      matchedRowsByXCode.get(xCode).push(row);
    }
  });

  return [...allRowsByXCode.entries()]
    .sort(([leftCode], [rightCode]) => leftCode.localeCompare(rightCode, "fr"))
    .map(([xCode]) => {
      const matchedRows = matchedRowsByXCode.get(xCode) ?? [];
      const mapping = state.dimensionMapping?.find(tableId, "x_axis_rc_code", xCode);
      const description = mapping?.description || `X ${xCode}`;
      const hierarchy = parseDescriptionHierarchy(description);

      return {
        code: xCode,
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
    const tableId = template.tableId;
    const selections = normalizeTemplateSelections(templateSelections[tableId]);
    const matchedRows = getRowsForCompleteSelection(state, indexes, tableId, selections);
    const format = getSelectedFilterFormat(state, tableId, "template", selections);

    return {
      code: tableId,
      description: template.label || tableId,
      displayDescription: template.label || tableId,
      format,
      hierarchyPath: template.label || tableId,
      indentLevel: 0,
      matchCount: matchedRows.length,
      parentPath: "",
      values: buildValues(dateColumns, matchedRows)
    };
  });
}

function normalizeTemplateSelections(selections = {}) {
  return {
    selectedXCode: normalizeAxisCode(selections.selectedXCode || MODULE_2_TARGET.xAxisRcCode, "x"),
    selectedYCode: normalizeAxisCode(selections.selectedYCode || "", "y"),
    selectedZCode: normalizeAxisCode(selections.selectedZCode || "", "z")
  };
}

function getRowsForAxisPoint(state, indexes, tableId, axis, pointCode, selections) {
  const pointSelections = {
    selectedXCode: axis === "x" ? pointCode : selections.selectedXCode,
    selectedYCode: axis === "y" ? pointCode : selections.selectedYCode,
    selectedZCode: axis === "z" ? pointCode : selections.selectedZCode
  };

  if (canUseCompleteCoordinateIndex(pointSelections)) {
    return getRowsForCompleteSelection(state, indexes, tableId, pointSelections);
  }

  return getRowsForTableJst(state, indexes, tableId).filter((row) => (
    matchesSelectedAxis(row, indexes, "x", selections.selectedXCode, axis)
    && matchesSelectedAxis(row, indexes, "y", selections.selectedYCode, axis)
    && matchesSelectedAxis(row, indexes, "z", selections.selectedZCode, axis)
    && normalizeAxisCode(row[indexes[`${axis}AxisRcCode`]], axis) === pointCode
  ));
}

function getRowsForCompleteSelection(state, indexes, tableId, selections) {
  if (canUseCompleteCoordinateIndex(selections)) {
    return getIndexedRowsByCoordinates(state, tableId, selections);
  }

  return getRowsForTableJst(state, indexes, tableId).filter((row) => (
    matchesSelectedAxis(row, indexes, "x", selections.selectedXCode, "template")
    && matchesSelectedAxis(row, indexes, "y", selections.selectedYCode, "template")
    && matchesSelectedAxis(row, indexes, "z", selections.selectedZCode, "template")
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
  const configuredPoint = (state.module2Points ?? []).find((point) => (
    point.tableId === tableId
    && point.coordinate === coordinate
    && point.code === code
  ));

  if (configuredPoint?.format) return configuredPoint.format;

  return state.dimensionMapping?.find(tableId, coordinate, code)?.format || "";
}

function matchesSelectedAxis(row, indexes, axis, selectedCode, activeAxis) {
  if (axis === activeAxis || !selectedCode) return true;
  return normalizeAxisCode(row[indexes[`${axis}AxisRcCode`]], axis) === selectedCode;
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

function getRequiredIndexes(columns) {
  const indexes = {
    jstCode: columns.indexOf("jst_code"),
    tableId: columns.indexOf("table_id"),
    xAxisRcCode: columns.indexOf("x_axis_rc_code"),
    yAxisRcCode: columns.indexOf("y_axis_rc_code"),
    zAxisRcCode: columns.indexOf("z_axis_rc_code")
  };

  return Object.values(indexes).every((index) => index !== -1) ? indexes : null;
}

function getReferenceColumns(columns) {
  return columns
    .map((name, index) => {
      const match = name.match(REFERENCE_COLUMN_PATTERN);
      if (!match) return null;

      const [, year, month, day] = match;
      return {
        date: new Date(Number(year), Number(month) - 1, Number(day)),
        index,
        name
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.date - right.date);
}

function parseNumericValue(value) {
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatReferenceDate(date) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}
