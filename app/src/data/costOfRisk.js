import { getIndexedRowsByCoordinates } from "./dataIndex.js";
import { normalizeAxisCode } from "./core/axisCode.js";
import { getRequiredAxisColumnIndexes as getRequiredIndexes } from "./core/axisColumns.js";
import { formatBasisPointsValue, formatMetricValue, formatSignedMetricValue } from "./core/formatting.js?v=20260710-bp-format";
import { getReferenceColumns, parseNumericValue } from "./core/referenceColumns.js";

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

export const COST_OF_RISK_TABLE_ID = "F_12.01";
export const COST_OF_RISK_STAGE_TRANSFER_TABLE_ID = "F_12.02";
const COST_OF_RISK_STAGE_EXPOSURE_TABLE_ID = "F_04.04.1";
const COST_OF_RISK_STAGE_BOX_TABLE_ID = "F_18.00";
// F_18.00 gross carrying amount, split by stage on the x-axis: stage 2 is
// reported as two separate rows (performing / non-performing) that must be
// summed to get the total stage 2 exposure.
const COST_OF_RISK_STAGE_BOX_X_CODES = {
  "1": ["56"],
  "2": ["57", "109"],
  "3": ["121"]
};
const COST_OF_RISK_STAGE_BOX_DESCRIPTION_PREFIX = "Debt instruments other than held for trading";
export const COST_OF_RISK_X_AXIS_CODE = "0020";
export const COST_OF_RISK_FILTER_ALL = "__all__";
const COST_OF_RISK_F02_TABLE_ID = "F_02.00";
const COST_OF_RISK_F02_X_AXIS_CODE = "0010";
const COST_OF_RISK_F02_Y_AXIS_CODE = "0460";
const COST_OF_RISK_TOTAL_Y_AXIS_CODE = "0520";
export const COST_OF_RISK_WATERFALL_X_CODES = ["0020", "0030", "0040", "0050", "0070", "0080", "0090", "0110", "0120", "0125"];
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
const COST_OF_RISK_STAGE_EXPOSURE_X_CODES = [
  { label: "Stage 1", stage: "Stage 1", xCode: "0015" },
  { label: "Stage 2", stage: "Stage 2", xCode: "0030" },
  { label: "Stage 3", stage: "Stage 3", xCode: "0040" }
];
const COST_OF_RISK_STAGE_TRANSFER_STAGE_LABELS = {
  "1": "Stage 1",
  "2": "Stage 2",
  "3": "Stage 3"
};
const COST_OF_RISK_WRITE_OFF_X_CODES = ["0080", "0120"];
const ALL_STAGES_LABEL = "all stages + POCI";
const CACHE_KEY_SEPARATOR = "\u001f";
const COST_OF_RISK_SERIES_CACHE = new WeakMap();

export const COST_OF_RISK_CONFIG = {
  denominator: {
    label: "Gross carrying amount - loans and advances - all stages + POCI",
    points: [
      {
        label: "Loans and advances - stage 1",
        sign: 1,
        xCode: "0015",
        yCode: "0070",
        zCode: ""
      },
      {
        label: "Loans and advances - stage 2",
        sign: 1,
        xCode: "0030",
        yCode: "0070",
        zCode: ""
      },
      {
        label: "Loans and advances - stage 3",
        sign: 1,
        xCode: "0040",
        yCode: "0070",
        zCode: ""
      },
      {
        label: "Loans and advances - POCI",
        sign: 1,
        xCode: "0041",
        yCode: "0070",
        zCode: ""
      }
    ],
    tableId: "F_04.04.1"
  },
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

export function getCostOfRiskSelectionOptions(state) {
  const yMappings = getCostOfRiskYMappings(state);
  const descriptors = yMappings.map(describeCostOfRiskYAxisPoint);
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
  const descriptors = getCostOfRiskYMappings(state).map(describeCostOfRiskYAxisPoint);

  return {
    assets: createCostOfRiskFilterOptions(ASSET_LABELS, formatCostOfRiskAssetLabel),
    counterparties: createCostOfRiskFilterOptions(COUNTERPARTY_LABELS, formatCostOfRiskCounterpartyLabel),
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
  const xLabels = getCostOfRiskXAxisLabelMap(state);
  return COST_OF_RISK_WATERFALL_X_CODES.map((code) => ({
    code,
    label: xLabels.get(code) ?? code
  }));
}

export function buildCostOfRiskSelectionValue(state, selectionId, xAxisCode = COST_OF_RISK_X_AXIS_CODE, referenceDate = "") {
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

  const series = buildCostOfRiskSelectionSeries(state, indexes, referenceColumns, selectedOption, selectedXCode, state.selectedJst);
  const referenceIndex = getCostOfRiskReferenceIndex(referenceColumns, referenceDate);
  const selectedPoint = series[referenceIndex];

  return {
    benchmarkSeries: buildCostOfRiskBenchmarkSeries(state, indexes, referenceColumns, selectedOption, selectedXCode),
    denominator: selectedPoint?.denominator ?? null,
    denominatorLabel: COST_OF_RISK_CONFIG.denominator.label,
    option: selectedOption,
    ratioBasisPoints: selectedPoint?.ratioBasisPoints ?? null,
    referenceDate: selectedPoint?.label ?? "",
    series,
    value: selectedPoint?.value ?? null
  };
}

export function buildCostOfRiskFilteredSelectionValue(state, filters, xAxisCode = COST_OF_RISK_X_AXIS_CODE, referenceDate = "") {
  return buildCostOfRiskSelectionSnapshot(state, buildCostOfRiskSelectionFromFilters(state, filters), xAxisCode, referenceDate);
}

export function buildCostOfRiskF02ImpairmentRatio(state, referenceDate = "") {
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
  const denominatorSeries = sumConfiguredPointSeriesValues(
    state,
    indexes,
    referenceColumns,
    COST_OF_RISK_CONFIG.denominator.tableId,
    COST_OF_RISK_CONFIG.denominator.points,
    state.selectedJst
  );
  const referenceIndex = getCostOfRiskReferenceIndex(referenceColumns, referenceDate);
  const value = quarterlyValueSeries[referenceIndex] ?? null;
  const denominator = denominatorSeries[referenceIndex] ?? null;

  return {
    denominator,
    label: "F_02.00 y_axis 0460",
    ratioBasisPoints: denominator ? (value / denominator) * 10000 : null,
    referenceDate: referenceColumns[referenceIndex]?.label ?? "",
    value
  };
}

export function buildCostOfRiskF02ImpairmentSeries(state) {
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
  const denominatorSeries = sumConfiguredPointSeriesValues(
    state,
    indexes,
    referenceColumns,
    COST_OF_RISK_CONFIG.denominator.tableId,
    COST_OF_RISK_CONFIG.denominator.points,
    state.selectedJst
  );

  return {
    points: referenceColumns.map((referenceColumn, index) => {
      const value = quarterlyValueSeries[index] ?? null;
      const signedValue = Number.isFinite(value) ? -value : value;
      const denominator = denominatorSeries[index] ?? null;

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

  const denominatorSeries = sumConfiguredPointSeriesValues(
    state,
    indexes,
    referenceColumns,
    COST_OF_RISK_CONFIG.denominator.tableId,
    COST_OF_RISK_CONFIG.denominator.points,
    state.selectedJst
  );
  const referenceIndex = getCostOfRiskReferenceIndex(referenceColumns, referenceDate);
  const denominator = denominatorSeries[referenceIndex] ?? 0;
  const xLabels = getCostOfRiskXAxisLabelMap(state);
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
    const value = quarterlyValueSeries[referenceIndex] ?? 0;

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

export function buildCostOfRiskF12ContributionSeries(state, filters, selectedXCodes = COST_OF_RISK_WATERFALL_X_CODES) {
  const indexes = getRequiredIndexes(state.columns);
  const referenceColumns = getReferenceColumns(state.columns);
  const selectedOption = buildCostOfRiskSelectionFromFilters(state, filters);
  const selectedCodeSet = new Set((selectedXCodes ?? []).map((code) => normalizeAxisCode(code, "x")));

  if (!indexes || !state.selectedJst || referenceColumns.length === 0 || selectedOption.points.length === 0 || selectedCodeSet.size === 0) {
    return { points: [], status: "Load a CSV and select a core definition." };
  }

  const rawValueSeries = createEmptySeries(referenceColumns.length);
  COST_OF_RISK_WATERFALL_X_CODES.filter((xCode) => selectedCodeSet.has(xCode)).forEach((xCode) => {
    selectedOption.points.forEach((yCode) => {
      addSeriesValues(rawValueSeries, getPointSeriesValues(state, indexes, referenceColumns, COST_OF_RISK_TABLE_ID, {
        xCode,
        yCode,
        zCode: ""
      }, state.selectedJst));
    });
  });

  const quarterlyValueSeries = decumulateQuarterlySeries(referenceColumns, rawValueSeries);
  const denominatorSeries = sumConfiguredPointSeriesValues(
    state,
    indexes,
    referenceColumns,
    COST_OF_RISK_CONFIG.denominator.tableId,
    COST_OF_RISK_CONFIG.denominator.points,
    state.selectedJst
  );

  return {
    points: referenceColumns.map((referenceColumn, index) => {
      const value = quarterlyValueSeries[index] ?? null;
      const denominator = denominatorSeries[index] ?? null;

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

export function buildCostOfRiskF2VsF12Audit(state, filters, selectedXCodes = COST_OF_RISK_WATERFALL_X_CODES) {
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
  const denominatorRows = COST_OF_RISK_CONFIG.denominator.points.map((point) => ({
    label: point.label,
    source: `${COST_OF_RISK_CONFIG.denominator.tableId} / x ${point.xCode} / y ${point.yCode}`,
    type: "amount",
    values: getPointSeriesValues(state, indexes, referenceColumns, COST_OF_RISK_CONFIG.denominator.tableId, point, state.selectedJst)
  }));
  const denominatorSeries = createEmptySeries(referenceColumns.length);
  denominatorRows.forEach((row) => addSeriesValues(denominatorSeries, row.values));
  const f2RatioSeries = referenceColumns.map((_, index) => {
    const denominator = denominatorSeries[index] ?? null;
    return denominator ? (f2QuarterlySeries[index] / denominator) * 10000 : null;
  });
  const xLabels = getCostOfRiskXAxisLabelMap(state);
  const selectedXList = COST_OF_RISK_WATERFALL_X_CODES.filter((xCode) => selectedCodeSet.has(xCode));
  const f12Rows = selectedXList.map((xCode) => {
    const rawSeries = createEmptySeries(referenceColumns.length);
    selectedOption.points.forEach((yCode) => {
      addSeriesValues(rawSeries, getPointSeriesValues(state, indexes, referenceColumns, COST_OF_RISK_TABLE_ID, {
        xCode,
        yCode,
        zCode: ""
      }, state.selectedJst));
    });
    const quarterlyValues = decumulateQuarterlySeries(referenceColumns, rawSeries);

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
    const denominator = denominatorSeries[index] ?? null;
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
        values: f2QuarterlySeries
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
        source: COST_OF_RISK_CONFIG.denominator.label,
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
  const exposureYSelection = getCostOfRiskStageExposureYSelection(state, filters);
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
    globalVariation: buildCostOfRiskStageGlobalVariation(state, indexes, referenceColumns, exposureYSelection, selectedStage, referenceIndex),
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
  const exposureYSelection = getCostOfRiskStageExposureYSelection(state, filters);
  const referenceIndex = getCostOfRiskReferenceIndex(referenceColumns, referenceDate);
  const selectedReference = referenceColumns[referenceIndex] ?? null;

  if (!indexes || !state.selectedJst || !selectedReference) {
    return {
      assetLabel: ySelection.label,
      flows: [],
      referenceDate: "",
      residuals: [],
      status: "No F_12.02 stage transfer data is available.",
      totalPreviousExposure: null,
      writeOffs: []
    };
  }

  if (ySelection.codes.length === 0) {
    return {
      assetLabel: ySelection.label,
      flows: [],
      referenceDate: selectedReference.label,
      residuals: [],
      status: "No matching F_12.02 Y-axis point is available for the selected filters.",
      totalPreviousExposure: null,
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
    buildCostOfRiskStageGlobalVariation(state, indexes, referenceColumns, exposureYSelection, stage, referenceIndex)
  ));
  const previousExposureValues = stageVariations
    .map((variation) => variation.previousValue)
    .filter((value) => Number.isFinite(value));
  const totalPreviousExposure = previousExposureValues.length
    ? previousExposureValues.reduce((total, value) => total + value, 0)
    : null;

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
    status: "",
    totalPreviousExposure,
    writeOffs: writeOffsByStage.map(({ magnitude, stage }) => ({
      label: `Write-Off Stage ${stage}`,
      stage,
      value: magnitude > 0 ? -magnitude : 0
    }))
  };
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
      points: buildCostOfRiskStageBoxPointsForJst(state, indexes, referenceColumns, xCodes, ySelection, jstCode)
    })),
    label: `Stage ${stage} - ${ySelection.label}`,
    status: ""
  };
}

function buildCostOfRiskStageBoxPointsForJst(state, indexes, referenceColumns, xCodes, ySelection, jstCode) {
  // Gross carrying amount is a stock (balance sheet) figure, not a flow, so
  // — unlike F_12.01/F_12.02 — it is used as-is, with no quarterly
  // decumulation.
  const values = createEmptySeries(referenceColumns.length);
  xCodes.forEach((xCode) => {
    ySelection.codes.forEach((yCode) => {
      addSeriesValues(values, getPointSeriesValues(state, indexes, referenceColumns, COST_OF_RISK_STAGE_BOX_TABLE_ID, {
        xCode,
        yCode,
        zCode: ""
      }, jstCode));
    });
  });

  // Same denominator as the standard Cost of Risk ratio ("the usual
  // quantity"), reused as-is per the product decision to keep this simple
  // for now.
  const denominatorSeries = sumConfiguredPointSeriesValues(
    state,
    indexes,
    referenceColumns,
    COST_OF_RISK_CONFIG.denominator.tableId,
    COST_OF_RISK_CONFIG.denominator.points,
    jstCode
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
  const exposureYSelection = getCostOfRiskStageExposureYSelection(state, filters);

  return {
    benchmarkSeries: getCostOfRiskPeerJstCodes(state).map((jstCode) => ({
      jstCode,
      points: buildCostOfRiskFlowPointsForJst(state, indexes, referenceColumns, descriptor, ySelection, exposureYSelection, filters, jstCode)
    })),
    label: getCostOfRiskFlowLabel(descriptor),
    status: ""
  };
}

function buildCostOfRiskFlowPointsForJst(state, indexes, referenceColumns, descriptor, ySelection, exposureYSelection, filters, jstCode) {
  const totalPreviousExposureByStage = ["1", "2", "3"].map((stage) => (
    computeCostOfRiskStageExposureLevels(state, indexes, referenceColumns, exposureYSelection, stage, jstCode)
  ));
  const totalExposureLevels = referenceColumns.map((_, index) => (
    totalPreviousExposureByStage.reduce((total, levels) => (
      Number.isFinite(levels[index]) ? total + levels[index] : total
    ), 0)
  ));
  const rawValues = getCostOfRiskFlowRawQuarterlyValues(state, indexes, referenceColumns, descriptor, ySelection, exposureYSelection, filters, jstCode);

  return referenceColumns.map((column, index) => {
    const value = rawValues[index] ?? null;
    const denominator = totalExposureLevels[index] ?? null;
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

function getCostOfRiskFlowRawQuarterlyValues(state, indexes, referenceColumns, descriptor, ySelection, exposureYSelection, filters, jstCode) {
  if (descriptor.type === "transfer") {
    return computeCostOfRiskTransferFlowQuarterlySeries(state, indexes, referenceColumns, ySelection, descriptor.code, jstCode);
  }

  if (descriptor.type === "writeoff") {
    const magnitudes = computeCostOfRiskWriteOffQuarterlySeriesForStage(state, indexes, referenceColumns, filters, descriptor.stage, jstCode);
    return magnitudes.map((magnitude) => (magnitude > 0 ? -magnitude : 0));
  }

  const exposureLevels = computeCostOfRiskStageExposureLevels(state, indexes, referenceColumns, exposureYSelection, descriptor.stage, jstCode);
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

function computeCostOfRiskStageExposureLevels(state, indexes, referenceColumns, exposureYSelection, stage, jstCode) {
  const stageLabel = COST_OF_RISK_STAGE_TRANSFER_STAGE_LABELS[stage];
  const stageDefinition = COST_OF_RISK_STAGE_EXPOSURE_X_CODES.find((definition) => definition.stage === stageLabel);
  if (!stageDefinition || exposureYSelection.codes.length === 0) return referenceColumns.map(() => null);

  const values = createEmptySeries(referenceColumns.length);
  exposureYSelection.codes.forEach((yCode) => {
    addSeriesValues(values, getPointSeriesValues(state, indexes, referenceColumns, COST_OF_RISK_STAGE_EXPOSURE_TABLE_ID, {
      xCode: stageDefinition.xCode,
      yCode,
      zCode: ""
    }, jstCode));
  });
  return values;
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

function getCostOfRiskWriteOffPointsByStage(state, filters = {}) {
  const descriptors = getCostOfRiskYMappings(state).map(describeCostOfRiskYAxisPoint);
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

function buildCostOfRiskStageGlobalVariation(state, indexes, referenceColumns, ySelection, stage, referenceIndex) {
  const stageLabel = COST_OF_RISK_STAGE_TRANSFER_STAGE_LABELS[stage] ?? "Stage 3";
  const stageDefinition = COST_OF_RISK_STAGE_EXPOSURE_X_CODES.find((definition) => definition.stage === stageLabel);
  if (!stageDefinition || !indexes || referenceIndex <= 0 || ySelection.codes.length === 0) {
    return {
      label: `${stageLabel} delta`,
      value: null
    };
  }

  const values = createEmptySeries(referenceColumns.length);
  ySelection.codes.forEach((yCode) => {
    addSeriesValues(values, getPointSeriesValues(state, indexes, referenceColumns, COST_OF_RISK_STAGE_EXPOSURE_TABLE_ID, {
      xCode: stageDefinition.xCode,
      yCode,
      zCode: ""
    }, state.selectedJst));
  });

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

function buildCostOfRiskSelectionSnapshot(state, selectedOption, xAxisCode, referenceDate = "") {
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

  const series = buildCostOfRiskSelectionSeries(state, indexes, referenceColumns, selectedOption, selectedXCode, state.selectedJst);
  const referenceIndex = getCostOfRiskReferenceIndex(referenceColumns, referenceDate);
  const selectedPoint = series[referenceIndex];

  return {
    benchmarkSeries: buildCostOfRiskBenchmarkSeries(state, indexes, referenceColumns, selectedOption, selectedXCode),
    denominator: selectedPoint?.denominator ?? null,
    denominatorLabel: COST_OF_RISK_CONFIG.denominator.label,
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

  if (!hasConfiguredPoints(config.numerator) || !hasConfiguredPoints(config.denominator)) {
    return {
      benchmarkRows: [],
      denominator: null,
      numerator: null,
      ratio: null,
      referenceColumns,
      status: "Cost of risk configuration is ready. Add numerator and denominator points to compute the ratio."
    };
  }

  const numerator = buildConfiguredAggregate(state, indexes, referenceColumns, config.numerator, state.selectedJst);
  const denominator = buildConfiguredAggregate(state, indexes, referenceColumns, config.denominator, state.selectedJst);

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

function getCostOfRiskStageTransferYSelection(state, filters = {}) {
  return getCostOfRiskStageAxisYSelection(state, filters, {
    tableId: COST_OF_RISK_STAGE_TRANSFER_TABLE_ID,
    totalLabel: "Total debt instruments"
  });
}

function getCostOfRiskStageExposureYSelection(state, filters = {}) {
  return getCostOfRiskStageAxisYSelection(state, filters, {
    tableId: COST_OF_RISK_STAGE_EXPOSURE_TABLE_ID,
    totalLabel: "Financial assets at amortised cost"
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
    && (!counterparty || descriptor.counterparty === counterparty)
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
    filters.asset ? formatCostOfRiskAssetLabel(filters.asset) : "All accounting types",
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

function getAvailableCostOfRiskStages(descriptors) {
  const stages = ["Stage 1", "Stage 2", "Stage 3", "POCI"];
  return stages.filter((stage) => descriptors.some((descriptor) => descriptor.stage === stage));
}

function buildCostOfRiskSelectionFromFilters(state, filters = {}) {
  const descriptors = getCostOfRiskYMappings(state).map(describeCostOfRiskYAxisPoint);
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
    && (!filters.counterparty || descriptor.counterparty === filters.counterparty)
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
  return value === counterparty || String(value ?? "").startsWith(`${counterparty} `);
}

function createCostOfRiskFilteredSelectionLabel(filters) {
  return [
    filters.asset ? formatCostOfRiskAssetLabel(filters.asset) : "All accounting types",
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
  return COUNTERPARTY_SHORT_LABELS.get(counterparty) ?? counterparty;
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
    groupLabel: "Aggregations - all exposure types",
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
  return "Aggregations - all exposure types";
}

function createCostOfRiskAggregateLabel(criteria) {
  const segments = [
    criteria.asset ? formatCostOfRiskAssetLabel(criteria.asset) : "All exposure types",
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
  if (!hasConfiguredPoints(config.numerator) || !hasConfiguredPoints(config.denominator)) return [];

  return getCostOfRiskPeerJstCodes(state).map((jstCode) => {
    const numerator = buildConfiguredAggregate(state, indexes, referenceColumns, config.numerator, jstCode);
    const denominator = buildConfiguredAggregate(state, indexes, referenceColumns, config.denominator, jstCode);

    return {
      denominator,
      jstCode,
      numerator,
      ratio: buildRatioSeries(referenceColumns, numerator, denominator)
    };
  });
}

function buildCostOfRiskBenchmarkSeries(state, indexes, referenceColumns, selectedOption, xAxisCode) {
  return getCostOfRiskPeerJstCodes(state).map((jstCode) => ({
    jstCode,
    points: buildCostOfRiskSelectionSeries(state, indexes, referenceColumns, selectedOption, xAxisCode, jstCode)
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

function buildCostOfRiskSelectionSeries(state, indexes, referenceColumns, selectedOption, xAxisCode, jstCode) {
  const valueSeries = createEmptySeries(referenceColumns.length);
  selectedOption.points.forEach((yCode) => {
    addSeriesValues(valueSeries, getPointSeriesValues(state, indexes, referenceColumns, COST_OF_RISK_TABLE_ID, {
        xCode: xAxisCode,
        yCode
      }, jstCode));
  });
  const quarterlyValueSeries = decumulateQuarterlySeries(referenceColumns, valueSeries);
  const denominatorSeries = sumConfiguredPointSeriesValues(
    state,
    indexes,
    referenceColumns,
    COST_OF_RISK_CONFIG.denominator.tableId,
    COST_OF_RISK_CONFIG.denominator.points,
    jstCode
  );

  return referenceColumns.map((column, index) => {
    const value = quarterlyValueSeries[index] ?? 0;
    const denominator = denominatorSeries[index] ?? 0;
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
  return {
    label: "Cost of risk ratio",
    values: referenceColumns.map((column, index) => {
      const numeratorValue = numerator.values[index]?.value ?? null;
      const denominatorValue = denominator.values[index]?.value ?? null;

      return {
        date: column.date,
        label: column.label,
        value: denominatorValue ? numeratorValue / denominatorValue : null
      };
    })
  };
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
