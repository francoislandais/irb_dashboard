import { getRequiredAxisColumnIndexes as getRequiredIndexes } from "../core/axisColumns.js";
import { getReferenceColumns } from "../core/referenceColumns.js";
import {
  COST_OF_RISK_BALANCE_SCOPE_IN_BALANCE,
  COST_OF_RISK_FILTER_ALL,
  DEFAULT_COST_OF_RISK_COLLATERAL_RATIO_CELL
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
  parseCostOfRiskRatioDriverCellParts,
  resolveCostOfRiskDenominatorPointsSeries
} from "./core.js";

export function buildCostOfRiskCollateralRatioModel(state, filters, referenceDate = "", selectedCellKey = DEFAULT_COST_OF_RISK_COLLATERAL_RATIO_CELL) {
  const indexes = getRequiredIndexes(state.columns);
  const referenceColumns = getReferenceColumns(state.columns);
  const ratioFilters = filters;
  const selectedStatusDefinition = getCostOfRiskCollateralRatioDefinitionForFilters(ratioFilters);

  if (!indexes || !state.selectedJst || referenceColumns.length === 0) {
    return { benchmarkSeries: [], rows: [], selectedCell: null, status: "Load a CSV and select a JST." };
  }

  if (!selectedStatusDefinition) {
    const referenceIndex = getCostOfRiskReferenceIndex(referenceColumns, referenceDate);
    return {
      benchmarkSeries: [],
      filterLabel: "",
      needsCollateralStatusSelection: true,
      referenceDate: referenceColumns[referenceIndex]?.label ?? "",
      rows: [],
      selectedCell: null,
      status: "Collateral information in F_18.00 is available for total, performing and non-performing exposures. Select one of the following:"
    };
  }

  const normalizedFilters = normalizeCostOfRiskFilters(ratioFilters);
  if (normalizedFilters.balanceScope !== COST_OF_RISK_BALANCE_SCOPE_IN_BALANCE) {
    const referenceIndex = getCostOfRiskReferenceIndex(referenceColumns, referenceDate);
    return {
      benchmarkSeries: [],
      filterLabel: "",
      referenceDate: referenceColumns[referenceIndex]?.label ?? "",
      rows: [],
      selectedCell: null,
      status: "FINREP data does not support this level of detail for collateral analysis outside the in-balance perimeter. Select In-balance."
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
  const parsedSelectedCell = parseCostOfRiskCollateralRatioCellKey(selectedCellKey)
    ?? parseCostOfRiskCollateralRatioCellKey(DEFAULT_COST_OF_RISK_COLLATERAL_RATIO_CELL);
  const selectedCell = normalizeCostOfRiskCollateralRatioCellForFilters(parsedSelectedCell, ratioFilters);
  const rows = buildCostOfRiskCollateralRatioRowsForJst(state, indexes, referenceColumns, ySelection, state.selectedJst, referenceIndex, ratioFilters);

  return {
    benchmarkSeries: getCostOfRiskPeerJstCodes(state).map((jstCode) => ({
      jstCode,
      points: buildCostOfRiskCollateralRatioPointsForJst(state, indexes, referenceColumns, ySelection, jstCode, selectedCell)
    })),
    filterLabel: ySelection.label,
    referenceDate: referenceLabel,
    rows,
    selectedCell,
    status: ""
  };
}

function buildCostOfRiskCollateralRatioRowsForJst(state, indexes, referenceColumns, ySelection, jstCode, referenceIndex, filters = {}) {
  const statusDefinition = getCostOfRiskCollateralRatioDefinitionForFilters(filters);
  const selectedStatus = statusDefinition ?? getCostOfRiskCollateralRatioDefinitions()[0];
  const points = buildCostOfRiskCollateralRatioPointsForJst(state, indexes, referenceColumns, ySelection, jstCode, {
    filters,
    metric: "ratio",
    stageKey: selectedStatus.key
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
      stage: selectedStatus.stageFilter
    }, jstCode, referenceIndex, "gca", {
      aggregateEffectBasisPoints: point.denominatorEffectBasisPoints,
      currentDenominator: point.denominator,
      currentNumerator: point.numerator,
      effectType: "denominator",
      previousDenominator: point.previousDenominator,
      previousNumerator: point.previousNumerator
    }),
    key: selectedStatus.key,
    label: selectedStatus.rowLabel ?? selectedStatus.label,
    numeratorDrivers: buildCostOfRiskRatioComponentDrivers(state, indexes, referenceColumns, {
      ...filters,
      stage: selectedStatus.stageFilter
    }, jstCode, referenceIndex, "collateral", {
      aggregateEffectBasisPoints: point.numeratorEffectBasisPoints,
      currentDenominator: point.denominator,
      currentNumerator: point.numerator,
      effectType: "numerator",
      previousDenominator: point.previousDenominator,
      previousNumerator: point.previousNumerator
    }),
    previousDenominator: point.previousDenominator ?? null,
    previousNumerator: point.previousNumerator ?? null,
    stageKey: selectedStatus.key
  }];
}

function buildCostOfRiskCollateralRatioPointsForJst(state, indexes, referenceColumns, ySelection, jstCode, selectedCell) {
  const statusDefinition = getCostOfRiskCollateralRatioDefinitions().find((candidate) => candidate.key === selectedCell.stageKey)
    ?? getCostOfRiskCollateralRatioDefinitions()[0];
  const filters = selectedCell.filters ?? {};
  const numeratorSeries = resolveCostOfRiskDenominatorPointsSeries(
    state,
    indexes,
    referenceColumns,
    jstCode,
    statusDefinition.collateralXCodes,
    ySelection.codes
  );
  const denominatorSeries = getCostOfRiskRatioDenominatorSeries(state, indexes, referenceColumns, jstCode, {
    ...filters,
    stage: statusDefinition.stageFilter
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
    const driverValue = selectedCell.driver
      ? getCostOfRiskRatioDriverPointValue(state, indexes, referenceColumns, {
        ...filters,
        stage: statusDefinition.stageFilter
      }, jstCode, index, selectedCell.driver.effectType === "denominator" ? "gca" : "collateral", selectedCell.driver, {
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

function getCostOfRiskCollateralRatioDefinitions() {
  return [
    { key: "all", collateralXCodes: ["0201", "0200"], label: "Collateral ratio", rowLabel: "All exposures", stageFilter: COST_OF_RISK_FILTER_ALL },
    { key: "performing", collateralXCodes: ["0201"], label: "Performing collateral", rowLabel: "Performing", stageFilter: "Performing" },
    { key: "nonperforming", collateralXCodes: ["0200"], label: "Non-performing collateral", rowLabel: "Non-performing", stageFilter: "Non-performing" }
  ];
}

function normalizeCostOfRiskCollateralRatioCellForFilters(selectedCell, filters = {}) {
  const selectedStatus = getCostOfRiskCollateralRatioDefinitionForFilters(filters);
  const stageKey = selectedStatus?.key ?? (getCostOfRiskCollateralRatioDefinitions().some((definition) => definition.key === selectedCell?.stageKey)
    ? selectedCell.stageKey
    : "all");
  const metric = selectedCell?.metric ?? "ratio";

  return {
    driver: selectedCell?.driver ?? null,
    filters,
    key: selectedCell?.driver ? createCostOfRiskRatioDriverCellKey(stageKey, metric, selectedCell.driver) : `${stageKey}:${metric}`,
    metric,
    stageKey
  };
}

function getCostOfRiskCollateralRatioDefinitionForFilters(filters = {}) {
  const normalizedFilters = normalizeCostOfRiskFilters(filters);
  const selectedStage = normalizedFilters.stage;
  if (!selectedStage || selectedStage === COST_OF_RISK_FILTER_ALL) {
    return getCostOfRiskCollateralRatioDefinitions().find((definition) => definition.key === "all");
  }
  return getCostOfRiskCollateralRatioDefinitions().find((definition) => definition.stageFilter === selectedStage) ?? null;
}

function parseCostOfRiskCollateralRatioCellKey(cellKey) {
  const parts = String(cellKey ?? "").split(":");
  const [stageKey, metric] = parts;
  const legacyMetricMap = {
    denominator: "denominatorEffect",
    numerator: "numeratorEffect"
  };
  const normalizedMetric = legacyMetricMap[metric] ?? metric;
  const driver = parseCostOfRiskRatioDriverCellParts(parts);
  const isStage = getCostOfRiskCollateralRatioDefinitions().some((row) => row.key === stageKey);
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
