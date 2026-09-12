import { getIndexedAxisCodes, getIndexedRowsByTableJst, getIndexedTableIds } from "./dataIndex.js?v=20260804-lazy-index";
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

  "F_01.01": "Balance sheet statement: assets",
  "F_01.02": "Balance sheet statement: liabilities",
  "F_01.03": "Balance sheet statement: equity",
  "F_02.00": "Statement of profit or loss",
  "F_03.00": "Statement of comprehensive income",

  "F_04.01": "Financial assets held for trading by instrument and counterparty sector",
  "F_04.02.1": "Non-trading financial assets mandatorily at fair value through profit or loss by instrument and counterparty sector",
  "F_04.02.2": "Financial assets designated at fair value through profit or loss by instrument and counterparty sector",
  "F_04.03.1": "Financial assets at fair value through other comprehensive income by instrument and counterparty sector",
  "F_04.04.1": "Financial assets at amortised cost by instrument and counterparty sector",
  "F_04.05": "Subordinated financial assets",
  "F_04.06": "Trading financial assets by instrument and counterparty sector (national GAAP)",
  "F_04.07": "Non-trading non-derivative financial assets at fair value through profit or loss by instrument and counterparty sector (national GAAP)",
  "F_04.08": "Non-trading non-derivative financial assets at fair value through equity by instrument and counterparty sector (national GAAP)",
  "F_04.09": "Non-trading non-derivative financial assets measured using a cost-based method by instrument and counterparty sector (national GAAP)",
  "F_04.10": "Other non-trading non-derivative financial assets by instrument and counterparty sector (national GAAP)",

  "F_05.01": "Loans and advances other than held for trading, trading or held for sale, by product",
  "F_06.01": "Loans and advances to non-financial corporations by NACE code",
  "F_07.01": "Financial assets subject to impairment that are past due",
  "F_07.02": "Financial assets subject to impairment that are past due (national GAAP)",
  "F_08.01": "Financial liabilities by product and counterparty sector",
  "F_08.02": "Subordinated financial liabilities",

  "F_09.01": "Off-balance-sheet exposures given (national GAAP)",
  "F_09.01.1": "Loan commitments, financial guarantees and other commitments given",
  "F_09.02": "Loan commitments, financial guarantees and other commitments received",
  "F_10.00": "Derivatives — trading and economic hedges",

  "F_11.01": "Hedge-accounting derivatives by type of risk and type of hedge",
  "F_11.02": "Hedge-accounting derivatives by type of risk (national GAAP)",
  "F_11.03": "Non-derivative hedging instruments by accounting portfolio and type of hedge",
  "F_11.03.1": "Non-derivative hedging instruments by accounting portfolio (national GAAP)",
  "F_11.04": "Hedged items in fair value hedges",

  "F_12.00": "Movements in credit-loss allowances and impairment of equity instruments (national GAAP)",
  "F_12.01": "Movements in allowances and provisions for credit losses",
  "F_12.02": "Transfers between impairment stages (gross-basis presentation)",

  "F_13.01": "Collateral and guarantees received for loans and advances other than held for trading",
  "F_13.02.1": "Collateral obtained by taking possession during the period and held at the reference date",
  "F_13.03.1": "Collateral obtained by taking possession — accumulated",
  "F_14.00": "Fair value hierarchy for financial instruments at fair value",
  "F_15.00": "Derecognition and financial liabilities associated with transferred financial assets",

  "F_16.01": "Interest income and expenses by instrument and counterparty sector",
  "F_16.02": "Gains or losses on derecognition of financial assets and liabilities not measured at fair value through profit or loss, by instrument",
  "F_16.03": "Gains or losses on held-for-trading and trading financial assets and liabilities, by instrument",
  "F_16.04": "Gains or losses on held-for-trading and trading financial assets and liabilities, by risk",
  "F_16.04.1": "Gains or losses on non-trading financial assets mandatorily at fair value through profit or loss, by instrument",
  "F_16.05": "Gains or losses on financial assets and liabilities designated at fair value through profit or loss, by instrument",
  "F_16.06": "Gains or losses from hedge accounting",
  "F_16.07": "Impairment on non-financial assets",
  "F_16.08": "Other administrative expenses",

  "F_17.01": "Reconciliation between accounting and CRR scopes of consolidation: assets",
  "F_17.02": "Reconciliation between accounting and CRR scopes of consolidation: off-balance-sheet exposures given",
  "F_17.03": "Reconciliation between accounting and CRR scopes of consolidation: liabilities",
  "F_18.00": "Information on performing and non-performing exposures",
  "F_18.01": "Inflows and outflows of non-performing loans and advances by counterparty sector",
  "F_18.02": "Commercial real-estate loans and additional information on loans secured by immovable property",
  "F_19.00": "Forborne exposures",

  "F_20.01": "Geographical breakdown of assets by location of activities",
  "F_20.02": "Geographical breakdown of liabilities by location of activities",
  "F_20.03": "Geographical breakdown of main profit-or-loss items by location of activities",
  "F_20.04": "Geographical breakdown of assets by counterparty residence",
  "F_20.05": "Geographical breakdown of off-balance-sheet exposures by counterparty residence",
  "F_20.06": "Geographical breakdown of liabilities by counterparty residence",
  "F_20.07.1": "Loans and advances to non-financial corporations by NACE code and counterparty residence",
  "F_21.00": "Tangible and intangible assets subject to operating leases",

  "F_22.01": "Fee and commission income and expenses by activity",
  "F_22.02": "Assets involved in services provided",
  "F_23.01": "Loans and advances: number of instruments",
  "F_23.02": "Loans and advances: additional information on gross carrying amounts",
  "F_23.03": "Loans and advances collateralised by immovable property by loan-to-value ratio",
  "F_23.04": "Loans and advances: accumulated impairments and fair-value losses due to credit risk",
  "F_23.05": "Loans and advances: collateral and financial guarantees received",
  "F_23.06": "Loans and advances: accumulated partial write-offs",

  "F_24.01": "Inflows and outflows of non-performing loans and advances",
  "F_24.02": "Impairment flows and fair-value losses on non-performing loans and advances",
  "F_24.03": "Inflows of write-offs of non-performing loans and advances",
  "F_25.01": "Possessed collateral other than property, plant and equipment: inflows and outflows",
  "F_25.02": "Possessed collateral other than property, plant and equipment: type of collateral",
  "F_25.03": "Possessed collateral classified as property, plant and equipment",
  "F_26.00": "Forbearance management and quality of forbearance",

  "F_30.01": "Interests in unconsolidated structured entities",
  "F_30.02": "Interests in unconsolidated structured entities by nature of activity",
  "F_31.01": "Related parties: amounts payable and receivable",
  "F_31.02": "Related parties: expenses and income from transactions",

  // Asset-encumbrance templates retain the EBA F-prefix but are not FINREP
  // financial-statement templates. Their official AE scope is made explicit.
  "F_32.01": "Asset encumbrance — assets of the reporting institution",
  "F_32.02": "Asset encumbrance — collateral received",
  "F_32.03": "Asset encumbrance — own covered bonds and securitisations issued and not yet pledged",
  "F_32.04": "Asset encumbrance — sources of encumbrance",
  "F_33.00": "Asset encumbrance — maturity data",
  "F_34.00": "Asset encumbrance — contingent encumbrance",
  "F_35.00": "Asset encumbrance — covered-bond issuance",
  "F_36.01": "Asset encumbrance — advanced data, Part I",
  "F_36.02": "Asset encumbrance — advanced data, Part II",

  "F_40.01": "Group structure — entity by entity",
  "F_40.02": "Group structure — instrument by instrument",
  "F_41.01": "Fair value hierarchy for financial instruments at amortised cost",
  "F_41.02": "Use of the fair value option",
  "F_42.00": "Tangible and intangible assets by measurement method",
  "F_43.00": "Provisions",
  "F_44.01": "Components of net defined-benefit-plan assets and liabilities",
  "F_44.02": "Movements in defined-benefit-plan obligations",
  "F_44.03": "Staff expenses by type of benefit",
  "F_44.04": "Staff expenses by staff structure and category",
  "F_45.01": "Gains or losses on financial assets and liabilities designated at fair value through profit or loss, by accounting portfolio",
  "F_45.02": "Gains or losses on derecognition of non-financial assets and investments",
  "F_45.03": "Other operating income and expenses",
  "F_46.00": "Statement of changes in equity",
  "F_47.00": "Average duration and recovery periods"

};

export function getExplorerTemplateDescription(tableId) {
  return EXPLORER_TEMPLATE_LABELS[tableId] ?? "";
}

export function getExplorerTemplateLabel(tableId) {
  const description = getExplorerTemplateDescription(tableId);
  return description ? `${tableId} - ${description}` : tableId;
}

export function getExplorerTemplates(state) {
  const tableIds = getExplorerTableIds(state);

  return tableIds.map((tableId) => ({
    description: getExplorerTemplateDescription(tableId),
    label: getExplorerTemplateLabel(tableId),
    tableId
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
      isVisible: availableXCodes.length > 0
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

export function getPreferredExplorerAxisCodes(configuredCodes, availableCodes) {
  if (configuredCodes.length === 0) return [];
  if (availableCodes.length === 0) return configuredCodes;

  const availableCodeSet = new Set(availableCodes);
  const matchingCodes = configuredCodes.filter((code) => availableCodeSet.has(code));

  return matchingCodes.length > 0 ? matchingCodes : availableCodes;
}

export function getVisibleExplorerAxes(axisOptions) {
  return ["y", "x", "z"].filter((axis) => axisOptions[axis]?.isVisible);
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
