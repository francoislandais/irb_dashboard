import { getRequiredAxisColumnIndexes as getRequiredIndexes } from "../core/axisColumns.js";
import { getReferenceColumns } from "../core/referenceColumns.js";
import {
  COST_OF_RISK_FILTER_ALL,
  DEFAULT_COST_OF_RISK_STAGE_RATIO_CELL
} from "./definitions.js";
import {
  buildCostOfRiskRatioComponentDrivers,
  createCostOfRiskRatioDriverCellKey,
  createCostOfRiskStageRatioCell,
  decomposeCostOfRiskStageRatioChange,
  getCostOfRiskPeerJstCodes,
  getCostOfRiskRatioDenominatorSeries,
  getCostOfRiskRatioDriverPointValue,
  getCostOfRiskReferenceIndex,
  getCostOfRiskStageBoxYSelection,
  getCostOfRiskStageRatioMetricValue,
  normalizeCostOfRiskFilters,
  parseCostOfRiskRatioDriverCellParts
} from "./core.js";

export function buildCostOfRiskStageRatioModel(state, filters, referenceDate = "", selectedCellKey = DEFAULT_COST_OF_RISK_STAGE_RATIO_CELL) {
  const indexes = getRequiredIndexes(state.columns);
  const referenceColumns = getReferenceColumns(state.columns);
  const ratioFilters = filters;
  const selectedStageDefinition = getCostOfRiskStageRatioDefinitionForFilters(ratioFilters);

  if (!indexes || !state.selectedJst || referenceColumns.length === 0) {
    return { benchmarkSeries: [], rows: [], selectedCell: null, status: "Load a CSV and select a JST." };
  }

  if (!selectedStageDefinition) {
    const referenceIndex = getCostOfRiskReferenceIndex(referenceColumns, referenceDate);
    return {
      benchmarkSeries: [],
      filterLabel: "",
      needsStageSelection: true,
      referenceDate: referenceColumns[referenceIndex]?.label ?? "",
      rows: [],
      selectedCell: null,
      status: "This tab is stage or performing status specific. Select one of the following:"
    };
  }

  const ySelection = getCostOfRiskStageBoxYSelection(state, ratioFilters);
  if (ySelection.codes.length === 0) {
    return {
      benchmarkSeries: [],
      rows: [],
      selectedCell: null,
      status: "No matching F_18.00 Y-axis point is available for the selected filters."
    };
  }

  const referenceIndex = getCostOfRiskReferenceIndex(referenceColumns, referenceDate);
  const referenceLabel = referenceColumns[referenceIndex]?.label ?? "";
  const parsedSelectedCell = parseCostOfRiskStageRatioCellKey(selectedCellKey)
    ?? parseCostOfRiskStageRatioCellKey(DEFAULT_COST_OF_RISK_STAGE_RATIO_CELL);
  const selectedCell = normalizeCostOfRiskStageRatioCellForFilters(parsedSelectedCell, ratioFilters);
  const rows = buildCostOfRiskStageRatioRowsForJst(state, indexes, referenceColumns, ratioFilters, state.selectedJst, referenceIndex);

  return {
    benchmarkSeries: getCostOfRiskPeerJstCodes(state).map((jstCode) => ({
      jstCode,
      points: buildCostOfRiskStageRatioPointsForJst(state, indexes, referenceColumns, ratioFilters, jstCode, selectedCell)
    })),
    filterLabel: ySelection.label,
    referenceDate: referenceLabel,
    rows,
    selectedCell,
    status: ""
  };
}

function buildCostOfRiskStageRatioRowsForJst(state, indexes, referenceColumns, filters, jstCode, referenceIndex) {
  const stageDefinition = getCostOfRiskStageRatioDefinitionForFilters(filters);
  if (!stageDefinition) return [];

  const points = buildCostOfRiskStageRatioPointsForJst(state, indexes, referenceColumns, filters, jstCode, {
    metric: "ratio",
    stageKey: stageDefinition.key
  });
  const point = points[referenceIndex] ?? {};
  const numeratorDelta = Number.isFinite(point.numerator) && Number.isFinite(point.previousNumerator)
    ? point.numerator - point.previousNumerator
    : null;
  const denominatorDelta = Number.isFinite(point.denominator) && Number.isFinite(point.previousDenominator)
    ? point.denominator - point.previousDenominator
    : null;

  return [{
    cells: {
      denominatorDelta: createCostOfRiskStageRatioCell(denominatorDelta),
      denominatorEffect: createCostOfRiskStageRatioCell(point.denominatorEffectBasisPoints),
      denominatorLevel: createCostOfRiskStageRatioCell(point.denominator),
      numeratorDelta: createCostOfRiskStageRatioCell(numeratorDelta),
      numeratorEffect: createCostOfRiskStageRatioCell(point.numeratorEffectBasisPoints),
      numeratorLevel: createCostOfRiskStageRatioCell(point.numerator),
      ratio: createCostOfRiskStageRatioCell(point.ratioBasisPoints),
      variation: createCostOfRiskStageRatioCell(point.variationBasisPoints)
    },
    currentDenominator: point.denominator ?? null,
    currentNumerator: point.numerator ?? null,
    denominatorDrivers: buildCostOfRiskRatioComponentDrivers(state, indexes, referenceColumns, {
      ...filters,
      stage: COST_OF_RISK_FILTER_ALL
    }, jstCode, referenceIndex, "gca", {
      aggregateEffectBasisPoints: point.denominatorEffectBasisPoints,
      currentDenominator: point.denominator,
      currentNumerator: point.numerator,
      effectType: "denominator",
      previousDenominator: point.previousDenominator,
      previousNumerator: point.previousNumerator
    }),
    key: stageDefinition.key,
    label: stageDefinition.rowLabel ?? stageDefinition.label,
    numeratorDrivers: buildCostOfRiskRatioComponentDrivers(state, indexes, referenceColumns, {
      ...filters,
      stage: stageDefinition.stageFilter
    }, jstCode, referenceIndex, "gca", {
      aggregateEffectBasisPoints: point.numeratorEffectBasisPoints,
      currentDenominator: point.denominator,
      currentNumerator: point.numerator,
      effectType: "numerator",
      previousDenominator: point.previousDenominator,
      previousNumerator: point.previousNumerator
    }),
    previousDenominator: point.previousDenominator ?? null,
    previousNumerator: point.previousNumerator ?? null,
    stageKey: stageDefinition.key
  }];
}

function buildCostOfRiskStageRatioPointsForJst(state, indexes, referenceColumns, filters, jstCode, selectedCell) {
  const stageDefinition = getCostOfRiskStageRatioDefinitions().find((candidate) => candidate.key === selectedCell.stageKey)
    ?? getCostOfRiskStageRatioDefinitions()[1];
  const numeratorSeries = getCostOfRiskRatioDenominatorSeries(state, indexes, referenceColumns, jstCode, {
    ...filters,
    stage: stageDefinition.stageFilter
  });
  const denominatorSeries = getCostOfRiskRatioDenominatorSeries(state, indexes, referenceColumns, jstCode, {
    ...filters,
    stage: COST_OF_RISK_FILTER_ALL
  });

  return referenceColumns.map((column, index) => {
    const numerator = numeratorSeries[index] ?? null;
    const denominator = denominatorSeries[index] ?? null;
    const previousNumerator = index > 0 ? numeratorSeries[index - 1] ?? null : null;
    const previousDenominator = index > 0 ? denominatorSeries[index - 1] ?? null : null;
    const decomposition = decomposeCostOfRiskStageRatioChange(numerator, denominator, previousNumerator, previousDenominator);
    const ratioBasisPoints = Number.isFinite(numerator) && Number.isFinite(denominator) && denominator !== 0
      ? (numerator / denominator) * 10000
      : null;
    const numeratorDelta = Number.isFinite(numerator) && Number.isFinite(previousNumerator) ? numerator - previousNumerator : null;
    const denominatorDelta = Number.isFinite(denominator) && Number.isFinite(previousDenominator) ? denominator - previousDenominator : null;
    const driverValue = selectedCell.driver
      ? getCostOfRiskRatioDriverPointValue(state, indexes, referenceColumns, {
        ...filters,
        stage: selectedCell.driver.effectType === "denominator" ? COST_OF_RISK_FILTER_ALL : stageDefinition.stageFilter
      }, jstCode, index, "gca", selectedCell.driver, {
        aggregateEffectBasisPoints: selectedCell.driver.effectType === "denominator"
          ? decomposition.denominatorEffectBasisPoints
          : decomposition.numeratorEffectBasisPoints,
        currentDenominator: denominator,
        currentNumerator: numerator,
        effectType: selectedCell.driver.effectType,
        previousDenominator,
        previousNumerator
      })
      : null;
    const metricValue = selectedCell.driver ? driverValue : getCostOfRiskStageRatioMetricValue(selectedCell.metric, {
      denominator,
      denominatorDelta,
      numerator,
      numeratorDelta,
      ratioBasisPoints
    }, decomposition);

    return {
      date: column.date,
      denominator,
      denominatorEffectBasisPoints: decomposition.denominatorEffectBasisPoints,
      label: column.label,
      numerator,
      numeratorEffectBasisPoints: decomposition.numeratorEffectBasisPoints,
      previousDenominator,
      previousNumerator,
      ratioBasisPoints: metricValue,
      value: metricValue,
      variationBasisPoints: decomposition.variationBasisPoints
    };
  });
}

function getCostOfRiskStageRatioDefinitions() {
  return [
    { key: "stage1", label: "Stage 1 ratio", rowLabel: "Stage 1", stageFilter: "Stage 1" },
    { key: "stage2", label: "Stage 2 ratio", rowLabel: "Stage 2", stageFilter: "Stage 2" },
    { key: "stage3", label: "Stage 3 ratio", rowLabel: "Stage 3", stageFilter: "Stage 3" },
    { key: "poci", label: "POCI ratio", rowLabel: "POCI", stageFilter: "POCI" },
    { key: "performing", label: "Performing ratio", rowLabel: "Performing", stageFilter: "Performing" },
    { key: "nonperforming", label: "Non-performing ratio", rowLabel: "Non-performing", stageFilter: "Non-performing" }
  ];
}

function normalizeCostOfRiskStageRatioCellForFilters(selectedCell, filters = {}) {
  const selectedStage = getCostOfRiskStageRatioDefinitionForFilters(filters);
  const stageKey = selectedStage?.key ?? (getCostOfRiskStageRatioDefinitions().some((definition) => definition.key === selectedCell?.stageKey)
    ? selectedCell.stageKey
    : "stage2");
  const metric = selectedCell?.metric ?? "ratio";

  return {
    driver: selectedCell?.driver ?? null,
    key: selectedCell?.driver ? createCostOfRiskRatioDriverCellKey(stageKey, metric, selectedCell.driver) : `${stageKey}:${metric}`,
    metric,
    stageKey
  };
}

function getCostOfRiskStageRatioDefinitionForFilters(filters = {}) {
  const normalizedFilters = normalizeCostOfRiskFilters(filters);
  return getCostOfRiskStageRatioDefinitions().find((definition) => definition.stageFilter === normalizedFilters.stage) ?? null;
}

function parseCostOfRiskStageRatioCellKey(cellKey) {
  const parts = String(cellKey ?? "").split(":");
  const [stageKey, metricOrRow, rawMetric] = parts;
  const legacyMetricMap = {
    denominator: "denominatorEffect",
    numerator: "numeratorEffect"
  };
  const driver = parseCostOfRiskRatioDriverCellParts(parts);
  const metricSource = driver ? metricOrRow : (rawMetric ?? metricOrRow);
  const metric = legacyMetricMap[metricSource] ?? metricSource;
  const isStage = getCostOfRiskStageRatioDefinitions().some((row) => row.key === stageKey);
  const isMetric = [
    "denominatorDelta",
    "denominatorEffect",
    "denominatorLevel",
    "numeratorDelta",
    "numeratorEffect",
    "numeratorLevel",
    "ratio",
    "variation"
  ].includes(metric);
  if (!isStage || !isMetric) return null;
  return {
    driver,
    key: driver ? createCostOfRiskRatioDriverCellKey(stageKey, metric, driver) : `${stageKey}:${metric}`,
    metric,
    stageKey
  };
}
