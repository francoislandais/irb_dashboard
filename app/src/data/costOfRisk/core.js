import { getIndexedRowsByAxisPoint, getIndexedRowsByCoordinates } from "../dataIndex.js?v=20260804-lazy-index";
import { normalizeAxisCode } from "../core/axisCode.js";
import { getRequiredAxisColumnIndexes as getRequiredIndexes } from "../core/axisColumns.js";
import { formatBasisPointsValue, formatMetricValue, formatSignedMetricValue } from "../core/formatting.js?v=20260710-bp-format";
import { getReferenceColumns, parseNumericValue } from "../core/referenceColumns.js";
import {
  ALL_STAGES_LABEL,
  ASSET_KEY_BY_LABEL,
  ASSET_LABELS,
  ASSET_LABEL_BY_KEY,
  ASSET_SHORT_LABELS,
  COST_OF_RISK_ALLOWANCE_STAGE_X_CODES,
  COST_OF_RISK_BALANCE_SCOPE_IN_BALANCE,
  COST_OF_RISK_BALANCE_SCOPE_OFF_BALANCE,
  COST_OF_RISK_BALANCE_SCOPE_OPTIONS,
  COST_OF_RISK_BALANCE_SCOPE_TOTAL,
  COST_OF_RISK_BALANCE_SHEET_ALLOWANCE_PREFIX,
  COST_OF_RISK_COUNTERPARTY_FILTER_OPTIONS,
  COST_OF_RISK_COUNTERPARTY_SUMMARY_ROWS,
  COST_OF_RISK_DENOMINATOR_CASH_Y_CODE,
  COST_OF_RISK_DENOMINATOR_STAGE_X_CODES,
  COST_OF_RISK_F02_TABLE_ID,
  COST_OF_RISK_F12_RECONCILIATION_X_CODES,
  COST_OF_RISK_FILTER_ALL,
  COST_OF_RISK_OFF_BALANCE_ALLOWANCE_Y_CODES,
  COST_OF_RISK_OFF_BALANCE_ALLOWANCE_Y_CODE_SET,
  COST_OF_RISK_PERFORMANCE_STATUS_VALUES,
  COST_OF_RISK_STAGE_BOX_DESCRIPTION_PREFIX,
  COST_OF_RISK_STAGE_BOX_TABLE_ID,
  COST_OF_RISK_STAGE_SERIES_DEFINITIONS,
  COST_OF_RISK_STAGE_TRANSFER_STAGE_LABELS,
  COST_OF_RISK_STAGE_TRANSFER_TABLE_ID,
  COST_OF_RISK_TABLE_ID,
  COST_OF_RISK_TOTAL_CONTRIBUTION_X_CODE,
  COST_OF_RISK_TOTAL_Y_AXIS_CODE,
  COST_OF_RISK_WATERFALL_X_CODES,
  COST_OF_RISK_X_AXIS_CODE,
  COUNTERPARTY_LABELS,
  COUNTERPARTY_SHORT_LABELS,
  STAGE_LABELS,
  STAGE_SHORT_LABELS
} from "./definitions.js";

const CACHE_KEY_SEPARATOR = "\u001f";
const COST_OF_RISK_SERIES_CACHE = new WeakMap();

export const COST_OF_RISK_PERIOD_MODE_QUARTERLY = "quarterly";

export const COST_OF_RISK_PERIOD_MODE_YTD = "ytd";

export const COST_OF_RISK_PERIOD_MODE_ANNUALIZED = "annualized";

// The ratio denominator follows the sidebar filters: it is always the
// FINREP F_18.00 GCA for the same asset/counterparty/stage perimeter as the
// numerator.
export function getCostOfRiskDenominatorComposition(state, filters = {}) {
  const normalized = normalizeCostOfRiskFilters(filters);
  const ySelection = getCostOfRiskStageBoxYSelection(state, filters);
  const excludeCash = normalized.balanceScope !== COST_OF_RISK_BALANCE_SCOPE_OFF_BALANCE && !normalized.asset && !normalized.counterparty;
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

export function getCostOfRiskStageTransferDenominatorFilters(filters = {}) {
  return {
    ...filters,
    stage: COST_OF_RISK_FILTER_ALL
  };
}

export function formatCostOfRiskAllowanceMovementDisplayValue(value) {
  return Number.isFinite(value) ? -value : value;
}

export function getCostOfRiskAllowanceMovementSign(yCode) {
  const normalizedYCode = normalizeAxisCode(yCode, "y");
  return COST_OF_RISK_OFF_BALANCE_ALLOWANCE_Y_CODE_SET.has(normalizedYCode) ? 1 : -1;
}

function addCostOfRiskSignedAllowanceMovementSeries(state, indexes, referenceColumns, targetSeries, xCode, yCode, jstCode) {
  const sign = getCostOfRiskAllowanceMovementSign(yCode);
  const sourceSeries = getPointSeriesValues(state, indexes, referenceColumns, COST_OF_RISK_TABLE_ID, {
    xCode,
    yCode,
    zCode: ""
  }, jstCode).map((value) => (Number.isFinite(value) ? value * sign : value));
  addSeriesValues(targetSeries, sourceSeries);
}

export function normalizeCostOfRiskPeriodMode(periodMode = COST_OF_RISK_PERIOD_MODE_QUARTERLY) {
  if (periodMode === COST_OF_RISK_PERIOD_MODE_ANNUALIZED) {
    return COST_OF_RISK_PERIOD_MODE_ANNUALIZED;
  }
  return periodMode === COST_OF_RISK_PERIOD_MODE_YTD
    ? COST_OF_RISK_PERIOD_MODE_YTD
    : COST_OF_RISK_PERIOD_MODE_QUARTERLY;
}

export function resolveCostOfRiskPeriodSeries(referenceColumns, values, periodMode = COST_OF_RISK_PERIOD_MODE_QUARTERLY) {
  const normalizedMode = normalizeCostOfRiskPeriodMode(periodMode);
  if (normalizedMode === COST_OF_RISK_PERIOD_MODE_YTD) return values;
  if (normalizedMode === COST_OF_RISK_PERIOD_MODE_ANNUALIZED) {
    return values.map((value, index) => {
      if (!Number.isFinite(value)) return value;
      const referenceDate = referenceColumns?.[index]?.date;
      if (!(referenceDate instanceof Date) || Number.isNaN(referenceDate.getTime())) return value;
      const quarter = Math.floor(referenceDate.getMonth() / 3) + 1;
      return value * (4 / quarter);
    });
  }
  return decumulateQuarterlySeries(referenceColumns, values);
}

export function isCostOfRiskCumulativePeriodMode(periodMode = COST_OF_RISK_PERIOD_MODE_QUARTERLY) {
  const normalizedMode = normalizeCostOfRiskPeriodMode(periodMode);
  return normalizedMode === COST_OF_RISK_PERIOD_MODE_YTD
    || normalizedMode === COST_OF_RISK_PERIOD_MODE_ANNUALIZED;
}

export function getCostOfRiskRatioDenominatorLabel(periodMode = COST_OF_RISK_PERIOD_MODE_QUARTERLY) {
  return isCostOfRiskCumulativePeriodMode(periodMode)
    ? "first quarter of the year"
    : "previous quarter";
}

export function getCostOfRiskAllowanceMovementPeriodSeries(state, indexes, referenceColumns, xCodes, yCodes, jstCode, periodMode = COST_OF_RISK_PERIOD_MODE_QUARTERLY) {
  const cache = getCostOfRiskSeriesCache(state);
  const normalizedPeriodMode = normalizeCostOfRiskPeriodMode(periodMode);
  const key = makeCostOfRiskAllowanceMovementSeriesKey(xCodes, yCodes, jstCode, referenceColumns, normalizedPeriodMode);
  if (cache.allowanceMovementSeries.has(key)) return cache.allowanceMovementSeries.get(key);

  const valueSeries = createEmptySeries(referenceColumns.length);
  xCodes.forEach((xCode) => {
    yCodes.forEach((yCode) => {
      addCostOfRiskSignedAllowanceMovementSeries(state, indexes, referenceColumns, valueSeries, xCode, yCode, jstCode);
    });
  });
  const periodSeries = resolveCostOfRiskPeriodSeries(referenceColumns, valueSeries, normalizedPeriodMode);
  cache.allowanceMovementSeries.set(key, periodSeries);
  return periodSeries;
}

export function getCostOfRiskFilterOptions(state) {
  const descriptors = getCostOfRiskBalanceSheetAllowanceDescriptors(state);

  return {
    assets: createCostOfRiskFilterOptions(ASSET_LABELS, formatCostOfRiskAssetLabel),
    balanceScopes: COST_OF_RISK_BALANCE_SCOPE_OPTIONS,
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

export function getCostOfRiskF12ReconciliationXAxisOptions(state) {
  return getCostOfRiskXAxisOptionsForCodes(state, COST_OF_RISK_F12_RECONCILIATION_X_CODES);
}

export function getCostOfRiskXAxisOptionsForCodes(state, codes) {
  const xLabels = getCostOfRiskXAxisLabelMap(state);
  return codes.map((code) => ({
    code,
    label: xLabels.get(code) ?? code
  }));
}

export function buildCostOfRiskFilteredSelectionValue(
  state,
  filters,
  xAxisCode = COST_OF_RISK_X_AXIS_CODE,
  referenceDate = "",
  periodMode = COST_OF_RISK_PERIOD_MODE_QUARTERLY
) {
  return buildCostOfRiskSelectionSnapshot(
    state,
    buildCostOfRiskSelectionFromFilters(state, filters),
    xAxisCode,
    referenceDate,
    filters,
    periodMode
  );
}

export function buildCostOfRiskWaterfall(
  state,
  filters,
  referenceDate = "",
  selectedXCodes = COST_OF_RISK_WATERFALL_X_CODES,
  periodMode = COST_OF_RISK_PERIOD_MODE_QUARTERLY
) {
  const indexes = getRequiredIndexes(state.columns);
  const referenceColumns = getReferenceColumns(state.columns);
  const selectedOption = buildCostOfRiskSelectionFromFilters(state, filters);
  const selectedCodeSet = new Set((selectedXCodes ?? []).map((code) => normalizeAxisCode(code, "x")));

  if (!indexes || !state.selectedJst || referenceColumns.length === 0 || selectedOption.points.length === 0) {
    return { points: [], referenceDate: "" };
  }

  const denominatorSeries = getCostOfRiskRatioDenominatorSeries(state, indexes, referenceColumns, state.selectedJst, filters);
  const referenceIndex = getCostOfRiskReferenceIndex(referenceColumns, referenceDate);
  const denominator = getCostOfRiskMovementDenominator(denominatorSeries, referenceColumns, referenceIndex, periodMode) ?? 0;
  const xLabels = getCostOfRiskXAxisFullLabelMap(state);
  const points = COST_OF_RISK_WATERFALL_X_CODES.filter((xCode) => selectedCodeSet.has(xCode)).map((xCode) => {
    const periodValueSeries = getCostOfRiskAllowanceMovementPeriodSeries(
      state,
      indexes,
      referenceColumns,
      [xCode],
      selectedOption.points,
      state.selectedJst,
      periodMode
    );
    const value = periodValueSeries[referenceIndex] ?? 0;

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

export function getCostOfRiskRatioDenominatorReferenceIndex(
  referenceColumns,
  index,
  periodMode = COST_OF_RISK_PERIOD_MODE_QUARTERLY
) {
  if (!Number.isInteger(index) || index < 0) return -1;
  if (!isCostOfRiskCumulativePeriodMode(periodMode)) {
    return index > 0 ? index - 1 : -1;
  }
  return getCostOfRiskFirstReferenceIndexOfYear(referenceColumns, index);
}

function getCostOfRiskFirstReferenceIndexOfYear(referenceColumns, index) {
  const referenceDate = referenceColumns?.[index]?.date;
  if (!(referenceDate instanceof Date) || Number.isNaN(referenceDate.getTime())) return -1;
  const year = referenceDate.getFullYear();
  const firstIndex = (referenceColumns ?? []).findIndex((column) => {
    const columnDate = column?.date;
    return columnDate instanceof Date
      && !Number.isNaN(columnDate.getTime())
      && columnDate.getFullYear() === year;
  });
  return firstIndex >= 0 ? firstIndex : index;
}

export function getMappingDescription(state, tableId, coordinate, code) {
  const mappings = state.dimensionMapping?.list?.(tableId, coordinate) ?? [];
  return mappings.find((mapping) => mapping.code === code)?.description ?? code;
}

export function buildCostOfRiskRatioComponentDrivers(state, indexes, referenceColumns, filters, jstCode, referenceIndex, metric, effectContext = {}) {
  const normalizedFilters = normalizeCostOfRiskFilters(filters);
  const candidateKeys = getCostOfRiskRatioDriverCounterpartyKeys(normalizedFilters.counterparty);
  const candidateAssets = normalizedFilters.asset ? [normalizedFilters.asset] : ASSET_LABELS;
  const candidates = COST_OF_RISK_COUNTERPARTY_SUMMARY_ROWS
    .filter((row) => row.type === "row" && candidateKeys.includes(row.key))
    .flatMap((row) => candidateAssets.map((asset) => ({
      asset,
      assetKey: ASSET_KEY_BY_LABEL.get(asset) ?? asset,
      counterparty: row.value,
      counterpartyKey: row.key,
      key: `${row.key}:${asset}`,
      label: `${row.label} / ${formatCostOfRiskAssetLabel(asset)}`
    })));
  const rawDrivers = candidates
    .map((candidate) => {
      const series = buildCostOfRiskCounterpartySummarySeries(state, indexes, referenceColumns, {
        ...normalizedFilters,
        asset: candidate.asset
      }, jstCode, metric, candidate.counterparty);
      const value = series[referenceIndex] ?? null;
      const previousValue = referenceIndex > 0 ? series[referenceIndex - 1] ?? null : null;
      const effectBasisPoints = getCostOfRiskRatioDriverEffectBasisPoints(value, previousValue, effectContext);
      return {
        ...candidate,
        componentMetric: metric,
        effectType: effectContext.effectType,
        effectBasisPoints,
        value
      };
    });
  const drivers = rawDrivers
    .filter((driver) => Number.isFinite(driver.effectBasisPoints) && driver.effectBasisPoints !== 0)
    .sort((left, right) => Math.abs(right.effectBasisPoints) - Math.abs(left.effectBasisPoints))
    .slice(0, 5);
  const max = Math.max(...drivers.map((driver) => Math.abs(driver.effectBasisPoints)), 0);
  return drivers.map((driver) => ({
    ...driver,
    weight: max > 0 ? Math.abs(driver.effectBasisPoints) / max : 0
  }));
}

function getCostOfRiskRatioDriverCounterpartyKeys(counterpartyValue) {
  if (!counterpartyValue || counterpartyValue === COST_OF_RISK_FILTER_ALL) {
    return ["nfc", "households", "central-banks", "governments", "credit-institutions", "other-financials"];
  }
  const selected = COST_OF_RISK_COUNTERPARTY_SUMMARY_ROWS.find((row) => row.type === "row" && row.value === counterpartyValue);
  return selected ? [selected.key] : ["all"];
}

export function getCostOfRiskRatioDriverPointValue(state, indexes, referenceColumns, filters, jstCode, index, metric, driver, effectContext) {
  const series = buildCostOfRiskCounterpartySummarySeries(state, indexes, referenceColumns, {
    ...filters,
    asset: driver.asset
  }, jstCode, metric, driver.counterpartyValue);
  const value = series[index] ?? null;
  const previousValue = index > 0 ? series[index - 1] ?? null : null;
  return getCostOfRiskRatioDriverEffectBasisPoints(value, previousValue, effectContext);
}

function getCostOfRiskRatioDriverEffectBasisPoints(value, previousValue, effectContext) {
  if (!Number.isFinite(value) || !Number.isFinite(previousValue)) return null;
  const delta = value - previousValue;
  if (!Number.isFinite(delta) || delta === 0) return null;
  if (effectContext.effectType === "numerator") {
    const previousDenominator = effectContext.previousDenominator;
    const currentDenominator = effectContext.currentDenominator;
    if (!Number.isFinite(previousDenominator) || previousDenominator === 0 || !Number.isFinite(currentDenominator) || currentDenominator === 0) return null;
    return delta * 0.5 * ((1 / previousDenominator) + (1 / currentDenominator)) * 10000;
  }
  if (effectContext.effectType === "denominator") {
    const previousDenominator = effectContext.previousDenominator;
    const currentDenominator = effectContext.currentDenominator;
    const totalDelta = Number.isFinite(previousDenominator) && Number.isFinite(currentDenominator)
      ? currentDenominator - previousDenominator
      : null;
    if (!Number.isFinite(totalDelta) || totalDelta === 0 || !Number.isFinite(effectContext.aggregateEffectBasisPoints)) return null;
    return effectContext.aggregateEffectBasisPoints * (delta / totalDelta);
  }
  return null;
}

export function decomposeCostOfRiskStageRatioChange(currentNumerator, currentDenominator, previousNumerator, previousDenominator) {
  if (
    !Number.isFinite(currentNumerator)
    || !Number.isFinite(currentDenominator)
    || currentDenominator === 0
    || !Number.isFinite(previousNumerator)
    || !Number.isFinite(previousDenominator)
    || previousDenominator === 0
  ) {
    return {
      denominatorEffectBasisPoints: null,
      numeratorEffectBasisPoints: null,
      variationBasisPoints: null
    };
  }

  const previousRatio = previousNumerator / previousDenominator;
  const currentRatio = currentNumerator / currentDenominator;
  const numeratorFirstEffect = currentNumerator / previousDenominator - previousRatio;
  const denominatorAfterNumeratorEffect = currentRatio - currentNumerator / previousDenominator;
  const denominatorFirstEffect = previousNumerator / currentDenominator - previousRatio;
  const numeratorAfterDenominatorEffect = currentRatio - previousNumerator / currentDenominator;

  return {
    denominatorEffectBasisPoints: ((denominatorAfterNumeratorEffect + denominatorFirstEffect) / 2) * 10000,
    numeratorEffectBasisPoints: ((numeratorFirstEffect + numeratorAfterDenominatorEffect) / 2) * 10000,
    variationBasisPoints: (currentRatio - previousRatio) * 10000
  };
}

export function getCostOfRiskStageRatioMetricValue(metric, values, decomposition) {
  if (metric === "variation") return decomposition.variationBasisPoints;
  if (metric === "numerator") return decomposition.numeratorEffectBasisPoints;
  if (metric === "numeratorLevel") return values.numerator;
  if (metric === "numeratorDelta") return values.numeratorDelta;
  if (metric === "numeratorEffect") return decomposition.numeratorEffectBasisPoints;
  if (metric === "denominator") return decomposition.denominatorEffectBasisPoints;
  if (metric === "denominatorLevel") return values.denominator;
  if (metric === "denominatorDelta") return values.denominatorDelta;
  if (metric === "denominatorEffect") return decomposition.denominatorEffectBasisPoints;
  return values.ratioBasisPoints;
}

export function createCostOfRiskStageRatioCell(value) {
  return { value: Number.isFinite(value) ? value : null };
}

export function buildCostOfRiskStageSummarySeries(state, indexes, referenceColumns, ySelection, jstCode, metric, stageKey) {
  const rowDefinition = COST_OF_RISK_STAGE_SERIES_DEFINITIONS.find((candidate) => candidate.key === stageKey)
    ?? COST_OF_RISK_STAGE_SERIES_DEFINITIONS[0];
  if (metric === "collateral") {
    const xCodes = rowDefinition.collateralXCodes ?? (rowDefinition.key === "all" ? ["0201", "0200"] : []);
    if (xCodes.length === 0) return referenceColumns.map(() => null);
    return resolveCostOfRiskDenominatorPointsSeries(state, indexes, referenceColumns, jstCode, xCodes, ySelection.codes);
  }
  const xCodes = metric === "allowances" ? rowDefinition.allowanceXCodes : rowDefinition.gcaXCodes;
  const values = resolveCostOfRiskDenominatorPointsSeries(state, indexes, referenceColumns, jstCode, xCodes, ySelection.codes);

  return metric === "allowances"
    ? values.map((value) => (Number.isFinite(value) ? -value : value))
    : values;
}

export function buildCostOfRiskCounterpartySummaryRowsForJst(state, indexes, referenceColumns, filters, jstCode, referenceIndex) {
  const totalAllowances = buildCostOfRiskCounterpartySummaryTotalSeries(state, indexes, referenceColumns, filters, jstCode, "allowances");

  return COST_OF_RISK_COUNTERPARTY_SUMMARY_ROWS.map((rowDefinition) => {
    if (rowDefinition.type === "group") return { ...rowDefinition };

    const gca = buildCostOfRiskCounterpartySummarySeries(state, indexes, referenceColumns, filters, jstCode, "gca", rowDefinition.value);
    const gcaRatioBase = buildCostOfRiskCounterpartySummaryRatioBaseSeries(state, indexes, referenceColumns, filters, jstCode, rowDefinition.value);
    const allowances = buildCostOfRiskCounterpartySummarySeries(state, indexes, referenceColumns, filters, jstCode, "allowances", rowDefinition.value);
    const coverage = buildCostOfRiskCoverageSeries(gca, allowances);
    const collateralAmount = buildCostOfRiskCounterpartySummarySeries(state, indexes, referenceColumns, filters, jstCode, "collateral", rowDefinition.value);
    const collateral = buildCostOfRiskCoverageSeries(gca, collateralAmount);
    return {
      ...rowDefinition,
      cells: {
        allowances: createCostOfRiskStageSummaryCellValues(allowances, totalAllowances, referenceIndex),
        collateral: createCostOfRiskCoverageCellValues(collateral, referenceIndex),
        collateralAmount: createCostOfRiskStageSummaryCellValues(collateralAmount, gcaRatioBase, referenceIndex),
        coverage: createCostOfRiskCoverageCellValues(coverage, referenceIndex),
        gca: createCostOfRiskStageSummaryCellValues(gca, gcaRatioBase, referenceIndex)
      }
    };
  });
}

export function buildCostOfRiskCounterpartySummaryPointsForJst(state, indexes, referenceColumns, filters, jstCode, selectedCell) {
  const metricSeries = buildCostOfRiskCounterpartySummaryMetricSeries(state, indexes, referenceColumns, filters, jstCode, selectedCell.metric, selectedCell.rowKey);
  const totalSeries = selectedCell.metric === "gca" || selectedCell.metric === "allowances"
    ? selectedCell.metric === "gca" && (selectedCell.kind === "ratio" || selectedCell.kind === "ratioMom")
      ? buildCostOfRiskCounterpartySummaryRatioBaseSeries(state, indexes, referenceColumns, filters, jstCode, getCostOfRiskCounterpartySummaryValueForRowKey(selectedCell.rowKey))
      : buildCostOfRiskCounterpartySummaryTotalSeries(state, indexes, referenceColumns, filters, jstCode, selectedCell.metric)
    : null;

  return referenceColumns.map((column, index) => {
    const previousValue = index > 0 ? metricSeries[index - 1] : null;
    const value = metricSeries[index] ?? null;
    const pointValue = selectedCell.kind === "mom" || selectedCell.kind === "ratioMom"
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

  if (metric === "collateralAmount") {
    return buildCostOfRiskCounterpartySummarySeries(state, indexes, referenceColumns, filters, jstCode, "collateral", rowDefinition.value);
  }
  if (metric === "coverage") {
    return buildCostOfRiskCoverageSeries(
      buildCostOfRiskCounterpartySummarySeries(state, indexes, referenceColumns, filters, jstCode, "gca", rowDefinition.value),
      buildCostOfRiskCounterpartySummarySeries(state, indexes, referenceColumns, filters, jstCode, "allowances", rowDefinition.value)
    );
  }
  if (metric === "collateral") {
    return buildCostOfRiskCoverageSeries(
      buildCostOfRiskCounterpartySummarySeries(state, indexes, referenceColumns, filters, jstCode, "gca", rowDefinition.value),
      buildCostOfRiskCounterpartySummarySeries(state, indexes, referenceColumns, filters, jstCode, "collateral", rowDefinition.value)
    );
  }

  return buildCostOfRiskCounterpartySummarySeries(state, indexes, referenceColumns, filters, jstCode, metric, rowDefinition.value);
}

function buildCostOfRiskCounterpartySummarySeries(state, indexes, referenceColumns, filters, jstCode, metric, counterpartyValue) {
  if (metric === "gca") {
    return getCostOfRiskRatioDenominatorSeries(state, indexes, referenceColumns, jstCode, {
      ...filters,
      counterparty: counterpartyValue
    });
  }
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

function buildCostOfRiskCounterpartySummaryRatioBaseSeries(state, indexes, referenceColumns, filters, jstCode, counterpartyValue) {
  return getCostOfRiskRatioDenominatorSeries(state, indexes, referenceColumns, jstCode, {
    ...filters,
    counterparty: counterpartyValue,
    stage: COST_OF_RISK_FILTER_ALL
  });
}

function getCostOfRiskCounterpartySummaryValueForRowKey(rowKey) {
  return COST_OF_RISK_COUNTERPARTY_SUMMARY_ROWS.find((row) => row.type === "row" && row.key === rowKey)?.value
    ?? COST_OF_RISK_FILTER_ALL;
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
  if (metric === "collateral") {
    if (normalizedStage === "Performing") return ["0201"];
    if (normalizedStage === "Non-performing") return ["0200"];
    if (!normalizedStage) return ["0201", "0200"];
    return [];
  }
  if (metric === "allowances") return COST_OF_RISK_ALLOWANCE_STAGE_X_CODES[normalizedStage] ?? COST_OF_RISK_ALLOWANCE_STAGE_X_CODES[""];
  return COST_OF_RISK_DENOMINATOR_STAGE_X_CODES[normalizedStage] ?? COST_OF_RISK_DENOMINATOR_STAGE_X_CODES[""];
}

export function buildCostOfRiskCoverageSeries(gcaSeries, allowanceSeries) {
  return gcaSeries.map((gca, index) => {
    const allowances = allowanceSeries[index];
    return Number.isFinite(gca) && gca !== 0 && Number.isFinite(allowances)
      ? allowances / gca
      : null;
  });
}

export function createCostOfRiskStageSummaryCellValues(series, totalSeries, referenceIndex) {
  const value = series[referenceIndex] ?? null;
  const previousValue = referenceIndex > 0 ? series[referenceIndex - 1] : null;
  const total = totalSeries[referenceIndex] ?? null;
  const previousTotal = referenceIndex > 0 ? totalSeries[referenceIndex - 1] : null;
  const ratio = Number.isFinite(value) && Number.isFinite(total) && total !== 0 ? value / total : null;
  const previousRatio = Number.isFinite(previousValue) && Number.isFinite(previousTotal) && previousTotal !== 0 ? previousValue / previousTotal : null;
  const mom = getFiniteDelta(value, previousValue);
  const momRatioBasisPoints = Number.isFinite(mom) && Number.isFinite(previousValue) && previousValue !== 0
    ? (mom / previousValue) * 10000
    : null;
  const ratioMomBasisPoints = Number.isFinite(ratio) && Number.isFinite(previousRatio)
    ? (ratio - previousRatio) * 10000
    : null;

  return {
    mom,
    momRatioBasisPoints,
    ratio,
    ratioMomBasisPoints,
    value
  };
}

export function createCostOfRiskCoverageCellValues(series, referenceIndex) {
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

export function getCostOfRiskStageSummaryRatioValue(metricSeries, totalSeries, selectedCell, index) {
  const value = metricSeries[index] ?? null;
  const previousValue = index > 0 ? metricSeries[index - 1] : null;

  if (selectedCell.metric === "coverage" || selectedCell.metric === "collateral") {
    if (selectedCell.kind === "mom" || selectedCell.kind === "ratioMom") {
      const delta = getFiniteDelta(value, previousValue);
      return delta === null ? null : delta * 10000;
    }
    return Number.isFinite(value) ? value * 10000 : null;
  }

  const total = totalSeries?.[index] ?? null;
  const ratio = Number.isFinite(value) && Number.isFinite(total) && total !== 0 ? value / total : null;

  if (selectedCell.kind === "ratioMom") {
    const previousTotal = totalSeries?.[index - 1] ?? null;
    const previousRatio = Number.isFinite(previousValue) && Number.isFinite(previousTotal) && previousTotal !== 0
      ? previousValue / previousTotal
      : null;
    return Number.isFinite(ratio) && Number.isFinite(previousRatio)
      ? (ratio - previousRatio) * 10000
      : null;
  }

  if (selectedCell.kind === "mom") {
    const delta = getFiniteDelta(value, previousValue);
    return Number.isFinite(delta) && Number.isFinite(previousValue) && previousValue !== 0
      ? (delta / previousValue) * 10000
      : null;
  }

  return ratio === null ? null : ratio * 10000;
}

export function getFiniteDelta(currentValue, previousValue) {
  return Number.isFinite(currentValue) && Number.isFinite(previousValue)
    ? currentValue - previousValue
    : null;
}

export function parseCostOfRiskCounterpartySummaryCellKey(cellKey) {
  const parts = String(cellKey ?? "").split(":");
  const [metric, kind, rowKey] = parts[0] === "counterparty"
    ? [parts[1], parts[2], parts[3]]
    : parts;
  const isMetric = ["gca", "allowances", "coverage", "collateral", "collateralAmount"].includes(metric);
  const isKind = ["level", "mom", "ratio", "ratioMom"].includes(kind);
  const isRow = COST_OF_RISK_COUNTERPARTY_SUMMARY_ROWS.some((row) => row.type === "row" && row.key === rowKey);
  return isMetric && isKind && isRow ? { key: `counterparty:${metric}:${kind}:${rowKey}`, kind, metric, rowKey } : null;
}

export function parseCostOfRiskRatioDriverCellParts(parts) {
  if (parts[2] !== "driver") return null;
  const effectType = parts[3];
  const counterpartyKey = parts[4];
  const assetKey = parts[5];
  const counterpartyDefinition = COST_OF_RISK_COUNTERPARTY_SUMMARY_ROWS.find((row) => row.type === "row" && row.key === counterpartyKey);
  const asset = ASSET_LABEL_BY_KEY.get(assetKey);
  if (!["denominator", "numerator"].includes(effectType) || !counterpartyDefinition || !asset) return null;
  return {
    asset,
    assetKey,
    componentMetric: "",
    counterpartyKey,
    counterpartyValue: counterpartyDefinition.value,
    effectType,
    label: `${counterpartyDefinition.label} / ${formatCostOfRiskAssetLabel(asset)}`
  };
}

export function createCostOfRiskRatioDriverCellKey(stageKey, metric, driver) {
  return `${stageKey}:${metric}:driver:${driver.effectType}:${driver.counterpartyKey}:${driver.assetKey}`;
}

export function computeCostOfRiskTransferFlowPeriodSeries(state, indexes, referenceColumns, ySelection, movementCode, jstCode, periodMode = COST_OF_RISK_PERIOD_MODE_QUARTERLY) {
  const raw = createEmptySeries(referenceColumns.length);
  ySelection.codes.forEach((yCode) => {
    addSeriesValues(raw, getPointSeriesValues(state, indexes, referenceColumns, COST_OF_RISK_STAGE_TRANSFER_TABLE_ID, {
      xCode: movementCode,
      yCode,
      zCode: ""
    }, jstCode));
  });
  return resolveCostOfRiskPeriodSeries(referenceColumns, raw, periodMode);
}

export function computeCostOfRiskStageExposureLevels(state, indexes, referenceColumns, filters, stage, jstCode) {
  return getCostOfRiskRatioDenominatorSeries(state, indexes, referenceColumns, jstCode, getCostOfRiskStageScopedFilters(filters, stage));
}

export function getCostOfRiskStageScopedFilters(filters = {}, stage) {
  return {
    ...filters,
    stage: COST_OF_RISK_STAGE_TRANSFER_STAGE_LABELS[stage] ?? filters.stage
  };
}

function buildCostOfRiskSelectionSnapshot(
  state,
  selectedOption,
  xAxisCode,
  referenceDate = "",
  filters = {},
  periodMode = COST_OF_RISK_PERIOD_MODE_QUARTERLY
) {
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

  const series = buildCostOfRiskSelectionSeries(state, indexes, referenceColumns, selectedOption, selectedXCode, state.selectedJst, filters, periodMode);
  const referenceIndex = getCostOfRiskReferenceIndex(referenceColumns, referenceDate);
  const selectedPoint = series[referenceIndex];

  return {
    benchmarkSeries: buildCostOfRiskBenchmarkSeries(state, indexes, referenceColumns, selectedOption, selectedXCode, filters, periodMode),
    denominator: selectedPoint?.denominator ?? null,
    denominatorLabel: getCostOfRiskDenominatorComposition(state, filters).label,
    option: selectedOption,
    ratioBasisPoints: selectedPoint?.ratioBasisPoints ?? null,
    referenceDate: selectedPoint?.label ?? "",
    series,
    value: selectedPoint?.value ?? null
  };
}

export function getCostOfRiskReferenceIndex(referenceColumns, referenceDate = "") {
  const index = referenceColumns.findIndex((column) => column.label === referenceDate);
  return index >= 0 ? index : Math.max(0, referenceColumns.length - 1);
}

function getCostOfRiskYMappings(state) {
  return state.dimensionMapping?.list?.(COST_OF_RISK_TABLE_ID, "y_axis_rc_code") ?? [];
}

export function getCostOfRiskBalanceSheetAllowanceDescriptors(state) {
  return getCostOfRiskYMappings(state)
    .map(describeCostOfRiskYAxisPoint)
    .filter(isCostOfRiskBalanceSheetAllowanceDescriptor);
}

function isCostOfRiskBalanceSheetAllowanceDescriptor(descriptor) {
  return String(descriptor.description ?? "").startsWith(COST_OF_RISK_BALANCE_SHEET_ALLOWANCE_PREFIX);
}

export function getCostOfRiskStageTransferYSelection(state, filters = {}) {
  const normalized = normalizeCostOfRiskFilters(filters);
  if (normalized.balanceScope === COST_OF_RISK_BALANCE_SCOPE_OFF_BALANCE) {
    return getCostOfRiskStageAxisYSelection(state, filters, {
      descriptionPrefix: "Commitments and financial guarantees given",
      requiresUnfilteredPerimeter: true,
      tableId: COST_OF_RISK_STAGE_TRANSFER_TABLE_ID,
      totalLabel: "Commitments and financial guarantees given"
    });
  }
  if (normalized.balanceScope === COST_OF_RISK_BALANCE_SCOPE_TOTAL) {
    if (normalized.asset || normalized.counterparty) {
      return {
        codes: [],
        label: "Total in-balance and off-balance is only available without instrument or counterparty detail"
      };
    }
    return combineCostOfRiskStageAxisYSelections([
      getCostOfRiskStageAxisYSelection(state, { ...filters, balanceScope: COST_OF_RISK_BALANCE_SCOPE_IN_BALANCE }, {
        descriptionPrefix: "Total debt instruments",
        tableId: COST_OF_RISK_STAGE_TRANSFER_TABLE_ID,
        totalLabel: "Total debt instruments"
      }),
      getCostOfRiskStageAxisYSelection(state, { ...filters, balanceScope: COST_OF_RISK_BALANCE_SCOPE_OFF_BALANCE }, {
        descriptionPrefix: "Commitments and financial guarantees given",
        requiresUnfilteredPerimeter: true,
        tableId: COST_OF_RISK_STAGE_TRANSFER_TABLE_ID,
        totalLabel: "Commitments and financial guarantees given"
      })
    ], "Total in-balance and off-balance", { requireEverySelection: true });
  }
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
export function getCostOfRiskStageBoxYSelection(state, filters = {}) {
  const normalized = normalizeCostOfRiskFilters(filters);
  if (normalized.balanceScope === COST_OF_RISK_BALANCE_SCOPE_OFF_BALANCE) {
    return getCostOfRiskStageAxisYSelection(state, filters, {
      descriptionPrefix: "Off-balance sheet exposures",
      tableId: COST_OF_RISK_STAGE_BOX_TABLE_ID,
      totalLabel: "Off-balance sheet exposures"
    });
  }
  if (normalized.balanceScope === COST_OF_RISK_BALANCE_SCOPE_TOTAL) {
    if (normalized.asset) {
      return {
        codes: [],
        label: "Total in-balance and off-balance is not available with instrument detail"
      };
    }
    return combineCostOfRiskStageAxisYSelections([
      getCostOfRiskStageAxisYSelection(state, { ...filters, balanceScope: COST_OF_RISK_BALANCE_SCOPE_IN_BALANCE }, {
        descriptionPrefix: COST_OF_RISK_STAGE_BOX_DESCRIPTION_PREFIX,
        tableId: COST_OF_RISK_STAGE_BOX_TABLE_ID,
        totalLabel: COST_OF_RISK_STAGE_BOX_DESCRIPTION_PREFIX
      }),
      getCostOfRiskStageAxisYSelection(state, { ...filters, balanceScope: COST_OF_RISK_BALANCE_SCOPE_OFF_BALANCE }, {
        descriptionPrefix: "Off-balance sheet exposures",
        tableId: COST_OF_RISK_STAGE_BOX_TABLE_ID,
        totalLabel: "Off-balance sheet exposures"
      })
    ], "Total in-balance and off-balance", { requireEverySelection: true });
  }
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

  if (config.requiresUnfilteredPerimeter && (asset || counterparty)) {
    return {
      codes: [],
      label: `${config.totalLabel} is only available without instrument or counterparty detail`
    };
  }

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

function combineCostOfRiskStageAxisYSelections(selections, label, options = {}) {
  if (options.requireEverySelection && selections.some((selection) => (selection.codes ?? []).length === 0)) {
    return {
      codes: [],
      label
    };
  }
  const codes = selections.flatMap((selection) => selection.codes ?? []);
  return {
    codes: [...new Set(codes)],
    label
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
  return [
    ...stages.filter((stage) => descriptors.some((descriptor) => descriptor.stage === stage)),
    ...COST_OF_RISK_PERFORMANCE_STATUS_VALUES
  ];
}

export function buildCostOfRiskSelectionFromFilters(state, filters = {}) {
  const normalizedFilters = normalizeCostOfRiskFilters(filters);
  if (normalizedFilters.balanceScope === COST_OF_RISK_BALANCE_SCOPE_OFF_BALANCE) {
    return buildCostOfRiskOffBalanceSelectionFromFilters(normalizedFilters);
  }
  if (normalizedFilters.balanceScope === COST_OF_RISK_BALANCE_SCOPE_TOTAL) {
    return buildCostOfRiskTotalBalanceSelectionFromFilters(state, normalizedFilters);
  }

  const descriptors = getCostOfRiskBalanceSheetAllowanceDescriptors(state);
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

function buildCostOfRiskOffBalanceSelectionFromFilters(filters) {
  if (filters.asset || filters.counterparty) {
    return createEmptyCostOfRiskFilteredSelection(filters, "Off-balance data is not available with instrument or counterparty detail");
  }
  const points = COST_OF_RISK_OFF_BALANCE_ALLOWANCE_Y_CODES[filters.stage] ?? [];
  return {
    filters,
    id: `filters:off-balance:${filters.stage || "all"}`,
    kind: "filtered",
    label: filters.stage
      ? `Off-balance provisions / ${formatCostOfRiskStageLabel(filters.stage)}`
      : "Total provisions on commitments and financial guarantees given",
    points
  };
}

function buildCostOfRiskTotalBalanceSelectionFromFilters(state, filters) {
  if (filters.asset || filters.counterparty) {
    return createEmptyCostOfRiskFilteredSelection(filters, "Total in-balance and off-balance data is not available with instrument or counterparty detail");
  }
  const balanceSelection = buildCostOfRiskSelectionFromFilters(state, {
    ...filters,
    balanceScope: COST_OF_RISK_BALANCE_SCOPE_IN_BALANCE
  });
  const offBalanceSelection = buildCostOfRiskOffBalanceSelectionFromFilters({
    ...filters,
    balanceScope: COST_OF_RISK_BALANCE_SCOPE_OFF_BALANCE
  });
  return {
    filters,
    id: `filters:total-balance:${filters.stage || "all"}`,
    kind: "filtered",
    label: filters.stage
      ? `Total in-balance and off-balance / ${formatCostOfRiskStageLabel(filters.stage)}`
      : "Total in-balance and off-balance",
    points: [...new Set([...(balanceSelection.points ?? []), ...(offBalanceSelection.points ?? [])])]
  };
}

function createEmptyCostOfRiskFilteredSelection(filters, label) {
  return {
    filters,
    id: `filters:empty:${filters.balanceScope}:${filters.asset}:${filters.counterparty}:${filters.stage}`,
    kind: "filtered",
    label,
    points: []
  };
}

export function normalizeCostOfRiskFilters(filters) {
  return {
    asset: filters.asset && filters.asset !== COST_OF_RISK_FILTER_ALL ? filters.asset : "",
    balanceScope: normalizeCostOfRiskBalanceScope(filters.balanceScope),
    counterparty: filters.counterparty && filters.counterparty !== COST_OF_RISK_FILTER_ALL ? filters.counterparty : "",
    stage: filters.stage && filters.stage !== COST_OF_RISK_FILTER_ALL ? filters.stage : ""
  };
}

function isCostOfRiskTotalFilter(filters) {
  return filters.balanceScope === COST_OF_RISK_BALANCE_SCOPE_IN_BALANCE && !filters.asset && !filters.counterparty && !filters.stage;
}

function normalizeCostOfRiskBalanceScope(balanceScope) {
  return COST_OF_RISK_BALANCE_SCOPE_OPTIONS.some((option) => option.value === balanceScope)
    ? balanceScope
    : COST_OF_RISK_BALANCE_SCOPE_IN_BALANCE;
}

export function matchesCostOfRiskFilterDescriptor(descriptor, filters) {
  return (!filters.asset || descriptor.asset === filters.asset)
    && (!filters.counterparty || matchesCostOfRiskCounterpartyDescriptor(descriptor, filters.counterparty))
    && (!filters.stage || descriptor.stage === filters.stage);
}

export function isCostOfRiskAggregationPoint(descriptor, filters) {
  if (filters.counterparty) return isCostOfRiskCounterpartyLabel(descriptor.terminal, descriptor.counterparty);
  if (filters.asset) return descriptor.terminal === descriptor.asset;
  if (filters.stage) return descriptor.terminal === descriptor.stage;

  return descriptor.stage && (
    descriptor.terminal === descriptor.stage
    || descriptor.terminal === "Allowances for purchased or originated credit-impaired financial assets"
  );
}

export function isCostOfRiskCounterpartyLabel(value, counterparty) {
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

export function formatCostOfRiskAssetLabel(asset) {
  return ASSET_SHORT_LABELS.get(asset) ?? asset;
}

export function formatCostOfRiskCounterpartyLabel(counterparty) {
  const definition = getCostOfRiskCounterpartyDefinition(counterparty);
  if (definition) return definition.shortLabel ?? definition.label;
  return COUNTERPARTY_SHORT_LABELS.get(counterparty) ?? counterparty;
}

function getCostOfRiskCounterpartyDefinition(value) {
  return COST_OF_RISK_COUNTERPARTY_FILTER_OPTIONS.find((option) => option.value === value) ?? null;
}

export function formatCostOfRiskStageLabel(stage) {
  return STAGE_SHORT_LABELS.get(stage) ?? stage;
}

function dedupeCostOfRiskAxisOptions(option, index, options) {
  return options.findIndex((candidate) => candidate.code === option.code) === index;
}

export function getCostOfRiskXAxisLabelMap(state) {
  const mappings = state.dimensionMapping?.list?.(COST_OF_RISK_TABLE_ID, "x_axis_rc_code") ?? [];
  return new Map(mappings.map((mapping) => [
    mapping.code,
    getCostOfRiskShortAxisLabel(mapping.description, mapping.code)
  ]));
}

export function getCostOfRiskXAxisFullLabelMap(state) {
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

export function getCostOfRiskStageTransferXAxisLabelMap(state) {
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

function buildCostOfRiskBenchmarkSeries(state, indexes, referenceColumns, selectedOption, xAxisCode, filters = {}, periodMode = COST_OF_RISK_PERIOD_MODE_QUARTERLY) {
  return getCostOfRiskPeerJstCodes(state).map((jstCode) => ({
    jstCode,
    points: buildCostOfRiskSelectionSeries(state, indexes, referenceColumns, selectedOption, xAxisCode, jstCode, filters, periodMode)
  }));
}

export function getCostOfRiskPeerJstCodes(state) {
  const jstOptions = state?.jstOptions ?? [];
  const peers = state?.peerJstCodes ?? jstOptions;
  const requested = [state?.selectedJst, ...peers].filter(Boolean);

  return requested.filter((jstCode, index) => (
    jstOptions.includes(jstCode) && requested.indexOf(jstCode) === index
  ));
}

function buildCostOfRiskSelectionSeries(state, indexes, referenceColumns, selectedOption, xAxisCode, jstCode, filters = {}, periodMode = COST_OF_RISK_PERIOD_MODE_QUARTERLY) {
  if (xAxisCode === COST_OF_RISK_TOTAL_CONTRIBUTION_X_CODE) {
    return buildCostOfRiskTotalContributionSelectionSeries(state, indexes, referenceColumns, selectedOption, jstCode, filters, periodMode);
  }

  const periodValueSeries = getCostOfRiskAllowanceMovementPeriodSeries(
    state,
    indexes,
    referenceColumns,
    [xAxisCode],
    selectedOption.points,
    jstCode,
    periodMode
  );
  const denominatorSeries = getCostOfRiskRatioDenominatorSeries(state, indexes, referenceColumns, jstCode, filters);

  return referenceColumns.map((column, index) => {
    const value = periodValueSeries[index] ?? 0;
    const denominator = getCostOfRiskMovementDenominator(denominatorSeries, referenceColumns, index, periodMode) ?? 0;
    return {
      date: column.date,
      denominator,
      label: column.label,
      ratioBasisPoints: denominator ? (value / denominator) * 10000 : null,
      value
    };
  });
}

function buildCostOfRiskTotalContributionSelectionSeries(state, indexes, referenceColumns, selectedOption, jstCode, filters = {}, periodMode = COST_OF_RISK_PERIOD_MODE_QUARTERLY) {
  const periodValueSeries = getCostOfRiskAllowanceMovementPeriodSeries(
    state,
    indexes,
    referenceColumns,
    COST_OF_RISK_WATERFALL_X_CODES,
    selectedOption.points,
    jstCode,
    periodMode
  );
  const denominatorSeries = getCostOfRiskRatioDenominatorSeries(state, indexes, referenceColumns, jstCode, filters);

  return referenceColumns.map((column, index) => {
    const value = periodValueSeries[index] ?? 0;
    const denominator = getCostOfRiskMovementDenominator(denominatorSeries, referenceColumns, index, periodMode) ?? 0;
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

export function getCostOfRiskMovementDenominator(
  denominatorSeries,
  referenceColumnsOrIndex,
  indexOrPeriodMode,
  periodMode = COST_OF_RISK_PERIOD_MODE_QUARTERLY
) {
  if (!Array.isArray(denominatorSeries)) return null;
  const usesLegacySignature = Number.isInteger(referenceColumnsOrIndex);
  const referenceColumns = usesLegacySignature ? [] : referenceColumnsOrIndex;
  const index = usesLegacySignature ? referenceColumnsOrIndex : indexOrPeriodMode;
  const resolvedPeriodMode = usesLegacySignature ? indexOrPeriodMode : periodMode;
  const denominatorIndex = getCostOfRiskRatioDenominatorReferenceIndex(referenceColumns, index, resolvedPeriodMode);
  if (denominatorIndex < 0) return null;
  const denominator = denominatorSeries[denominatorIndex];
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
export function resolveCostOfRiskDenominatorCellSeries(state, indexes, referenceColumns, jstCode, xCode, yCode) {
  if (!indexes) return referenceColumns.map(() => null);

  const cache = getCostOfRiskSeriesCache(state);
  const key = makeCostOfRiskDenominatorCellSeriesKey(jstCode, xCode, yCode, referenceColumns);
  if (cache.denominatorCellSeries.has(key)) return cache.denominatorCellSeries.get(key);

  const rows = getCostOfRiskPointRows(state, indexes, COST_OF_RISK_STAGE_BOX_TABLE_ID, { xCode, yCode, zCode: "" }, jstCode);
  if (rows.length !== 1) {
    const emptySeries = referenceColumns.map(() => null);
    cache.denominatorCellSeries.set(key, emptySeries);
    return emptySeries;
  }

  const [row] = rows;
  const values = referenceColumns.map((column) => {
    const raw = row[column.index];
    if (raw === undefined || raw === null || String(raw).trim() === "") return null;
    const parsed = parseNumericValue(raw, NaN);
    return Number.isFinite(parsed) ? parsed : null;
  });
  cache.denominatorCellSeries.set(key, values);
  return values;
}

// Sums every available (xCode, yCode) cell in the cross product into one
// per-date series. Missing/ambiguous cells are ignored for that date; the
// date only resolves to null when no component is available at all.
export function resolveCostOfRiskDenominatorPointsSeries(state, indexes, referenceColumns, jstCode, xCodes, yCodes) {
  if (!indexes || xCodes.length === 0 || yCodes.length === 0) return referenceColumns.map(() => null);

  const cache = getCostOfRiskSeriesCache(state);
  const key = makeCostOfRiskDenominatorPointsSeriesKey(jstCode, xCodes, yCodes, referenceColumns);
  if (cache.denominatorPointsSeries.has(key)) return cache.denominatorPointsSeries.get(key);

  const cellSeriesList = [];
  xCodes.forEach((xCode) => {
    yCodes.forEach((yCode) => {
      cellSeriesList.push(resolveCostOfRiskDenominatorCellSeries(state, indexes, referenceColumns, jstCode, xCode, yCode));
    });
  });

  const values = referenceColumns.map((_, index) => {
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
  cache.denominatorPointsSeries.set(key, values);
  return values;
}

// The denominator for the current sidebar filters: sums every matching
// F_18.00 cell (see getCostOfRiskDenominatorComposition), then - only when
// both Accounting type and Counterparty are unrestricted - subtracts cash
// balances at central banks, which must never be part of the denominator.
export function getCostOfRiskRatioDenominatorSeries(state, indexes, referenceColumns, jstCode, filters = {}) {
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
      source: `${COST_OF_RISK_STAGE_BOX_TABLE_ID} / x ${xCode} / y ${yCode}`,
      value: resolveCostOfRiskDenominatorCellSeries(state, indexes, referenceColumns, jstCode, xCode, yCode)[referenceIndex] ?? null
    }))),
    ...(composition.excludeCash ? composition.xCodes.map((xCode) => ({
      label: `Cash balances at central banks and other demand deposits (x=${xCode})`,
      operator: "subtract",
      source: `${COST_OF_RISK_STAGE_BOX_TABLE_ID} / x ${xCode} / y ${COST_OF_RISK_DENOMINATOR_CASH_Y_CODE}`,
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

export function getPointSeriesValues(state, indexes, referenceColumns, tableId, point, jstCode) {
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

export function getCostOfRiskPointRows(state, indexes, tableId, point, jstCode) {
  const indexedRows = getCostOfRiskIndexedPointRows(state, indexes, tableId, point, jstCode);
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
      allowanceMovementSeries: new Map(),
      denominatorCellSeries: new Map(),
      denominatorPointsSeries: new Map(),
      pointSeries: new Map()
    });
  }

  const cache = COST_OF_RISK_SERIES_CACHE.get(rowsKey);
  if (!cache.allowanceMovementSeries) cache.allowanceMovementSeries = new Map();
  if (!cache.denominatorCellSeries) cache.denominatorCellSeries = new Map();
  if (!cache.denominatorPointsSeries) cache.denominatorPointsSeries = new Map();
  if (!cache.pointSeries) cache.pointSeries = new Map();
  return cache;
}

function makeCostOfRiskAllowanceMovementSeriesKey(
  xCodes,
  yCodes,
  jstCode,
  referenceColumns,
  periodMode = COST_OF_RISK_PERIOD_MODE_QUARTERLY
) {
  return [
    "allowance-movement",
    normalizeCostOfRiskPeriodMode(periodMode),
    jstCode,
    xCodes.map((code) => normalizeAxisCode(code, "x")).sort().join(","),
    yCodes.map((code) => normalizeAxisCode(code, "y")).sort().join(","),
    referenceColumns.map((column) => column.index).join(",")
  ].join(CACHE_KEY_SEPARATOR);
}

function makeCostOfRiskDenominatorCellSeriesKey(jstCode, xCode, yCode, referenceColumns) {
  return [
    "denominator-cell",
    jstCode,
    normalizeAxisCode(xCode, "x"),
    normalizeAxisCode(yCode, "y"),
    referenceColumns.map((column) => column.index).join(",")
  ].join(CACHE_KEY_SEPARATOR);
}

function makeCostOfRiskDenominatorPointsSeriesKey(jstCode, xCodes, yCodes, referenceColumns) {
  return [
    "denominator-points",
    jstCode,
    xCodes.map((code) => normalizeAxisCode(code, "x")).sort().join(","),
    yCodes.map((code) => normalizeAxisCode(code, "y")).sort().join(","),
    referenceColumns.map((column) => column.index).join(",")
  ].join(CACHE_KEY_SEPARATOR);
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

export function createEmptySeries(length) {
  return Array.from({ length }, () => 0);
}

export function addSeriesValues(target, source, multiplier = 1) {
  source.forEach((value, index) => {
    target[index] = (target[index] ?? 0) + multiplier * value;
  });
}

export function decumulateQuarterlySeries(referenceColumns, values) {
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

function getCostOfRiskIndexedPointRows(state, indexes, tableId, point, jstCode) {
  if (!state.dataIndexes?.byCoordinates || !point.xCode || !point.yCode) return null;

  if (point.zCode) {
    return getIndexedRowsByCoordinates(state, tableId, {
      selectedXCode: point.xCode,
      selectedYCode: point.yCode,
      selectedZCode: point.zCode
    }, jstCode);
  }

  const rowsToFilter = getIndexedRowsByAxisPoint(state, tableId, "y", point.yCode, jstCode);
  if (rowsToFilter.length === 0) return [];

  return rowsToFilter.filter((row) => (
    matchesAxis(row, indexes, "x", point.xCode)
    && matchesAxis(row, indexes, "y", point.yCode)
  ));
}

function matchesAxis(row, indexes, axis, code) {
  if (!code) return true;
  const index = indexes[`${axis}AxisRcCode`];
  if (index === -1 || index === undefined) return false;
  return normalizeAxisCode(row[index], axis) === normalizeAxisCode(code, axis);
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
