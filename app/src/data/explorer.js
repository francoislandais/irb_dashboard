import { getAllIndexedTableIds, getIndexedAxisCodesAnyJst, getIndexedRowsByTableJst } from "./dataIndex.js?v=20260925-institution-id";
import { normalizeAxisCode } from "./core/axisCode.js?v=20260921-z-axis-padding";
import { getCompleteAxisColumnIndexes } from "./core/axisColumns.js?v=20260925-institution-id";
import { unescapeHierarchySegment } from "./core/hierarchyPath.js?v=20260921-hierarchy-gt-escape";
import { EXPLORER_TEMPLATE_LABELS } from "./explorerTemplateNames.js?v=20260929-template-names";

export function getExplorerTemplateDescription(tableId) {
  return EXPLORER_TEMPLATE_LABELS[tableId] ?? "";
}

export function getExplorerTemplateLabel(tableId) {
  const description = getExplorerTemplateDescription(tableId);
  return description ? `${tableId} - ${description}` : tableId;
}

// Some templates have so many y-axis rows (a table reused for several
// unrelated counterparty/memorandum blocks) that a single view used to be
// too heavy to render. Now that the Explorer tree only builds DOM rows for
// expanded branches (see the visible-rows filter in renderExplorerTable),
// that's no longer needed - kept empty as the mechanism for a future table
// that would still warrant splitting. Splitting keeps the real, single
// table_id used for every actual data lookup - only the y-axis reference
// points shown are scoped to a section-specific id in
// ITS_all_dimension_mapping.csv (e.g. "C_75.01#central-bank"). See
// `id` (selection identity, also the y-axis config lookup key) vs
// `tableId` (the real table_id data rows are matched against).
export const EXPLORER_TEMPLATE_ROW_SECTIONS = {};

// KRI's dictionary lists every known indicator across every institution -
// unlike every other template, one particular dataset only ever covers a
// small subset of them. Unlike the general "stay selectable even without
// data" stability rule (see getPreferredExplorerAxisCodes), KRI's row axis
// is restricted to codes actually present in the loaded dataset instead -
// the full dictionary would otherwise bury the handful that matter under
// thousands of rows with no data at all.
const EXPLORER_DATA_ONLY_ROW_TABLE_IDS = new Set(["KRI"]);

export function isExplorerDataOnlyRowTemplate(tableId) {
  return EXPLORER_DATA_ONLY_ROW_TABLE_IDS.has(tableId);
}

export function getExplorerTemplates(state) {
  const tableIds = getExplorerTableIds(state);

  return tableIds.flatMap((tableId) => {
    const description = getExplorerTemplateDescription(tableId);
    const label = getExplorerTemplateLabel(tableId);
    const sections = EXPLORER_TEMPLATE_ROW_SECTIONS[tableId];
    if (!sections) return [{ description, id: tableId, label, tableId }];

    return sections.map((section) => ({
      description: section.label,
      id: section.id,
      label: `${label} — ${section.label}`,
      tableId
    }));
  });
}

export function getExplorerTableIds(state) {
  if (!state) return [];

  const indexedTableIds = getAllIndexedTableIds(state);
  if (indexedTableIds.length > 0 || state.dataIndexes) return indexedTableIds;

  const indexes = getCompleteAxisColumnIndexes(state.columns);
  if (!indexes) return [];

  return [...new Set(state.rows
    .map((row) => row[indexes.tableId])
    .filter(Boolean))]
    .sort((left, right) => left.localeCompare(right, "fr", { numeric: true }));
}

// Sentinel z-code standing for "ignore the z-axis filter, aggregate across
// every value" - offered first on any table whose z-axis is a currency
// breakdown (see explorerTableHasCurrencyZAxis). Not a real point, so it's
// injected here and in buildExplorerAxisSeries rather than added to the
// CSV reference.
export const EXPLORER_ALL_CURRENCIES_CODE = "__ALL__";
export const EXPLORER_ALL_CURRENCIES_LABEL = "All currencies";

// EUR is present on every currency z-axis breakdown in the reference
// config, so its presence is a reliable signal without hand-maintaining a
// list of table_ids - any newly-added currency table picks this up for
// free.
export function explorerTableHasCurrencyZAxis(state, tableId) {
  return getConfiguredExplorerAxisCodes(state, tableId, "z").includes("EUR");
}

// Some tables (e.g. C_66.01) already have their own native z-axis point
// for "all currencies" (an actual code/description pair in the dimension
// mapping) - synthesizing the __ALL__ sentinel on top of that would offer
// the user two different ways to ask for the same thing. Match both "All"
// and "Total" because source labels vary between frameworks.
function explorerTableHasNativeAllCurrencyPoint(state, tableId) {
  return (state.explorerPoints ?? []).some((point) => (
    point.tableId === tableId
    && point.coordinate === "z_axis_rc_code"
    && /\b(?:all|total)\s*currenc/i.test(`${point.code} ${point.description}`)
  ));
}

// Funding Plan currency tables are reported and reviewed currency by
// currency. Other regulatory families keep their synthetic aggregate,
// unless the table already has a native "all currencies" point of its own.
export function explorerTableOffersAllCurrencies(state, tableId) {
  return !String(tableId ?? "").startsWith("P_")
    && explorerTableHasCurrencyZAxis(state, tableId)
    && !explorerTableHasNativeAllCurrencyPoint(state, tableId);
}

export function getExplorerAxisOptions(state, tableId, yConfigTableId = tableId) {
  const templates = getExplorerTemplates(state);
  const configuredXCodes = getConfiguredExplorerAxisCodes(state, tableId, "x");
  const configuredYCodes = getConfiguredExplorerAxisCodes(state, yConfigTableId, "y");
  const configuredZCodes = getConfiguredExplorerAxisCodes(state, tableId, "z");
  const availableXCodes = getAvailableExplorerAxisCodes(state, tableId, "x");
  const availableYCodes = getAvailableExplorerAxisCodes(state, tableId, "y");
  const availableZCodes = getAvailableExplorerAxisCodes(state, tableId, "z");
  const configuredYCodeSet = new Set(configuredYCodes);
  const availableYCodeSet = new Set(availableYCodes);
  const xCodes = getPreferredExplorerAxisCodes(configuredXCodes, availableXCodes);
  const yCodes = isExplorerDataOnlyRowTemplate(yConfigTableId)
    ? [
        ...configuredYCodes.filter((code) => availableYCodeSet.has(code)),
        ...availableYCodes.filter((code) => !configuredYCodeSet.has(code))
      ]
    : getPreferredExplorerAxisCodes(configuredYCodes, availableYCodes);
  const preferredZCodes = getPreferredExplorerAxisCodes(configuredZCodes, availableZCodes);
  const zCodes = preferredZCodes.length > 0 && explorerTableOffersAllCurrencies(state, tableId)
    ? [EXPLORER_ALL_CURRENCIES_CODE, ...preferredZCodes]
    : preferredZCodes;

  return {
    template: {
      codes: templates.map((template) => template.id),
      isVisible: templates.length > 1
    },
    x: {
      codes: xCodes,
      isVisible: xCodes.length > 0
    },
    y: {
      codes: yCodes,
      isVisible: yCodes.length > 0
    },
    z: {
      codes: zCodes,
      isVisible: zCodes.length > 0
    }
  };
}

// A code that is part of the reference configuration always stays
// selectable, even when the current dataset has no data for it anywhere
// (e.g. a currency no institution reported): the configured list is the
// source of truth. Data-derived codes are only used as a fallback for
// axes with no static configuration at all.
export function getPreferredExplorerAxisCodes(configuredCodes, availableCodes) {
  return configuredCodes.length > 0 ? configuredCodes : availableCodes;
}

export function getVisibleExplorerAxes(axisOptions) {
  return ["y", "x", "z"].filter((axis) => axisOptions[axis]?.isVisible);
}

export function hasExplorerSelectedCombination(rows, columns, context) {
  const indexes = getCompleteAxisColumnIndexes(columns);
  if (!indexes) return true;

  // "All Currency" never appears as a literal z_axis_rc_code value in the
  // data - it means "any currency", so treat it like no z filter at all.
  const selectedZCode = context.selectedZCode === EXPLORER_ALL_CURRENCIES_CODE ? "" : context.selectedZCode;

  return rows.some((row) => (
    (!context.selectedXCode || normalizeAxisCode(row[indexes.xAxisRcCode], "x") === context.selectedXCode)
    && (!context.selectedYCode || normalizeAxisCode(row[indexes.yAxisRcCode], "y") === context.selectedYCode)
    && (!selectedZCode || normalizeAxisCode(row[indexes.zAxisRcCode], "z") === selectedZCode)
  ));
}

export function getExplorerRowsForTemplate(state, tableId) {
  const indexedRows = getIndexedRowsByTableJst(state, tableId);
  if (indexedRows.length > 0 || state.dataIndexes) return indexedRows;

  const indexes = getCompleteAxisColumnIndexes(state.columns);
  if (!indexes || !state.selectedJst) return [];

  return state.rows.filter((row) => (
    row[indexes.jstCode] === state.selectedJst
    && row[indexes.tableId] === tableId
  ));
}

export function getConfiguredExplorerAxisCodes(state, tableId, axis) {
  return (state.explorerPoints ?? [])
    .filter((point) => (
      point.tableId === tableId
      && point.coordinate === `${axis}_axis_rc_code`
    ))
    .map((point) => point.code)
    .filter(Boolean);
}

export function getAvailableExplorerAxisCodes(state, tableId, axis) {
  const indexedCodes = getIndexedAxisCodesAnyJst(state, tableId, axis);
  if (indexedCodes.length > 0 || state.dataIndexes) return indexedCodes;

  const columnName = `${axis}_axis_rc_code`;
  const indexes = {
    tableId: state.columns.indexOf("table_id"),
    axisCode: state.columns.indexOf(columnName)
  };

  if (Object.values(indexes).some((index) => index === -1)) return [];

  return [...new Set(state.rows
    .filter((row) => row[indexes.tableId] === tableId)
    .map((row) => normalizeAxisCode(row[indexes.axisCode], axis))
    .filter(Boolean))]
    .sort((left, right) => left.localeCompare(right, "fr"));
}

export function isExplorerContributionChild(path, contributionBase, pointCode = "") {
  if (!contributionBase?.path) return false;
  if (contributionBase.scope === "selection") {
    return Boolean(contributionBase.numeratorCode)
      && String(pointCode ?? "") === String(contributionBase.numeratorCode);
  }
  if (contributionBase.type === "common") return true;
  return path.startsWith(`${contributionBase.path} > `);
}

export function getExplorerContributionRatio(value, baseValue) {
  if (value === null || baseValue === null || baseValue === 0) return null;
  return value / baseValue;
}

export function getSelectedExplorerCodeForAxis(context, axis) {
  if (axis === "x") return context.selectedXCode;
  if (axis === "z") return context.selectedZCode;
  return context.selectedYCode;
}

export function normalizeHierarchyPath(path) {
  return String(path ?? "").trim().toLocaleLowerCase("fr-FR");
}

export function splitHierarchyPath(path) {
  // parseDescriptionHierarchy already escaped every literal ">" it found
  // inside a segment before joining with " > " (see core/hierarchyPath.js) -
  // so any ">" still in the string here is genuinely a level separator, and
  // splitting on it plainly is safe. Restore the escaped ones once split
  // back into their own segment, for display or further "/"-based joins.
  return String(path ?? "")
    .split(">")
    .map((part) => unescapeHierarchySegment(part.trim()))
    .filter(Boolean);
}

export function getParentPaths(rows) {
  const parentPaths = new Set();

  rows.forEach((row) => {
    const parts = splitHierarchyPath(row.hierarchyPath);
    for (let index = 0; index < parts.length - 1; index += 1) {
      parentPaths.add(normalizeHierarchyPath(parts.slice(0, index + 1).join(" > ")));
    }
  });

  return parentPaths;
}

export function getExplicitPaths(rows) {
  return new Set(rows.map((row) => normalizeHierarchyPath(row.hierarchyPath)).filter(Boolean));
}

export function getHierarchyAncestorPaths(path) {
  const parts = splitHierarchyPath(path);
  const paths = [];

  for (let index = 0; index < parts.length - 1; index += 1) {
    paths.push(normalizeHierarchyPath(parts.slice(0, index + 1).join(" > ")));
  }

  return paths;
}

export function normalizeExplorerSeriesRow(seriesRow) {
  return {
    ...seriesRow,
    format: seriesRow.format || "",
    hierarchyPath: seriesRow.hierarchyPath || seriesRow.description || "",
    parentPath: seriesRow.parentPath || splitHierarchyPath(seriesRow.description).slice(0, -1).join(" > ")
  };
}

export function buildExplorerDisplayRows(rows) {
  const explicitPaths = getExplicitPaths(rows);
  const displayedPaths = new Set();
  const displayRows = [];

  rows.forEach((row) => {
    const parts = splitHierarchyPath(row.hierarchyPath);

    for (let index = 0; index < parts.length - 1; index += 1) {
      const path = parts.slice(0, index + 1).join(" > ");
      const normalizedPath = normalizeHierarchyPath(path);
      if (explicitPaths.has(normalizedPath) || displayedPaths.has(normalizedPath)) continue;

      displayedPaths.add(normalizedPath);
      displayRows.push(createVirtualExplorerRow(path, parts[index], index, row.values));
    }

    displayedPaths.add(normalizeHierarchyPath(row.hierarchyPath));
    displayRows.push(row);
  });

  return displayRows;
}

export function createVirtualExplorerRow(path, label, indentLevel, values) {
  return {
    code: `virtual:${normalizeHierarchyPath(path)}`,
    description: path,
    displayDescription: label,
    hierarchyPath: path,
    indentLevel,
    isVirtual: true,
    parentPath: splitHierarchyPath(path).slice(0, -1).join(" > "),
    values: values.map((point) => ({
      ...point,
      value: null
    }))
  };
}
