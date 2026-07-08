import { getIndexedAxisCodes, getIndexedRowsByTableJst, getIndexedTableIds } from "./dataIndex.js";
import { normalizeAxisCode } from "./core/axisCode.js";
import { getCompleteAxisColumnIndexes } from "./core/axisColumns.js";

const EXPLORER_TEMPLATE_LABELS = {

  // ------------------------------------------------------------------
  // COREP
  // ------------------------------------------------------------------

  "C_01.00": "Own funds",
  "C_02.00": "Total risk exposure amount",
  "C_03.00": "Capital ratios",
  "C_04.00": "Memorandum items",
  "C_05.01": "Transitional provisions",
  "C_05.02": "Transitional provisions - details",

  "C_07.00": "Credit risk - Standardised approach",

  "C_08.01": "Credit risk - IRB approach",
  "C_08.02": "IRB - Exposure classes",
  "C_08.03": "IRB - Risk parameters",
  "C_08.04": "IRB - Specialised lending",
  "C_08.05": "IRB - Equity exposures",
  "C_08.06": "IRB - Slotting approach",
  "C_08.07": "IRB - Expected loss",

  "C_09.01": "SA geographical distribution",
  "C_09.02": "IRB geographical distribution",

  "C_10.00": "Equity exposures",
  "C_10.01": "Equity exposures - IRB",

  "C_11.00": "Settlement / delivery risk",

  "C_13.01": "Securitisation positions",
  "C_14.00": "Securitisation - Standardised approach",
  "C_15.00": "Securitisation - IRB approach",

  "C_16.00": "Operational risk",
  "C_17.01": "Operational losses",
  "C_17.02": "Operational loss events",

  "C_18.00": "Market risk",
  "C_19.00": "Position risk",
  "C_20.00": "Foreign exchange risk",
  "C_21.00": "Commodity risk",
  "C_22.00": "Options risk",
  "C_23.00": "CVA risk",
  "C_24.00": "Market risk - Internal models",
  "C_25.00": "Market risk summary",

  "C_26.00": "Large exposures",
  "C_27.00": "Large exposures - Groups of connected clients",
  "C_28.00": "Large exposures - Top exposures",
  "C_29.00": "Large exposures - Breakdown",

  "C_32.01": "Prudent valuation",
  "C_32.02": "Prudent valuation - AVAs",
  "C_32.03": "Prudent valuation - Summary",
  "C_32.04": "Prudent valuation - Details",

  "C_33.00": "Exposures to central governments",

  "C_34.01": "Counterparty credit risk",
  "C_34.02": "CCR - Standardised approach",
  "C_34.03": "CCR - IMM",
  "C_34.04": "CCR - CVA",
  "C_34.05": "CCR - Securities financing transactions",
  "C_34.06": "CCR - Cleared transactions",
  "C_34.07": "CCR - Margining",
  "C_34.08": "CCR - Netting sets",
  "C_34.09": "CCR - Exposures",
  "C_34.10": "CCR - Risk measures",
  "C_34.11": "CCR - Summary",

  "C_35.01": "Non-performing exposures (LC1)",
  "C_35.02": "Non-performing exposures (LC2)",
  "C_35.03": "Non-performing exposures (LC3)",

  "C_40.00": "Leverage ratio",

  "C_43.00": "Leverage ratio - Exposure measure",
  "C_44.00": "Leverage ratio - Breakdown",
  "C_45.00": "Leverage ratio - SFT",
  "C_46.00": "Leverage ratio - Derivatives",
  "C_47.00": "Leverage ratio - Off-balance sheet",
  "C_48.00": "Leverage ratio - Additional disclosures",

  "C_66.00": "Liquidity coverage ratio",
  "C_67.00": "LCR - Outflows",
  "C_68.00": "LCR - Inflows",
  "C_69.00": "LCR - Summary",
  "C_70.00": "LCR - Additional items",
  "C_71.00": "LCR - Currency breakdown",
  "C_72.00": "LCR - Concentration",
  "C_73.00": "LCR - Operational deposits",
  "C_74.00": "LCR - Secured lending",
  "C_75.00": "LCR - Collateral swaps",
  "C_76.00": "LCR - Liquidity buffer",
  "C_77.00": "LCR - Monitoring metrics",

  "C_80.00": "Net Stable Funding Ratio",
  "C_81.00": "Available Stable Funding",
  "C_82.00": "Required Stable Funding",
  "C_83.00": "NSFR - Additional information",
  "C_84.00": "NSFR summary",

  "C_90.00": "Threshold-based treatment",
  "C_91.00": "Alternative Standardised Approach",

  // ------------------------------------------------------------------
  // FINREP
  // ------------------------------------------------------------------

  "F_01.01": "Balance sheet - Assets",
  "F_01.02": "Balance sheet - Liabilities",
  "F_01.03": "Balance sheet - Equity",

  "F_02.00": "Statement of profit or loss",
  "F_03.00": "Statement of comprehensive income",

  "F_04.01": "Financial assets by instrument",
  "F_04.02": "Loans and advances",
  "F_04.03": "Debt securities",
  "F_04.04.1": "Financial assets at amortised cost",
  "F_04.04.2": "Impairment movements",
  "F_04.05": "Collateral and guarantees",
  "F_04.06": "Financial assets - Additional breakdown",
  "F_04.07": "Purchased or originated credit-impaired assets",
  "F_04.08": "Forborne exposures",
  "F_04.09": "Non-performing exposures",
  "F_04.10": "Financial assets - Summary",

  "F_05.01": "Loans and advances by product",

  "F_06.01": "Loans by NACE activity",

  "F_07.01": "Past-due exposures",
  "F_07.02": "Past-due exposures - Details",

  "F_08.01": "Financial liabilities",
  "F_08.02": "Financial liabilities - Details",

  "F_09.01": "Loan commitments",
  "F_09.02": "Financial guarantees",

  "F_10.00": "Derivatives",
  "F_11.01": "Hedge accounting",
  "F_11.02": "Hedging instruments",
  "F_11.03": "Hedged items",
  "F_11.04": "Hedge effectiveness",

  "F_12.00": "Movements in loss allowances",
  "F_12.01": "Stage transfers",
  "F_12.02": "Changes in gross carrying amount",

  "F_13.01": "Collateral and guarantees received",
  "F_13.02": "Collateral by type",
  "F_13.03": "Guarantees received",

  "F_14.00": "Fair value hierarchy",

  "F_15.00": "Derecognition and continuing involvement",
  "F_16.00": "Transferred financial assets",

  "F_17.01": "Reconciliation IFRS / CRR",
  "F_17.02": "Reconciliation of provisions",
  "F_17.03": "Reconciliation details",

  "F_18.00": "Performing and non-performing exposures",
  "F_18.01": "Performing / non-performing by instrument",
  "F_18.02": "Loans secured by immovable property",

  "F_19.00": "Forborne exposures",

  "F_20.01": "Geographical distribution by residence",
  "F_20.02": "Geographical distribution by location",
  "F_20.03": "Country breakdown",
  "F_20.04": "Geographical analysis",

  "F_21.00": "Leases",

  "F_22.00": "Fee and commission income",

  "F_23.01": "Number of instruments",
  "F_23.02": "Number of collateral items",
  "F_23.03": "Number of guarantees",

  "F_24.01": "Loan origination",
  "F_24.02": "Loan servicing",

  "F_25.01": "Collateral obtained",
  "F_25.02": "Collateral by asset type",
  "F_25.03": "Foreclosed assets",

  "F_41.00": "Fair value hierarchy",
  "F_42.00": "Financial guarantees received",
  "F_43.00": "Provisions",
  "F_44.00": "Commitments",
  "F_45.00": "Equity instruments",
  "F_46.00": "Statement of changes in equity",

  "F_47.00": "Average duration and recoveries"

};

export function getExplorerTemplateLabel(tableId) {
  const description = EXPLORER_TEMPLATE_LABELS[tableId];
  return description ? `${tableId} - ${description}` : tableId;
}

export function getExplorerTemplates(state) {
  const tableIds = getExplorerTableIds(state);

  return tableIds.map((tableId) => ({
    tableId,
    label: getExplorerTemplateLabel(tableId)
  }));
}

export function getExplorerTableIds(state) {
  if (!state) return [];

  const indexedTableIds = getIndexedTableIds(state);
  if (indexedTableIds.length > 0 || state.dataIndexes) return indexedTableIds;

  const indexes = getCompleteAxisColumnIndexes(state.columns);
  if (!indexes || !state.selectedJst) return [];

  return [...new Set(state.rows
    .filter((row) => row[indexes.jstCode] === state.selectedJst)
    .map((row) => row[indexes.tableId])
    .filter(Boolean))]
    .sort((left, right) => left.localeCompare(right, "fr", { numeric: true }));
}

export function getExplorerAxisOptions(state, tableId) {
  const templates = getExplorerTemplates(state);
  const configuredYCodes = getConfiguredExplorerAxisCodes(state, tableId, "y");
  const configuredZCodes = getConfiguredExplorerAxisCodes(state, tableId, "z");
  const availableXCodes = getAvailableExplorerAxisCodes(state, tableId, "x");
  const availableYCodes = getAvailableExplorerAxisCodes(state, tableId, "y");
  const availableZCodes = getAvailableExplorerAxisCodes(state, tableId, "z");
  const yCodes = getPreferredExplorerAxisCodes(configuredYCodes, availableYCodes);
  const zCodes = getPreferredExplorerAxisCodes(configuredZCodes, availableZCodes);

  return {
    template: {
      codes: templates.map((template) => template.tableId),
      isVisible: templates.length > 1
    },
    x: {
      codes: availableXCodes,
      isVisible: availableXCodes.length > 1
    },
    y: {
      codes: yCodes,
      isVisible: yCodes.length > 1
    },
    z: {
      codes: zCodes,
      isVisible: zCodes.length > 1
    }
  };
}

export function getPreferredExplorerAxisCodes(configuredCodes, availableCodes) {
  if (configuredCodes.length === 0) return [];
  if (availableCodes.length === 0) return configuredCodes;

  const availableCodeSet = new Set(availableCodes);
  const matchingCodes = configuredCodes.filter((code) => availableCodeSet.has(code));

  return matchingCodes.length > 0 ? matchingCodes : availableCodes;
}

export function getVisibleExplorerAxes(axisOptions) {
  return ["template", "y", "x", "z"].filter((axis) => axisOptions[axis]?.isVisible);
}

export function hasExplorerSelectedCombination(rows, columns, context) {
  const indexes = getCompleteAxisColumnIndexes(columns);
  if (!indexes) return true;

  return rows.some((row) => (
    (!context.selectedXCode || normalizeAxisCode(row[indexes.xAxisRcCode], "x") === context.selectedXCode)
    && (!context.selectedYCode || normalizeAxisCode(row[indexes.yAxisRcCode], "y") === context.selectedYCode)
    && (!context.selectedZCode || normalizeAxisCode(row[indexes.zAxisRcCode], "z") === context.selectedZCode)
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
  const indexedCodes = getIndexedAxisCodes(state, tableId, axis);
  if (indexedCodes.length > 0 || state.dataIndexes) return indexedCodes;

  const columnName = `${axis}_axis_rc_code`;
  const indexes = {
    jstCode: state.columns.indexOf("jst_code"),
    tableId: state.columns.indexOf("table_id"),
    axisCode: state.columns.indexOf(columnName)
  };

  if (Object.values(indexes).some((index) => index === -1) || !state.selectedJst) return [];

  return [...new Set(state.rows
    .filter((row) => (
      row[indexes.jstCode] === state.selectedJst
      && row[indexes.tableId] === tableId
    ))
    .map((row) => normalizeAxisCode(row[indexes.axisCode], axis))
    .filter(Boolean))]
    .sort((left, right) => left.localeCompare(right, "fr"));
}

export function isExplorerContributionChild(path, contributionBase) {
  if (!contributionBase?.path) return false;
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
  return String(path ?? "")
    .split(">")
    .map((part) => part.trim())
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
