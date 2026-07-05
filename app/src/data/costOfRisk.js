import { getIndexedRowsByCoordinates } from "./dataIndex.js";
import { normalizeAxisCode } from "./module2Config.js";

const REFERENCE_COLUMN_PATTERN = /^ref_(\d{4})_(\d{2})_(\d{2})$/;
export const COST_OF_RISK_TABLE_ID = "F_12.01";
export const COST_OF_RISK_X_AXIS_CODE = "0020";
export const COST_OF_RISK_FILTER_ALL = "__all__";
const COST_OF_RISK_F02_TABLE_ID = "F_02.00";
const COST_OF_RISK_F02_X_AXIS_CODE = "0010";
const COST_OF_RISK_F02_Y_AXIS_CODE = "0460";
const COST_OF_RISK_TOTAL_Y_AXIS_CODE = "0520";
export const COST_OF_RISK_WATERFALL_X_CODES = ["0020", "0030", "0040", "0050", "0070", "0090", "0110", "0120"];
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

function getRequiredIndexes(columns) {
  const indexes = {
    jstCode: columns.indexOf("jst_code"),
    tableId: columns.indexOf("table_id"),
    xAxisRcCode: columns.indexOf("x_axis_rc_code"),
    yAxisRcCode: columns.indexOf("y_axis_rc_code"),
    zAxisRcCode: columns.indexOf("z_axis_rc_code")
  };

  return [indexes.jstCode, indexes.tableId, indexes.xAxisRcCode, indexes.yAxisRcCode]
    .every((index) => index !== -1)
    ? indexes
    : null;
}

function getReferenceColumns(columns) {
  return columns
    .map((name, index) => {
      const match = String(name).match(REFERENCE_COLUMN_PATTERN);
      if (!match) return null;

      const [, year, month, day] = match;
      const date = new Date(Number(year), Number(month) - 1, Number(day));
      return {
        date,
        index,
        label: new Intl.DateTimeFormat("fr-FR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric"
        }).format(date)
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.date - right.date);
}

function parseNumericValue(value) {
  const parsed = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}
