import { getRequiredAxisColumnIndexes as getRequiredIndexes } from "../core/axisColumns.js";
import { getReferenceColumns } from "../core/referenceColumns.js";
import {
  DEFAULT_COST_OF_RISK_COVERAGE_RATIO_CELL
} from "./definitions.js";
import {
  buildCostOfRiskRatioComponentDrivers,
  buildCostOfRiskStageSummarySeries,
  createCostOfRiskRatioDriverCellKey,
  createCostOfRiskStageRatioCell,
  decomposeCostOfRiskStageRatioChange,
  getCostOfRiskPeerJstCodes,
  getCostOfRiskRatioDriverPointValue,
  getCostOfRiskReferenceIndex,
  getCostOfRiskStageBoxYSelection,
  getCostOfRiskStageRatioMetricValue,
  normalizeCostOfRiskFilters,
  parseCostOfRiskRatioDriverCellParts
} from "./core.js";

export function buildCostOfRiskCoverageRatioModel(state, filters, referenceDate = "", selectedCellKey = DEFAULT_COST_OF_RISK_COVERAGE_RATIO_CELL) {
  const indexes = getRequiredIndexes(state.columns);
  const referenceColumns = getReferenceColumns(state.columns);
  const ratioFilters = filters;
  const selectedStageDefinition = getCostOfRiskCoverageRatioDefinitionForFilters(ratioFilters);

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
  const parsedSelectedCell = parseCostOfRiskCoverageRatioCellKey(selectedCellKey)
    ?? parseCostOfRiskCoverageRatioCellKey(DEFAULT_COST_OF_RISK_COVERAGE_RATIO_CELL);
  const selectedCell = normalizeCostOfRiskCoverageRatioCellForFilters(parsedSelectedCell, ratioFilters);
  const rows = buildCostOfRiskCoverageRatioRowsForJst(state, indexes, referenceColumns, ySelection, state.selectedJst, referenceIndex, ratioFilters);

  return {
    benchmarkSeries: getCostOfRiskPeerJstCodes(state).map((jstCode) => ({
      jstCode,
      points: buildCostOfRiskCoverageRatioPointsForJst(state, indexes, referenceColumns, ySelection, jstCode, selectedCell)
    })),
    filterLabel: ySelection.label,
    referenceDate: referenceLabel,
    rows,
    selectedCell,
    status: ""
  };
}

function buildCostOfRiskCoverageRatioRowsForJst(state, indexes, referenceColumns, ySelection, jstCode, referenceIndex, filters = {}) {
  const stageDefinition = getCostOfRiskCoverageRatioDefinitionForFilters(filters);
  const selectedStage = stageDefinition ?? getCostOfRiskCoverageRatioDefinitions()[2];
  const points = buildCostOfRiskCoverageRatioPointsForJst(state, indexes, referenceColumns, ySelection, jstCode, {
    metric: "ratio",
    stageKey: selectedStage.key
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
      stage: selectedStage.stageFilter
    }, jstCode, referenceIndex, "gca", {
      aggregateEffectBasisPoints: point.denominatorEffectBasisPoints,
      currentDenominator: point.denominator,
      currentNumerator: point.numerator,
      effectType: "denominator",
      previousDenominator: point.previousDenominator,
      previousNumerator: point.previousNumerator
    }),
    key: selectedStage.key,
    label: selectedStage.rowLabel ?? selectedStage.label,
    numeratorDrivers: buildCostOfRiskRatioComponentDrivers(state, indexes, referenceColumns, {
      ...filters,
      stage: selectedStage.stageFilter
    }, jstCode, referenceIndex, "allowances", {
      aggregateEffectBasisPoints: point.numeratorEffectBasisPoints,
      currentDenominator: point.denominator,
      currentNumerator: point.numerator,
      effectType: "numerator",
      previousDenominator: point.previousDenominator,
      previousNumerator: point.previousNumerator
    }),
    previousDenominator: point.previousDenominator ?? null,
    previousNumerator: point.previousNumerator ?? null,
    stageKey: selectedStage.key
  }];
}

function buildCostOfRiskCoverageRatioPointsForJst(state, indexes, referenceColumns, ySelection, jstCode, selectedCell) {
  const stageDefinition = getCostOfRiskCoverageRatioDefinitions().find((candidate) => candidate.key === selectedCell.stageKey)
    ?? getCostOfRiskCoverageRatioDefinitions()[2];
  const numeratorSeries = buildCostOfRiskStageSummarySeries(state, indexes, referenceColumns, ySelection, jstCode, "allowances", stageDefinition.stageKey);
  const denominatorSeries = buildCostOfRiskStageSummarySeries(state, indexes, referenceColumns, ySelection, jstCode, "gca", stageDefinition.stageKey);

  return referenceColumns.map((column, index) => {
    const numerator = numeratorSeries[index] ?? null;
    const denominator = denominatorSeries[index] ?? null;
    const previousNumerator = index > 0 ? numeratorSeries[index - 1] ?? null : null;
    const previousDenominator = index > 0 ? denominatorSeries[index - 1] ?? null : null;
    const decomposition = decomposeCostOfRiskStageRatioChange(numerator, denominator, previousNumerator, previousDenominator);
    const ratioBasisPoints = Number.isFinite(numerator) && Number.isFinite(denominator) && denominator !== 0
      ? (numerator / denominator) * 10000
      : null;
    const driverValue = selectedCell.driver
      ? getCostOfRiskRatioDriverPointValue(state, indexes, referenceColumns, {
        ...filters,
        stage: stageDefinition.stageFilter
      }, jstCode, index, selectedCell.driver.effectType === "denominator" ? "gca" : "allowances", selectedCell.driver, {
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
      denominatorDelta: Number.isFinite(denominator) && Number.isFinite(previousDenominator) ? denominator - previousDenominator : null,
      numerator,
      numeratorDelta: Number.isFinite(numerator) && Number.isFinite(previousNumerator) ? numerator - previousNumerator : null,
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

function getCostOfRiskCoverageRatioDefinitions() {
  return [
    { key: "stage1", label: "Stage 1 coverage", rowLabel: "Stage 1", stageFilter: "Stage 1", stageKey: "stage1" },
    { key: "stage2", label: "Stage 2 coverage", rowLabel: "Stage 2", stageFilter: "Stage 2", stageKey: "stage2" },
    { key: "stage3", label: "Stage 3 coverage", rowLabel: "Stage 3", stageFilter: "Stage 3", stageKey: "stage3" },
    { key: "poci", label: "POCI coverage", rowLabel: "POCI", stageFilter: "POCI", stageKey: "poci" },
    { key: "performing", label: "Performing coverage", rowLabel: "Performing", stageFilter: "Performing", stageKey: "performing" },
    { key: "nonperforming", label: "Non-performing coverage", rowLabel: "Non-performing", stageFilter: "Non-performing", stageKey: "nonperforming" }
  ];
}

function normalizeCostOfRiskCoverageRatioCellForFilters(selectedCell, filters = {}) {
  const selectedStage = getCostOfRiskCoverageRatioDefinitionForFilters(filters);
  const stageKey = selectedStage?.key ?? (getCostOfRiskCoverageRatioDefinitions().some((definition) => definition.key === selectedCell?.stageKey)
    ? selectedCell.stageKey
    : "stage3");
  const metric = selectedCell?.metric ?? "ratio";

  return {
    driver: selectedCell?.driver ?? null,
    key: selectedCell?.driver ? createCostOfRiskRatioDriverCellKey(stageKey, metric, selectedCell.driver) : `${stageKey}:${metric}`,
    metric,
    stageKey
  };
}

function getCostOfRiskCoverageRatioDefinitionForFilters(filters = {}) {
  const normalizedFilters = normalizeCostOfRiskFilters(filters);
  return getCostOfRiskCoverageRatioDefinitions().find((definition) => definition.stageFilter === normalizedFilters.stage) ?? null;
}

function parseCostOfRiskCoverageRatioCellKey(cellKey) {
  const parts = String(cellKey ?? "").split(":");
  const [stageKey, metric] = parts;
  const legacyMetricMap = {
    denominator: "denominatorEffect",
    numerator: "numeratorEffect"
  };
  const normalizedMetric = legacyMetricMap[metric] ?? metric;
  const driver = parseCostOfRiskRatioDriverCellParts(parts);
  const isStage = getCostOfRiskCoverageRatioDefinitions().some((row) => row.key === stageKey);
  const isMetric = [
    "denominatorDelta",
    "denominatorEffect",
    "denominatorLevel",
    "numeratorDelta",
    "numeratorEffect",
    "numeratorLevel",
    "ratio",
    "variation"
  ].includes(normalizedMetric);
  if (!isStage || !isMetric) return null;
  return {
    driver,
    key: driver ? createCostOfRiskRatioDriverCellKey(stageKey, normalizedMetric, driver) : `${stageKey}:${normalizedMetric}`,
    metric: normalizedMetric,
    stageKey
  };
}
