import { getIndexedRowsByCoordinates } from "./dataIndex.js";
import { normalizeAxisCode } from "./core/axisCode.js";
import { getRequiredAxisColumnIndexes as getRequiredIndexes } from "./core/axisColumns.js";
import { formatBasisPointsValue, formatMetricValue, formatSignedMetricValue } from "./core/formatting.js?v=20260710-bp-format";
import { getReferenceColumns, parseNumericValue } from "./core/referenceColumns.js";

export const COST_OF_RISK_FILTER_ALL = "__all__";
export const COST_OF_RISK_TREEMAP_STAGE_OPTIONS = [
  { label: "Stage 1", value: "Stage 1" },
  { label: "Stage 2", value: "Stage 2" },
  { label: "Stage 3", value: "Stage 3" },
  { label: "POCI", value: "POCI" }
];
export const COST_OF_RISK_TREEMAP_COUNTERPARTIES = [
  { label: "Central banks", shortLabel: "CB", value: "Central banks" },
  { label: "Governments", shortLabel: "Gov", value: "General governments" },
  { label: "Credit institutions", shortLabel: "CI", value: "Credit institutions" },
  { label: "Other financials", shortLabel: "OFI", value: "Other financial corporations" },
  { label: "NFC", shortLabel: "NFC", value: "Non-financial corporations" },
  { label: "HH", shortLabel: "HH", value: "Households" }
];
const COST_OF_RISK_COUNTERPARTY_OTHER_GROUP = "Other";
const COST_OF_RISK_COUNTERPARTY_PRIORITY_GROUP = "Key counterparties";
const COST_OF_RISK_COUNTERPARTY_FILTER_OPTIONS = [
  { groupLabel: COST_OF_RISK_COUNTERPARTY_PRIORITY_GROUP, label: "NFC", shortLabel: "NFC", terminal: "Non-financial corporations", value: "Non-financial corporations" },
  { groupLabel: COST_OF_RISK_COUNTERPARTY_PRIORITY_GROUP, label: "o/w SMEs", parent: "Non-financial corporations", terminal: "Of which: small and medium-sized enterprises", value: "NFC_SMES" },
  { groupLabel: COST_OF_RISK_COUNTERPARTY_PRIORITY_GROUP, label: "o/w collat. CRE", parent: "Non-financial corporations", terminal: "Of which: loans collateralised by commercial immovable property", value: "NFC_CRE" },
  { groupLabel: COST_OF_RISK_COUNTERPARTY_PRIORITY_GROUP, label: "Households", shortLabel: "HH", terminal: "Households", value: "Households" },
  { groupLabel: COST_OF_RISK_COUNTERPARTY_PRIORITY_GROUP, label: "o/w credit for consumption", parent: "Households", terminal: "Of which: credit for consumption", value: "HH_CONSUMPTION" },
  { groupLabel: COST_OF_RISK_COUNTERPARTY_PRIORITY_GROUP, label: "o/w collat. RRE", parent: "Households", terminal: "Of which: loans collateralised by residential immovable property", value: "HH_RRE" },
  { groupLabel: COST_OF_RISK_COUNTERPARTY_OTHER_GROUP, label: "Central banks", shortLabel: "CB", terminal: "Central banks", value: "Central banks" },
  { groupLabel: COST_OF_RISK_COUNTERPARTY_OTHER_GROUP, label: "General governments", shortLabel: "Gov", terminal: "General governments", value: "General governments" },
  { groupLabel: COST_OF_RISK_COUNTERPARTY_OTHER_GROUP, label: "Credit institutions", shortLabel: "CI", terminal: "Credit institutions", value: "Credit institutions" },
  { groupLabel: COST_OF_RISK_COUNTERPARTY_OTHER_GROUP, label: "Other financial corporations", shortLabel: "OFI", terminal: "Other financial corporations", value: "Other financial corporations" }
];

export const COST_OF_RISK_TABLE_ID = "F_12.01";
export const COST_OF_RISK_STAGE_TRANSFER_TABLE_ID = "F_12.02";
const COST_OF_RISK_STAGE_BOX_TABLE_ID = "F_18.00";
// F_18.00 gross carrying amount, split by stage on the x-axis: stage 2 is
// reported as two separate rows (performing / non-performing) that must be
// summed to get the total stage 2 exposure.
const COST_OF_RISK_STAGE_BOX_X_CODES = {
  "1": ["56"],
  "2": ["57", "109"],
  "3": ["121"]
};
const COST_OF_RISK_STAGE_SUMMARY_ROWS = [
  { key: "all", label: "All", gcaXCodes: ["0010"], allowanceXCodes: ["0130"] },
  { key: "stage1", label: "Stage 1", gcaXCodes: ["0056"], allowanceXCodes: ["0141"] },
  { key: "stage2", label: "Stage 2", gcaXCodes: ["0057", "0109"], allowanceXCodes: ["0142", "0950"] },
  { key: "stage3", label: "Stage 3", gcaXCodes: ["0121"], allowanceXCodes: ["0951"] },
  { key: "poci", label: "POCI", gcaXCodes: ["0058", "0900"], allowanceXCodes: ["0143", "0952"] }
];
export const DEFAULT_COST_OF_RISK_STAGE_SUMMARY_CELL = "gca:level:all";
const COST_OF_RISK_ALLOWANCE_STAGE_X_CODES = {
  "": ["0130"],
  "POCI": ["0143", "0952"],
  "Stage 1": ["0141"],
  "Stage 2": ["0142", "0950"],
  "Stage 3": ["0951"]
};
const COST_OF_RISK_COUNTERPARTY_SUMMARY_ROWS = [
  { key: "all", label: "All", type: "row", value: COST_OF_RISK_FILTER_ALL },
  { key: "nfc", label: "NFC", type: "row", value: "Non-financial corporations" },
  { key: "nfc-smes", label: "SMEs", type: "row", value: "NFC_SMES" },
  { key: "nfc-cre", label: "collat. CRE", type: "row", value: "NFC_CRE" },
  { key: "households", label: "Households", type: "row", value: "Households" },
  { key: "hh-consumption", label: "credit for consumption", type: "row", value: "HH_CONSUMPTION" },
  { key: "hh-rre", label: "collat. RRE", type: "row", value: "HH_RRE" },
  { key: "other", label: "Other", type: "group" },
  { group: "other", key: "central-banks", label: "Central banks", type: "row", value: "Central banks" },
  { group: "other", key: "governments", label: "General governments", type: "row", value: "General governments" },
  { group: "other", key: "credit-institutions", label: "Credit institutions", type: "row", value: "Credit institutions" },
  { group: "other", key: "other-financials", label: "Other financial corporations", type: "row", value: "Other financial corporations" }
];
export const DEFAULT_COST_OF_RISK_COUNTERPARTY_SUMMARY_CELL = "gca:level:nfc";
const COST_OF_RISK_STAGE_BOX_DESCRIPTION_PREFIX = "Debt instruments other than held for trading";
const COST_OF_RISK_BALANCE_SHEET_ALLOWANCE_PREFIX = "Total allowance for debt instruments";
export const COST_OF_RISK_X_AXIS_CODE = "0020";
const COST_OF_RISK_F02_TABLE_ID = "F_02.00";
const COST_OF_RISK_F02_X_AXIS_CODE = "0010";
const COST_OF_RISK_F02_Y_AXIS_CODE = "0460";
const COST_OF_RISK_TOTAL_Y_AXIS_CODE = "0520";
export const COST_OF_RISK_WATERFALL_X_CODES = ["0020", "0030", "0040", "0050", "0070", "0080", "0090"];
export const COST_OF_RISK_F12_RECONCILIATION_X_CODES = ["0020", "0030", "0040", "0050", "0070", "0080", "0090", "0110", "0120", "0125"];
export const COST_OF_RISK_STAGE_TRANSFER_STAGE_OPTIONS = [
  { label: "Stage 1", value: "1" },
  { label: "Stage 2", value: "2" },
  { label: "Stage 3", value: "3" }
];
const COST_OF_RISK_STAGE_TRANSFER_FLOW_MOVEMENTS = [
  { code: "0010", from: "1", to: "2" },
  { code: "0020", from: "2", to: "1" },
  { code: "0030", from: "2", to: "3" },
  { code: "0040", from: "3", to: "2" },
  { code: "0050", from: "1", to: "3" },
  { code: "0060", from: "3", to: "1" }
];
const COST_OF_RISK_STAGE_TRANSFER_MOVEMENTS = {
  "1": [
    { code: "0010", sign: -1 },
    { code: "0020", sign: 1 },
    { code: "0050", sign: -1 },
    { code: "0060", sign: 1 }
  ],
  "2": [
    { code: "0010", sign: 1 },
    { code: "0020", sign: -1 },
    { code: "0030", sign: -1 },
    { code: "0040", sign: 1 }
  ],
  "3": [
    { code: "0030", sign: 1 },
    { code: "0040", sign: -1 },
    { code: "0050", sign: 1 },
    { code: "0060", sign: -1 }
  ]
};
const COST_OF_RISK_STAGE_TRANSFER_STAGE_LABELS = {
  "1": "Stage 1",
  "2": "Stage 2",
  "3": "Stage 3"
};
const COST_OF_RISK_WRITE_OFF_X_CODES = ["0080", "0120"];
const ALL_STAGES_LABEL = "all stages + POCI";
const CACHE_KEY_SEPARATOR = "\u001f";
const COST_OF_RISK_SERIES_CACHE = new WeakMap();

// The ratio denominator now follows the sidebar filters (Accounting type,
// Counterparty, Stage) instead of a fixed user-picked option: it is always
// the FINREP F_18.00 gross carrying amount for exactly the same
// asset/counterparty/stage perimeter currently selected, so the denominator
// always matches what the numerator is scoped to.
//
// Coordinates confirmed against assets/ITS_all_dimension_mapping.csv
// (raw codes; normalizeAxisCode() pads them to 4 digits). F_18.00 has no
// z-axis; x=0010 is the "Gross carrying amount" total column.
//
// Stage lives on the x-axis and is sometimes split across two columns:
// Stage 1 = x=0056 only; Stage 2 = x=0057 (performing) + x=0109
// (non-performing) - both labelled "instruments with significant increase
// in credit risk since initial recognition but not credit-impaired"; Stage
// 3 = x=0121 only; POCI = x=0058 (performing) + x=0900 (non-performing).
// "All stages" uses x=0010, the report's own total column.
const COST_OF_RISK_DENOMINATOR_STAGE_X_CODES = {
  "": ["0010"],
  "POCI": ["0058", "0900"],
  "Stage 1": ["0056"],
  "Stage 2": ["0057", "0109"],
  "Stage 3": ["0121"]
};

// "Cash balances at central banks and other demand deposits" - the only row
// in F_18.00 matching that concept, nested under the amortised-cost
// portfolio only, with no counterparty or asset-type breakdown. It must
// never be included in the denominator: whenever both Accounting type and
// Counterparty are left unrestricted, the y-axis selection below resolves
// to the single "Debt instruments other than held for trading" grand-total
// row (y=0330), which structurally does include cash - so that specific
// case (and only that case, since every other combination is scoped under
// the "Debt securities" or "Loans and advances" subtrees, which never
// contain cash) explicitly subtracts it back out.
const COST_OF_RISK_DENOMINATOR_CASH_Y_CODE = "0005";

// Resolves which F_18.00 coordinates make up the ratio denominator for the
// current sidebar filters: the y-axis selection reuses the same
// asset/counterparty aggregation already built for the stage-box feature
// (matches the terminal segment of each F_18.00 y-axis description against
// the asset name and/or counterparty name, aggregating across all three
// accounting portfolios automatically), and the x-axis selection maps the
// stage filter to its F_18.00 column(s).
function getCostOfRiskDenominatorComposition(state, filters = {}) {
  const normalized = normalizeCostOfRiskFilters(filters);
  const ySelection = getCostOfRiskStageAxisYSelection(state, filters, {
    descriptionPrefix: COST_OF_RISK_STAGE_BOX_DESCRIPTION_PREFIX,
    tableId: COST_OF_RISK_STAGE_BOX_TABLE_ID,
    totalLabel: COST_OF_RISK_STAGE_BOX_DESCRIPTION_PREFIX
  });
  const excludeCash = !normalized.asset && !normalized.counterparty;
  const xCodes = COST_OF_RISK_DENOMINATOR_STAGE_X_CODES[normalized.stage] ?? COST_OF_RISK_DENOMINATOR_STAGE_X_CODES[""];

  const labelParts = [excludeCash ? `${ySelection.label} (excl. cash at central banks)` : ySelection.label];
  if (normalized.stage) labelParts.push(normalized.stage);

  return {
    excludeCash,
    label: labelParts.join(" - "),
    xCodes,
    yCodes: ySelection.codes
  };
}

function getCostOfRiskStageTransferDenominatorFilters(filters = {}) {
  return {
    ...filters,
    stage: COST_OF_RISK_FILTER_ALL
  };
}

export const COST_OF_RISK_CONFIG = {
  numerator: {
    label: "Numerator",
    points: [
      {
        label: "Numerator point 1",
        sign: 1,
        xCode: "",
        yCode: "",
        zCode: ""
      },
      {
        label: "Numerator point 2",
        sign: 1,
        xCode: "",
        yCode: "",
        zCode: ""
      },
      {
        label: "Numerator point 3",
        sign: 1,
        xCode: "",
        yCode: "",
        zCode: ""
      }
    ],
    tableId: COST_OF_RISK_TABLE_ID
  }
};

const STAGE_LABELS = ["Stage 1", "Stage 2", "Stage 3", "Purchased or originated credit-impaired"];
const ASSET_LABELS = ["Debt securities", "Loans and advances"];
const COUNTERPARTY_LABELS = [
  "Central banks",
  "General governments",
  "Credit institutions",
  "Other financial corporations",
  "Non-financial corporations",
  "Households"
];
const ASSET_SHORT_LABELS = new Map([
  ["Debt securities", "Debt securities"],
  ["Loans and advances", "L&A"]
]);
const COUNTERPARTY_SHORT_LABELS = new Map([
  ["Central banks", "Central banks"],
  ["General governments", "Governments"],
  ["Credit institutions", "Credit institutions"],
  ["Other financial corporations", "Other financials"],
  ["Non-financial corporations", "NFC"],
  ["Households", "Households"]
]);
const STAGE_SHORT_LABELS = new Map([
  ["Stage 1", "Stage 1"],
  ["Stage 2", "Stage 2"],
  ["Stage 3", "Stage 3"],
  ["POCI", "POCI"],
  ["Purchased or originated credit-impaired", "POCI"]
]);

function formatCostOfRiskAllowanceMovementDisplayValue(value) {
  return Number.isFinite(value) ? -value : value;
}

export function getCostOfRiskSelectionOptions(state) {
  const descriptors = getCostOfRiskBalanceSheetAllowanceDescriptors(state);
  const aggregateOptions = buildCostOfRiskAggregateOptions(descriptors);
  const individualOptions = descriptors.map((descriptor) => ({
    groupLabel: getCostOfRiskOptionGroupLabel(descriptor, "individual"),
    id: `point:${descriptor.code}`,
    kind: "point",
    label: createCostOfRiskOptionLabel(descriptor),
    points: [descriptor.code]
  }));

  return [
    ...aggregateOptions,
    ...individualOptions
  ];
}

export function getCostOfRiskFilterOptions(state) {
  const descriptors = getCostOfRiskBalanceSheetAllowanceDescriptors(state);

  return {
    assets: createCostOfRiskFilterOptions(ASSET_LABELS, formatCostOfRiskAssetLabel),
    counterparties: createCostOfRiskCounterpartyFilterOptions(),
    stages: createCostOfRiskFilterOptions(getAvailableCostOfRiskStages(descriptors), formatCostOfRiskStageLabel)
  };
}

export function getCostOfRiskXAxisOptions(state) {
  const mappings = state.dimensionMapping?.list?.(COST_OF_RISK_TABLE_ID, "x_axis_rc_code") ?? [];
  return mappings
    .map((mapping) => ({
      code: mapping.code,
      label: mapping.description ? `${mapping.code} - ${mapping.description}` : mapping.code
    }))
    .filter(dedupeCostOfRiskAxisOptions)
    .sort((left, right) => left.code.localeCompare(right.code));
}

export function getCostOfRiskWaterfallXAxisOptions(state) {
  return getCostOfRiskXAxisOptionsForCodes(state, COST_OF_RISK_WATERFALL_X_CODES);
}

export function getCostOfRiskF12ReconciliationXAxisOptions(state) {
  return getCostOfRiskXAxisOptionsForCodes(state, COST_OF_RISK_F12_RECONCILIATION_X_CODES);
}

function getCostOfRiskXAxisOptionsForCodes(state, codes) {
  const xLabels = getCostOfRiskXAxisLabelMap(state);
  return codes.map((code) => ({
    code,
    label: xLabels.get(code) ?? code
  }));
}

export function buildCostOfRiskSelectionValue(state, selectionId, xAxisCode = COST_OF_RISK_X_AXIS_CODE, referenceDate = "", filters = {}) {
  const indexes = getRequiredIndexes(state.columns);
  const referenceColumns = getReferenceColumns(state.columns);
  const options = getCostOfRiskSelectionOptions(state);
  const selectedOption = options.find((option) => option.id === selectionId) ?? options[0] ?? null;
  const selectedXCode = normalizeAxisCode(xAxisCode || COST_OF_RISK_X_AXIS_CODE, "x");

  if (!state.dimensionMapping?.list) {
    return { status: "Internal dimension mapping is loading." };
  }

  if (!indexes || !state.selectedJst) {
    return { status: "Load a CSV and select a JST." };
  }

  if (referenceColumns.length === 0) {
    return { status: "No reference date was found in the CSV." };
  }

  if (!selectedOption) {
    return { status: "No F_12.01 Y-axis point is available in the internal mapping." };
  }

  const series = buildCostOfRiskSelectionSeries(state, indexes, referenceColumns, selectedOption, selectedXCode, state.selectedJst, filters);
  const referenceIndex = getCostOfRiskReferenceIndex(referenceColumns, referenceDate);
  const selectedPoint = series[referenceIndex];

  return {
    benchmarkSeries: buildCostOfRiskBenchmarkSeries(state, indexes, referenceColumns, selectedOption, selectedXCode, filters),
    denominator: selectedPoint?.denominator ?? null,
    denominatorLabel: getCostOfRiskDenominatorComposition(state, filters).label,
    option: selectedOption,
    ratioBasisPoints: selectedPoint?.ratioBasisPoints ?? null,
    referenceDate: selectedPoint?.label ?? "",
    series,
    value: selectedPoint?.value ?? null
  };
}

export function buildCostOfRiskFilteredSelectionValue(state, filters, xAxisCode = COST_OF_RISK_X_AXIS_CODE, referenceDate = "") {
  return buildCostOfRiskSelectionSnapshot(state, buildCostOfRiskSelectionFromFilters(state, filters), xAxisCode, referenceDate, filters);
}

export function buildCostOfRiskF02ImpairmentRatio(state, referenceDate = "", filters = {}) {
  const indexes = getRequiredIndexes(state.columns);
  const referenceColumns = getReferenceColumns(state.columns);

  if (!indexes || !state.selectedJst || referenceColumns.length === 0) {
    return { ratioBasisPoints: null, referenceDate: "", value: null };
  }

  const rawValueSeries = getPointSeriesValues(state, indexes, referenceColumns, COST_OF_RISK_F02_TABLE_ID, {
    xCode: COST_OF_RISK_F02_X_AXIS_CODE,
    yCode: COST_OF_RISK_F02_Y_AXIS_CODE,
    zCode: ""
  }, state.selectedJst);
  const quarterlyValueSeries = decumulateQuarterlySeries(referenceColumns, rawValueSeries);
  const denominatorSeries = getCostOfRiskRatioDenominatorSeries(state, indexes, referenceColumns, state.selectedJst, filters);
  const referenceIndex = getCostOfRiskReferenceIndex(referenceColumns, referenceDate);
  const value = formatCostOfRiskAllowanceMovementDisplayValue(quarterlyValueSeries[referenceIndex] ?? null);
  const denominator = getCostOfRiskMovementDenominator(denominatorSeries, referenceIndex);

  return {
    denominator,
    label: "F_02.00 y_axis 0460",
    ratioBasisPoints: denominator ? (value / denominator) * 10000 : null,
    referenceDate: referenceColumns[referenceIndex]?.label ?? "",
    value
  };
}

export function buildCostOfRiskF02ImpairmentSeries(state, filters = {}) {
  const indexes = getRequiredIndexes(state.columns);
  const referenceColumns = getReferenceColumns(state.columns);

  if (!indexes || !state.selectedJst || referenceColumns.length === 0) {
    return { points: [], status: "Load a CSV and select a JST." };
  }

  const rawValueSeries = getPointSeriesValues(state, indexes, referenceColumns, COST_OF_RISK_F02_TABLE_ID, {
    xCode: COST_OF_RISK_F02_X_AXIS_CODE,
    yCode: COST_OF_RISK_F02_Y_AXIS_CODE,
    zCode: ""
  }, state.selectedJst);
  const quarterlyValueSeries = decumulateQuarterlySeries(referenceColumns, rawValueSeries);
  const denominatorSeries = getCostOfRiskRatioDenominatorSeries(state, indexes, referenceColumns, state.selectedJst, filters);

  return {
    points: referenceColumns.map((referenceColumn, index) => {
      const value = quarterlyValueSeries[index] ?? null;
      const signedValue = Number.isFinite(value) ? -value : value;
      const denominator = getCostOfRiskMovementDenominator(denominatorSeries, index);

      return {
        date: referenceColumn.date,
        denominator,
        label: referenceColumn.label,
        ratioBasisPoints: denominator ? (signedValue / denominator) * 10000 : null,
        value: signedValue
      };
    }),
    status: ""
  };
}

export function buildCostOfRiskWaterfall(state, filters, referenceDate = "", selectedXCodes = COST_OF_RISK_WATERFALL_X_CODES) {
  const indexes = getRequiredIndexes(state.columns);
  const referenceColumns = getReferenceColumns(state.columns);
  const selectedOption = buildCostOfRiskSelectionFromFilters(state, filters);
  const selectedCodeSet = new Set((selectedXCodes ?? []).map((code) => normalizeAxisCode(code, "x")));

  if (!indexes || !state.selectedJst || referenceColumns.length === 0 || selectedOption.points.length === 0) {
    return { points: [], referenceDate: "" };
  }

  const denominatorSeries = getCostOfRiskRatioDenominatorSeries(state, indexes, referenceColumns, state.selectedJst, filters);
  const referenceIndex = getCostOfRiskReferenceIndex(referenceColumns, referenceDate);
  const denominator = getCostOfRiskMovementDenominator(denominatorSeries, referenceIndex) ?? 0;
  const xLabels = getCostOfRiskXAxisFullLabelMap(state);
  const points = COST_OF_RISK_WATERFALL_X_CODES.filter((xCode) => selectedCodeSet.has(xCode)).map((xCode) => {
    const rawValueSeries = createEmptySeries(referenceColumns.length);
    selectedOption.points.forEach((yCode) => {
      addSeriesValues(rawValueSeries, getPointSeriesValues(state, indexes, referenceColumns, COST_OF_RISK_TABLE_ID, {
        xCode,
        yCode,
        zCode: ""
      }, state.selectedJst));
    });
    const quarterlyValueSeries = decumulateQuarterlySeries(referenceColumns, rawValueSeries);
    const value = formatCostOfRiskAllowanceMovementDisplayValue(quarterlyValueSeries[referenceIndex] ?? 0);

    return {
      code: xCode,
      label: xLabels.get(xCode) ?? xCode,
      ratioBasisPoints: denominator ? (value / denominator) * 10000 : null,
      value
    };
  });

  return {
    denominator,
    points,
    referenceDate: referenceColumns[referenceIndex]?.label ?? ""
  };
}

export function buildCostOfRiskF12ContributionSeries(state, filters, selectedXCodes = COST_OF_RISK_F12_RECONCILIATION_X_CODES) {
  const indexes = getRequiredIndexes(state.columns);
  const referenceColumns = getReferenceColumns(state.columns);
  const selectedOption = buildCostOfRiskSelectionFromFilters(state, filters);
  const selectedCodeSet = new Set((selectedXCodes ?? []).map((code) => normalizeAxisCode(code, "x")));

  if (!indexes || !state.selectedJst || referenceColumns.length === 0 || selectedOption.points.length === 0 || selectedCodeSet.size === 0) {
    return { points: [], status: "Load a CSV and select a core definition." };
  }

  const rawValueSeries = createEmptySeries(referenceColumns.length);
  COST_OF_RISK_F12_RECONCILIATION_X_CODES.filter((xCode) => selectedCodeSet.has(xCode)).forEach((xCode) => {
    selectedOption.points.forEach((yCode) => {
      addSeriesValues(rawValueSeries, getPointSeriesValues(state, indexes, referenceColumns, COST_OF_RISK_TABLE_ID, {
        xCode,
        yCode,
        zCode: ""
      }, state.selectedJst));
    });
  });

  const quarterlyValueSeries = decumulateQuarterlySeries(referenceColumns, rawValueSeries);
  const denominatorSeries = getCostOfRiskRatioDenominatorSeries(state, indexes, referenceColumns, state.selectedJst, filters);

  return {
    points: referenceColumns.map((referenceColumn, index) => {
      const value = formatCostOfRiskAllowanceMovementDisplayValue(quarterlyValueSeries[index] ?? null);
      const denominator = getCostOfRiskMovementDenominator(denominatorSeries, index);

      return {
        date: referenceColumn.date,
        denominator,
        label: referenceColumn.label,
        ratioBasisPoints: denominator ? (value / denominator) * 10000 : null,
        value
      };
    }),
    status: ""
  };
}

export function buildCostOfRiskMovementContributionAudit(state, filters, xCode = COST_OF_RISK_X_AXIS_CODE) {
  const indexes = getRequiredIndexes(state.columns);
  const referenceColumns = getReferenceColumns(state.columns);
  const selectedOption = buildCostOfRiskSelectionFromFilters(state, filters);
  const normalizedXCode = normalizeAxisCode(xCode || COST_OF_RISK_X_AXIS_CODE, "x");

  if (!indexes || !state.selectedJst || referenceColumns.length === 0 || selectedOption.points.length === 0) {
    return { dates: [], rows: [], title: "Audit trail" };
  }

  const xLabel = getCostOfRiskXAxisFullLabelMap(state).get(normalizedXCode) ?? normalizedXCode;
  const selectedRows = buildCostOfRiskMovementAuditRowsForYCodes(
    state,
    indexes,
    referenceColumns,
    normalizedXCode,
    selectedOption.points,
    "Selected scope"
  );
  const selectedTotal = createEmptySeries(referenceColumns.length);
  selectedRows.forEach((row) => addSeriesValues(selectedTotal, row.values));

  const reconciliationYCodes = ["0010", "0180", "0360", "0600"];
  const totalRows = buildCostOfRiskMovementAuditRowsForYCodes(
    state,
    indexes,
    referenceColumns,
    normalizedXCode,
    [COST_OF_RISK_TOTAL_Y_AXIS_CODE],
    "Reconciliation"
  );
  const stageRows = buildCostOfRiskMovementAuditRowsForYCodes(
    state,
    indexes,
    referenceColumns,
    normalizedXCode,
    reconciliationYCodes,
    "Reconciliation"
  );
  const stageSum = createEmptySeries(referenceColumns.length);
  stageRows.forEach((row) => addSeriesValues(stageSum, row.values));
  const totalValues = totalRows[0]?.values ?? createEmptySeries(referenceColumns.length);
  const gapValues = totalValues.map((value, index) => value - (stageSum[index] ?? 0));

  return {
    dates: referenceColumns.map((column) => ({
      label: column.label,
      date: column.date
    })),
    rows: [
      {
        label: "Displayed contribution",
        section: "Selected scope",
        source: `${selectedOption.label} / x ${normalizedXCode}`,
        type: "amount",
        values: selectedTotal
      },
      ...selectedRows,
      ...totalRows,
      ...stageRows,
      {
        label: "Stage 1 + Stage 2 + Stage 3 + POCI",
        section: "Reconciliation",
        source: "F_12.01 / x selected / y 0010 + 0180 + 0360 + 0600",
        type: "amount",
        values: stageSum
      },
      {
        label: "Gap: total − stage sum",
        section: "Reconciliation",
        source: "y 0520 − (0010 + 0180 + 0360 + 0600)",
        type: "amount",
        values: gapValues
      }
    ],
    title: `${normalizedXCode} - ${xLabel}`
  };
}

function buildCostOfRiskMovementAuditRowsForYCodes(state, indexes, referenceColumns, xCode, yCodes, section) {
  return yCodes.map((yCode) => {
    const point = {
      xCode,
      yCode,
      zCode: ""
    };
    const rows = getCostOfRiskPointRows(state, indexes, COST_OF_RISK_TABLE_ID, point, state.selectedJst);
    const rawSeries = referenceColumns.map((column) => (
      rows.reduce((total, row) => total + parseNumericValue(row[column.index]), 0)
    ));
    const values = decumulateQuarterlySeries(referenceColumns, rawSeries)
      .map(formatCostOfRiskAllowanceMovementDisplayValue);
    const normalizedYCode = normalizeAxisCode(yCode, "y");
    const rowLabel = rows.length === 1 ? "1 row" : `${rows.length} rows`;

    return {
      label: getMappingDescription(state, COST_OF_RISK_TABLE_ID, "y_axis_rc_code", normalizedYCode),
      section,
      source: `${COST_OF_RISK_TABLE_ID} / x ${xCode} / y ${normalizedYCode} / ${rowLabel}`,
      type: "amount",
      values
    };
  });
}

export function buildCostOfRiskF2VsF12Audit(state, filters, selectedXCodes = COST_OF_RISK_F12_RECONCILIATION_X_CODES) {
  const indexes = getRequiredIndexes(state.columns);
  const referenceColumns = getReferenceColumns(state.columns);
  const selectedOption = buildCostOfRiskSelectionFromFilters(state, filters);
  const selectedCodeSet = new Set((selectedXCodes ?? []).map((code) => normalizeAxisCode(code, "x")));

  if (!indexes || !state.selectedJst || referenceColumns.length === 0 || selectedOption.points.length === 0) {
    return { dates: [], rows: [] };
  }

  const f2RawSeries = getPointSeriesValues(state, indexes, referenceColumns, COST_OF_RISK_F02_TABLE_ID, {
    xCode: COST_OF_RISK_F02_X_AXIS_CODE,
    yCode: COST_OF_RISK_F02_Y_AXIS_CODE,
    zCode: ""
  }, state.selectedJst);
  const f2QuarterlySeries = decumulateQuarterlySeries(referenceColumns, f2RawSeries);
  const denominatorSeries = getCostOfRiskRatioDenominatorSeries(state, indexes, referenceColumns, state.selectedJst, filters);
  const denominatorComposition = getCostOfRiskDenominatorComposition(state, filters);
  const denominatorRows = [
    ...denominatorComposition.xCodes.flatMap((xCode) => denominatorComposition.yCodes.map((yCode) => ({
      label: getMappingDescription(state, COST_OF_RISK_STAGE_BOX_TABLE_ID, "y_axis_rc_code", yCode),
      source: `${COST_OF_RISK_STAGE_BOX_TABLE_ID} / x ${xCode} / y ${yCode}`,
      type: "amount",
      values: resolveCostOfRiskDenominatorCellSeries(state, indexes, referenceColumns, state.selectedJst, xCode, yCode)
    }))),
    ...(denominatorComposition.excludeCash ? denominatorComposition.xCodes.map((xCode) => ({
      label: "− Cash balances at central banks and other demand deposits",
      source: `${COST_OF_RISK_STAGE_BOX_TABLE_ID} / x ${xCode} / y ${COST_OF_RISK_DENOMINATOR_CASH_Y_CODE}`,
      type: "amount",
      values: resolveCostOfRiskDenominatorCellSeries(state, indexes, referenceColumns, state.selectedJst, xCode, COST_OF_RISK_DENOMINATOR_CASH_Y_CODE)
    })) : [])
  ];
  const f2DisplaySeries = f2QuarterlySeries.map(formatCostOfRiskAllowanceMovementDisplayValue);
  const f2RatioSeries = referenceColumns.map((_, index) => {
    const denominator = getCostOfRiskMovementDenominator(denominatorSeries, index);
    return denominator ? (f2DisplaySeries[index] / denominator) * 10000 : null;
  });
  const xLabels = getCostOfRiskXAxisFullLabelMap(state);
  const selectedXList = COST_OF_RISK_F12_RECONCILIATION_X_CODES.filter((xCode) => selectedCodeSet.has(xCode));
  const f12Rows = selectedXList.map((xCode) => {
    const rawSeries = createEmptySeries(referenceColumns.length);
    selectedOption.points.forEach((yCode) => {
      addSeriesValues(rawSeries, getPointSeriesValues(state, indexes, referenceColumns, COST_OF_RISK_TABLE_ID, {
        xCode,
        yCode,
        zCode: ""
      }, state.selectedJst));
    });
    const quarterlyValues = decumulateQuarterlySeries(referenceColumns, rawSeries)
      .map(formatCostOfRiskAllowanceMovementDisplayValue);

    return {
      label: xLabels.get(xCode) ?? xCode,
      source: `${COST_OF_RISK_TABLE_ID} / x ${xCode} / selected Y scope`,
      type: "amount",
      values: quarterlyValues
    };
  });
  const f12TotalSeries = createEmptySeries(referenceColumns.length);
  f12Rows.forEach((row) => addSeriesValues(f12TotalSeries, row.values));
  const f12RatioSeries = referenceColumns.map((_, index) => {
    const denominator = getCostOfRiskMovementDenominator(denominatorSeries, index);
    return denominator ? (f12TotalSeries[index] / denominator) * 10000 : null;
  });

  return {
    dates: referenceColumns.map((column) => ({
      label: column.label,
      date: column.date
    })),
    rows: [
      {
        label: "F2 ratio",
        section: "F2",
        source: "F2 numerator / denominator",
        type: "bp",
        values: f2RatioSeries
      },
      {
        label: "F2 impairment numerator",
        section: "F2",
        source: `${COST_OF_RISK_F02_TABLE_ID} / x ${COST_OF_RISK_F02_X_AXIS_CODE} / y ${COST_OF_RISK_F02_Y_AXIS_CODE}`,
        type: "amount",
        values: f2DisplaySeries
      },
      {
        label: "F12 selected contribution ratio",
        section: "F12",
        source: "Selected F12 contributions / denominator",
        type: "bp",
        values: f12RatioSeries
      },
      {
        label: "F12 selected contribution total",
        section: "F12",
        source: `${COST_OF_RISK_TABLE_ID} / selected x / selected Y scope`,
        type: "amount",
        values: f12TotalSeries
      },
      ...f12Rows.map((row) => ({ ...row, section: "F12 components" })),
      {
        label: "Denominator total",
        section: "Denominator",
        source: denominatorComposition.label,
        type: "amount",
        values: denominatorSeries
      },
      ...denominatorRows.map((row) => ({ ...row, section: "Denominator components" }))
    ]
  };
}

export function buildCostOfRiskStageTransferWaterfall(state, stage = "3", referenceDate = "", filters = {}) {
  const indexes = getRequiredIndexes(state.columns);
  const referenceColumns = getReferenceColumns(state.columns);
  const selectedStage = COST_OF_RISK_STAGE_TRANSFER_MOVEMENTS[stage] ? stage : "3";
  const xLabels = getCostOfRiskStageTransferXAxisLabelMap(state);
  const ySelection = getCostOfRiskStageTransferYSelection(state, filters);
  const referenceIndex = getCostOfRiskReferenceIndex(referenceColumns, referenceDate);
  const selectedReference = referenceColumns[referenceIndex] ?? null;

  if (!indexes || !state.selectedJst || !selectedReference) {
    return {
      assetLabel: ySelection.label,
      points: [],
      referenceDate: "",
      stage: selectedStage,
      status: "No F_12.02 stage transfer data is available."
    };
  }

  if (ySelection.codes.length === 0) {
    return {
      assetLabel: ySelection.label,
      points: [],
      referenceDate: selectedReference.label,
      stage: selectedStage,
      status: "No matching F_12.02 Y-axis point is available for the selected filters."
    };
  }

  return {
    assetLabel: ySelection.label,
    globalVariation: buildCostOfRiskStageGlobalVariation(state, indexes, referenceColumns, filters, selectedStage, referenceIndex),
    points: COST_OF_RISK_STAGE_TRANSFER_MOVEMENTS[selectedStage].map((movement) => {
      const rawValue = ySelection.codes.reduce((total, yCode) => {
        const series = getPointSeriesValues(state, indexes, referenceColumns, COST_OF_RISK_STAGE_TRANSFER_TABLE_ID, {
          xCode: movement.code,
          yCode,
          zCode: ""
        }, state.selectedJst);
        const quarterlySeries = decumulateQuarterlySeries(referenceColumns, series);
        return total + (quarterlySeries[referenceIndex] ?? 0);
      }, 0);

      return {
        code: movement.code,
        label: xLabels.get(movement.code) ?? movement.code,
        rawValue,
        sign: movement.sign,
        value: rawValue * movement.sign
      };
    }),
    referenceDate: selectedReference.label,
    stage: selectedStage,
    status: ""
  };
}

export function buildCostOfRiskStageTransferFlowDiagram(state, referenceDate = "", filters = {}) {
  const indexes = getRequiredIndexes(state.columns);
  const referenceColumns = getReferenceColumns(state.columns);
  const xLabels = getCostOfRiskStageTransferXAxisLabelMap(state);
  const ySelection = getCostOfRiskStageTransferYSelection(state, filters);
  const referenceIndex = getCostOfRiskReferenceIndex(referenceColumns, referenceDate);
  const selectedReference = referenceColumns[referenceIndex] ?? null;

  if (!indexes || !state.selectedJst || !selectedReference) {
    return {
      assetLabel: ySelection.label,
      flows: [],
      ratioDenominator: null,
      referenceDate: "",
      residuals: [],
      stageBalances: [],
      status: "No F_12.02 stage transfer data is available.",
      writeOffs: []
    };
  }

  if (ySelection.codes.length === 0) {
    return {
      assetLabel: ySelection.label,
      flows: [],
      ratioDenominator: null,
      referenceDate: selectedReference.label,
      residuals: [],
      stageBalances: [],
      status: "No matching F_12.02 Y-axis point is available for the selected filters.",
      writeOffs: []
    };
  }

  const flowValues = new Map(COST_OF_RISK_STAGE_TRANSFER_FLOW_MOVEMENTS.map((movement) => {
    const value = ySelection.codes.reduce((total, yCode) => {
      const series = getPointSeriesValues(state, indexes, referenceColumns, COST_OF_RISK_STAGE_TRANSFER_TABLE_ID, {
        xCode: movement.code,
        yCode,
        zCode: ""
      }, state.selectedJst);
      const quarterlySeries = decumulateQuarterlySeries(referenceColumns, series);
      return total + (quarterlySeries[referenceIndex] ?? 0);
    }, 0);

    return [movement.code, value];
  }));

  const stageVariations = ["1", "2", "3"].map((stage) => (
    buildCostOfRiskStageGlobalVariation(state, indexes, referenceColumns, filters, stage, referenceIndex)
  ));
  const ratioDenominatorSeries = getCostOfRiskRatioDenominatorSeries(
    state,
    indexes,
    referenceColumns,
    state.selectedJst,
    getCostOfRiskStageTransferDenominatorFilters(filters)
  );
  const ratioDenominator = getCostOfRiskMovementDenominator(ratioDenominatorSeries, referenceIndex);
  const stageBalanceRatioDenominator = ratioDenominatorSeries[referenceIndex] ?? null;

  const netTransfersByStage = new Map([["1", 0], ["2", 0], ["3", 0]]);
  COST_OF_RISK_STAGE_TRANSFER_FLOW_MOVEMENTS.forEach((movement) => {
    const value = flowValues.get(movement.code) ?? 0;
    netTransfersByStage.set(movement.from, (netTransfersByStage.get(movement.from) ?? 0) - value);
    netTransfersByStage.set(movement.to, (netTransfersByStage.get(movement.to) ?? 0) + value);
  });

  const writeOffsByStage = buildCostOfRiskWriteOffByStage(state, indexes, referenceColumns, filters, referenceIndex);
  const writeOffMagnitudeByStage = new Map(writeOffsByStage.map((item) => [item.stage, item.magnitude]));

  return {
    assetLabel: ySelection.label,
    flows: COST_OF_RISK_STAGE_TRANSFER_FLOW_MOVEMENTS.map((movement) => ({
      ...movement,
      label: xLabels.get(movement.code) ?? movement.code,
      value: flowValues.get(movement.code) ?? null
    })),
    ratioDenominator,
    referenceDate: selectedReference.label,
    residuals: stageVariations.map((variation, index) => {
      const stage = String(index + 1);
      const delta = variation.value;
      const netTransfers = netTransfersByStage.get(stage) ?? 0;
      const writeOffMagnitude = writeOffMagnitudeByStage.get(stage) ?? 0;
      const rawResidual = Number.isFinite(delta) ? delta - netTransfers : null;
      return {
        delta,
        label: `Other Stage ${stage} movements`,
        netTransfers,
        stage,
        value: Number.isFinite(rawResidual) ? rawResidual + writeOffMagnitude : null
      };
    }),
    stageBalances: stageVariations.map((variation, index) => ({
      label: COST_OF_RISK_STAGE_TRANSFER_STAGE_LABELS[String(index + 1)] ?? `Stage ${index + 1}`,
      ratioDenominator: stageBalanceRatioDenominator,
      stage: String(index + 1),
      value: variation.currentValue ?? null
    })),
    status: "",
    writeOffs: writeOffsByStage.map(({ magnitude, stage }) => ({
      label: `Write-Off Stage ${stage}`,
      stage,
      value: magnitude > 0 ? -magnitude : 0
    }))
  };
}

export function buildCostOfRiskStageReconciliationModel(state, filters = {}, referenceDate = "") {
  const indexes = getRequiredIndexes(state.columns);
  const referenceColumns = getReferenceColumns(state.columns);
  const normalizedFilters = normalizeCostOfRiskFilters(filters);
  const selectedStage = getCostOfRiskStageNumberFromFilter(normalizedFilters.stage);

  if (!selectedStage) {
    return {
      benchmarkSeries: [],
      breakdown: [],
      referenceDate: "",
      status: normalizedFilters.stage === "POCI"
        ? "Stage reconciliation is available for Stage 1, Stage 2 and Stage 3 only."
        : "Select Stage 1, Stage 2 or Stage 3 to reconcile stage transfers with the change in credit risk allowance movement."
    };
  }

  if (!indexes || !state.selectedJst || referenceColumns.length === 0) {
    return {
      benchmarkSeries: [],
      breakdown: [],
      referenceDate: "",
      status: "Load a CSV and select a JST."
    };
  }

  const transferYSelection = getCostOfRiskStageTransferYSelection(state, filters);
  const allowanceSelection = buildCostOfRiskSelectionFromFilters(state, {
    ...filters,
    stage: COST_OF_RISK_STAGE_TRANSFER_STAGE_LABELS[selectedStage]
  });
  const referenceIndex = getCostOfRiskReferenceIndex(referenceColumns, referenceDate);
  const selectedReference = referenceColumns[referenceIndex] ?? null;

  if (transferYSelection.codes.length === 0 || allowanceSelection.points.length === 0 || !selectedReference) {
    return {
      benchmarkSeries: [],
      breakdown: [],
      referenceDate: selectedReference?.label ?? "",
      status: "No matching FINREP point is available for the selected filters."
    };
  }

  const transferSeriesByCode = new Map(COST_OF_RISK_STAGE_TRANSFER_FLOW_MOVEMENTS.map((movement) => [
    movement.code,
    computeCostOfRiskTransferFlowQuarterlySeries(state, indexes, referenceColumns, transferYSelection, movement.code, state.selectedJst)
  ]));
  const transferBreakdown = buildCostOfRiskStageReconciliationTransferBreakdown(
    state,
    selectedStage,
    referenceIndex,
    transferSeriesByCode
  );
  const netTransfers = transferBreakdown.reduce((total, item) => total + (item.signedValue ?? 0), 0);
  const creditRiskSeries = computeCostOfRiskAllowanceComponentQuarterlySeries(
    state,
    indexes,
    referenceColumns,
    allowanceSelection.points,
    "0040",
    state.selectedJst
  );
  const creditRiskChange = creditRiskSeries[referenceIndex] ?? null;
  const ratio = Number.isFinite(creditRiskChange) && Number.isFinite(netTransfers) && netTransfers !== 0
    ? creditRiskChange / netTransfers
    : null;

  return {
    allowanceLabel: allowanceSelection.label,
    benchmarkSeries: getCostOfRiskPeerJstCodes(state).map((jstCode) => ({
      jstCode,
      points: buildCostOfRiskStageReconciliationPointsForJst(
        state,
        indexes,
        referenceColumns,
        transferYSelection,
        allowanceSelection.points,
        selectedStage,
        jstCode
      )
    })),
    breakdown: transferBreakdown,
    creditRiskChange,
    netTransfers,
    ratio,
    referenceDate: selectedReference.label,
    stage: selectedStage,
    stageLabel: COST_OF_RISK_STAGE_TRANSFER_STAGE_LABELS[selectedStage],
    status: "",
    transferLabel: transferYSelection.label
  };
}

function getCostOfRiskStageNumberFromFilter(stageFilter) {
  if (stageFilter === "Stage 1") return "1";
  if (stageFilter === "Stage 2") return "2";
  if (stageFilter === "Stage 3") return "3";
  return "";
}

function buildCostOfRiskStageReconciliationTransferBreakdown(state, stage, referenceIndex, transferSeriesByCode) {
  const xLabels = getCostOfRiskStageTransferXAxisLabelMap(state);
  return COST_OF_RISK_STAGE_TRANSFER_FLOW_MOVEMENTS
    .filter((movement) => movement.from === stage || movement.to === stage)
    .map((movement) => {
      const direction = movement.to === stage ? "in" : "out";
      const value = transferSeriesByCode.get(movement.code)?.[referenceIndex] ?? null;
      const signedValue = Number.isFinite(value) ? (direction === "in" ? value : -value) : null;
      return {
        code: movement.code,
        direction,
        from: movement.from,
        label: xLabels.get(movement.code) ?? movement.code,
        signedValue,
        to: movement.to,
        value
      };
    });
}

function buildCostOfRiskStageReconciliationPointsForJst(state, indexes, referenceColumns, transferYSelection, allowanceYCodes, stage, jstCode) {
  const transferSeriesByCode = new Map(COST_OF_RISK_STAGE_TRANSFER_FLOW_MOVEMENTS.map((movement) => [
    movement.code,
    computeCostOfRiskTransferFlowQuarterlySeries(state, indexes, referenceColumns, transferYSelection, movement.code, jstCode)
  ]));
  const creditRiskSeries = computeCostOfRiskAllowanceComponentQuarterlySeries(
    state,
    indexes,
    referenceColumns,
    allowanceYCodes,
    "0040",
    jstCode
  );

  return referenceColumns.map((column, index) => {
    let netTransfers = 0;
    COST_OF_RISK_STAGE_TRANSFER_FLOW_MOVEMENTS.forEach((movement) => {
      const value = transferSeriesByCode.get(movement.code)?.[index] ?? 0;
      if (movement.from === stage) netTransfers -= value;
      if (movement.to === stage) netTransfers += value;
    });
    const creditRiskChange = creditRiskSeries[index] ?? null;
    const ratio = Number.isFinite(creditRiskChange) && Number.isFinite(netTransfers) && netTransfers !== 0
      ? creditRiskChange / netTransfers
      : null;

    return {
      date: column.date,
      denominator: netTransfers,
      label: column.label,
      ratioBasisPoints: ratio,
      value: ratio
    };
  });
}

function computeCostOfRiskAllowanceComponentQuarterlySeries(state, indexes, referenceColumns, yCodes, xCode, jstCode) {
  const raw = createEmptySeries(referenceColumns.length);
  yCodes.forEach((yCode) => {
    addSeriesValues(raw, getPointSeriesValues(state, indexes, referenceColumns, COST_OF_RISK_TABLE_ID, {
      xCode,
      yCode,
      zCode: ""
    }, jstCode));
  });
  return decumulateQuarterlySeries(referenceColumns, raw);
}

// Generic audit trail: given the same flowKey used to select an arrow in the
// stage transfer flow diagram, reconstructs every raw data point (code,
// description, previous/current cumulative value, quarterly movement) that
// contributed to the displayed value, for the currently selected reference
// date. This is what powers the "Where does it come from?" right-click
// feature — kept fully separate from the chart-building functions above so
// it can be reused by any other flow-diagram-like view later.
export function buildCostOfRiskStageTransferFlowAudit(state, filters = {}, flowKey, referenceDate = "") {
  const indexes = getRequiredIndexes(state.columns);
  const referenceColumns = getReferenceColumns(state.columns);
  const descriptor = parseCostOfRiskFlowKey(flowKey);
  const referenceIndex = getCostOfRiskReferenceIndex(referenceColumns, referenceDate);
  const selectedReference = referenceColumns[referenceIndex] ?? null;
  const previousReference = referenceColumns[referenceIndex - 1] ?? null;

  if (!indexes || !descriptor || !state.selectedJst || !selectedReference) return null;

  if (descriptor.type === "transfer") {
    return buildCostOfRiskTransferFlowAudit(state, indexes, referenceColumns, filters, descriptor, referenceIndex, selectedReference, previousReference);
  }
  if (descriptor.type === "stagebox") {
    return buildCostOfRiskStageBoxFlowAudit(state, indexes, referenceColumns, filters, descriptor, referenceIndex, selectedReference);
  }
  if (descriptor.type === "writeoff") {
    return buildCostOfRiskWriteOffFlowAudit(state, indexes, referenceColumns, filters, descriptor, referenceIndex, selectedReference, previousReference);
  }
  return buildCostOfRiskOtherMovementsFlowAudit(state, indexes, referenceColumns, filters, descriptor, referenceIndex, selectedReference, previousReference);
}

function buildCostOfRiskTransferFlowAudit(state, indexes, referenceColumns, filters, descriptor, referenceIndex, selectedReference, previousReference) {
  const ySelection = getCostOfRiskStageTransferYSelection(state, filters);
  const xLabels = getCostOfRiskStageTransferXAxisLabelMap(state);

  const components = ySelection.codes.map((yCode) => {
    const raw = getPointSeriesValues(state, indexes, referenceColumns, COST_OF_RISK_STAGE_TRANSFER_TABLE_ID, {
      xCode: descriptor.code,
      yCode,
      zCode: ""
    }, state.selectedJst);
    const currentCumulative = raw[referenceIndex] ?? null;
    const previousCumulative = raw[referenceIndex - 1] ?? null;
    const quarterly = decumulateQuarterlySeries(referenceColumns, raw)[referenceIndex] ?? null;

    return {
      code: yCode,
      currentCumulative,
      description: getMappingDescription(state, COST_OF_RISK_STAGE_TRANSFER_TABLE_ID, "y_axis_rc_code", yCode),
      previousCumulative,
      quarterly
    };
  });

  return {
    assetLabel: ySelection.label,
    components,
    descriptor,
    previousReferenceLabel: previousReference?.label ?? "",
    referenceLabel: selectedReference.label,
    tableId: COST_OF_RISK_STAGE_TRANSFER_TABLE_ID,
    type: "transfer",
    value: components.reduce((total, item) => total + (item.quarterly ?? 0), 0),
    xCode: descriptor.code,
    xLabel: xLabels.get(descriptor.code) ?? descriptor.code
  };
}

function buildCostOfRiskWriteOffFlowAudit(state, indexes, referenceColumns, filters, descriptor, referenceIndex, selectedReference, previousReference) {
  const { points } = getCostOfRiskWriteOffPointsByStage(state, filters).find((item) => item.stage === descriptor.stage) ?? { points: [] };
  const xLabels = getCostOfRiskXAxisLabelMap(state);

  const components = COST_OF_RISK_WRITE_OFF_X_CODES.flatMap((xCode) => (
    points.map((yCode) => {
      const raw = getPointSeriesValues(state, indexes, referenceColumns, COST_OF_RISK_TABLE_ID, {
        xCode,
        yCode,
        zCode: ""
      }, state.selectedJst);
      const currentCumulative = raw[referenceIndex] ?? null;
      const previousCumulative = raw[referenceIndex - 1] ?? null;
      const quarterly = decumulateQuarterlySeries(referenceColumns, raw)[referenceIndex] ?? null;

      return {
        currentCumulative,
        description: getMappingDescription(state, COST_OF_RISK_TABLE_ID, "y_axis_rc_code", yCode),
        previousCumulative,
        quarterly,
        xCode,
        xLabel: xLabels.get(xCode) ?? xCode,
        yCode
      };
    })
  ));

  const magnitude = components.reduce((total, item) => total + Math.abs(item.quarterly ?? 0), 0);

  return {
    components,
    descriptor,
    previousReferenceLabel: previousReference?.label ?? "",
    referenceLabel: selectedReference.label,
    stage: descriptor.stage,
    tableId: COST_OF_RISK_TABLE_ID,
    type: "writeoff",
    value: magnitude > 0 ? -magnitude : 0
  };
}

function buildCostOfRiskOtherMovementsFlowAudit(state, indexes, referenceColumns, filters, descriptor, referenceIndex, selectedReference, previousReference) {
  const exposureComponents = buildCostOfRiskStageExposureComponents(state, indexes, referenceColumns, filters, descriptor.stage, referenceIndex);
  const exposureDelta = exposureComponents.reduce((total, item) => total + (item.delta ?? 0), 0);

  const ySelection = getCostOfRiskStageTransferYSelection(state, filters);
  const xLabels = getCostOfRiskStageTransferXAxisLabelMap(state);
  const transferComponents = COST_OF_RISK_STAGE_TRANSFER_FLOW_MOVEMENTS
    .filter((movement) => movement.from === descriptor.stage || movement.to === descriptor.stage)
    .map((movement) => {
      const raw = createEmptySeries(referenceColumns.length);
      ySelection.codes.forEach((yCode) => {
        addSeriesValues(raw, getPointSeriesValues(state, indexes, referenceColumns, COST_OF_RISK_STAGE_TRANSFER_TABLE_ID, {
          xCode: movement.code,
          yCode,
          zCode: ""
        }, state.selectedJst));
      });
      const quarterly = decumulateQuarterlySeries(referenceColumns, raw)[referenceIndex] ?? 0;
      const direction = movement.from === descriptor.stage ? "out" : "in";

      return {
        code: movement.code,
        direction,
        from: movement.from,
        label: xLabels.get(movement.code) ?? movement.code,
        quarterly,
        signedContribution: direction === "out" ? -quarterly : quarterly,
        to: movement.to
      };
    });
  const netTransfers = transferComponents.reduce((total, item) => total + item.signedContribution, 0);

  const writeOffAudit = buildCostOfRiskWriteOffFlowAudit(state, indexes, referenceColumns, filters, { stage: descriptor.stage, type: "writeoff" }, referenceIndex, selectedReference, previousReference);
  const writeOffMagnitude = Math.abs(writeOffAudit.value ?? 0);

  return {
    descriptor,
    exposureComponents,
    exposureDelta,
    netTransfers,
    previousReferenceLabel: previousReference?.label ?? "",
    referenceLabel: selectedReference.label,
    stage: descriptor.stage,
    transferComponents,
    type: "other",
    value: Number.isFinite(exposureDelta) ? exposureDelta - netTransfers + writeOffMagnitude : null,
    writeOffComponents: writeOffAudit.components,
    writeOffMagnitude
  };
}

function buildCostOfRiskStageBoxFlowAudit(state, indexes, referenceColumns, filters, descriptor, referenceIndex, selectedReference) {
  const stageFilters = getCostOfRiskStageScopedFilters(filters, descriptor.stage);
  const composition = getCostOfRiskDenominatorComposition(state, stageFilters);
  const components = [
    ...composition.xCodes.flatMap((xCode) => composition.yCodes.map((yCode) => {
      const value = resolveCostOfRiskDenominatorCellSeries(state, indexes, referenceColumns, state.selectedJst, xCode, yCode)[referenceIndex] ?? null;
      return {
        label: `${getMappingDescription(state, COST_OF_RISK_STAGE_BOX_TABLE_ID, "y_axis_rc_code", yCode)} (x=${xCode})`,
        operator: "add",
        source: `${COST_OF_RISK_STAGE_BOX_TABLE_ID} / x ${xCode} / y ${yCode}`,
        value
      };
    })),
    ...(composition.excludeCash ? composition.xCodes.map((xCode) => {
      const value = resolveCostOfRiskDenominatorCellSeries(state, indexes, referenceColumns, state.selectedJst, xCode, COST_OF_RISK_DENOMINATOR_CASH_Y_CODE)[referenceIndex] ?? null;
      return {
        label: `Cash balances at central banks and other demand deposits (x=${xCode})`,
        operator: "subtract",
        source: `${COST_OF_RISK_STAGE_BOX_TABLE_ID} / x ${xCode} / y ${COST_OF_RISK_DENOMINATOR_CASH_Y_CODE}`,
        value
      };
    }) : [])
  ];
  const hasAddComponent = components.some((component) => component.operator === "add" && Number.isFinite(component.value));
  const value = hasAddComponent
    ? components.reduce((total, component) => {
      if (!Number.isFinite(component.value)) return total;
      return total + (component.operator === "subtract" ? -component.value : component.value);
    }, 0)
    : null;

  return {
    assetLabel: composition.label,
    components,
    descriptor,
    referenceLabel: selectedReference.label,
    stage: descriptor.stage,
    stageLabel: COST_OF_RISK_STAGE_TRANSFER_STAGE_LABELS[descriptor.stage] ?? `Stage ${descriptor.stage}`,
    tableId: COST_OF_RISK_STAGE_BOX_TABLE_ID,
    type: "stagebox",
    value
  };
}

function getMappingDescription(state, tableId, coordinate, code) {
  const mappings = state.dimensionMapping?.list?.(tableId, coordinate) ?? [];
  return mappings.find((mapping) => mapping.code === code)?.description ?? code;
}

// Clicking a stage box (rather than a flow arrow) shows the F_18.00 gross
// carrying amount for that stage over time, per JST — a different data
// source and computation from the F_12.01/F_12.02-based flow selections
// above, but returning the exact same { benchmarkSeries, label, status }
// shape so it plugs into the same chart-rendering pipeline unchanged.
export function buildCostOfRiskStageBoxTimeSeries(state, filters, stage) {
  const indexes = getRequiredIndexes(state.columns);
  const referenceColumns = getReferenceColumns(state.columns);
  const xCodes = COST_OF_RISK_STAGE_BOX_X_CODES[stage];

  if (!indexes || !xCodes || referenceColumns.length === 0) {
    return { benchmarkSeries: [], label: "", status: "No F_18.00 staging data is available." };
  }

  const ySelection = getCostOfRiskStageBoxYSelection(state, filters);
  if (ySelection.codes.length === 0) {
    return {
      benchmarkSeries: [],
      label: `Stage ${stage} - ${ySelection.label}`,
      status: "No matching F_18.00 Y-axis point is available for the selected filters."
    };
  }

  return {
    benchmarkSeries: getCostOfRiskPeerJstCodes(state).map((jstCode) => ({
      jstCode,
      points: buildCostOfRiskStageBoxPointsForJst(state, indexes, referenceColumns, stage, jstCode, filters)
    })),
    label: `Stage ${stage} - ${ySelection.label}`,
    status: ""
  };
}

export function buildCostOfRiskStageSummaryModel(state, filters, referenceDate = "", selectedCellKey = DEFAULT_COST_OF_RISK_STAGE_SUMMARY_CELL) {
  const indexes = getRequiredIndexes(state.columns);
  const referenceColumns = getReferenceColumns(state.columns);
  const ySelection = getCostOfRiskStageBoxYSelection(state, filters);

  if (!indexes || !state.selectedJst || referenceColumns.length === 0) {
    return { rows: [], selectedCell: null, status: "Load a CSV and select a JST." };
  }

  if (ySelection.codes.length === 0) {
    return {
      rows: [],
      selectedCell: null,
      status: "No matching F_18.00 Y-axis point is available for the selected filters."
    };
  }

  const referenceIndex = getCostOfRiskReferenceIndex(referenceColumns, referenceDate);
  const referenceLabel = referenceColumns[referenceIndex]?.label ?? "";
  const selectedCell = parseCostOfRiskStageSummaryCellKey(selectedCellKey)
    ?? parseCostOfRiskStageSummaryCellKey(DEFAULT_COST_OF_RISK_STAGE_SUMMARY_CELL);
  const rows = buildCostOfRiskStageSummaryRowsForJst(state, indexes, referenceColumns, ySelection, state.selectedJst, referenceIndex);

  return {
    benchmarkSeries: getCostOfRiskPeerJstCodes(state).map((jstCode) => ({
      jstCode,
      points: buildCostOfRiskStageSummaryPointsForJst(state, indexes, referenceColumns, ySelection, jstCode, selectedCell)
    })),
    filterLabel: ySelection.label,
    referenceDate: referenceLabel,
    rows,
    selectedCell,
    status: ""
  };
}

function buildCostOfRiskStageSummaryRowsForJst(state, indexes, referenceColumns, ySelection, jstCode, referenceIndex) {
  const totalGca = buildCostOfRiskStageSummarySeries(state, indexes, referenceColumns, ySelection, jstCode, "gca", "all");
  const totalAllowances = buildCostOfRiskStageSummarySeries(state, indexes, referenceColumns, ySelection, jstCode, "allowances", "all");

  return COST_OF_RISK_STAGE_SUMMARY_ROWS.map((rowDefinition) => {
    const gca = buildCostOfRiskStageSummarySeries(state, indexes, referenceColumns, ySelection, jstCode, "gca", rowDefinition.key);
    const allowances = buildCostOfRiskStageSummarySeries(state, indexes, referenceColumns, ySelection, jstCode, "allowances", rowDefinition.key);
    const coverage = buildCostOfRiskCoverageSeries(gca, allowances);
    return {
      key: rowDefinition.key,
      label: rowDefinition.label,
      cells: {
        allowances: createCostOfRiskStageSummaryCellValues(allowances, totalAllowances, referenceIndex),
        coverage: createCostOfRiskCoverageCellValues(coverage, referenceIndex),
        gca: createCostOfRiskStageSummaryCellValues(gca, totalGca, referenceIndex)
      }
    };
  });
}

function buildCostOfRiskStageSummaryPointsForJst(state, indexes, referenceColumns, ySelection, jstCode, selectedCell) {
  const metricSeries = buildCostOfRiskStageSummaryMetricSeries(state, indexes, referenceColumns, ySelection, jstCode, selectedCell.metric, selectedCell.stageKey);
  const totalSeries = selectedCell.metric === "gca" || selectedCell.metric === "allowances"
    ? buildCostOfRiskStageSummarySeries(state, indexes, referenceColumns, ySelection, jstCode, selectedCell.metric, "all")
    : null;

  return referenceColumns.map((column, index) => {
    const previousValue = index > 0 ? metricSeries[index - 1] : null;
    const value = metricSeries[index] ?? null;
    const pointValue = selectedCell.kind === "mom"
      ? getFiniteDelta(value, previousValue)
      : value;
    const ratioBasisPoints = getCostOfRiskStageSummaryRatioValue(metricSeries, totalSeries, selectedCell, index);

    return {
      date: column.date,
      denominator: totalSeries?.[index] ?? null,
      label: column.label,
      ratioBasisPoints,
      value: pointValue
    };
  });
}

function buildCostOfRiskStageSummaryMetricSeries(state, indexes, referenceColumns, ySelection, jstCode, metric, stageKey) {
  if (metric === "coverage") {
    return buildCostOfRiskCoverageSeries(
      buildCostOfRiskStageSummarySeries(state, indexes, referenceColumns, ySelection, jstCode, "gca", stageKey),
      buildCostOfRiskStageSummarySeries(state, indexes, referenceColumns, ySelection, jstCode, "allowances", stageKey)
    );
  }

  return buildCostOfRiskStageSummarySeries(state, indexes, referenceColumns, ySelection, jstCode, metric, stageKey);
}

function buildCostOfRiskStageSummarySeries(state, indexes, referenceColumns, ySelection, jstCode, metric, stageKey) {
  const rowDefinition = COST_OF_RISK_STAGE_SUMMARY_ROWS.find((candidate) => candidate.key === stageKey)
    ?? COST_OF_RISK_STAGE_SUMMARY_ROWS[0];
  const xCodes = metric === "allowances" ? rowDefinition.allowanceXCodes : rowDefinition.gcaXCodes;
  const values = resolveCostOfRiskDenominatorPointsSeries(state, indexes, referenceColumns, jstCode, xCodes, ySelection.codes);

  return metric === "allowances"
    ? values.map((value) => (Number.isFinite(value) ? -value : value))
    : values;
}

export function buildCostOfRiskCounterpartySummaryModel(state, filters, referenceDate = "", selectedCellKey = DEFAULT_COST_OF_RISK_COUNTERPARTY_SUMMARY_CELL) {
  const indexes = getRequiredIndexes(state.columns);
  const referenceColumns = getReferenceColumns(state.columns);
  const normalizedFilters = normalizeCostOfRiskFilters(filters);
  const baseFilters = { ...filters, counterparty: COST_OF_RISK_FILTER_ALL };
  const totalYSelection = getCostOfRiskStageBoxYSelection(state, baseFilters);

  if (!indexes || !state.selectedJst || referenceColumns.length === 0) {
    return { rows: [], selectedCell: null, status: "Load a CSV and select a JST." };
  }

  if (totalYSelection.codes.length === 0) {
    return {
      rows: [],
      selectedCell: null,
      status: "No matching F_18.00 Y-axis point is available for the selected filters."
    };
  }

  const referenceIndex = getCostOfRiskReferenceIndex(referenceColumns, referenceDate);
  const referenceLabel = referenceColumns[referenceIndex]?.label ?? "";
  const selectedCell = parseCostOfRiskCounterpartySummaryCellKey(selectedCellKey)
    ?? parseCostOfRiskCounterpartySummaryCellKey(DEFAULT_COST_OF_RISK_COUNTERPARTY_SUMMARY_CELL);
  const rows = buildCostOfRiskCounterpartySummaryRowsForJst(state, indexes, referenceColumns, normalizedFilters, state.selectedJst, referenceIndex);

  return {
    benchmarkSeries: getCostOfRiskPeerJstCodes(state).map((jstCode) => ({
      jstCode,
      points: buildCostOfRiskCounterpartySummaryPointsForJst(state, indexes, referenceColumns, normalizedFilters, jstCode, selectedCell)
    })),
    filterLabel: totalYSelection.label,
    referenceDate: referenceLabel,
    rows,
    selectedCell,
    status: ""
  };
}

function buildCostOfRiskCounterpartySummaryRowsForJst(state, indexes, referenceColumns, filters, jstCode, referenceIndex) {
  const totalGca = buildCostOfRiskCounterpartySummaryTotalSeries(state, indexes, referenceColumns, filters, jstCode, "gca");
  const totalAllowances = buildCostOfRiskCounterpartySummaryTotalSeries(state, indexes, referenceColumns, filters, jstCode, "allowances");

  return COST_OF_RISK_COUNTERPARTY_SUMMARY_ROWS.map((rowDefinition) => {
    if (rowDefinition.type === "group") return { ...rowDefinition };

    const gca = buildCostOfRiskCounterpartySummarySeries(state, indexes, referenceColumns, filters, jstCode, "gca", rowDefinition.value);
    const allowances = buildCostOfRiskCounterpartySummarySeries(state, indexes, referenceColumns, filters, jstCode, "allowances", rowDefinition.value);
    const coverage = buildCostOfRiskCoverageSeries(gca, allowances);
    return {
      ...rowDefinition,
      cells: {
        allowances: createCostOfRiskStageSummaryCellValues(allowances, totalAllowances, referenceIndex),
        coverage: createCostOfRiskCoverageCellValues(coverage, referenceIndex),
        gca: createCostOfRiskStageSummaryCellValues(gca, totalGca, referenceIndex)
      }
    };
  });
}

function buildCostOfRiskCounterpartySummaryPointsForJst(state, indexes, referenceColumns, filters, jstCode, selectedCell) {
  const metricSeries = buildCostOfRiskCounterpartySummaryMetricSeries(state, indexes, referenceColumns, filters, jstCode, selectedCell.metric, selectedCell.rowKey);
  const totalSeries = selectedCell.metric === "gca" || selectedCell.metric === "allowances"
    ? buildCostOfRiskCounterpartySummaryTotalSeries(state, indexes, referenceColumns, filters, jstCode, selectedCell.metric)
    : null;

  return referenceColumns.map((column, index) => {
    const previousValue = index > 0 ? metricSeries[index - 1] : null;
    const value = metricSeries[index] ?? null;
    const pointValue = selectedCell.kind === "mom"
      ? getFiniteDelta(value, previousValue)
      : value;
    const ratioBasisPoints = getCostOfRiskStageSummaryRatioValue(metricSeries, totalSeries, selectedCell, index);

    return {
      date: column.date,
      denominator: totalSeries?.[index] ?? null,
      label: column.label,
      ratioBasisPoints,
      value: pointValue
    };
  });
}

function buildCostOfRiskCounterpartySummaryMetricSeries(state, indexes, referenceColumns, filters, jstCode, metric, rowKey) {
  const rowDefinition = COST_OF_RISK_COUNTERPARTY_SUMMARY_ROWS.find((candidate) => candidate.key === rowKey && candidate.type === "row")
    ?? COST_OF_RISK_COUNTERPARTY_SUMMARY_ROWS.find((candidate) => candidate.key === "nfc");

  if (metric === "coverage") {
    return buildCostOfRiskCoverageSeries(
      buildCostOfRiskCounterpartySummarySeries(state, indexes, referenceColumns, filters, jstCode, "gca", rowDefinition.value),
      buildCostOfRiskCounterpartySummarySeries(state, indexes, referenceColumns, filters, jstCode, "allowances", rowDefinition.value)
    );
  }

  return buildCostOfRiskCounterpartySummarySeries(state, indexes, referenceColumns, filters, jstCode, metric, rowDefinition.value);
}

function buildCostOfRiskCounterpartySummarySeries(state, indexes, referenceColumns, filters, jstCode, metric, counterpartyValue) {
  const ySelection = getCostOfRiskStageBoxYSelection(state, {
    ...filters,
    counterparty: counterpartyValue
  });
  return buildCostOfRiskCounterpartySummarySeriesFromYCodes(state, indexes, referenceColumns, filters, jstCode, metric, ySelection.codes);
}

function buildCostOfRiskCounterpartySummaryTotalSeries(state, indexes, referenceColumns, filters, jstCode, metric) {
  if (metric === "gca") {
    return getCostOfRiskRatioDenominatorSeries(state, indexes, referenceColumns, jstCode, {
      ...filters,
      counterparty: COST_OF_RISK_FILTER_ALL
    });
  }

  const ySelection = getCostOfRiskStageBoxYSelection(state, {
    ...filters,
    counterparty: COST_OF_RISK_FILTER_ALL
  });
  return buildCostOfRiskCounterpartySummarySeriesFromYCodes(state, indexes, referenceColumns, filters, jstCode, metric, ySelection.codes);
}

function buildCostOfRiskCounterpartySummarySeriesFromYCodes(state, indexes, referenceColumns, filters, jstCode, metric, yCodes) {
  const xCodes = getCostOfRiskCounterpartySummaryXCodes(metric, filters.stage);
  const values = resolveCostOfRiskDenominatorPointsSeries(state, indexes, referenceColumns, jstCode, xCodes, yCodes);

  return metric === "allowances"
    ? values.map((value) => (Number.isFinite(value) ? -value : value))
    : values;
}

function getCostOfRiskCounterpartySummaryXCodes(metric, stage) {
  const normalizedStage = stage && stage !== COST_OF_RISK_FILTER_ALL ? stage : "";
  if (metric === "allowances") return COST_OF_RISK_ALLOWANCE_STAGE_X_CODES[normalizedStage] ?? COST_OF_RISK_ALLOWANCE_STAGE_X_CODES[""];
  return COST_OF_RISK_DENOMINATOR_STAGE_X_CODES[normalizedStage] ?? COST_OF_RISK_DENOMINATOR_STAGE_X_CODES[""];
}

function buildCostOfRiskCoverageSeries(gcaSeries, allowanceSeries) {
  return gcaSeries.map((gca, index) => {
    const allowances = allowanceSeries[index];
    return Number.isFinite(gca) && gca !== 0 && Number.isFinite(allowances)
      ? allowances / gca
      : null;
  });
}

function createCostOfRiskStageSummaryCellValues(series, totalSeries, referenceIndex) {
  const value = series[referenceIndex] ?? null;
  const previousValue = referenceIndex > 0 ? series[referenceIndex - 1] : null;
  const total = totalSeries[referenceIndex] ?? null;
  const ratio = Number.isFinite(value) && Number.isFinite(total) && total !== 0 ? value / total : null;
  const mom = getFiniteDelta(value, previousValue);
  const momRatioBasisPoints = Number.isFinite(mom) && Number.isFinite(previousValue) && previousValue !== 0
    ? (mom / previousValue) * 10000
    : null;

  return {
    mom,
    momRatioBasisPoints,
    ratio,
    value
  };
}

function createCostOfRiskCoverageCellValues(series, referenceIndex) {
  const value = series[referenceIndex] ?? null;
  const previousValue = referenceIndex > 0 ? series[referenceIndex - 1] : null;
  const momRatioBasisPoints = getFiniteDelta(value, previousValue);

  return {
    mom: momRatioBasisPoints === null ? null : momRatioBasisPoints * 10000,
    momRatioBasisPoints: momRatioBasisPoints === null ? null : momRatioBasisPoints * 10000,
    ratio: value,
    value
  };
}

function getCostOfRiskStageSummaryRatioValue(metricSeries, totalSeries, selectedCell, index) {
  const value = metricSeries[index] ?? null;
  const previousValue = index > 0 ? metricSeries[index - 1] : null;

  if (selectedCell.metric === "coverage") {
    if (selectedCell.kind === "mom") {
      const delta = getFiniteDelta(value, previousValue);
      return delta === null ? null : delta * 10000;
    }
    return Number.isFinite(value) ? value * 10000 : null;
  }

  const total = totalSeries?.[index] ?? null;
  const ratio = Number.isFinite(value) && Number.isFinite(total) && total !== 0 ? value / total : null;

  if (selectedCell.kind === "mom") {
    const delta = getFiniteDelta(value, previousValue);
    return Number.isFinite(delta) && Number.isFinite(previousValue) && previousValue !== 0
      ? (delta / previousValue) * 10000
      : null;
  }

  return ratio === null ? null : ratio * 10000;
}

function getFiniteDelta(currentValue, previousValue) {
  return Number.isFinite(currentValue) && Number.isFinite(previousValue)
    ? currentValue - previousValue
    : null;
}

export function parseCostOfRiskStageSummaryCellKey(cellKey) {
  const [metric, kind, stageKey] = String(cellKey ?? "").split(":");
  const isMetric = ["gca", "allowances", "coverage"].includes(metric);
  const isKind = ["level", "mom"].includes(kind);
  const isStage = COST_OF_RISK_STAGE_SUMMARY_ROWS.some((row) => row.key === stageKey);
  return isMetric && isKind && isStage ? { key: `${metric}:${kind}:${stageKey}`, kind, metric, stageKey } : null;
}

export function parseCostOfRiskCounterpartySummaryCellKey(cellKey) {
  const [metric, kind, rowKey] = String(cellKey ?? "").split(":");
  const isMetric = ["gca", "allowances", "coverage"].includes(metric);
  const isKind = ["level", "mom"].includes(kind);
  const isRow = COST_OF_RISK_COUNTERPARTY_SUMMARY_ROWS.some((row) => row.type === "row" && row.key === rowKey);
  return isMetric && isKind && isRow ? { key: `${metric}:${kind}:${rowKey}`, kind, metric, rowKey } : null;
}

function buildCostOfRiskStageBoxPointsForJst(state, indexes, referenceColumns, stage, jstCode, filters = {}) {
  // Gross carrying amount is a stock (balance sheet) figure, not a flow, so
  // — unlike F_12.01/F_12.02 — it is used as-is, with no quarterly
  // decumulation. Use the same perimeter as the stage boxes in the flow
  // diagram, including the systematic exclusion of cash balances at central
  // banks when the selected perimeter otherwise resolves to the F_18.00
  // all-debt-instruments total.
  const values = computeCostOfRiskStageExposureLevels(state, indexes, referenceColumns, filters, stage, jstCode);

  const denominatorSeries = getCostOfRiskRatioDenominatorSeries(
    state,
    indexes,
    referenceColumns,
    jstCode,
    getCostOfRiskStageTransferDenominatorFilters(filters)
  );

  return referenceColumns.map((column, index) => {
    const value = values[index] ?? null;
    const denominator = denominatorSeries[index] ?? null;
    return {
      date: column.date,
      denominator,
      label: column.label,
      // Kept on the same internal bps-equivalent scale as every other ratio
      // in this module (value / denominator * 10000) so it plugs into the
      // shared chart pipeline unchanged; the UI layer converts this to a
      // percentage for display only, since stage ratios are large (10s of
      // %) and reading them in basis points would be unwieldy.
      ratioBasisPoints: Number.isFinite(value) && Number.isFinite(denominator) && denominator !== 0
        ? (value / denominator) * 10000
        : null,
      value
    };
  });
}

export function buildCostOfRiskStageTransferFlowTimeSeries(state, filters, flowKey) {
  const indexes = getRequiredIndexes(state.columns);
  const referenceColumns = getReferenceColumns(state.columns);
  const descriptor = parseCostOfRiskFlowKey(flowKey);

  if (!indexes || !descriptor || referenceColumns.length === 0) {
    return { benchmarkSeries: [], label: "", status: "No F_12.02 stage transfer data is available." };
  }

  const ySelection = getCostOfRiskStageTransferYSelection(state, filters);

  return {
    benchmarkSeries: getCostOfRiskPeerJstCodes(state).map((jstCode) => ({
      jstCode,
      points: buildCostOfRiskFlowPointsForJst(state, indexes, referenceColumns, descriptor, ySelection, filters, jstCode)
    })),
    label: getCostOfRiskFlowLabel(descriptor),
    status: ""
  };
}

function buildCostOfRiskFlowPointsForJst(state, indexes, referenceColumns, descriptor, ySelection, filters, jstCode) {
  const rawValues = getCostOfRiskFlowRawQuarterlyValues(state, indexes, referenceColumns, descriptor, ySelection, filters, jstCode);
  const denominatorSeries = getCostOfRiskRatioDenominatorSeries(
    state,
    indexes,
    referenceColumns,
    jstCode,
    getCostOfRiskStageTransferDenominatorFilters(filters)
  );

  return referenceColumns.map((column, index) => {
    const value = rawValues[index] ?? null;
    const denominator = getCostOfRiskMovementDenominator(denominatorSeries, index);
    return {
      date: column.date,
      denominator,
      label: column.label,
      ratioBasisPoints: Number.isFinite(value) && Number.isFinite(denominator) && denominator !== 0
        ? (value / denominator) * 10000
        : null,
      value
    };
  });
}

function getCostOfRiskFlowRawQuarterlyValues(state, indexes, referenceColumns, descriptor, ySelection, filters, jstCode) {
  if (descriptor.type === "transfer") {
    return computeCostOfRiskTransferFlowQuarterlySeries(state, indexes, referenceColumns, ySelection, descriptor.code, jstCode);
  }

  if (descriptor.type === "writeoff") {
    const magnitudes = computeCostOfRiskWriteOffQuarterlySeriesForStage(state, indexes, referenceColumns, filters, descriptor.stage, jstCode);
    return magnitudes.map((magnitude) => (magnitude > 0 ? -magnitude : 0));
  }

  const exposureLevels = computeCostOfRiskStageExposureLevels(state, indexes, referenceColumns, filters, descriptor.stage, jstCode);
  const writeOffMagnitudes = computeCostOfRiskWriteOffQuarterlySeriesForStage(state, indexes, referenceColumns, filters, descriptor.stage, jstCode);
  const movementQuarterlyByCode = new Map(COST_OF_RISK_STAGE_TRANSFER_FLOW_MOVEMENTS.map((movement) => [
    movement.code,
    computeCostOfRiskTransferFlowQuarterlySeries(state, indexes, referenceColumns, ySelection, movement.code, jstCode)
  ]));

  return referenceColumns.map((column, index) => {
    if (index === 0) return null;
    const currentValue = exposureLevels[index];
    const previousValue = exposureLevels[index - 1];
    if (!Number.isFinite(currentValue) || !Number.isFinite(previousValue)) return null;

    const delta = currentValue - previousValue;
    let netTransfers = 0;
    COST_OF_RISK_STAGE_TRANSFER_FLOW_MOVEMENTS.forEach((movement) => {
      const value = movementQuarterlyByCode.get(movement.code)?.[index] ?? 0;
      if (movement.from === descriptor.stage) netTransfers -= value;
      if (movement.to === descriptor.stage) netTransfers += value;
    });
    const writeOffMagnitude = writeOffMagnitudes[index] ?? 0;
    return delta - netTransfers + writeOffMagnitude;
  });
}

function computeCostOfRiskTransferFlowQuarterlySeries(state, indexes, referenceColumns, ySelection, movementCode, jstCode) {
  const raw = createEmptySeries(referenceColumns.length);
  ySelection.codes.forEach((yCode) => {
    addSeriesValues(raw, getPointSeriesValues(state, indexes, referenceColumns, COST_OF_RISK_STAGE_TRANSFER_TABLE_ID, {
      xCode: movementCode,
      yCode,
      zCode: ""
    }, jstCode));
  });
  return decumulateQuarterlySeries(referenceColumns, raw);
}

function computeCostOfRiskStageExposureLevels(state, indexes, referenceColumns, filters, stage, jstCode) {
  return getCostOfRiskRatioDenominatorSeries(state, indexes, referenceColumns, jstCode, getCostOfRiskStageScopedFilters(filters, stage));
}

function computeCostOfRiskWriteOffQuarterlySeriesForStage(state, indexes, referenceColumns, filters, stage, jstCode) {
  const { points } = getCostOfRiskWriteOffPointsByStage(state, filters).find((item) => item.stage === stage) ?? { points: [] };
  if (!indexes || points.length === 0) return referenceColumns.map(() => 0);

  const total = createEmptySeries(referenceColumns.length);
  COST_OF_RISK_WRITE_OFF_X_CODES.forEach((xCode) => {
    const series = createEmptySeries(referenceColumns.length);
    points.forEach((yCode) => {
      addSeriesValues(series, getPointSeriesValues(state, indexes, referenceColumns, COST_OF_RISK_TABLE_ID, {
        xCode,
        yCode,
        zCode: ""
      }, jstCode));
    });
    const quarterly = decumulateQuarterlySeries(referenceColumns, series);
    quarterly.forEach((value, index) => { total[index] += Math.abs(value); });
  });
  return total;
}

function parseCostOfRiskFlowKey(flowKey) {
  const [type, value] = String(flowKey ?? "").split(":");
  if (type === "transfer") {
    const movement = COST_OF_RISK_STAGE_TRANSFER_FLOW_MOVEMENTS.find((item) => `${item.from}-${item.to}` === value);
    return movement ? { code: movement.code, from: movement.from, to: movement.to, type: "transfer" } : null;
  }
  if (type === "stagebox" && ["1", "2", "3"].includes(value)) {
    return { stage: value, type };
  }
  if ((type === "writeoff" || type === "other") && ["1", "2", "3"].includes(value)) {
    return { stage: value, type };
  }
  return null;
}

function getCostOfRiskFlowLabel(descriptor) {
  if (descriptor.type === "transfer") return `Stage ${descriptor.from} → Stage ${descriptor.to}`;
  if (descriptor.type === "writeoff") return `Write-Off - Stage ${descriptor.stage}`;
  return `Other movements - Stage ${descriptor.stage}`;
}

function getCostOfRiskStageScopedFilters(filters = {}, stage) {
  return {
    ...filters,
    stage: COST_OF_RISK_STAGE_TRANSFER_STAGE_LABELS[stage] ?? filters.stage
  };
}

function buildCostOfRiskStageExposureComponents(state, indexes, referenceColumns, filters, stage, referenceIndex) {
  const stageFilters = getCostOfRiskStageScopedFilters(filters, stage);
  const composition = getCostOfRiskDenominatorComposition(state, stageFilters);
  const previousIndex = referenceIndex - 1;

  if (!indexes || previousIndex < 0 || composition.xCodes.length === 0 || composition.yCodes.length === 0) return [];

  const components = [
    ...composition.xCodes.flatMap((xCode) => composition.yCodes.map((yCode) => ({
      label: `${getMappingDescription(state, COST_OF_RISK_STAGE_BOX_TABLE_ID, "y_axis_rc_code", yCode)} (x=${xCode})`,
      operator: "add",
      series: resolveCostOfRiskDenominatorCellSeries(state, indexes, referenceColumns, state.selectedJst, xCode, yCode),
      source: `${COST_OF_RISK_STAGE_BOX_TABLE_ID} / x ${xCode} / y ${yCode}`
    }))),
    ...(composition.excludeCash ? composition.xCodes.map((xCode) => ({
      label: `Cash balances at central banks and other demand deposits (x=${xCode})`,
      operator: "subtract",
      series: resolveCostOfRiskDenominatorCellSeries(state, indexes, referenceColumns, state.selectedJst, xCode, COST_OF_RISK_DENOMINATOR_CASH_Y_CODE),
      source: `${COST_OF_RISK_STAGE_BOX_TABLE_ID} / x ${xCode} / y ${COST_OF_RISK_DENOMINATOR_CASH_Y_CODE}`
    })) : [])
  ];

  return components.map((component) => {
    const sign = component.operator === "subtract" ? -1 : 1;
    const currentRaw = component.series[referenceIndex] ?? null;
    const previousRaw = component.series[previousIndex] ?? null;
    const currentValue = Number.isFinite(currentRaw) ? sign * currentRaw : null;
    const previousValue = Number.isFinite(previousRaw) ? sign * previousRaw : null;

    return {
      code: component.source,
      currentValue,
      delta: Number.isFinite(currentValue) && Number.isFinite(previousValue) ? currentValue - previousValue : null,
      description: `${component.operator === "subtract" ? "− " : ""}${component.label}`,
      previousValue
    };
  });
}

function getCostOfRiskWriteOffPointsByStage(state, filters = {}) {
  const descriptors = getCostOfRiskBalanceSheetAllowanceDescriptors(state);
  const normalizedFilters = normalizeCostOfRiskFilters(filters);

  return ["1", "2", "3"].map((stage) => {
    const stageFilters = { ...normalizedFilters, stage: COST_OF_RISK_STAGE_TRANSFER_STAGE_LABELS[stage] };
    const points = descriptors
      .filter((descriptor) => matchesCostOfRiskFilterDescriptor(descriptor, stageFilters))
      .filter((descriptor) => isCostOfRiskAggregationPoint(descriptor, stageFilters))
      .map((descriptor) => descriptor.code);

    return { points, stage };
  });
}

function buildCostOfRiskWriteOffByStage(state, indexes, referenceColumns, filters, referenceIndex) {
  return getCostOfRiskWriteOffPointsByStage(state, filters).map(({ points, stage }) => {
    if (!indexes || points.length === 0) {
      return { magnitude: 0, stage };
    }

    const magnitude = COST_OF_RISK_WRITE_OFF_X_CODES.reduce((total, xCode) => {
      const series = createEmptySeries(referenceColumns.length);
      points.forEach((yCode) => {
        addSeriesValues(series, getPointSeriesValues(state, indexes, referenceColumns, COST_OF_RISK_TABLE_ID, {
          xCode,
          yCode,
          zCode: ""
        }, state.selectedJst));
      });
      const quarterlyValue = decumulateQuarterlySeries(referenceColumns, series)[referenceIndex] ?? 0;
      return total + Math.abs(quarterlyValue);
    }, 0);

    return { magnitude, stage };
  });
}

function buildCostOfRiskStageGlobalVariation(state, indexes, referenceColumns, filters, stage, referenceIndex) {
  const stageLabel = COST_OF_RISK_STAGE_TRANSFER_STAGE_LABELS[stage] ?? "Stage 3";
  if (!indexes || referenceIndex <= 0) {
    return {
      label: `${stageLabel} delta`,
      value: null
    };
  }

  const values = computeCostOfRiskStageExposureLevels(state, indexes, referenceColumns, filters, stage, state.selectedJst);
  const currentValue = values[referenceIndex];
  const previousValue = values[referenceIndex - 1];

  return {
    currentValue,
    label: `${stageLabel} delta`,
    previousValue,
    value: Number.isFinite(currentValue) && Number.isFinite(previousValue)
      ? currentValue - previousValue
      : null
  };
}

function buildCostOfRiskSelectionSnapshot(state, selectedOption, xAxisCode, referenceDate = "", filters = {}) {
  const indexes = getRequiredIndexes(state.columns);
  const referenceColumns = getReferenceColumns(state.columns);
  const selectedXCode = normalizeAxisCode(xAxisCode || COST_OF_RISK_X_AXIS_CODE, "x");

  if (!state.dimensionMapping?.list) {
    return { status: "Internal dimension mapping is loading." };
  }

  if (!indexes || !state.selectedJst) {
    return { status: "Load a CSV and select a JST." };
  }

  if (referenceColumns.length === 0) {
    return { status: "No reference date was found in the CSV." };
  }

  if (!selectedOption || selectedOption.points.length === 0) {
    return { status: "No F_12.01 Y-axis point matches the selected filters." };
  }

  const series = buildCostOfRiskSelectionSeries(state, indexes, referenceColumns, selectedOption, selectedXCode, state.selectedJst, filters);
  const referenceIndex = getCostOfRiskReferenceIndex(referenceColumns, referenceDate);
  const selectedPoint = series[referenceIndex];

  return {
    benchmarkSeries: buildCostOfRiskBenchmarkSeries(state, indexes, referenceColumns, selectedOption, selectedXCode, filters),
    denominator: selectedPoint?.denominator ?? null,
    denominatorLabel: getCostOfRiskDenominatorComposition(state, filters).label,
    option: selectedOption,
    ratioBasisPoints: selectedPoint?.ratioBasisPoints ?? null,
    referenceDate: selectedPoint?.label ?? "",
    series,
    value: selectedPoint?.value ?? null
  };
}

function getCostOfRiskReferenceIndex(referenceColumns, referenceDate = "") {
  const index = referenceColumns.findIndex((column) => column.label === referenceDate);
  return index >= 0 ? index : Math.max(0, referenceColumns.length - 1);
}

export function buildCostOfRiskModel(state, config = COST_OF_RISK_CONFIG) {
  const indexes = getRequiredIndexes(state.columns);
  const referenceColumns = getReferenceColumns(state.columns);

  if (!indexes || !state.selectedJst) {
    return { status: "Load a CSV and select a JST." };
  }

  if (referenceColumns.length === 0) {
    return { status: "No reference date was found in the CSV." };
  }

  if (!hasConfiguredPoints(config.numerator)) {
    return {
      benchmarkRows: [],
      denominator: null,
      numerator: null,
      ratio: null,
      referenceColumns,
      status: "Cost of risk configuration is ready. Add numerator points to compute the ratio."
    };
  }

  const numerator = buildConfiguredAggregate(state, indexes, referenceColumns, config.numerator, state.selectedJst);
  const denominator = buildCostOfRiskRatioDenominatorAggregate(state, indexes, referenceColumns, state.selectedJst);

  return {
    benchmarkRows: buildCostOfRiskBenchmarkRows(state, indexes, referenceColumns, config),
    denominator,
    numerator,
    ratio: buildRatioSeries(referenceColumns, numerator, denominator),
    referenceColumns,
    status: ""
  };
}

function getCostOfRiskYMappings(state) {
  return state.dimensionMapping?.list?.(COST_OF_RISK_TABLE_ID, "y_axis_rc_code") ?? [];
}

function getCostOfRiskBalanceSheetAllowanceDescriptors(state) {
  return getCostOfRiskYMappings(state)
    .map(describeCostOfRiskYAxisPoint)
    .filter(isCostOfRiskBalanceSheetAllowanceDescriptor);
}

function isCostOfRiskBalanceSheetAllowanceDescriptor(descriptor) {
  return String(descriptor.description ?? "").startsWith(COST_OF_RISK_BALANCE_SHEET_ALLOWANCE_PREFIX);
}

function getCostOfRiskStageTransferYSelection(state, filters = {}) {
  return getCostOfRiskStageAxisYSelection(state, filters, {
    descriptionPrefix: "Total debt instruments",
    tableId: COST_OF_RISK_STAGE_TRANSFER_TABLE_ID,
    totalLabel: "Total debt instruments"
  });
}

// F_18.00's y-axis repeats the same "Debt securities / Loans and advances /
// counterparty" hierarchy once per accounting portfolio (amortised cost,
// FVOCI, ...) — asset/counterparty matching below already sums across all of
// them automatically since it only looks at the last segment(s) of each
// description, not the portfolio prefix. descriptionPrefix only excludes the
// unrelated "Off-balance sheet exposures" section, which reuses the same
// counterparty names and would otherwise be picked up by mistake.
function getCostOfRiskStageBoxYSelection(state, filters = {}) {
  return getCostOfRiskStageAxisYSelection(state, filters, {
    descriptionPrefix: COST_OF_RISK_STAGE_BOX_DESCRIPTION_PREFIX,
    tableId: COST_OF_RISK_STAGE_BOX_TABLE_ID,
    totalLabel: COST_OF_RISK_STAGE_BOX_DESCRIPTION_PREFIX
  });
}

function getCostOfRiskStageAxisYSelection(state, filters = {}, config) {
  const descriptors = getCostOfRiskStageAxisYMappings(state, config.tableId)
    .filter((mapping) => !config.descriptionPrefix || String(mapping.description ?? "").startsWith(config.descriptionPrefix))
    .map(describeCostOfRiskStageAxisYAxisPoint);
  const normalizedFilters = normalizeCostOfRiskFilters(filters);
  const asset = normalizedFilters.asset;
  const counterparty = normalizedFilters.counterparty;

  if (!asset && !counterparty) {
    const total = descriptors.find((descriptor) => descriptor.terminal === config.totalLabel);
    return {
      codes: total ? [total.code] : [],
      label: config.totalLabel
    };
  }

  const matchingDescriptors = descriptors.filter((descriptor) => (
    (!asset || descriptor.asset === asset)
    && (!counterparty || matchesCostOfRiskCounterpartyDescriptor(descriptor, counterparty))
    && isCostOfRiskStageAxisAggregationPoint(descriptor, { asset, counterparty })
  ));

  return {
    codes: matchingDescriptors.map((descriptor) => descriptor.code),
    label: createCostOfRiskStageAxisSelectionLabel({ asset, counterparty })
  };
}

function getCostOfRiskStageAxisYMappings(state, tableId) {
  return state.dimensionMapping?.list?.(tableId, "y_axis_rc_code") ?? [];
}

function describeCostOfRiskStageAxisYAxisPoint(mapping) {
  const parts = String(mapping.description ?? "")
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);

  return {
    asset: parts.find((part) => ASSET_LABELS.includes(part)) ?? "",
    code: mapping.code,
    counterparty: findCostOfRiskCounterparty(parts),
    description: mapping.description,
    terminal: parts.at(-1) ?? ""
  };
}

function isCostOfRiskStageAxisAggregationPoint(descriptor, filters) {
  if (filters.asset && filters.counterparty) return isCostOfRiskCounterpartyLabel(descriptor.terminal, filters.counterparty);
  if (filters.asset) return descriptor.terminal === filters.asset;
  if (filters.counterparty) return isCostOfRiskCounterpartyLabel(descriptor.terminal, filters.counterparty);
  return descriptor.terminal === "Total debt instruments";
}

function createCostOfRiskStageAxisSelectionLabel(filters) {
  return [
    filters.asset ? formatCostOfRiskAssetLabel(filters.asset) : "All instruments",
    filters.counterparty ? formatCostOfRiskCounterpartyLabel(filters.counterparty) : "All counterparties"
  ].join(" / ");
}

function describeCostOfRiskYAxisPoint(mapping) {
  const parts = String(mapping.description ?? "")
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);

  return {
    asset: parts.find((part) => ASSET_LABELS.includes(part)) ?? "",
    code: mapping.code,
    counterparty: findCostOfRiskCounterparty(parts),
    description: mapping.description,
    stage: findCostOfRiskStage(parts),
    terminal: parts.at(-1) ?? ""
  };
}

function findCostOfRiskStage(parts) {
  return parts.find((part) => STAGE_LABELS.includes(part) || part === "POCI") ?? "";
}

function findCostOfRiskCounterparty(parts) {
  return COUNTERPARTY_LABELS.find((counterparty) => (
    parts.some((part) => part === counterparty || part.startsWith(`${counterparty} `))
  )) ?? "";
}

function createCostOfRiskFilterOptions(values, formatLabel) {
  return [
    { label: "All", value: COST_OF_RISK_FILTER_ALL },
    ...values.map((value) => ({
      label: formatLabel(value),
      value
    }))
  ];
}

function createCostOfRiskCounterpartyFilterOptions() {
  return [
    { label: "All", value: COST_OF_RISK_FILTER_ALL },
    ...COST_OF_RISK_COUNTERPARTY_FILTER_OPTIONS.map((option) => ({
      groupLabel: option.groupLabel,
      label: option.label,
      value: option.value
    }))
  ];
}

function getAvailableCostOfRiskStages(descriptors) {
  const stages = ["Stage 1", "Stage 2", "Stage 3", "POCI"];
  return stages.filter((stage) => descriptors.some((descriptor) => descriptor.stage === stage));
}

function buildCostOfRiskSelectionFromFilters(state, filters = {}) {
  const descriptors = getCostOfRiskBalanceSheetAllowanceDescriptors(state);
  const normalizedFilters = normalizeCostOfRiskFilters(filters);
  if (isCostOfRiskTotalFilter(normalizedFilters)) {
    const totalDescriptor = descriptors.find((descriptor) => descriptor.code === COST_OF_RISK_TOTAL_Y_AXIS_CODE);
    return {
      filters: normalizedFilters,
      id: "filters:total",
      kind: "filtered",
      label: totalDescriptor?.terminal || "Total allowance for debt instruments",
      points: [COST_OF_RISK_TOTAL_Y_AXIS_CODE]
    };
  }

  const points = descriptors
    .filter((descriptor) => matchesCostOfRiskFilterDescriptor(descriptor, normalizedFilters))
    .filter((descriptor) => isCostOfRiskAggregationPoint(descriptor, normalizedFilters))
    .map((descriptor) => descriptor.code);

  return {
    filters: normalizedFilters,
    id: `filters:${normalizedFilters.asset}:${normalizedFilters.counterparty}:${normalizedFilters.stage}`,
    kind: "filtered",
    label: createCostOfRiskFilteredSelectionLabel(normalizedFilters),
    points
  };
}

function normalizeCostOfRiskFilters(filters) {
  return {
    asset: filters.asset && filters.asset !== COST_OF_RISK_FILTER_ALL ? filters.asset : "",
    counterparty: filters.counterparty && filters.counterparty !== COST_OF_RISK_FILTER_ALL ? filters.counterparty : "",
    stage: filters.stage && filters.stage !== COST_OF_RISK_FILTER_ALL ? filters.stage : ""
  };
}

function isCostOfRiskTotalFilter(filters) {
  return !filters.asset && !filters.counterparty && !filters.stage;
}

function matchesCostOfRiskFilterDescriptor(descriptor, filters) {
  return (!filters.asset || descriptor.asset === filters.asset)
    && (!filters.counterparty || matchesCostOfRiskCounterpartyDescriptor(descriptor, filters.counterparty))
    && (!filters.stage || descriptor.stage === filters.stage);
}

function isCostOfRiskAggregationPoint(descriptor, filters) {
  if (filters.counterparty) return isCostOfRiskCounterpartyLabel(descriptor.terminal, descriptor.counterparty);
  if (filters.asset) return descriptor.terminal === descriptor.asset;
  if (filters.stage) return descriptor.terminal === descriptor.stage;

  return descriptor.stage && (
    descriptor.terminal === descriptor.stage
    || descriptor.terminal === "Allowances for purchased or originated credit-impaired financial assets"
  );
}

function isCostOfRiskCounterpartyLabel(value, counterparty) {
  const definition = getCostOfRiskCounterpartyDefinition(counterparty);
  const target = definition?.terminal ?? counterparty;
  return value === target || String(value ?? "").startsWith(`${target} `);
}

function matchesCostOfRiskCounterpartyDescriptor(descriptor, counterparty) {
  const definition = getCostOfRiskCounterpartyDefinition(counterparty);
  if (!definition) return descriptor.counterparty === counterparty;
  if (definition.parent && descriptor.counterparty !== definition.parent) return false;
  return isCostOfRiskCounterpartyLabel(descriptor.terminal, counterparty);
}

function createCostOfRiskFilteredSelectionLabel(filters) {
  return [
    filters.asset ? formatCostOfRiskAssetLabel(filters.asset) : "All instruments",
    filters.counterparty ? formatCostOfRiskCounterpartyLabel(filters.counterparty) : "All counterparties",
    filters.stage ? formatCostOfRiskStageLabel(filters.stage) : ALL_STAGES_LABEL
  ].join(" / ");
}

function createCostOfRiskOptionLabel(descriptor) {
  const segments = [
    descriptor.asset ? formatCostOfRiskAssetLabel(descriptor.asset) : "",
    descriptor.counterparty ? formatCostOfRiskCounterpartyLabel(descriptor.counterparty) : "",
    descriptor.stage ? formatCostOfRiskStageLabel(descriptor.stage) : "",
    getCostOfRiskResidualLabel(descriptor)
  ].filter(Boolean);

  return segments.length > 0
    ? `${segments.join(" / ")} (${descriptor.code})`
    : `${descriptor.terminal || descriptor.description} (${descriptor.code})`;
}

function getCostOfRiskResidualLabel(descriptor) {
  if (!descriptor.terminal) return "";
  if (descriptor.terminal === descriptor.asset) return "";
  if (descriptor.terminal === descriptor.counterparty) return "";
  if (descriptor.terminal === descriptor.stage) return "";
  if (descriptor.terminal === "Allowances for purchased or originated credit-impaired financial assets") return "POCI";
  return descriptor.terminal.replace(/^Of which:\s*/i, "Of which ");
}

function formatCostOfRiskAssetLabel(asset) {
  return ASSET_SHORT_LABELS.get(asset) ?? asset;
}

function formatCostOfRiskCounterpartyLabel(counterparty) {
  const definition = getCostOfRiskCounterpartyDefinition(counterparty);
  if (definition) return definition.shortLabel ?? definition.label;
  return COUNTERPARTY_SHORT_LABELS.get(counterparty) ?? counterparty;
}

function getCostOfRiskCounterpartyDefinition(value) {
  return COST_OF_RISK_COUNTERPARTY_FILTER_OPTIONS.find((option) => option.value === value) ?? null;
}

function formatCostOfRiskStageLabel(stage) {
  return STAGE_SHORT_LABELS.get(stage) ?? stage;
}

function getCostOfRiskOptionGroupLabel(descriptor, kind) {
  const prefix = kind === "aggregate" ? "Aggregations" : "Individual points";
  if (descriptor.asset) return `${prefix} - ${formatCostOfRiskAssetLabel(descriptor.asset)}`;
  if (descriptor.stage) return `${prefix} - ${formatCostOfRiskStageLabel(descriptor.stage)}`;
  return `${prefix} - totals and other`;
}

function buildCostOfRiskAggregateOptions(descriptors) {
  const options = [
    buildCostOfRiskTotalAggregateOption(descriptors)
  ];

  ASSET_LABELS.forEach((asset) => {
    options.push(buildAggregateOption(descriptors, {
      asset,
      counterparty: "",
      label: `${asset} - ${ALL_STAGES_LABEL}`,
      stage: ""
    }));

    COUNTERPARTY_LABELS.forEach((counterparty) => {
      options.push(buildAggregateOption(descriptors, {
        asset,
        counterparty,
        label: `${asset} / ${counterparty} - ${ALL_STAGES_LABEL}`,
        stage: ""
      }));
    });
  });

  return options
    .filter((option) => option.points.length > 0)
    .filter(dedupeAggregateOptions);
}

function buildCostOfRiskTotalAggregateOption(descriptors) {
  const totalDescriptor = descriptors.find((descriptor) => descriptor.code === COST_OF_RISK_TOTAL_Y_AXIS_CODE);
  return {
    groupLabel: "Aggregations - all instruments",
    id: "aggregate:total",
    kind: "aggregate",
    label: totalDescriptor?.terminal || "Total allowance for debt instruments",
    points: [COST_OF_RISK_TOTAL_Y_AXIS_CODE]
  };
}

function buildAggregateOption(descriptors, criteria) {
  const points = descriptors
    .filter((descriptor) => (
      (!criteria.stage || descriptor.stage === criteria.stage)
      && (!criteria.asset || descriptor.asset === criteria.asset)
      && (!criteria.counterparty || descriptor.counterparty === criteria.counterparty)
      && matchesAggregateTerminal(descriptor, criteria)
    ))
    .map((descriptor) => descriptor.code);

  return {
    groupLabel: getCostOfRiskAggregateGroupLabel(criteria),
    id: `aggregate:${criteria.stage || "all"}:${criteria.asset || "all"}:${criteria.counterparty || "all"}`,
    kind: "aggregate",
    label: createCostOfRiskAggregateLabel(criteria),
    points
  };
}

function getCostOfRiskAggregateGroupLabel(criteria) {
  if (criteria.asset) return `Aggregations - ${formatCostOfRiskAssetLabel(criteria.asset)}`;
  return "Aggregations - all instruments";
}

function createCostOfRiskAggregateLabel(criteria) {
  const segments = [
    criteria.asset ? formatCostOfRiskAssetLabel(criteria.asset) : "All instruments",
    criteria.counterparty ? formatCostOfRiskCounterpartyLabel(criteria.counterparty) : "All counterparties",
    criteria.stage ? formatCostOfRiskStageLabel(criteria.stage) : ALL_STAGES_LABEL
  ];

  return segments.join(" / ");
}

function matchesAggregateTerminal(descriptor, criteria) {
  if (criteria.counterparty) return descriptor.terminal === criteria.counterparty;
  if (criteria.asset) return descriptor.terminal === criteria.asset;
  return descriptor.stage && (
    descriptor.terminal === descriptor.stage
    || descriptor.terminal === "Allowances for purchased or originated credit-impaired financial assets"
  );
}

function dedupeAggregateOptions(option, index, options) {
  const pointsKey = option.points.join("|");
  return options.findIndex((candidate) => candidate.points.join("|") === pointsKey) === index;
}

function dedupeCostOfRiskAxisOptions(option, index, options) {
  return options.findIndex((candidate) => candidate.code === option.code) === index;
}

function getCostOfRiskXAxisLabelMap(state) {
  const mappings = state.dimensionMapping?.list?.(COST_OF_RISK_TABLE_ID, "x_axis_rc_code") ?? [];
  return new Map(mappings.map((mapping) => [
    mapping.code,
    getCostOfRiskShortAxisLabel(mapping.description, mapping.code)
  ]));
}

function getCostOfRiskXAxisFullLabelMap(state) {
  const mappings = state.dimensionMapping?.list?.(COST_OF_RISK_TABLE_ID, "x_axis_rc_code") ?? [];
  return new Map(mappings.map((mapping) => [
    mapping.code,
    formatCostOfRiskFullAxisLabel(mapping.description || mapping.code)
  ]));
}

function formatCostOfRiskFullAxisLabel(label) {
  return String(label ?? "")
    .replace(/^Movements\s*\/\s*/i, "")
    .replace(/\bmovement_/gi, "")
    .trim();
}

function getCostOfRiskStageTransferXAxisLabelMap(state) {
  const mappings = state.dimensionMapping?.list?.(COST_OF_RISK_STAGE_TRANSFER_TABLE_ID, "x_axis_rc_code") ?? [];
  return new Map(mappings.map((mapping) => [
    mapping.code,
    getCostOfRiskShortAxisLabel(mapping.description, mapping.code)
  ]));
}

function getCostOfRiskShortAxisLabel(description, fallback) {
  const parts = String(description ?? "")
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);

  return parts.at(-1) || fallback;
}

export function buildCostOfRiskBenchmarkRows(state, indexes, referenceColumns, config = COST_OF_RISK_CONFIG) {
  if (!hasConfiguredPoints(config.numerator)) return [];

  return getCostOfRiskPeerJstCodes(state).map((jstCode) => {
    const numerator = buildConfiguredAggregate(state, indexes, referenceColumns, config.numerator, jstCode);
    const denominator = buildCostOfRiskRatioDenominatorAggregate(state, indexes, referenceColumns, jstCode);

    return {
      denominator,
      jstCode,
      numerator,
      ratio: buildRatioSeries(referenceColumns, numerator, denominator)
    };
  });
}

function buildCostOfRiskBenchmarkSeries(state, indexes, referenceColumns, selectedOption, xAxisCode, filters = {}) {
  return getCostOfRiskPeerJstCodes(state).map((jstCode) => ({
    jstCode,
    points: buildCostOfRiskSelectionSeries(state, indexes, referenceColumns, selectedOption, xAxisCode, jstCode, filters)
  }));
}

function getCostOfRiskPeerJstCodes(state) {
  const jstOptions = state?.jstOptions ?? [];
  const peers = state?.peerJstCodes?.length ? state.peerJstCodes : jstOptions;
  const requested = [state?.selectedJst, ...peers].filter(Boolean);

  return requested.filter((jstCode, index) => (
    jstOptions.includes(jstCode) && requested.indexOf(jstCode) === index
  ));
}

function buildCostOfRiskSelectionSeries(state, indexes, referenceColumns, selectedOption, xAxisCode, jstCode, filters = {}) {
  const valueSeries = createEmptySeries(referenceColumns.length);
  selectedOption.points.forEach((yCode) => {
    addSeriesValues(valueSeries, getPointSeriesValues(state, indexes, referenceColumns, COST_OF_RISK_TABLE_ID, {
        xCode: xAxisCode,
        yCode
      }, jstCode));
  });
  const quarterlyValueSeries = decumulateQuarterlySeries(referenceColumns, valueSeries);
  const denominatorSeries = getCostOfRiskRatioDenominatorSeries(state, indexes, referenceColumns, jstCode, filters);

  return referenceColumns.map((column, index) => {
    const value = formatCostOfRiskAllowanceMovementDisplayValue(quarterlyValueSeries[index] ?? 0);
    const denominator = getCostOfRiskMovementDenominator(denominatorSeries, index) ?? 0;
    return {
      date: column.date,
      denominator,
      label: column.label,
      ratioBasisPoints: denominator ? (value / denominator) * 10000 : null,
      value
    };
  });
}

function buildConfiguredAggregate(state, indexes, referenceColumns, definition, jstCode) {
  const rawValueSeries = sumConfiguredPointSeriesValues(
    state,
    indexes,
    referenceColumns,
    definition.tableId,
    definition.points,
    jstCode
  );
  const valueSeries = definition.tableId === COST_OF_RISK_TABLE_ID
    ? decumulateQuarterlySeries(referenceColumns, rawValueSeries)
    : rawValueSeries;

  const values = referenceColumns.map((column, index) => {
    return {
      date: column.date,
      label: column.label,
      value: valueSeries[index] ?? 0
    };
  });

  return {
    label: definition.label,
    tableId: definition.tableId,
    values
  };
}

function hasConfiguredPoints(definition) {
  return definition.points.some(hasConfiguredPointCoordinates);
}

function hasConfiguredPointCoordinates(point) {
  return Boolean(point.xCode || point.yCode || point.zCode);
}

function buildRatioSeries(referenceColumns, numerator, denominator) {
  const useMovementDenominator = numerator.tableId === COST_OF_RISK_TABLE_ID || numerator.tableId === COST_OF_RISK_F02_TABLE_ID;
  return {
    label: "Cost of risk ratio",
    values: referenceColumns.map((column, index) => {
      const numeratorValue = numerator.values[index]?.value ?? null;
      const denominatorValue = useMovementDenominator
        ? denominator.values[index - 1]?.value ?? null
        : denominator.values[index]?.value ?? null;

      return {
        date: column.date,
        label: column.label,
        value: denominatorValue ? numeratorValue / denominatorValue : null
      };
    })
  };
}

function getCostOfRiskMovementDenominator(denominatorSeries, index) {
  if (!Array.isArray(denominatorSeries) || index <= 0) return null;
  const denominator = denominatorSeries[index - 1];
  return Number.isFinite(denominator) ? denominator : null;
}

function sumConfiguredPointSeriesValues(state, indexes, referenceColumns, tableId, points, jstCode) {
  const values = createEmptySeries(referenceColumns.length);
  points
    .filter(hasConfiguredPointCoordinates)
    .forEach((point) => {
      const sign = Number.isFinite(point.sign) ? point.sign : 1;
      addSeriesValues(values, getPointSeriesValues(state, indexes, referenceColumns, tableId, point, jstCode), sign);
    });

  return values;
}

// Resolves a single F_18.00 (x, y) cell into a per-date series. Must
// resolve to exactly one row per (table, x, y, z, jst): missing or
// ambiguous (duplicate) rows return null for every date rather than being
// silently summed or defaulted. Blank/non-numeric raw values also resolve
// to null per date.
function resolveCostOfRiskDenominatorCellSeries(state, indexes, referenceColumns, jstCode, xCode, yCode) {
  if (!indexes) return referenceColumns.map(() => null);

  const rows = getCostOfRiskPointRows(state, indexes, COST_OF_RISK_STAGE_BOX_TABLE_ID, { xCode, yCode, zCode: "" }, jstCode);
  if (rows.length !== 1) return referenceColumns.map(() => null);

  const [row] = rows;
  return referenceColumns.map((column) => {
    const raw = row[column.index];
    if (raw === undefined || raw === null || String(raw).trim() === "") return null;
    const parsed = parseNumericValue(raw, NaN);
    return Number.isFinite(parsed) ? parsed : null;
  });
}

// Sums every available (xCode, yCode) cell in the cross product into one
// per-date series. Missing/ambiguous cells are ignored for that date; the
// date only resolves to null when no component is available at all.
function resolveCostOfRiskDenominatorPointsSeries(state, indexes, referenceColumns, jstCode, xCodes, yCodes) {
  if (!indexes || xCodes.length === 0 || yCodes.length === 0) return referenceColumns.map(() => null);

  const cellSeriesList = [];
  xCodes.forEach((xCode) => {
    yCodes.forEach((yCode) => {
      cellSeriesList.push(resolveCostOfRiskDenominatorCellSeries(state, indexes, referenceColumns, jstCode, xCode, yCode));
    });
  });

  return referenceColumns.map((_, index) => {
    let total = 0;
    let availableCount = 0;
    for (const series of cellSeriesList) {
      const value = series[index];
      if (!Number.isFinite(value)) continue;
      total += value;
      availableCount += 1;
    }
    return availableCount > 0 ? total : null;
  });
}

// The denominator for the current sidebar filters: sums every matching
// F_18.00 cell (see getCostOfRiskDenominatorComposition), then - only when
// both Accounting type and Counterparty are unrestricted - subtracts cash
// balances at central banks, which must never be part of the denominator.
function getCostOfRiskRatioDenominatorSeries(state, indexes, referenceColumns, jstCode, filters = {}) {
  const composition = getCostOfRiskDenominatorComposition(state, filters);
  const baseSeries = resolveCostOfRiskDenominatorPointsSeries(state, indexes, referenceColumns, jstCode, composition.xCodes, composition.yCodes);
  if (!composition.excludeCash) return baseSeries;

  const cashSeries = resolveCostOfRiskDenominatorPointsSeries(state, indexes, referenceColumns, jstCode, composition.xCodes, [COST_OF_RISK_DENOMINATOR_CASH_Y_CODE]);
  return referenceColumns.map((_, index) => {
    const base = baseSeries[index];
    const cash = cashSeries[index];
    if (!Number.isFinite(base)) return null;
    return Number.isFinite(cash) ? base - cash : base;
  });
}

function buildCostOfRiskRatioDenominatorAggregate(state, indexes, referenceColumns, jstCode, filters = {}) {
  const valueSeries = getCostOfRiskRatioDenominatorSeries(state, indexes, referenceColumns, jstCode, filters);
  const composition = getCostOfRiskDenominatorComposition(state, filters);

  return {
    label: composition.label,
    tableId: "F_18.00",
    values: referenceColumns.map((column, index) => ({
      date: column.date,
      label: column.label,
      value: valueSeries[index] ?? null
    }))
  };
}

// Public entry point for the info tooltip / audit trail: resolves the
// filter-driven denominator for a single reference date, with a per-cell
// breakdown (raw value + operator) so the calculation can be explained
// rather than just showing the final number.
export function buildCostOfRiskRatioDenominatorDetail(state, filters, referenceDate = "", jstCode = state.selectedJst) {
  const indexes = getRequiredIndexes(state.columns);
  const referenceColumns = getReferenceColumns(state.columns);
  const composition = getCostOfRiskDenominatorComposition(state, filters);

  if (!indexes || !jstCode || referenceColumns.length === 0 || composition.yCodes.length === 0) {
    return { components: [], label: composition.label, sourceTable: "F_18.00", status: "unavailable", value: null };
  }

  const referenceIndex = getCostOfRiskReferenceIndex(referenceColumns, referenceDate);
  const components = [
    ...composition.xCodes.flatMap((xCode) => composition.yCodes.map((yCode) => ({
      label: `${getMappingDescription(state, COST_OF_RISK_STAGE_BOX_TABLE_ID, "y_axis_rc_code", yCode)} (x=${xCode})`,
      operator: "add",
      value: resolveCostOfRiskDenominatorCellSeries(state, indexes, referenceColumns, jstCode, xCode, yCode)[referenceIndex] ?? null
    }))),
    ...(composition.excludeCash ? composition.xCodes.map((xCode) => ({
      label: `Cash balances at central banks and other demand deposits (x=${xCode})`,
      operator: "subtract",
      value: resolveCostOfRiskDenominatorCellSeries(state, indexes, referenceColumns, jstCode, xCode, COST_OF_RISK_DENOMINATOR_CASH_Y_CODE)[referenceIndex] ?? null
    })) : [])
  ];

  const hasAddComponent = components.some((component) => component.operator === "add" && Number.isFinite(component.value));
  const value = hasAddComponent
    ? components.reduce((total, component) => {
        if (!Number.isFinite(component.value)) return total;
        return total + (component.operator === "subtract" ? -component.value : component.value);
      }, 0)
    : null;

  return {
    components,
    label: composition.label,
    sourceTable: "F_18.00",
    status: hasAddComponent ? "available" : "unavailable",
    value
  };
}

function getPointSeriesValues(state, indexes, referenceColumns, tableId, point, jstCode) {
  const cache = getCostOfRiskSeriesCache(state);
  const key = makeCostOfRiskPointSeriesKey(tableId, point, jstCode, referenceColumns);
  if (cache.pointSeries.has(key)) return cache.pointSeries.get(key);

  const rows = getCostOfRiskPointRows(state, indexes, tableId, point, jstCode);
  const values = referenceColumns.map((column) => (
    rows.reduce((total, row) => total + parseNumericValue(row[column.index]), 0)
  ));
  cache.pointSeries.set(key, values);
  return values;
}

function getCostOfRiskPointRows(state, indexes, tableId, point, jstCode) {
  const indexedRows = getCostOfRiskIndexedPointRows(state, tableId, point, jstCode);
  if (indexedRows) return indexedRows;

  return state.rows.filter((row) => (
    row[indexes.jstCode] === jstCode
    && row[indexes.tableId] === tableId
    && matchesAxis(row, indexes, "x", point.xCode)
    && matchesAxis(row, indexes, "y", point.yCode)
    && matchesAxis(row, indexes, "z", point.zCode)
  ));
}

function getCostOfRiskSeriesCache(state) {
  const rowsKey = state.rows ?? [];
  if (!COST_OF_RISK_SERIES_CACHE.has(rowsKey)) {
    COST_OF_RISK_SERIES_CACHE.set(rowsKey, {
      pointSeries: new Map()
    });
  }

  return COST_OF_RISK_SERIES_CACHE.get(rowsKey);
}

function makeCostOfRiskPointSeriesKey(tableId, point, jstCode, referenceColumns) {
  return [
    tableId,
    jstCode,
    normalizeAxisCode(point.xCode ?? "", "x"),
    normalizeAxisCode(point.yCode ?? "", "y"),
    normalizeAxisCode(point.zCode ?? "", "z"),
    referenceColumns.map((column) => column.index).join(",")
  ].join(CACHE_KEY_SEPARATOR);
}

function createEmptySeries(length) {
  return Array.from({ length }, () => 0);
}

function addSeriesValues(target, source, multiplier = 1) {
  source.forEach((value, index) => {
    target[index] = (target[index] ?? 0) + multiplier * value;
  });
}

function decumulateQuarterlySeries(referenceColumns, values) {
  return values.map((value, index) => {
    const currentYear = referenceColumns[index]?.date?.getFullYear();
    const previousYear = referenceColumns[index - 1]?.date?.getFullYear();
    const previousValue = values[index - 1];

    if (index === 0 || currentYear !== previousYear || !Number.isFinite(previousValue)) {
      return value;
    }

    return value - previousValue;
  });
}

function getCostOfRiskIndexedPointRows(state, tableId, point, jstCode) {
  if (!state.dataIndexes?.byCoordinates || !point.xCode || !point.yCode) return null;

  const indexedRows = getIndexedRowsByCoordinates(state, tableId, {
    selectedXCode: point.xCode,
    selectedYCode: point.yCode,
    selectedZCode: point.zCode ?? ""
  }, jstCode);

  return indexedRows.length > 0 ? indexedRows : null;
}

function matchesAxis(row, indexes, axis, code) {
  if (!code) return true;
  const index = indexes[`${axis}AxisRcCode`];
  if (index === -1 || index === undefined) return false;
  return normalizeAxisCode(row[index], axis) === normalizeAxisCode(code, axis);
}

export function buildCostOfRiskCounterpartyTreemapData(state, filters, referenceDate = "") {
  const baseFilters = {
    ...filters,
    counterparty: COST_OF_RISK_FILTER_ALL
  };
  const counterpartyOptions = filters.counterparty === COST_OF_RISK_FILTER_ALL
    ? COST_OF_RISK_TREEMAP_COUNTERPARTIES
    : COST_OF_RISK_TREEMAP_COUNTERPARTIES.filter((counterparty) => counterparty.value === filters.counterparty);
  const totalWaterfall = buildCostOfRiskWaterfall(state, baseFilters, referenceDate);
  const stageOptions = filters.stage === COST_OF_RISK_FILTER_ALL
    ? COST_OF_RISK_TREEMAP_STAGE_OPTIONS
    : COST_OF_RISK_TREEMAP_STAGE_OPTIONS.filter((stage) => stage.value === filters.stage);
  const stageWaterfalls = stageOptions.map((stage) => {
    const totalByCode = getCostOfRiskWaterfallPointMap(buildCostOfRiskWaterfall(state, {
      ...baseFilters,
      stage: stage.value
    }, referenceDate));
    const counterpartyWaterfalls = counterpartyOptions.map((counterparty) => ({
      counterparty,
      pointByCode: getCostOfRiskWaterfallPointMap(buildCostOfRiskWaterfall(state, {
        ...baseFilters,
        counterparty: counterparty.value,
        stage: stage.value
      }, referenceDate))
    }));

    return {
      counterpartyWaterfalls,
      label: stage.label,
      totalByCode
    };
  });

  return {
    points: (totalWaterfall.points ?? []).map((point) => {
      const counterpartyChildren = counterpartyOptions.map((counterparty) => {
        const stages = stageWaterfalls.map((stage) => {
          const stageWaterfall = stage.counterpartyWaterfalls.find((candidate) => candidate.counterparty.value === counterparty.value);

          return {
            counterpartyLabel: counterparty.label,
            counterpartyShortLabel: counterparty.shortLabel,
            key: `${counterparty.shortLabel}-${stage.label}`,
            label: stage.label,
            ratioBasisPoints: stageWaterfall?.pointByCode.get(point.code)?.ratioBasisPoints ?? 0,
            value: stageWaterfall?.pointByCode.get(point.code)?.value ?? 0
          };
        });

        return {
          key: counterparty.shortLabel,
          label: counterparty.label,
          shortLabel: counterparty.shortLabel,
          ratioBasisPoints: sumCostOfRiskTreemapChildren(stages),
          value: sumCostOfRiskTreemapChildren(stages, "value"),
          children: stages
        };
      });

      return {
        ...point,
        children: counterpartyChildren
      };
    }),
    referenceDate: totalWaterfall.referenceDate
  };
}

function getCostOfRiskWaterfallPointMap(waterfall) {
  return new Map((waterfall.points ?? []).map((point) => [point.code, point]));
}

function sumCostOfRiskTreemapChildren(children, field = "ratioBasisPoints") {
  return children.reduce((sum, child) => (
    sum + (Number.isFinite(child[field]) ? child[field] : 0)
  ), 0);
}

export function getCostOfRiskPointDisplayValue(point, displayMode) {
  return displayMode === "amount" ? point?.value : point?.ratioBasisPoints;
}

export function formatCostOfRiskDisplayValue(value, displayMode, selectedUnit, signed = false) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "-";
  if (displayMode === "ratio") {
    const sign = signed && value > 0 ? "+" : "";
    return `${sign}${formatBasisPointsValue(value)}`;
  }
  return signed ? formatSignedMetricValue(value, selectedUnit) : formatMetricValue(value, selectedUnit);
}

export function createCostOfRiskChartData(points, displayMode = "ratio") {
  return points
    .filter((point) => point.date instanceof Date && Number.isFinite(displayMode === "ratio" ? point.smoothedRatioBasisPoints : point.smoothedValue))
    .map((point) => ({
      referenceLabel: point.label,
      x: point.date.getTime(),
      y: displayMode === "ratio" ? point.smoothedRatioBasisPoints : point.smoothedValue
    }));
}

export function createCostOfRiskRatioChartData(points, displayMode = "ratio") {
  return (points ?? [])
    .filter((point) => point.date instanceof Date && Number.isFinite(getCostOfRiskPointDisplayValue(point, displayMode)))
    .map((point) => ({
      referenceLabel: point.label,
      x: point.date.getTime(),
      y: getCostOfRiskPointDisplayValue(point, displayMode)
    }));
}

export function getCostOfRiskYAxisBounds(series) {
  const values = series
    .flatMap((serie) => serie.data.map((point) => point.y))
    .filter((value) => Number.isFinite(value));

  if (values.length === 0) return { max: undefined, min: undefined };

  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue;
  const padding = range > 0 ? range * 0.015 : Math.max(Math.abs(maxValue) * 0.015, 0.5);

  return {
    max: maxValue + padding,
    min: minValue - padding
  };
}

export function clampCostOfRiskSmoothingWindow(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 1;
  return Math.max(1, Math.min(4, Math.round(parsed)));
}

export function formatCostOfRiskSmoothingLabel(windowSize) {
  return `${windowSize}Q`;
}

export function formatReferenceQuarterLabel(label) {
  const match = String(label ?? "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return label || "-";

  const [, , month, year] = match;
  const quarter = Math.max(1, Math.min(4, Math.ceil(Number(month) / 3)));
  return `Q${quarter} ${year}`;
}

export function getSelectedSmoothedCostOfRiskPoint(points, smoothingWindow, referenceDate) {
  const smoothedPoints = smoothCostOfRiskPoints(points ?? [], smoothingWindow);
  return smoothedPoints.find((point) => point.label === referenceDate) ?? smoothedPoints.at(-1) ?? null;
}

export function formatCostOfRiskAuditValue(value, type, selectedUnit) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "-";
  if (type === "bp") return formatBasisPointsValue(value);
  return formatMetricValue(value, selectedUnit || "millions");
}

export function smoothCostOfRiskPoints(points, smoothingWindow) {
  const windowSize = clampCostOfRiskSmoothingWindow(smoothingWindow);
  if (windowSize <= 1) {
    return points.map((point) => ({
      ...point,
      smoothedRatioBasisPoints: point.ratioBasisPoints,
      smoothedValue: point.value
    }));
  }

  return points.map((point, index) => {
    const windowValues = points
      .slice(Math.max(0, index - windowSize + 1), index + 1)
      .map((candidate) => candidate.ratioBasisPoints)
      .filter((value) => Number.isFinite(value));
    const windowAmountValues = points
      .slice(Math.max(0, index - windowSize + 1), index + 1)
      .map((candidate) => candidate.value)
      .filter((value) => Number.isFinite(value));

    return {
      ...point,
      smoothedRatioBasisPoints: windowValues.length
        ? windowValues.reduce((total, value) => total + value, 0) / windowValues.length
        : null,
      smoothedValue: windowAmountValues.length
        ? windowAmountValues.reduce((total, value) => total + value, 0) / windowAmountValues.length
        : null
    };
  });
}
