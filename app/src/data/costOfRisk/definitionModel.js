import { normalizeAxisCode } from "../core/axisCode.js";
import { getRequiredAxisColumnIndexes as getRequiredIndexes } from "../core/axisColumns.js";
import { getReferenceColumns } from "../core/referenceColumns.js";
import {
  COST_OF_RISK_DEFINITION_ACPR_X_CODES,
  COST_OF_RISK_DEFINITION_CUSTOM_X_CODES,
  COST_OF_RISK_DEFINITION_F12_X_CODES,
  COST_OF_RISK_DEFINITION_OPTIONS,
  COST_OF_RISK_F02_TABLE_ID,
  COST_OF_RISK_F02_X_AXIS_CODE,
  COST_OF_RISK_F02_Y_AXIS_CODE,
  COST_OF_RISK_FILTER_ALL,
  COST_OF_RISK_TABLE_ID
} from "./definitions.js";
import {
  COST_OF_RISK_PERIOD_MODE_QUARTERLY,
  buildCostOfRiskSelectionFromFilters,
  formatCostOfRiskAllowanceMovementDisplayValue,
  formatCostOfRiskAssetLabel,
  formatCostOfRiskCounterpartyLabel,
  formatCostOfRiskStageLabel,
  getCostOfRiskAllowanceMovementPeriodSeries,
  getCostOfRiskBalanceSheetAllowanceDescriptors,
  getCostOfRiskDenominatorComposition,
  getCostOfRiskMovementDenominator,
  getCostOfRiskPeerJstCodes,
  getCostOfRiskRatioDenominatorSeries,
  getCostOfRiskReferenceIndex,
  getCostOfRiskXAxisFullLabelMap,
  getPointSeriesValues,
  isCostOfRiskCounterpartyLabel,
  matchesCostOfRiskFilterDescriptor,
  normalizeCostOfRiskFilters,
  normalizeCostOfRiskPeriodMode,
  resolveCostOfRiskPeriodSeries
} from "./core.js";

export function buildCostOfRiskDefinitionModel(
  state,
  definitionId = "f12-selected-components",
  filters = {},
  referenceDate = "",
  selectedDriverCode = "",
  customXCodes = null,
  options = {}
) {
  const indexes = getRequiredIndexes(state.columns);
  const referenceColumns = getReferenceColumns(state.columns);
  const definition = COST_OF_RISK_DEFINITION_OPTIONS.find((option) => option.id === definitionId)
    ?? COST_OF_RISK_DEFINITION_OPTIONS[1];
  const includeComponents = options.includeComponents !== false;
  const includeDrivers = options.includeDrivers !== false;
  const includeBenchmarkSeries = options.includeBenchmarkSeries !== false;
  const periodMode = normalizeCostOfRiskPeriodMode(options.periodMode);

  if (!indexes || !state.selectedJst || referenceColumns.length === 0) {
    return {
      benchmarkSeries: [],
      definition,
      denominator: null,
      denominatorLabel: "",
      components: [],
      drivers: [],
      ratioBasisPoints: null,
      referenceDate: "",
      series: [],
      status: "Load a CSV and select a JST.",
      value: null
    };
  }

  const referenceIndex = getCostOfRiskReferenceIndex(referenceColumns, referenceDate);
  const series = buildCostOfRiskDefinitionSeriesForJst(state, indexes, referenceColumns, definition.id, filters, state.selectedJst, customXCodes, periodMode);
  const selectedPoint = series[referenceIndex] ?? null;
  const components = includeComponents
    ? buildCostOfRiskDefinitionComponents(state, indexes, referenceColumns, definition.id, filters, referenceIndex, customXCodes, periodMode)
    : [];
  const drivers = includeDrivers
    ? buildCostOfRiskDefinitionDrivers(state, indexes, referenceColumns, definition.id, filters, referenceIndex, customXCodes, periodMode)
    : [];
  const selectedComponent = components.find((component) => component.code === selectedDriverCode) ?? null;
  const selectedDriver = selectedComponent ? null : drivers.find((driver) => driver.code === selectedDriverCode) ?? null;
  const chartSeries = selectedDriver
    ? buildCostOfRiskDefinitionDriverSeriesForJst(state, indexes, referenceColumns, definition.id, filters, selectedDriver.code, state.selectedJst, periodMode)
    : selectedComponent
      ? buildCostOfRiskDefinitionComponentSeriesForJst(state, indexes, referenceColumns, definition.id, filters, selectedComponent.code, state.selectedJst, periodMode)
    : series;

  return {
    benchmarkSeries: includeBenchmarkSeries
      ? buildCostOfRiskDefinitionBenchmarkSeries(
        state,
        indexes,
        referenceColumns,
        definition.id,
        filters,
        selectedDriver?.code ?? selectedComponent?.code ?? "",
        customXCodes,
        chartSeries,
        periodMode
      )
      : [],
    chartSeries,
    components,
    definition,
    denominator: selectedPoint?.denominator ?? null,
    denominatorLabel: getCostOfRiskDenominatorComposition(state, getCostOfRiskDefinitionDenominatorFilters(filters)).label,
    drivers,
    ratioBasisPoints: selectedPoint?.ratioBasisPoints ?? null,
    referenceDate: selectedPoint?.label ?? "",
    selectedDriver,
    series,
    status: "",
    value: selectedPoint?.value ?? null
  };
}

function buildCostOfRiskDefinitionBenchmarkSeries(
  state,
  indexes,
  referenceColumns,
  definitionId,
  filters,
  selectedDriverCode = "",
  customXCodes = null,
  selectedJstSeries = null,
  periodMode = COST_OF_RISK_PERIOD_MODE_QUARTERLY
) {
  return getCostOfRiskPeerJstCodes(state).map((jstCode) => ({
    jstCode,
    points: jstCode === state.selectedJst && Array.isArray(selectedJstSeries)
      ? selectedJstSeries
      : selectedDriverCode
        ? buildCostOfRiskDefinitionSelectedSeriesForJst(state, indexes, referenceColumns, definitionId, filters, selectedDriverCode, jstCode, periodMode)
        : buildCostOfRiskDefinitionSeriesForJst(state, indexes, referenceColumns, definitionId, filters, jstCode, customXCodes, periodMode)
  }));
}

function buildCostOfRiskDefinitionSelectedSeriesForJst(state, indexes, referenceColumns, definitionId, filters, selectedCode, jstCode, periodMode = COST_OF_RISK_PERIOD_MODE_QUARTERLY) {
  return String(selectedCode).startsWith("component:")
    ? buildCostOfRiskDefinitionComponentSeriesForJst(state, indexes, referenceColumns, definitionId, filters, selectedCode, jstCode, periodMode)
    : buildCostOfRiskDefinitionDriverSeriesForJst(state, indexes, referenceColumns, definitionId, filters, selectedCode, jstCode, periodMode);
}

function getCostOfRiskDefinitionXCodes(definitionId, customXCodes = null) {
  if (Array.isArray(customXCodes)) return normalizeCostOfRiskDefinitionCustomXCodes(customXCodes);
  if (definitionId === "f12-acpr-components") return COST_OF_RISK_DEFINITION_ACPR_X_CODES;
  if (definitionId === "f02-impairment") return [];
  return COST_OF_RISK_DEFINITION_F12_X_CODES;
}

function buildCostOfRiskDefinitionSeriesForJst(state, indexes, referenceColumns, definitionId, filters, jstCode, customXCodes = null, periodMode = COST_OF_RISK_PERIOD_MODE_QUARTERLY) {
  const selectedXCodes = getCostOfRiskDefinitionXCodes(definitionId, customXCodes);
  if (definitionId !== "f02-impairment") {
    return buildCostOfRiskF12SelectedComponentPointsForJst(
      state, indexes, referenceColumns, filters, jstCode, selectedXCodes, periodMode
    );
  }
  const baseSeries = buildCostOfRiskF02ImpairmentPointsForJst(
    state, indexes, referenceColumns, filters, jstCode, periodMode
  );
  if (selectedXCodes.length === 0) return baseSeries;
  const adjustmentSeries = buildCostOfRiskF12SelectedComponentPointsForJst(
    state, indexes, referenceColumns, filters, jstCode, selectedXCodes, periodMode
  );
  return baseSeries.map((point, index) => {
    const adjustment = adjustmentSeries[index];
    const value = Number.isFinite(point?.value) || Number.isFinite(adjustment?.value)
      ? (point?.value ?? 0) + (adjustment?.value ?? 0)
      : null;
    return {
      ...point,
      ratioBasisPoints: point?.denominator && Number.isFinite(value) ? (value / point.denominator) * 10000 : null,
      value
    };
  });
}

// Definition ratios use one stable exposure base. Dimensional filters refine
// the numerator only, so the ratios of the displayed sub-components remain
// additive and can be reconciled with the all-scope definition ratio.
function getCostOfRiskDefinitionDenominatorSeries(state, indexes, referenceColumns, jstCode, filters = {}) {
  return getCostOfRiskRatioDenominatorSeries(
    state, indexes, referenceColumns, jstCode, getCostOfRiskDefinitionDenominatorFilters(filters)
  );
}

function getCostOfRiskDefinitionDenominatorFilters(filters = {}) {
  return {
    ...filters,
    asset: COST_OF_RISK_FILTER_ALL,
    counterparty: COST_OF_RISK_FILTER_ALL,
    stage: COST_OF_RISK_FILTER_ALL
  };
}

function buildCostOfRiskDefinitionDriverSeriesForJst(state, indexes, referenceColumns, definitionId, filters, driverCode, jstCode, periodMode = COST_OF_RISK_PERIOD_MODE_QUARTERLY) {
  if (!driverCode || driverCode === "F02:0460") {
    return buildCostOfRiskF02ImpairmentPointsForJst(state, indexes, referenceColumns, filters, jstCode, periodMode);
  }

  const [xCode, yCode] = String(driverCode).split(":");
  if (!xCode || !yCode) return [];

  const periodValueSeries = getCostOfRiskAllowanceMovementPeriodSeries(
    state,
    indexes,
    referenceColumns,
    [xCode],
    [yCode],
    jstCode,
    periodMode
  );
  const denominatorSeries = getCostOfRiskDefinitionDenominatorSeries(state, indexes, referenceColumns, jstCode, filters);

  return referenceColumns.map((referenceColumn, index) => {
    const value = periodValueSeries[index] ?? null;
    const denominator = getCostOfRiskMovementDenominator(denominatorSeries, referenceColumns, index, periodMode);

    return {
      date: referenceColumn.date,
      denominator,
      label: referenceColumn.label,
      ratioBasisPoints: denominator ? (value / denominator) * 10000 : null,
      value
    };
  });
}

function buildCostOfRiskDefinitionComponentSeriesForJst(state, indexes, referenceColumns, definitionId, filters, componentCode, jstCode, periodMode = COST_OF_RISK_PERIOD_MODE_QUARTERLY) {
  if (componentCode === "component:f02-impairment") {
    return buildCostOfRiskF02ImpairmentPointsForJst(state, indexes, referenceColumns, filters, jstCode, periodMode);
  }

  const xCode = String(componentCode ?? "").replace(/^component:/, "");
  if (!xCode) return [];
  return buildCostOfRiskF12SelectedComponentPointsForJst(state, indexes, referenceColumns, filters, jstCode, [xCode], periodMode);
}

function buildCostOfRiskF02ImpairmentPointsForJst(state, indexes, referenceColumns, filters, jstCode, periodMode = COST_OF_RISK_PERIOD_MODE_QUARTERLY) {
  const rawValueSeries = getPointSeriesValues(state, indexes, referenceColumns, COST_OF_RISK_F02_TABLE_ID, {
    xCode: COST_OF_RISK_F02_X_AXIS_CODE,
    yCode: COST_OF_RISK_F02_Y_AXIS_CODE,
    zCode: ""
  }, jstCode);
  const periodValueSeries = resolveCostOfRiskPeriodSeries(referenceColumns, rawValueSeries, periodMode);
  const denominatorSeries = getCostOfRiskDefinitionDenominatorSeries(state, indexes, referenceColumns, jstCode, filters);

  return referenceColumns.map((referenceColumn, index) => {
    const rawValue = periodValueSeries[index] ?? null;
    const displayedValue = formatCostOfRiskAllowanceMovementDisplayValue(rawValue);
    const value = Number.isFinite(displayedValue) ? -displayedValue : displayedValue;
    const denominator = getCostOfRiskMovementDenominator(denominatorSeries, referenceColumns, index, periodMode);

    return {
      date: referenceColumn.date,
      denominator,
      label: referenceColumn.label,
      ratioBasisPoints: denominator ? (value / denominator) * 10000 : null,
      value
    };
  });
}

function buildCostOfRiskF12SelectedComponentPointsForJst(state, indexes, referenceColumns, filters, jstCode, xCodes = COST_OF_RISK_DEFINITION_F12_X_CODES, periodMode = COST_OF_RISK_PERIOD_MODE_QUARTERLY) {
  const selectedOption = buildCostOfRiskSelectionFromFilters(state, filters);
  const periodValueSeries = getCostOfRiskAllowanceMovementPeriodSeries(
    state,
    indexes,
    referenceColumns,
    xCodes,
    selectedOption.points,
    jstCode,
    periodMode
  );
  const denominatorSeries = getCostOfRiskDefinitionDenominatorSeries(state, indexes, referenceColumns, jstCode, filters);

  return referenceColumns.map((referenceColumn, index) => {
    const value = periodValueSeries[index] ?? null;
    const denominator = getCostOfRiskMovementDenominator(denominatorSeries, referenceColumns, index, periodMode);

    return {
      date: referenceColumn.date,
      denominator,
      label: referenceColumn.label,
      ratioBasisPoints: denominator ? (value / denominator) * 10000 : null,
      value
    };
  });
}

function buildCostOfRiskDefinitionDrivers(
  state,
  indexes,
  referenceColumns,
  definitionId,
  filters,
  referenceIndex,
  customXCodes = null,
  periodMode = COST_OF_RISK_PERIOD_MODE_QUARTERLY
) {
  const baseDrivers = [];
  if (definitionId === "f02-impairment") {
    const point = buildCostOfRiskF02ImpairmentPointsForJst(state, indexes, referenceColumns, filters, state.selectedJst, periodMode)[referenceIndex];
    baseDrivers.push({
      code: "F02:0460",
      label: "F02 impairment contribution",
      ratioBasisPoints: point?.ratioBasisPoints ?? null,
      source: `${COST_OF_RISK_F02_TABLE_ID} / x ${COST_OF_RISK_F02_X_AXIS_CODE} / y ${COST_OF_RISK_F02_Y_AXIS_CODE}`,
      value: point?.value ?? null
    });
  }

  const denominatorSeries = getCostOfRiskDefinitionDenominatorSeries(state, indexes, referenceColumns, state.selectedJst, filters);
  const denominator = getCostOfRiskMovementDenominator(denominatorSeries, referenceColumns, referenceIndex, periodMode);
  const xLabels = getCostOfRiskXAxisFullLabelMap(state);
  const granularDescriptors = getCostOfRiskDefinitionGranularDriverDescriptors(state, filters);
  const selectedYCodes = granularDescriptors.length > 0
    ? granularDescriptors.map((descriptor) => descriptor.code)
    : buildCostOfRiskSelectionFromFilters(state, filters).points;
  const descriptorByCode = new Map(granularDescriptors.map((descriptor) => [descriptor.code, descriptor]));

  const componentDrivers = getCostOfRiskDefinitionXCodes(definitionId, customXCodes).flatMap((xCode) => selectedYCodes.map((yCode) => {
    const periodValueSeries = getCostOfRiskAllowanceMovementPeriodSeries(
      state,
      indexes,
      referenceColumns,
      [xCode],
      [yCode],
      state.selectedJst,
      periodMode
    );
    const value = periodValueSeries[referenceIndex] ?? null;
    const descriptor = descriptorByCode.get(yCode) ?? null;
    const scopeLabel = descriptor ? createCostOfRiskDefinitionDriverScopeLabel(descriptor) : "Selected perimeter";
    const movementLabel = xLabels.get(xCode) ?? xCode;

    return {
      code: `${xCode}:${yCode}`,
      label: `${formatCostOfRiskDefinitionMovementLabel(movementLabel)} - ${scopeLabel}`,
      ratioBasisPoints: denominator ? (value / denominator) * 10000 : null,
      source: `${COST_OF_RISK_TABLE_ID} / x ${xCode} / y ${yCode}`,
      value
    };
  }));
  return [...baseDrivers, ...componentDrivers]
    .filter((driver) => Number.isFinite(driver.value))
    .sort((left, right) => Math.abs(right.value) - Math.abs(left.value))
    .slice(0, 6);
}

function buildCostOfRiskDefinitionComponents(
  state,
  indexes,
  referenceColumns,
  definitionId,
  filters,
  referenceIndex,
  customXCodes = null,
  periodMode = COST_OF_RISK_PERIOD_MODE_QUARTERLY
) {
  if (definitionId === "f02-impairment") {
    const point = buildCostOfRiskF02ImpairmentPointsForJst(state, indexes, referenceColumns, filters, state.selectedJst, periodMode)[referenceIndex];
    const baseComponent = {
      code: "component:f02-impairment",
      defaultIncluded: true,
      included: true,
      label: "F02 impairment / reversal",
      ratioBasisPoints: point?.ratioBasisPoints ?? null,
      source: `${COST_OF_RISK_F02_TABLE_ID} / x ${COST_OF_RISK_F02_X_AXIS_CODE} / y ${COST_OF_RISK_F02_Y_AXIS_CODE}`,
      value: point?.value ?? null
    };
    return [baseComponent, ...buildCostOfRiskF12DefinitionComponents(
      state, indexes, referenceColumns, definitionId, filters, referenceIndex, customXCodes, periodMode
    )];
  }

  return buildCostOfRiskF12DefinitionComponents(
    state, indexes, referenceColumns, definitionId, filters, referenceIndex, customXCodes, periodMode
  );
}

function buildCostOfRiskF12DefinitionComponents(
  state,
  indexes,
  referenceColumns,
  definitionId,
  filters,
  referenceIndex,
  customXCodes,
  periodMode
) {

  const denominatorSeries = getCostOfRiskDefinitionDenominatorSeries(state, indexes, referenceColumns, state.selectedJst, filters);
  const denominator = getCostOfRiskMovementDenominator(denominatorSeries, referenceColumns, referenceIndex, periodMode);
  const xLabels = getCostOfRiskXAxisFullLabelMap(state);

  const includedCodes = new Set(getCostOfRiskDefinitionXCodes(definitionId, customXCodes));
  const defaultCodes = new Set(definitionId === "f12-acpr-components"
    ? COST_OF_RISK_DEFINITION_ACPR_X_CODES
    : definitionId === "f12-selected-components"
      ? COST_OF_RISK_DEFINITION_F12_X_CODES
      : []);
  const componentCodes = COST_OF_RISK_DEFINITION_CUSTOM_X_CODES;

  return componentCodes.map((xCode) => {
    const point = buildCostOfRiskF12SelectedComponentPointsForJst(
      state,
      indexes,
      referenceColumns,
      filters,
      state.selectedJst,
      [xCode],
      periodMode
    )[referenceIndex];
    const value = point?.value ?? null;

    return {
      code: `component:${xCode}`,
      defaultIncluded: defaultCodes.has(xCode),
      included: includedCodes.has(xCode),
      userAdded: includedCodes.has(xCode) && !defaultCodes.has(xCode),
      userRemoved: !includedCodes.has(xCode) && defaultCodes.has(xCode),
      label: formatCostOfRiskDefinitionMovementLabel(xLabels.get(xCode) ?? xCode),
      ratioBasisPoints: denominator ? (value / denominator) * 10000 : null,
      source: `${COST_OF_RISK_TABLE_ID} / x ${xCode} / selected Y scope`,
      value
    };
  });
}

function normalizeCostOfRiskDefinitionCustomXCodes(customXCodes) {
  if (!Array.isArray(customXCodes)) return COST_OF_RISK_DEFINITION_CUSTOM_X_CODES;
  const allowedCodes = new Set(COST_OF_RISK_DEFINITION_CUSTOM_X_CODES);
  return customXCodes
    .map((code) => normalizeAxisCode(code, "x"))
    .filter((code, index, array) => allowedCodes.has(code) && array.indexOf(code) === index);
}

function getCostOfRiskDefinitionGranularDriverDescriptors(state, filters = {}) {
  const normalizedFilters = normalizeCostOfRiskFilters(filters);
  return getCostOfRiskBalanceSheetAllowanceDescriptors(state)
    .filter((descriptor) => matchesCostOfRiskFilterDescriptor(descriptor, normalizedFilters))
    .filter(isCostOfRiskDefinitionGranularDriverDescriptor);
}

function isCostOfRiskDefinitionGranularDriverDescriptor(descriptor) {
  return Boolean(
    descriptor.stage
    && descriptor.asset
    && descriptor.counterparty
    && isCostOfRiskCounterpartyLabel(descriptor.terminal, descriptor.counterparty)
  );
}

function createCostOfRiskDefinitionDriverScopeLabel(descriptor) {
  return [
    formatCostOfRiskStageLabel(descriptor.stage),
    formatCostOfRiskCounterpartyLabel(descriptor.counterparty),
    formatCostOfRiskAssetLabel(descriptor.asset)
  ].filter(Boolean).join(" / ");
}

function formatCostOfRiskDefinitionMovementLabel(label) {
  return String(label ?? "")
    .replace(/^Movements\//i, "")
    .replace(/^P&L impacts\//i, "")
    .replace(/\s*\(net\)$/i, "")
    .trim();
}
