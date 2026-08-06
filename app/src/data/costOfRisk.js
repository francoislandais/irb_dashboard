import { getIndexedRowsByAxisPoint, getIndexedRowsByCoordinates } from "./dataIndex.js?v=20260804-lazy-index";
import { normalizeAxisCode } from "./core/axisCode.js";
import { getRequiredAxisColumnIndexes as getRequiredIndexes } from "./core/axisColumns.js";
import { formatBasisPointsValue, formatMetricValue, formatSignedMetricValue } from "./core/formatting.js?v=20260710-bp-format";
import { getReferenceColumns, parseNumericValue } from "./core/referenceColumns.js";

import {
  ALL_STAGES_LABEL,
  ASSET_KEY_BY_LABEL,
  ASSET_LABEL_BY_KEY,
  ASSET_LABELS,
  ASSET_SHORT_LABELS,
  COUNTERPARTY_LABELS,
  COUNTERPARTY_SHORT_LABELS,
  DEFAULT_COST_OF_RISK_COLLATERAL_RATIO_CELL,
  DEFAULT_COST_OF_RISK_COUNTERPARTY_SUMMARY_CELL,
  DEFAULT_COST_OF_RISK_COVERAGE_RATIO_CELL,
  DEFAULT_COST_OF_RISK_STAGE_RATIO_CELL,
  DEFAULT_COST_OF_RISK_STAGE_SUMMARY_CELL,
  COST_OF_RISK_ALLOWANCE_STAGE_X_CODES,
  COST_OF_RISK_BALANCE_SCOPE_IN_BALANCE,
  COST_OF_RISK_BALANCE_SCOPE_OFF_BALANCE,
  COST_OF_RISK_BALANCE_SCOPE_OPTIONS,
  COST_OF_RISK_BALANCE_SCOPE_TOTAL,
  COST_OF_RISK_BALANCE_SHEET_ALLOWANCE_PREFIX,
  COST_OF_RISK_CONFIG,
  COST_OF_RISK_COUNTERPARTY_FILTER_OPTIONS,
  COST_OF_RISK_COUNTERPARTY_SUMMARY_ROWS,
  COST_OF_RISK_DEFINITION_ACPR_X_CODES,
  COST_OF_RISK_DEFINITION_CUSTOM_X_CODES,
  COST_OF_RISK_DEFINITION_F12_X_CODES,
  COST_OF_RISK_DEFINITION_OPTIONS,
  COST_OF_RISK_DENOMINATOR_CASH_Y_CODE,
  COST_OF_RISK_DENOMINATOR_STAGE_X_CODES,
  COST_OF_RISK_F02_TABLE_ID,
  COST_OF_RISK_F02_X_AXIS_CODE,
  COST_OF_RISK_F02_Y_AXIS_CODE,
  COST_OF_RISK_F12_RECONCILIATION_X_CODES,
  COST_OF_RISK_FILTER_ALL,
  COST_OF_RISK_GEOGRAPHY_EURO_AREA_COUNTRIES,
  COST_OF_RISK_GEOGRAPHY_EXPOSURE_X_CODE,
  COST_OF_RISK_GEOGRAPHY_IMPAIRMENT_X_CODE,
  COST_OF_RISK_GEOGRAPHY_NON_PERFORMING_X_CODE,
  COST_OF_RISK_GEOGRAPHY_TABLE_ID,
  COST_OF_RISK_GEOGRAPHY_Y_CODES,
  COST_OF_RISK_NPL_FLOW_COUNTERPARTY_ROWS,
  COST_OF_RISK_NPL_FLOW_DEFINITION,
  COST_OF_RISK_NPL_FLOW_INFLOW_X_CODE,
  COST_OF_RISK_NPL_FLOW_OUTFLOW_X_CODE,
  COST_OF_RISK_NPL_FLOW_TABLE_ID,
  COST_OF_RISK_OFF_BALANCE_ALLOWANCE_PREFIX,
  COST_OF_RISK_OFF_BALANCE_ALLOWANCE_Y_CODES,
  COST_OF_RISK_OFF_BALANCE_ALLOWANCE_Y_CODE_SET,
  COST_OF_RISK_PERFORMANCE_STATUS_VALUES,
  COST_OF_RISK_STAGE_BOX_DESCRIPTION_PREFIX,
  COST_OF_RISK_STAGE_BOX_TABLE_ID,
  COST_OF_RISK_STAGE_BOX_X_CODES,
  COST_OF_RISK_STAGE_SERIES_DEFINITIONS,
  COST_OF_RISK_STAGE_SUMMARY_ROWS,
  COST_OF_RISK_STAGE_TRANSFER_FLOW_MOVEMENTS,
  COST_OF_RISK_STAGE_TRANSFER_MOVEMENTS,
  COST_OF_RISK_STAGE_TRANSFER_STAGE_LABELS,
  COST_OF_RISK_STAGE_TRANSFER_TABLE_ID,
  COST_OF_RISK_TABLE_ID,
  COST_OF_RISK_TOTAL_CONTRIBUTION_X_CODE,
  COST_OF_RISK_TOTAL_Y_AXIS_CODE,
  COST_OF_RISK_TREEMAP_COUNTERPARTIES,
  COST_OF_RISK_TREEMAP_STAGE_OPTIONS,
  COST_OF_RISK_WATERFALL_X_CODES,
  COST_OF_RISK_WRITE_OFF_X_CODES,
  COST_OF_RISK_X_AXIS_CODE,
  STAGE_LABELS,
  STAGE_SHORT_LABELS
} from "./costOfRisk/definitions.js";

export * from "./costOfRisk/definitions.js";

const CACHE_KEY_SEPARATOR = "\u001f";
const COST_OF_RISK_SERIES_CACHE = new WeakMap();
export const COST_OF_RISK_PERIOD_MODE_QUARTERLY = "quarterly";
export const COST_OF_RISK_PERIOD_MODE_YTD = "ytd";

// The ratio denominator follows the sidebar filters: it is always the
// FINREP F_18.00 GCA for the same asset/counterparty/stage perimeter as the
// numerator.
function getCostOfRiskDenominatorComposition(state, filters = {}) {
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

function getCostOfRiskStageTransferDenominatorFilters(filters = {}) {
  return {
    ...filters,
    stage: COST_OF_RISK_FILTER_ALL
  };
}

function formatCostOfRiskAllowanceMovementDisplayValue(value) {
  return Number.isFinite(value) ? -value : value;
}

function getCostOfRiskAllowanceMovementSign(yCode) {
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

function normalizeCostOfRiskPeriodMode(periodMode = COST_OF_RISK_PERIOD_MODE_QUARTERLY) {
  return periodMode === COST_OF_RISK_PERIOD_MODE_YTD
    ? COST_OF_RISK_PERIOD_MODE_YTD
    : COST_OF_RISK_PERIOD_MODE_QUARTERLY;
}

function resolveCostOfRiskPeriodSeries(referenceColumns, values, periodMode = COST_OF_RISK_PERIOD_MODE_QUARTERLY) {
  return normalizeCostOfRiskPeriodMode(periodMode) === COST_OF_RISK_PERIOD_MODE_YTD
    ? values
    : decumulateQuarterlySeries(referenceColumns, values);
}

function getCostOfRiskRatioDenominatorLabel(periodMode = COST_OF_RISK_PERIOD_MODE_QUARTERLY) {
  return normalizeCostOfRiskPeriodMode(periodMode) === COST_OF_RISK_PERIOD_MODE_YTD
    ? "first quarter of the year"
    : "previous quarter";
}

function getCostOfRiskAllowanceMovementPeriodSeries(state, indexes, referenceColumns, xCodes, yCodes, jstCode, periodMode = COST_OF_RISK_PERIOD_MODE_QUARTERLY) {
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

function getCostOfRiskAllowanceMovementQuarterlySeries(state, indexes, referenceColumns, xCodes, yCodes, jstCode) {
  return getCostOfRiskAllowanceMovementPeriodSeries(
    state,
    indexes,
    referenceColumns,
    xCodes,
    yCodes,
    jstCode,
    COST_OF_RISK_PERIOD_MODE_QUARTERLY
  );
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

export function buildCostOfRiskGeographyModel(
  state,
  filters = {},
  referenceDate = "",
  options = {}
) {
  const indexes = getRequiredIndexes(state.columns);
  const referenceColumns = getReferenceColumns(state.columns);

  if (!indexes || !state.selectedJst || referenceColumns.length === 0) {
    return { countries: [], referenceDate: "", status: "Load a CSV and select a JST." };
  }

  const referenceIndex = getCostOfRiskReferenceIndex(referenceColumns, referenceDate);
  const referenceColumn = referenceColumns[referenceIndex];
  const normalizedFilters = normalizeCostOfRiskFilters(filters);
  if (normalizedFilters.balanceScope !== COST_OF_RISK_BALANCE_SCOPE_IN_BALANCE) {
    return {
      countries: [],
      referenceDate: referenceColumn?.label ?? "",
      status: "F_20.04 geography data is available for in-balance assets only."
    };
  }

  const yCodes = getCostOfRiskGeographyYCodes(filters);
  if (yCodes.length === 0) {
    return {
      countries: [],
      referenceDate: referenceColumn?.label ?? "",
      status: "F_20.04 does not provide this instrument and counterparty combination."
    };
  }

  const countryRows = buildCostOfRiskGeographyCountryRows(state, indexes, referenceColumn, yCodes);
  const selectedMode = normalizeCostOfRiskGeographyCountryMode(options.countryMode);
  const selectedCountries = selectCostOfRiskGeographyCountries(countryRows, selectedMode, options.countryCodes);
  const visibleCountrySet = new Set(selectedCountries);
  const countries = countryRows
    .filter((country) => visibleCountrySet.has(country.code))
    .sort((left, right) => {
      const leftRank = selectedCountries.indexOf(left.code);
      const rightRank = selectedCountries.indexOf(right.code);
      return leftRank - rightRank;
    });
  const selectedCell = getCostOfRiskGeographySelectedCell(countries, options.selectedCellKey);

  return {
    allCountries: countryRows,
    benchmarkSeries: selectedCell
      ? getCostOfRiskPeerJstCodes(state).map((jstCode) => ({
        jstCode,
        points: buildCostOfRiskGeographyBenchmarkPoints(state, indexes, referenceColumns, yCodes, selectedCell, jstCode)
      }))
      : [],
    countries,
    countryMode: selectedMode,
    filterLabel: getCostOfRiskGeographyFilterLabel(filters),
    referenceDate: referenceColumn?.label ?? "",
    selectedCell,
    selectedCountries,
    status: countryRows.length === 0 ? "No F_20.04 geography data is available for the current selection." : ""
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

export function buildCostOfRiskF02ImpairmentRatio(
  state,
  referenceDate = "",
  filters = {},
  periodMode = COST_OF_RISK_PERIOD_MODE_QUARTERLY
) {
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
  const periodValueSeries = resolveCostOfRiskPeriodSeries(referenceColumns, rawValueSeries, periodMode);
  const denominatorSeries = getCostOfRiskRatioDenominatorSeries(state, indexes, referenceColumns, state.selectedJst, filters);
  const referenceIndex = getCostOfRiskReferenceIndex(referenceColumns, referenceDate);
  const value = formatCostOfRiskAllowanceMovementDisplayValue(periodValueSeries[referenceIndex] ?? null);
  const denominator = getCostOfRiskMovementDenominator(denominatorSeries, referenceColumns, referenceIndex, periodMode);

  return {
    denominator,
    label: "F_02.00 y_axis 0460",
    ratioBasisPoints: denominator ? (value / denominator) * 10000 : null,
    referenceDate: referenceColumns[referenceIndex]?.label ?? "",
    value
  };
}

export function buildCostOfRiskF02ImpairmentSeries(
  state,
  filters = {},
  periodMode = COST_OF_RISK_PERIOD_MODE_QUARTERLY
) {
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
  const periodValueSeries = resolveCostOfRiskPeriodSeries(referenceColumns, rawValueSeries, periodMode);
  const denominatorSeries = getCostOfRiskRatioDenominatorSeries(state, indexes, referenceColumns, state.selectedJst, filters);

  return {
    points: referenceColumns.map((referenceColumn, index) => {
      const value = periodValueSeries[index] ?? null;
      const signedValue = Number.isFinite(value) ? -value : value;
      const denominator = getCostOfRiskMovementDenominator(denominatorSeries, referenceColumns, index, periodMode);

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

export function buildCostOfRiskF12ContributionSeries(
  state,
  filters,
  selectedXCodes = COST_OF_RISK_F12_RECONCILIATION_X_CODES,
  periodMode = COST_OF_RISK_PERIOD_MODE_QUARTERLY
) {
  const indexes = getRequiredIndexes(state.columns);
  const referenceColumns = getReferenceColumns(state.columns);
  const selectedOption = buildCostOfRiskSelectionFromFilters(state, filters);
  const selectedCodeSet = new Set((selectedXCodes ?? []).map((code) => normalizeAxisCode(code, "x")));

  if (!indexes || !state.selectedJst || referenceColumns.length === 0 || selectedOption.points.length === 0 || selectedCodeSet.size === 0) {
    return { points: [], status: "Load a CSV and select a core definition." };
  }

  const periodValueSeries = getCostOfRiskAllowanceMovementPeriodSeries(
    state,
    indexes,
    referenceColumns,
    COST_OF_RISK_F12_RECONCILIATION_X_CODES.filter((xCode) => selectedCodeSet.has(xCode)),
    selectedOption.points,
    state.selectedJst,
    periodMode
  );
  const denominatorSeries = getCostOfRiskRatioDenominatorSeries(state, indexes, referenceColumns, state.selectedJst, filters);

  return {
    points: referenceColumns.map((referenceColumn, index) => {
      const value = periodValueSeries[index] ?? null;
      const denominator = getCostOfRiskMovementDenominator(denominatorSeries, referenceColumns, index, periodMode);

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

export function buildCostOfRiskDefinitionModel(
  state,
  definitionId = "f12-selected-components",
  filters = {},
  referenceDate = "",
  selectedDriverCode = "",
  customXCodes = COST_OF_RISK_DEFINITION_CUSTOM_X_CODES,
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
    denominatorLabel: getCostOfRiskDenominatorComposition(state, filters).label,
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
  customXCodes = COST_OF_RISK_DEFINITION_CUSTOM_X_CODES,
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

function getCostOfRiskDefinitionXCodes(definitionId, customXCodes = COST_OF_RISK_DEFINITION_CUSTOM_X_CODES) {
  if (definitionId === "f12-acpr-components") return COST_OF_RISK_DEFINITION_ACPR_X_CODES;
  if (definitionId === "f12-custom-components") return normalizeCostOfRiskDefinitionCustomXCodes(customXCodes);
  return COST_OF_RISK_DEFINITION_F12_X_CODES;
}

function buildCostOfRiskDefinitionSeriesForJst(state, indexes, referenceColumns, definitionId, filters, jstCode, customXCodes = COST_OF_RISK_DEFINITION_CUSTOM_X_CODES, periodMode = COST_OF_RISK_PERIOD_MODE_QUARTERLY) {
  return definitionId === "f02-impairment"
    ? buildCostOfRiskF02ImpairmentPointsForJst(state, indexes, referenceColumns, filters, jstCode, periodMode)
    : buildCostOfRiskF12SelectedComponentPointsForJst(state, indexes, referenceColumns, filters, jstCode, getCostOfRiskDefinitionXCodes(definitionId, customXCodes), periodMode);
}

function buildCostOfRiskDefinitionDriverSeriesForJst(state, indexes, referenceColumns, definitionId, filters, driverCode, jstCode, periodMode = COST_OF_RISK_PERIOD_MODE_QUARTERLY) {
  if (!driverCode || definitionId === "f02-impairment") {
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
  const denominatorSeries = getCostOfRiskRatioDenominatorSeries(state, indexes, referenceColumns, jstCode, filters);

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
  if (definitionId === "f02-impairment") {
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
  const denominatorSeries = getCostOfRiskRatioDenominatorSeries(state, indexes, referenceColumns, jstCode, filters);

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
  const denominatorSeries = getCostOfRiskRatioDenominatorSeries(state, indexes, referenceColumns, jstCode, filters);

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
  customXCodes = COST_OF_RISK_DEFINITION_CUSTOM_X_CODES,
  periodMode = COST_OF_RISK_PERIOD_MODE_QUARTERLY
) {
  if (definitionId === "f02-impairment") {
    const point = buildCostOfRiskF02ImpairmentPointsForJst(state, indexes, referenceColumns, filters, state.selectedJst, periodMode)[referenceIndex];
    return [{
      code: "F02:0460",
      label: "F02 impairment contribution",
      ratioBasisPoints: point?.ratioBasisPoints ?? null,
      source: `${COST_OF_RISK_F02_TABLE_ID} / x ${COST_OF_RISK_F02_X_AXIS_CODE} / y ${COST_OF_RISK_F02_Y_AXIS_CODE}`,
      value: point?.value ?? null
    }];
  }

  const denominatorSeries = getCostOfRiskRatioDenominatorSeries(state, indexes, referenceColumns, state.selectedJst, filters);
  const denominator = getCostOfRiskMovementDenominator(denominatorSeries, referenceColumns, referenceIndex, periodMode);
  const xLabels = getCostOfRiskXAxisFullLabelMap(state);
  const granularDescriptors = getCostOfRiskDefinitionGranularDriverDescriptors(state, filters);
  const selectedYCodes = granularDescriptors.length > 0
    ? granularDescriptors.map((descriptor) => descriptor.code)
    : buildCostOfRiskSelectionFromFilters(state, filters).points;
  const descriptorByCode = new Map(granularDescriptors.map((descriptor) => [descriptor.code, descriptor]));

  return getCostOfRiskDefinitionXCodes(definitionId, customXCodes).flatMap((xCode) => selectedYCodes.map((yCode) => {
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
  }))
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
  customXCodes = COST_OF_RISK_DEFINITION_CUSTOM_X_CODES,
  periodMode = COST_OF_RISK_PERIOD_MODE_QUARTERLY
) {
  if (definitionId === "f02-impairment") {
    const point = buildCostOfRiskF02ImpairmentPointsForJst(state, indexes, referenceColumns, filters, state.selectedJst, periodMode)[referenceIndex];
    return [{
      code: "component:f02-impairment",
      label: "F02 impairment / reversal",
      ratioBasisPoints: point?.ratioBasisPoints ?? null,
      source: `${COST_OF_RISK_F02_TABLE_ID} / x ${COST_OF_RISK_F02_X_AXIS_CODE} / y ${COST_OF_RISK_F02_Y_AXIS_CODE}`,
      value: point?.value ?? null
    }];
  }

  const denominatorSeries = getCostOfRiskRatioDenominatorSeries(state, indexes, referenceColumns, state.selectedJst, filters);
  const denominator = getCostOfRiskMovementDenominator(denominatorSeries, referenceColumns, referenceIndex, periodMode);
  const xLabels = getCostOfRiskXAxisFullLabelMap(state);

  const includedCodes = new Set(getCostOfRiskDefinitionXCodes(definitionId, customXCodes));
  const componentCodes = definitionId === "f12-custom-components"
    ? COST_OF_RISK_DEFINITION_CUSTOM_X_CODES
    : getCostOfRiskDefinitionXCodes(definitionId, customXCodes);

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
      included: includedCodes.has(xCode),
      label: formatCostOfRiskDefinitionMovementLabel(xLabels.get(xCode) ?? xCode),
      ratioBasisPoints: denominator ? (value / denominator) * 10000 : null,
      source: `${COST_OF_RISK_TABLE_ID} / x ${xCode} / selected Y scope`,
      value
    };
  }).filter((component) => Number.isFinite(component.value));
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

export function buildCostOfRiskMovementContributionAudit(
  state,
  filters,
  xCode = COST_OF_RISK_X_AXIS_CODE,
  periodMode = COST_OF_RISK_PERIOD_MODE_QUARTERLY
) {
  const indexes = getRequiredIndexes(state.columns);
  const referenceColumns = getReferenceColumns(state.columns);
  const selectedOption = buildCostOfRiskSelectionFromFilters(state, filters);
  const normalizedXCode = normalizeAxisCode(xCode || COST_OF_RISK_X_AXIS_CODE, "x");

  if (!indexes || !state.selectedJst || referenceColumns.length === 0 || selectedOption.points.length === 0) {
    return { dates: [], rows: [], title: "Audit trail" };
  }

  const isTotalContribution = normalizedXCode === COST_OF_RISK_TOTAL_CONTRIBUTION_X_CODE;
  const xLabel = isTotalContribution
    ? "Total contribution"
    : getCostOfRiskXAxisFullLabelMap(state).get(normalizedXCode) ?? normalizedXCode;
  const selectedRows = isTotalContribution
    ? buildCostOfRiskMovementTotalContributionAuditRows(
      state,
      indexes,
      referenceColumns,
      selectedOption.points,
      "Selected scope",
      periodMode
    )
    : buildCostOfRiskMovementAuditRowsForYCodes(
      state,
      indexes,
      referenceColumns,
      normalizedXCode,
      selectedOption.points,
      "Selected scope",
      periodMode
    );
  const selectedTotal = createEmptySeries(referenceColumns.length);
  selectedRows.forEach((row) => addSeriesValues(selectedTotal, row.values));

  const denominatorComposition = getCostOfRiskDenominatorComposition(state, filters);
  const denominatorSeries = getCostOfRiskRatioDenominatorSeries(state, indexes, referenceColumns, state.selectedJst, filters);
  const denominatorRows = buildCostOfRiskMovementDenominatorAuditRows(
    state,
    indexes,
    referenceColumns,
    denominatorComposition,
    periodMode
  );
  const denominatorValues = resolveCostOfRiskRatioDenominatorPeriodSeries(referenceColumns, denominatorSeries, periodMode);
  const denominatorLabel = getCostOfRiskRatioDenominatorLabel(periodMode);
  const relativeValues = selectedTotal.map((value, index) => {
    const denominator = denominatorValues[index];
    return Number.isFinite(value) && Number.isFinite(denominator) && denominator !== 0
      ? (value / denominator) * 10000
      : null;
  });

  return {
    dates: referenceColumns.map((column) => ({
      label: column.label,
      date: column.date
    })),
    rows: [
      {
        label: "Displayed contribution",
        section: "Selected scope",
        source: isTotalContribution
          ? `${selectedOption.label} / selected waterfall components`
          : `${selectedOption.label} / x ${normalizedXCode}`,
        type: "amount",
        values: selectedTotal
      },
      ...selectedRows,
      {
        label: "Denominator total",
        section: "Denominator",
        source: `${denominatorComposition.label} / ${denominatorLabel}`,
        type: "amount",
        values: denominatorValues
      },
      ...denominatorRows,
      {
        denominatorValues,
        label: "Relative contribution",
        numeratorValues: selectedTotal,
        section: "Calculation",
        source: `Displayed contribution / ${denominatorLabel} denominator`,
        type: "bp",
        values: relativeValues
      }
    ],
    title: isTotalContribution ? xLabel : `${normalizedXCode} - ${xLabel}`
  };
}

function buildCostOfRiskMovementTotalContributionAuditRows(state, indexes, referenceColumns, yCodes, section, periodMode = COST_OF_RISK_PERIOD_MODE_QUARTERLY) {
  const xLabels = getCostOfRiskXAxisFullLabelMap(state);

  return COST_OF_RISK_WATERFALL_X_CODES.map((xCode) => {
    const values = getCostOfRiskAllowanceMovementPeriodSeries(
      state,
      indexes,
      referenceColumns,
      [xCode],
      yCodes,
      state.selectedJst,
      periodMode
    );

    return {
      label: xLabels.get(xCode) ?? xCode,
      section,
      source: `${COST_OF_RISK_TABLE_ID} / x ${xCode} / selected Y scope`,
      type: "amount",
      values
    };
  });
}

function buildCostOfRiskMovementDenominatorAuditRows(
  state,
  indexes,
  referenceColumns,
  composition,
  periodMode = COST_OF_RISK_PERIOD_MODE_QUARTERLY
) {
  const rows = composition.xCodes.flatMap((xCode) => composition.yCodes.map((yCode) => ({
    label: getMappingDescription(state, COST_OF_RISK_STAGE_BOX_TABLE_ID, "y_axis_rc_code", yCode),
    section: "Denominator",
    source: `${COST_OF_RISK_STAGE_BOX_TABLE_ID} / x ${xCode} / y ${yCode}`,
    type: "amount",
    values: resolveCostOfRiskRatioDenominatorPeriodSeries(
      referenceColumns,
      resolveCostOfRiskDenominatorCellSeries(state, indexes, referenceColumns, state.selectedJst, xCode, yCode),
      periodMode
    )
  })));

  if (!composition.excludeCash) return rows;

  return [
    ...rows,
    ...composition.xCodes.map((xCode) => ({
      label: "− Cash balances at central banks and other demand deposits",
      section: "Denominator",
      source: `${COST_OF_RISK_STAGE_BOX_TABLE_ID} / x ${xCode} / y ${COST_OF_RISK_DENOMINATOR_CASH_Y_CODE}`,
      type: "amount",
      values: resolveCostOfRiskRatioDenominatorPeriodSeries(
        referenceColumns,
        resolveCostOfRiskDenominatorCellSeries(state, indexes, referenceColumns, state.selectedJst, xCode, COST_OF_RISK_DENOMINATOR_CASH_Y_CODE),
        periodMode
      )
    }))
  ];
}

function shiftCostOfRiskSeriesToPreviousReference(series) {
  return series.map((_, index) => (index > 0 ? series[index - 1] ?? null : null));
}

function resolveCostOfRiskRatioDenominatorPeriodSeries(
  referenceColumns,
  series,
  periodMode = COST_OF_RISK_PERIOD_MODE_QUARTERLY
) {
  if (!Array.isArray(series)) return [];
  if (normalizeCostOfRiskPeriodMode(periodMode) !== COST_OF_RISK_PERIOD_MODE_YTD) {
    return shiftCostOfRiskSeriesToPreviousReference(series);
  }
  return series.map((_, index) => {
    const denominatorIndex = getCostOfRiskRatioDenominatorReferenceIndex(referenceColumns, index, periodMode);
    return denominatorIndex >= 0 ? series[denominatorIndex] ?? null : null;
  });
}

function getCostOfRiskRatioDenominatorReferenceIndex(
  referenceColumns,
  index,
  periodMode = COST_OF_RISK_PERIOD_MODE_QUARTERLY
) {
  if (!Number.isInteger(index) || index < 0) return -1;
  if (normalizeCostOfRiskPeriodMode(periodMode) !== COST_OF_RISK_PERIOD_MODE_YTD) {
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

function buildCostOfRiskMovementAuditRowsForYCodes(state, indexes, referenceColumns, xCode, yCodes, section, periodMode = COST_OF_RISK_PERIOD_MODE_QUARTERLY) {
  return yCodes.map((yCode) => {
    const point = {
      xCode,
      yCode,
      zCode: ""
    };
    const rows = getCostOfRiskPointRows(state, indexes, COST_OF_RISK_TABLE_ID, point, state.selectedJst);
    const sign = getCostOfRiskAllowanceMovementSign(yCode);
    const rawSeries = referenceColumns.map((column) => (
      rows.reduce((total, row) => total + parseNumericValue(row[column.index]), 0)
    ));
    const values = resolveCostOfRiskPeriodSeries(
      referenceColumns,
      rawSeries.map((value) => (Number.isFinite(value) ? value * sign : value)),
      periodMode
    );
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
    const quarterlyValues = getCostOfRiskAllowanceMovementQuarterlySeries(
      state,
      indexes,
      referenceColumns,
      [xCode],
      selectedOption.points,
      state.selectedJst
    );

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

export function buildCostOfRiskStageTransferWaterfall(
  state,
  stage = "3",
  referenceDate = "",
  filters = {},
  periodMode = COST_OF_RISK_PERIOD_MODE_QUARTERLY
) {
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
        const periodSeries = resolveCostOfRiskPeriodSeries(referenceColumns, series, periodMode);
        return total + (periodSeries[referenceIndex] ?? 0);
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

export function buildCostOfRiskStageTransferFlowDiagram(
  state,
  referenceDate = "",
  filters = {},
  periodMode = COST_OF_RISK_PERIOD_MODE_QUARTERLY
) {
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
      const periodSeries = resolveCostOfRiskPeriodSeries(referenceColumns, series, periodMode);
      return total + (periodSeries[referenceIndex] ?? 0);
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
  const ratioDenominator = getCostOfRiskMovementDenominator(ratioDenominatorSeries, referenceColumns, referenceIndex, periodMode);
  const stageBalanceRatioDenominator = ratioDenominatorSeries[referenceIndex] ?? null;

  const netTransfersByStage = new Map([["1", 0], ["2", 0], ["3", 0]]);
  COST_OF_RISK_STAGE_TRANSFER_FLOW_MOVEMENTS.forEach((movement) => {
    const value = flowValues.get(movement.code) ?? 0;
    netTransfersByStage.set(movement.from, (netTransfersByStage.get(movement.from) ?? 0) - value);
    netTransfersByStage.set(movement.to, (netTransfersByStage.get(movement.to) ?? 0) + value);
  });

  const writeOffsByStage = buildCostOfRiskWriteOffByStage(state, indexes, referenceColumns, filters, referenceIndex, periodMode);
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

// Given the same flowKey used to select an arrow in the stage transfer flow
// diagram, reconstructs every raw data point (code, description,
// previous/current cumulative value, quarterly movement) that contributed to
// the displayed value, for the currently selected reference date. Feeds the
// stage transfer panel audit trail below.
function buildCostOfRiskStageTransferFlowAudit(
  state,
  filters = {},
  flowKey,
  referenceDate = "",
  periodMode = COST_OF_RISK_PERIOD_MODE_QUARTERLY
) {
  const indexes = getRequiredIndexes(state.columns);
  const referenceColumns = getReferenceColumns(state.columns);
  const descriptor = parseCostOfRiskFlowKey(flowKey);
  const referenceIndex = getCostOfRiskReferenceIndex(referenceColumns, referenceDate);
  const selectedReference = referenceColumns[referenceIndex] ?? null;
  const previousReference = referenceColumns[referenceIndex - 1] ?? null;

  if (!indexes || !descriptor || !state.selectedJst || !selectedReference) return null;

  if (descriptor.type === "transfer") {
    return buildCostOfRiskTransferFlowAudit(state, indexes, referenceColumns, filters, descriptor, referenceIndex, selectedReference, previousReference, periodMode);
  }
  if (descriptor.type === "net") {
    return buildCostOfRiskNetTransferFlowAudit(state, indexes, referenceColumns, filters, descriptor, referenceIndex, selectedReference, previousReference, periodMode);
  }
  if (descriptor.type === "stagebox") {
    return buildCostOfRiskStageBoxFlowAudit(state, indexes, referenceColumns, filters, descriptor, referenceIndex, selectedReference);
  }
  if (descriptor.type === "writeoff") {
    return buildCostOfRiskWriteOffFlowAudit(state, indexes, referenceColumns, filters, descriptor, referenceIndex, selectedReference, previousReference, periodMode);
  }
  return buildCostOfRiskOtherMovementsFlowAudit(state, indexes, referenceColumns, filters, descriptor, referenceIndex, selectedReference, previousReference, periodMode);
}

export function buildCostOfRiskStageTransferPanelAudit(
  state,
  filters = {},
  flowKey,
  referenceDate = "",
  periodMode = COST_OF_RISK_PERIOD_MODE_QUARTERLY
) {
  const audit = buildCostOfRiskStageTransferFlowAudit(state, filters, flowKey, referenceDate, periodMode);
  if (!audit) return { dates: [], rows: [], title: "Stage Transfer" };

  const referenceColumns = getReferenceColumns(state.columns);
  const selectedValue = Number.isFinite(audit.value) ? audit.value : null;
  let relativeValue = null;
  const selectedRows = buildCostOfRiskStageTransferSelectedScopeRows(audit);
  const selectedScopeRows = selectedRows.length > 0
    ? selectedRows
    : [{
      label: "No lower-level component available",
      section: "Selected scope",
      source: getCostOfRiskStageTransferAuditSource(audit),
      type: "amount",
      values: [selectedValue]
    }];
  const rows = [
    {
      label: "Displayed value",
      section: "Selected scope",
      source: getCostOfRiskStageTransferAuditSource(audit),
      type: "amount",
      values: [selectedValue]
    },
    ...selectedScopeRows
  ];

  if (audit.type !== "stagebox") {
    const referenceIndex = getCostOfRiskReferenceIndex(referenceColumns, audit.referenceLabel);
    const denominatorReferenceIndex = getCostOfRiskRatioDenominatorReferenceIndex(referenceColumns, referenceIndex, periodMode);
    const denominatorReferenceLabel = denominatorReferenceIndex >= 0
      ? referenceColumns[denominatorReferenceIndex]?.label ?? ""
      : audit.previousReferenceLabel;
    const denominatorPeriodLabel = getCostOfRiskRatioDenominatorLabel(periodMode);
    const denominatorDetail = buildCostOfRiskRatioDenominatorDetail(
      state,
      getCostOfRiskStageTransferDenominatorFilters(filters),
      denominatorReferenceLabel,
      state.selectedJst
    );
    const denominatorValue = denominatorDetail.status === "available" ? denominatorDetail.value : null;
    relativeValue = Number.isFinite(selectedValue) && Number.isFinite(denominatorValue) && denominatorValue !== 0
      ? (selectedValue / denominatorValue) * 10000
      : null;

    rows.push(
      {
        label: "Denominator total",
        section: "Denominator",
        source: `${denominatorDetail.label} / ${denominatorPeriodLabel} (${formatReferenceQuarterLabel(denominatorReferenceLabel)})`,
        type: "amount",
        values: [denominatorValue]
      },
      ...denominatorDetail.components.map((component) => ({
        label: `${component.operator === "subtract" ? "− " : ""}${component.label}`,
        section: "Denominator",
        source: component.source ?? denominatorDetail.sourceTable,
        type: "amount",
        values: [Number.isFinite(component.value) ? component.value : null]
      })),
      {
        denominatorValues: [denominatorValue],
        label: "Relative transfer",
        numeratorValues: [selectedValue],
        section: "Calculation",
        source: `Displayed value / ${denominatorPeriodLabel} denominator`,
        type: "bp",
        values: [relativeValue]
      }
    );
  }

  return {
    dates: [{ date: null, label: audit.referenceLabel }],
    hero: {
      amount: {
        type: "amount",
        value: Number.isFinite(selectedValue) ? Math.abs(selectedValue) : null
      },
      ratio: {
        type: "bp",
        value: Number.isFinite(relativeValue) ? Math.abs(relativeValue) : null
      }
    },
    rows,
    title: getCostOfRiskStageTransferAuditTitle(audit)
  };
}

export function buildCostOfRiskStageTransferRelativeDenominatorDetail(
  state,
  filters = {},
  referenceDate = "",
  periodMode = COST_OF_RISK_PERIOD_MODE_QUARTERLY
) {
  const indexes = getRequiredIndexes(state.columns);
  const referenceColumns = getReferenceColumns(state.columns);
  const normalizedPeriodMode = normalizeCostOfRiskPeriodMode(periodMode);
  const denominatorFilters = getCostOfRiskStageTransferDenominatorFilters(filters);
  const referenceIndex = getCostOfRiskReferenceIndex(referenceColumns, referenceDate);
  const targetReference = referenceColumns[referenceIndex] ?? null;
  const denominatorReferenceIndex = getCostOfRiskRatioDenominatorReferenceIndex(
    referenceColumns,
    referenceIndex,
    normalizedPeriodMode
  );
  const denominatorReference = denominatorReferenceIndex >= 0
    ? referenceColumns[denominatorReferenceIndex] ?? null
    : null;

  if (!indexes || !state.selectedJst || !targetReference || !denominatorReference) {
    return {
      components: [],
      denominatorLabel: getCostOfRiskDenominatorComposition(state, denominatorFilters).label,
      periodMode: normalizedPeriodMode,
      referenceDate: targetReference?.label ?? "",
      ruleLabel: getCostOfRiskRatioDenominatorLabel(normalizedPeriodMode),
      sourceTable: "F_18.00",
      status: "unavailable",
      value: null,
      valueReferenceDate: denominatorReference?.label ?? ""
    };
  }

  const detail = buildCostOfRiskRatioDenominatorDetail(
    state,
    denominatorFilters,
    denominatorReference.label,
    state.selectedJst
  );

  return {
    components: detail.components,
    denominatorLabel: detail.label,
    periodMode: normalizedPeriodMode,
    referenceDate: targetReference.label,
    ruleLabel: getCostOfRiskRatioDenominatorLabel(normalizedPeriodMode),
    sourceTable: detail.sourceTable,
    status: detail.status,
    value: detail.value,
    valueReferenceDate: denominatorReference.label
  };
}

function buildCostOfRiskStageTransferSelectedScopeRows(audit) {
  if (audit.type === "transfer") {
    return audit.components.map((component) => ({
      label: formatCostOfRiskStageTransferAuditComponentLabel(component.description),
      section: "Selected scope",
      source: `${audit.tableId} / x ${audit.xCode} / y ${component.code}`,
      type: "amount",
      values: [component.quarterly]
    }));
  }

  if (audit.type === "net") {
    return audit.components.map((component) => ({
      label: `${component.sign < 0 ? "− " : ""}${component.label} / ${formatCostOfRiskStageTransferAuditComponentLabel(component.description)}`,
      section: "Selected scope",
      source: `${audit.tableId} / x ${component.xCode} / y ${component.yCode}`,
      type: "amount",
      values: [Number.isFinite(component.quarterly) ? component.sign * component.quarterly : null]
    }));
  }

  if (audit.type === "stagebox") {
    return audit.components.map((component) => ({
      label: `${component.operator === "subtract" ? "− " : ""}${formatCostOfRiskStageTransferAuditComponentLabel(component.label)}`,
      section: "Selected scope",
      source: component.source,
      type: "amount",
      values: [Number.isFinite(component.value) ? (component.operator === "subtract" ? -component.value : component.value) : null]
    }));
  }

  if (audit.type === "writeoff") {
    return audit.components.map((component) => ({
      label: `${component.xLabel} / ${component.description}`,
      section: "Selected scope",
      source: `${audit.tableId} / x ${component.xCode} / y ${component.yCode}`,
      type: "amount",
      values: [Number.isFinite(component.quarterly) ? -Math.abs(component.quarterly) : null]
    }));
  }

  return [
    {
      label: "Exposure variation",
      section: "Selected scope",
      source: "F_18.00 / current stage exposure delta",
      type: "amount",
      values: [audit.exposureDelta]
    },
    {
      label: "Less net transfers",
      section: "Selected scope",
      source: "F_12.02 / net transfers in and out of the stage",
      type: "amount",
      values: [Number.isFinite(audit.netTransfers) ? -audit.netTransfers : null]
    },
    {
      label: "Add write-offs",
      section: "Selected scope",
      source: "F_12.01 / write-off movements",
      type: "amount",
      values: [audit.writeOffMagnitude]
    }
  ];
}

function getCostOfRiskStageTransferAuditSource(audit) {
  if (audit.type === "transfer") return `${audit.tableId} / x ${audit.xCode} / selected Y scope`;
  if (audit.type === "net") return `${audit.tableId} / net Stage ${audit.from} to Stage ${audit.to}`;
  if (audit.type === "stagebox") return `${audit.tableId} / ${audit.stageLabel}`;
  if (audit.type === "writeoff") return `${audit.tableId} / write-off codes / Stage ${audit.stage}`;
  return `F_18.00 and F_12.02 / Stage ${audit.stage}`;
}

function formatCostOfRiskStageTransferAuditComponentLabel(label) {
  return String(label ?? "")
    .replace(/^Total debt instruments\s*\/\s*/i, "")
    .replace(/^Debt instruments other than held for trading\s*\/\s*/i, "")
    .replace(/^Financial assets at amortised cost\s*\/\s*/i, "")
    .replace(/^Financial assets at fair value through other comprehensive income\s*\/\s*/i, "")
    .replace(/^Non-trading non-derivative financial assets measured at fair value through profit or loss\s*\/\s*/i, "");
}

function getCostOfRiskStageTransferAuditTitle(audit) {
  if (audit.type === "transfer") return `${audit.xCode} - ${audit.xLabel}`;
  if (audit.type === "net") return `Net Stage ${audit.from} → Stage ${audit.to}`;
  if (audit.type === "stagebox") return audit.stageLabel;
  if (audit.type === "writeoff") return `Write-off - Stage ${audit.stage}`;
  return `Other movements - Stage ${audit.stage}`;
}

function buildCostOfRiskTransferFlowAudit(state, indexes, referenceColumns, filters, descriptor, referenceIndex, selectedReference, previousReference, periodMode = COST_OF_RISK_PERIOD_MODE_QUARTERLY) {
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
    const quarterly = resolveCostOfRiskPeriodSeries(referenceColumns, raw, periodMode)[referenceIndex] ?? null;

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

function buildCostOfRiskNetTransferFlowAudit(state, indexes, referenceColumns, filters, descriptor, referenceIndex, selectedReference, previousReference, periodMode = COST_OF_RISK_PERIOD_MODE_QUARTERLY) {
  const ySelection = getCostOfRiskStageTransferYSelection(state, filters);
  const xLabels = getCostOfRiskStageTransferXAxisLabelMap(state);
  const movements = [
    { ...descriptor.forwardMovement, sign: 1 },
    { ...descriptor.reverseMovement, sign: -1 }
  ];

  const components = movements.flatMap((movement) => (
    ySelection.codes.map((yCode) => {
      const raw = getPointSeriesValues(state, indexes, referenceColumns, COST_OF_RISK_STAGE_TRANSFER_TABLE_ID, {
        xCode: movement.code,
        yCode,
        zCode: ""
      }, state.selectedJst);
      const quarterly = resolveCostOfRiskPeriodSeries(referenceColumns, raw, periodMode)[referenceIndex] ?? null;

      return {
        description: getMappingDescription(state, COST_OF_RISK_STAGE_TRANSFER_TABLE_ID, "y_axis_rc_code", yCode),
        label: xLabels.get(movement.code) ?? `Stage ${movement.from} to Stage ${movement.to}`,
        quarterly,
        sign: movement.sign,
        xCode: movement.code,
        yCode
      };
    })
  ));

  return {
    assetLabel: ySelection.label,
    components,
    descriptor,
    from: descriptor.from,
    previousReferenceLabel: previousReference?.label ?? "",
    referenceLabel: selectedReference.label,
    tableId: COST_OF_RISK_STAGE_TRANSFER_TABLE_ID,
    to: descriptor.to,
    type: "net",
    value: components.reduce((total, item) => total + (item.sign * (item.quarterly ?? 0)), 0)
  };
}

function buildCostOfRiskWriteOffFlowAudit(state, indexes, referenceColumns, filters, descriptor, referenceIndex, selectedReference, previousReference, periodMode = COST_OF_RISK_PERIOD_MODE_QUARTERLY) {
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
      const quarterly = resolveCostOfRiskPeriodSeries(referenceColumns, raw, periodMode)[referenceIndex] ?? null;

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

function buildCostOfRiskOtherMovementsFlowAudit(state, indexes, referenceColumns, filters, descriptor, referenceIndex, selectedReference, previousReference, periodMode = COST_OF_RISK_PERIOD_MODE_QUARTERLY) {
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
      const quarterly = resolveCostOfRiskPeriodSeries(referenceColumns, raw, periodMode)[referenceIndex] ?? 0;
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

  const writeOffAudit = buildCostOfRiskWriteOffFlowAudit(state, indexes, referenceColumns, filters, { stage: descriptor.stage, type: "writeoff" }, referenceIndex, selectedReference, previousReference, periodMode);
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

export function buildCostOfRiskNplFlowsModel(state, filters = {}, referenceDate = "", selectedFlowKey = "net") {
  const indexes = getRequiredIndexes(state.columns);
  const referenceColumns = getReferenceColumns(state.columns);
  const normalizedFilters = normalizeCostOfRiskFilters(filters);
  const flowDefinition = COST_OF_RISK_NPL_FLOW_DEFINITION.find((flow) => flow.key === selectedFlowKey)
    ?? COST_OF_RISK_NPL_FLOW_DEFINITION.find((flow) => flow.key === "net");

  if (!indexes || !state.selectedJst) {
    return { status: "Load a CSV and select a JST." };
  }
  if (referenceColumns.length === 0) {
    return { status: "No reference date was found in the CSV." };
  }
  if (normalizedFilters.balanceScope !== COST_OF_RISK_BALANCE_SCOPE_IN_BALANCE) {
    return {
      status: "F_18.01 reports NPL inflows and outflows for in-balance loans and advances only. Select In-balance to display this tab."
    };
  }
  if (normalizedFilters.asset && normalizedFilters.asset !== "Loans and advances") {
    return {
      status: "F_18.01 reports NPL inflows and outflows for loans and advances only. Select All instruments or Loans and advances."
    };
  }
  const ySelection = getCostOfRiskNplFlowYSelection(filters);
  if (ySelection.yCodes.length === 0) {
    return {
      status: "No matching F_18.01 counterparty point is available for the selected filters."
    };
  }

  const referenceIndex = getCostOfRiskReferenceIndex(referenceColumns, referenceDate);
  const series = buildCostOfRiskNplFlowPointsForJst(state, indexes, referenceColumns, state.selectedJst, filters, ySelection.yCodes, flowDefinition.key);
  const selectedPoint = series[referenceIndex] ?? null;
  const metrics = COST_OF_RISK_NPL_FLOW_DEFINITION.map((flow) => {
    const flowSeries = buildCostOfRiskNplFlowPointsForJst(state, indexes, referenceColumns, state.selectedJst, filters, ySelection.yCodes, flow.key);
    const point = flowSeries[referenceIndex] ?? null;
    return {
      ...flow,
      denominator: point?.denominator ?? null,
      ratioBasisPoints: point?.ratioBasisPoints ?? null,
      value: point?.value ?? null
    };
  });

  return {
    benchmarkSeries: getCostOfRiskPeerJstCodes(state).map((jstCode) => ({
      jstCode,
      points: buildCostOfRiskNplFlowPointsForJst(state, indexes, referenceColumns, jstCode, filters, ySelection.yCodes, flowDefinition.key)
    })),
    denominatorLabel: getCostOfRiskDenominatorComposition(state, getCostOfRiskNplFlowDenominatorFilters(filters)).label,
    drivers: buildCostOfRiskNplFlowDriverRows(state, indexes, referenceColumns, filters, referenceIndex, flowDefinition.key),
    flow: flowDefinition,
    metrics,
    referenceDate: selectedPoint?.label ?? referenceColumns[referenceIndex]?.label ?? "",
    series,
    source: "F_18.01 c010/c020",
    status: "",
    value: selectedPoint?.value ?? null,
    ratioBasisPoints: selectedPoint?.ratioBasisPoints ?? null
  };
}

export function buildCostOfRiskStageSummaryModel(state, filters, referenceDate = "", selectedCellKey = DEFAULT_COST_OF_RISK_STAGE_SUMMARY_CELL, options = {}) {
  const indexes = getRequiredIndexes(state.columns);
  const referenceColumns = getReferenceColumns(state.columns);
  const normalizedFilters = normalizeCostOfRiskFilters(filters);
  const selectedCell = parseCostOfRiskCounterpartySummaryCellKey(selectedCellKey)
    ?? parseCostOfRiskStageSummaryCellKey(selectedCellKey)
    ?? parseCostOfRiskStageSummaryCellKey(DEFAULT_COST_OF_RISK_STAGE_SUMMARY_CELL);
  const stageNeutralFilters = {
    ...normalizedFilters,
    stage: COST_OF_RISK_FILTER_ALL
  };
  const ySelection = getCostOfRiskStageBoxYSelection(state, stageNeutralFilters);

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
  const rows = buildCostOfRiskStageSummaryRowsForJst(state, indexes, referenceColumns, ySelection, stageNeutralFilters, state.selectedJst, referenceIndex);
  const includeCounterpartyRows = options.includeCounterpartyRows !== false;
  const selectedStatusFilter = selectedCell.stageKey
    ? getCostOfRiskStageSummaryFilterForRowKey(selectedCell.stageKey)
    : normalizedFilters.stage;
  const counterpartyRowsFilters = {
    ...normalizedFilters,
    stage: selectedStatusFilter || COST_OF_RISK_FILTER_ALL
  };
  const counterpartyRows = includeCounterpartyRows
    ? buildCostOfRiskCounterpartySummaryRowsForJst(
      state,
      indexes,
      referenceColumns,
      counterpartyRowsFilters,
      state.selectedJst,
      referenceIndex
    ).filter((row) => row.type === "row")
    : [];

  return {
    benchmarkSeries: getCostOfRiskPeerJstCodes(state).map((jstCode) => ({
      jstCode,
      points: selectedCell.rowKey
        ? buildCostOfRiskCounterpartySummaryPointsForJst(state, indexes, referenceColumns, counterpartyRowsFilters, jstCode, selectedCell)
        : buildCostOfRiskStageSummaryPointsForJst(state, indexes, referenceColumns, ySelection, stageNeutralFilters, jstCode, selectedCell)
    })),
    counterpartyRows,
    filterLabel: ySelection.label,
    referenceDate: referenceLabel,
    rows,
    selectedCell,
    status: ""
  };
}

function getCostOfRiskStageSummaryFilterForRowKey(rowKey) {
  if (rowKey === "all") return COST_OF_RISK_FILTER_ALL;
  return COST_OF_RISK_STAGE_SUMMARY_ROWS.find((row) => row.key === rowKey)?.label ?? COST_OF_RISK_FILTER_ALL;
}

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

function buildCostOfRiskRatioComponentDrivers(state, indexes, referenceColumns, filters, jstCode, referenceIndex, metric, effectContext = {}) {
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

function getCostOfRiskRatioDriverPointValue(state, indexes, referenceColumns, filters, jstCode, index, metric, driver, effectContext) {
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

function decomposeCostOfRiskStageRatioChange(currentNumerator, currentDenominator, previousNumerator, previousDenominator) {
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

function getCostOfRiskStageRatioMetricValue(metric, values, decomposition) {
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

function createCostOfRiskStageRatioCell(value) {
  return { value: Number.isFinite(value) ? value : null };
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

function buildCostOfRiskStageSummaryRowsForJst(state, indexes, referenceColumns, ySelection, filters, jstCode, referenceIndex) {
  const totalGca = getCostOfRiskRatioDenominatorSeries(state, indexes, referenceColumns, jstCode, {
    ...filters,
    stage: COST_OF_RISK_FILTER_ALL
  });
  const totalAllowances = buildCostOfRiskStageSummarySeries(state, indexes, referenceColumns, ySelection, jstCode, "allowances", "all");

  return COST_OF_RISK_STAGE_SUMMARY_ROWS.map((rowDefinition) => {
    const gca = buildCostOfRiskStageSummaryGcaSeries(state, indexes, referenceColumns, filters, jstCode, rowDefinition.key);
    const allowances = buildCostOfRiskStageSummarySeries(state, indexes, referenceColumns, ySelection, jstCode, "allowances", rowDefinition.key);
    const coverage = buildCostOfRiskCoverageSeries(gca, allowances);
    const collateralAmount = buildCostOfRiskStageSummarySeries(state, indexes, referenceColumns, ySelection, jstCode, "collateral", rowDefinition.key);
    const collateral = buildCostOfRiskCoverageSeries(gca, collateralAmount);
    return {
      key: rowDefinition.key,
      label: rowDefinition.label,
      cells: {
        allowances: createCostOfRiskStageSummaryCellValues(allowances, totalAllowances, referenceIndex),
        collateral: createCostOfRiskCoverageCellValues(collateral, referenceIndex),
        collateralAmount: createCostOfRiskStageSummaryCellValues(collateralAmount, totalGca, referenceIndex),
        coverage: createCostOfRiskCoverageCellValues(coverage, referenceIndex),
        gca: createCostOfRiskStageSummaryCellValues(gca, totalGca, referenceIndex)
      }
    };
  });
}

function buildCostOfRiskStageSummaryPointsForJst(state, indexes, referenceColumns, ySelection, filters, jstCode, selectedCell) {
  const metricSeries = selectedCell.metric === "gca"
    ? buildCostOfRiskStageSummaryGcaSeries(state, indexes, referenceColumns, filters, jstCode, selectedCell.stageKey)
    : buildCostOfRiskStageSummaryMetricSeries(state, indexes, referenceColumns, ySelection, filters, jstCode, selectedCell.metric, selectedCell.stageKey);
  const totalSeries = selectedCell.metric === "gca" || selectedCell.metric === "allowances"
    ? selectedCell.metric === "gca" && selectedCell.kind === "ratio"
      ? getCostOfRiskRatioDenominatorSeries(state, indexes, referenceColumns, jstCode, {
        ...filters,
        stage: COST_OF_RISK_FILTER_ALL
      })
      : buildCostOfRiskStageSummarySeries(state, indexes, referenceColumns, ySelection, jstCode, selectedCell.metric, "all")
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

function buildCostOfRiskStageSummaryMetricSeries(state, indexes, referenceColumns, ySelection, filters, jstCode, metric, stageKey) {
  if (metric === "coverage") {
    return buildCostOfRiskCoverageSeries(
      buildCostOfRiskStageSummaryGcaSeries(state, indexes, referenceColumns, filters, jstCode, stageKey),
      buildCostOfRiskStageSummarySeries(state, indexes, referenceColumns, ySelection, jstCode, "allowances", stageKey)
    );
  }
  if (metric === "collateral") {
    return buildCostOfRiskCoverageSeries(
      buildCostOfRiskStageSummaryGcaSeries(state, indexes, referenceColumns, filters, jstCode, stageKey),
      buildCostOfRiskStageSummarySeries(state, indexes, referenceColumns, ySelection, jstCode, "collateral", stageKey)
    );
  }

  return buildCostOfRiskStageSummarySeries(state, indexes, referenceColumns, ySelection, jstCode, metric, stageKey);
}

function buildCostOfRiskStageSummaryGcaSeries(state, indexes, referenceColumns, filters, jstCode, stageKey) {
  return getCostOfRiskRatioDenominatorSeries(state, indexes, referenceColumns, jstCode, {
    ...filters,
    stage: getCostOfRiskStageSummaryFilterForRowKey(stageKey)
  });
}

function buildCostOfRiskStageSummarySeries(state, indexes, referenceColumns, ySelection, jstCode, metric, stageKey) {
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

function buildCostOfRiskCounterpartySummaryPointsForJst(state, indexes, referenceColumns, filters, jstCode, selectedCell) {
  const metricSeries = buildCostOfRiskCounterpartySummaryMetricSeries(state, indexes, referenceColumns, filters, jstCode, selectedCell.metric, selectedCell.rowKey);
  const totalSeries = selectedCell.metric === "gca" || selectedCell.metric === "allowances"
    ? selectedCell.metric === "gca" && selectedCell.kind === "ratio"
      ? buildCostOfRiskCounterpartySummaryRatioBaseSeries(state, indexes, referenceColumns, filters, jstCode, getCostOfRiskCounterpartySummaryValueForRowKey(selectedCell.rowKey))
      : buildCostOfRiskCounterpartySummaryTotalSeries(state, indexes, referenceColumns, filters, jstCode, selectedCell.metric)
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

  if (selectedCell.metric === "coverage" || selectedCell.metric === "collateral") {
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

function parseCostOfRiskStageSummaryCellKey(cellKey) {
  const [metric, kind, stageKey] = String(cellKey ?? "").split(":");
  const isMetric = ["gca", "allowances", "coverage", "collateral"].includes(metric);
  const isKind = ["level", "mom", "ratio"].includes(kind);
  const isStage = COST_OF_RISK_STAGE_SUMMARY_ROWS.some((row) => row.key === stageKey);
  return isMetric && isKind && isStage ? { key: `${metric}:${kind}:${stageKey}`, kind, metric, stageKey } : null;
}

function parseCostOfRiskCounterpartySummaryCellKey(cellKey) {
  const parts = String(cellKey ?? "").split(":");
  const [metric, kind, rowKey] = parts[0] === "counterparty"
    ? [parts[1], parts[2], parts[3]]
    : parts;
  const isMetric = ["gca", "allowances", "coverage", "collateral"].includes(metric);
  const isKind = ["level", "mom", "ratio"].includes(kind);
  const isRow = COST_OF_RISK_COUNTERPARTY_SUMMARY_ROWS.some((row) => row.type === "row" && row.key === rowKey);
  return isMetric && isKind && isRow ? { key: `counterparty:${metric}:${kind}:${rowKey}`, kind, metric, rowKey } : null;
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

function parseCostOfRiskRatioDriverCellParts(parts) {
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

function createCostOfRiskRatioDriverCellKey(stageKey, metric, driver) {
  return `${stageKey}:${metric}:driver:${driver.effectType}:${driver.counterpartyKey}:${driver.assetKey}`;
}

function buildCostOfRiskStageBoxPointsForJst(state, indexes, referenceColumns, stage, jstCode, filters = {}) {
  // GCA is a stock (balance sheet) figure, not a flow, so
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

function getCostOfRiskNplFlowYSelection(filters = {}) {
  const normalized = normalizeCostOfRiskFilters(filters);
  const row = COST_OF_RISK_NPL_FLOW_COUNTERPARTY_ROWS.find((candidate) => candidate.value === normalized.counterparty)
    ?? COST_OF_RISK_NPL_FLOW_COUNTERPARTY_ROWS[0];
  return {
    label: row.label,
    row,
    yCodes: row.yCodes
  };
}

function getCostOfRiskNplFlowDenominatorFilters(filters = {}) {
  return {
    ...filters,
    asset: "Loans and advances",
    balanceScope: COST_OF_RISK_BALANCE_SCOPE_IN_BALANCE,
    stage: COST_OF_RISK_FILTER_ALL
  };
}

function buildCostOfRiskNplFlowPointsForJst(state, indexes, referenceColumns, jstCode, filters = {}, yCodes = [], flowKey = "net") {
  const inflowSeries = getCostOfRiskNplFlowRawSeries(
    state,
    indexes,
    referenceColumns,
    jstCode,
    COST_OF_RISK_NPL_FLOW_INFLOW_X_CODE,
    yCodes
  );
  const outflowRawSeries = getCostOfRiskNplFlowRawSeries(
    state,
    indexes,
    referenceColumns,
    jstCode,
    COST_OF_RISK_NPL_FLOW_OUTFLOW_X_CODE,
    yCodes
  );
  const denominatorSeries = getCostOfRiskRatioDenominatorSeries(
    state,
    indexes,
    referenceColumns,
    jstCode,
    getCostOfRiskNplFlowDenominatorFilters(filters)
  );

  return referenceColumns.map((column, index) => {
    const inflow = inflowSeries[index] ?? 0;
    const outflow = -Math.abs(outflowRawSeries[index] ?? 0);
    const net = inflow + outflow;
    const value = flowKey === "inflow"
      ? inflow
      : flowKey === "outflow"
        ? outflow
        : net;
    const denominator = getCostOfRiskMovementDenominator(denominatorSeries, index);
    return {
      date: column.date,
      denominator,
      inflow,
      label: column.label,
      net,
      outflow,
      ratioBasisPoints: denominator ? (value / denominator) * 10000 : null,
      value
    };
  });
}

function getCostOfRiskNplFlowRawSeries(state, indexes, referenceColumns, jstCode, xCode, yCodes = []) {
  const values = createEmptySeries(referenceColumns.length);
  yCodes.forEach((yCode) => {
    addSeriesValues(values, getPointSeriesValues(state, indexes, referenceColumns, COST_OF_RISK_NPL_FLOW_TABLE_ID, {
      xCode,
      yCode,
      zCode: ""
    }, jstCode));
  });
  return decumulateQuarterlySeries(referenceColumns, values);
}

function buildCostOfRiskNplFlowDriverRows(state, indexes, referenceColumns, filters = {}, referenceIndex = 0, flowKey = "net") {
  const normalized = normalizeCostOfRiskFilters(filters);
  const rows = getCostOfRiskNplFlowDriverDefinitions(normalized.counterparty);
  return rows.map((row) => {
    const series = buildCostOfRiskNplFlowPointsForJst(
      state,
      indexes,
      referenceColumns,
      state.selectedJst,
      { ...filters, counterparty: row.value },
      row.yCodes,
      flowKey
    );
    const point = series[referenceIndex] ?? null;
    return {
      ...row,
      denominator: point?.denominator ?? null,
      ratioBasisPoints: point?.ratioBasisPoints ?? null,
      value: point?.value ?? null
    };
  }).filter((row) => Number.isFinite(row.value) || Number.isFinite(row.ratioBasisPoints));
}

function getCostOfRiskNplFlowDriverDefinitions(counterparty = "") {
  if (!counterparty) {
    return COST_OF_RISK_NPL_FLOW_COUNTERPARTY_ROWS.filter((row) => (
      ["nfc", "households", "central-banks", "governments", "credit-institutions", "other-financials"].includes(row.key)
    ));
  }
  if (counterparty === "Non-financial corporations") {
    return COST_OF_RISK_NPL_FLOW_COUNTERPARTY_ROWS.filter((row) => ["nfc", "nfc-smes", "nfc-cre"].includes(row.key));
  }
  if (counterparty === "Households") {
    return COST_OF_RISK_NPL_FLOW_COUNTERPARTY_ROWS.filter((row) => ["households", "hh-consumption", "hh-rre"].includes(row.key));
  }
  const selected = COST_OF_RISK_NPL_FLOW_COUNTERPARTY_ROWS.find((row) => row.value === counterparty);
  return selected ? [selected] : [];
}

export function buildCostOfRiskStageTransferFlowTimeSeries(
  state,
  filters,
  flowKey,
  periodMode = COST_OF_RISK_PERIOD_MODE_QUARTERLY
) {
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
      points: buildCostOfRiskFlowPointsForJst(state, indexes, referenceColumns, descriptor, ySelection, filters, jstCode, periodMode)
    })),
    label: getCostOfRiskFlowLabel(descriptor),
    status: ""
  };
}

function buildCostOfRiskFlowPointsForJst(state, indexes, referenceColumns, descriptor, ySelection, filters, jstCode, periodMode = COST_OF_RISK_PERIOD_MODE_QUARTERLY) {
  const rawValues = getCostOfRiskFlowRawPeriodValues(state, indexes, referenceColumns, descriptor, ySelection, filters, jstCode, periodMode);
  const denominatorSeries = getCostOfRiskRatioDenominatorSeries(
    state,
    indexes,
    referenceColumns,
    jstCode,
    getCostOfRiskStageTransferDenominatorFilters(filters)
  );

  return referenceColumns.map((column, index) => {
    const value = rawValues[index] ?? null;
    const denominator = getCostOfRiskMovementDenominator(denominatorSeries, referenceColumns, index, periodMode);
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

function getCostOfRiskFlowRawPeriodValues(state, indexes, referenceColumns, descriptor, ySelection, filters, jstCode, periodMode = COST_OF_RISK_PERIOD_MODE_QUARTERLY) {
  if (descriptor.type === "transfer") {
    return computeCostOfRiskTransferFlowPeriodSeries(state, indexes, referenceColumns, ySelection, descriptor.code, jstCode, periodMode);
  }

  if (descriptor.type === "net") {
    const forwardSeries = computeCostOfRiskTransferFlowPeriodSeries(
      state,
      indexes,
      referenceColumns,
      ySelection,
      descriptor.forwardMovement.code,
      jstCode,
      periodMode
    );
    const reverseSeries = computeCostOfRiskTransferFlowPeriodSeries(
      state,
      indexes,
      referenceColumns,
      ySelection,
      descriptor.reverseMovement.code,
      jstCode,
      periodMode
    );
    return referenceColumns.map((column, index) => {
      const forwardValue = forwardSeries[index] ?? 0;
      const reverseValue = reverseSeries[index] ?? 0;
      return forwardValue - reverseValue;
    });
  }

  if (descriptor.type === "writeoff") {
    const magnitudes = computeCostOfRiskWriteOffPeriodSeriesForStage(state, indexes, referenceColumns, filters, descriptor.stage, jstCode, periodMode);
    return magnitudes.map((magnitude) => (magnitude > 0 ? -magnitude : 0));
  }

  const exposureLevels = computeCostOfRiskStageExposureLevels(state, indexes, referenceColumns, filters, descriptor.stage, jstCode);
  const writeOffMagnitudes = computeCostOfRiskWriteOffPeriodSeriesForStage(state, indexes, referenceColumns, filters, descriptor.stage, jstCode, periodMode);
  const movementQuarterlyByCode = new Map(COST_OF_RISK_STAGE_TRANSFER_FLOW_MOVEMENTS.map((movement) => [
    movement.code,
    computeCostOfRiskTransferFlowPeriodSeries(state, indexes, referenceColumns, ySelection, movement.code, jstCode, periodMode)
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

function computeCostOfRiskTransferFlowPeriodSeries(state, indexes, referenceColumns, ySelection, movementCode, jstCode, periodMode = COST_OF_RISK_PERIOD_MODE_QUARTERLY) {
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

function computeCostOfRiskTransferFlowQuarterlySeries(state, indexes, referenceColumns, ySelection, movementCode, jstCode) {
  return computeCostOfRiskTransferFlowPeriodSeries(
    state,
    indexes,
    referenceColumns,
    ySelection,
    movementCode,
    jstCode,
    COST_OF_RISK_PERIOD_MODE_QUARTERLY
  );
}

function computeCostOfRiskStageExposureLevels(state, indexes, referenceColumns, filters, stage, jstCode) {
  return getCostOfRiskRatioDenominatorSeries(state, indexes, referenceColumns, jstCode, getCostOfRiskStageScopedFilters(filters, stage));
}

function computeCostOfRiskWriteOffPeriodSeriesForStage(state, indexes, referenceColumns, filters, stage, jstCode, periodMode = COST_OF_RISK_PERIOD_MODE_QUARTERLY) {
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
    const periodSeries = resolveCostOfRiskPeriodSeries(referenceColumns, series, periodMode);
    periodSeries.forEach((value, index) => { total[index] += Math.abs(value); });
  });
  return total;
}

function computeCostOfRiskWriteOffQuarterlySeriesForStage(state, indexes, referenceColumns, filters, stage, jstCode) {
  return computeCostOfRiskWriteOffPeriodSeriesForStage(
    state,
    indexes,
    referenceColumns,
    filters,
    stage,
    jstCode,
    COST_OF_RISK_PERIOD_MODE_QUARTERLY
  );
}

function parseCostOfRiskFlowKey(flowKey) {
  const [type, value] = String(flowKey ?? "").split(":");
  if (type === "transfer") {
    const movement = COST_OF_RISK_STAGE_TRANSFER_FLOW_MOVEMENTS.find((item) => `${item.from}-${item.to}` === value);
    return movement ? { code: movement.code, from: movement.from, to: movement.to, type: "transfer" } : null;
  }
  if (type === "net") {
    const [from, to] = String(value ?? "").split("-");
    const forwardMovement = COST_OF_RISK_STAGE_TRANSFER_FLOW_MOVEMENTS.find((item) => item.from === from && item.to === to);
    const reverseMovement = COST_OF_RISK_STAGE_TRANSFER_FLOW_MOVEMENTS.find((item) => item.from === to && item.to === from);
    return forwardMovement && reverseMovement
      ? { forwardMovement, from, reverseMovement, to, type: "net" }
      : null;
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
  if (descriptor.type === "net") return `Net Stage ${descriptor.from} → Stage ${descriptor.to}`;
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

function buildCostOfRiskWriteOffByStage(state, indexes, referenceColumns, filters, referenceIndex, periodMode = COST_OF_RISK_PERIOD_MODE_QUARTERLY) {
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
      const periodValue = resolveCostOfRiskPeriodSeries(referenceColumns, series, periodMode)[referenceIndex] ?? 0;
      return total + Math.abs(periodValue);
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

function getCostOfRiskReferenceIndex(referenceColumns, referenceDate = "") {
  const index = referenceColumns.findIndex((column) => column.label === referenceDate);
  return index >= 0 ? index : Math.max(0, referenceColumns.length - 1);
}

function buildCostOfRiskGeographyCountryRows(state, indexes, referenceColumn, yCodes) {
  const yCodeSet = new Set(yCodes.map((code) => normalizeAxisCode(code, "y")));
  const countryMap = new Map();
  addCostOfRiskGeographyMetricValues(state, indexes, referenceColumn, yCodeSet, countryMap, "exposure", COST_OF_RISK_GEOGRAPHY_EXPOSURE_X_CODE);
  addCostOfRiskGeographyMetricValues(state, indexes, referenceColumn, yCodeSet, countryMap, "nonPerforming", COST_OF_RISK_GEOGRAPHY_NON_PERFORMING_X_CODE);
  addCostOfRiskGeographyMetricValues(state, indexes, referenceColumn, yCodeSet, countryMap, "impairment", COST_OF_RISK_GEOGRAPHY_IMPAIRMENT_X_CODE);

  return [...countryMap.values()]
    .map((country) => {
      const nplRatio = country.exposure ? country.nonPerforming / country.exposure : null;
      const coverageRatio = country.nonPerforming ? Math.abs(country.impairment) / country.nonPerforming : null;
      return {
        ...country,
        coverageRatio,
        nplRatio
      };
    })
    .filter((country) => Number.isFinite(country.exposure) && country.exposure !== 0)
    .sort((left, right) => Math.abs(right.exposure) - Math.abs(left.exposure));
}

function addCostOfRiskGeographyMetricValues(state, indexes, referenceColumn, yCodeSet, countryMap, metric, xCode) {
  const rows = getIndexedRowsByAxisPoint(state, COST_OF_RISK_GEOGRAPHY_TABLE_ID, "x", xCode);
  rows.forEach((row) => {
    const yCode = normalizeAxisCode(row[indexes.yAxisRcCode], "y");
    if (!yCodeSet.has(yCode)) return;

    const countryCode = normalizeAxisCode(row[indexes.zAxisRcCode], "z");
    if (!countryCode) return;

    const country = getOrCreateCostOfRiskGeographyCountry(countryMap, state, countryCode);
    country[metric] += parseNumericValue(row[referenceColumn.index], 0);
  });
}

function getOrCreateCostOfRiskGeographyCountry(countryMap, state, countryCode) {
  if (!countryMap.has(countryCode)) {
    countryMap.set(countryCode, {
      code: countryCode,
      coverageRatio: null,
      exposure: 0,
      impairment: 0,
      label: getCostOfRiskCountryLabel(state, countryCode),
      nonPerforming: 0,
      nplRatio: null
    });
  }
  return countryMap.get(countryCode);
}

function getCostOfRiskCountryLabel(state, countryCode) {
  return state.dimensionMapping?.find?.(COST_OF_RISK_GEOGRAPHY_TABLE_ID, "z_axis_rc_code", countryCode)?.description
    || countryCode;
}

function getCostOfRiskGeographyYCodes(filters = {}) {
  const normalized = normalizeCostOfRiskFilters(filters);
  const key = normalized.counterparty && normalized.counterparty !== COST_OF_RISK_FILTER_ALL
    ? normalized.counterparty
    : "all";
  const yCodes = COST_OF_RISK_GEOGRAPHY_Y_CODES[key] ?? COST_OF_RISK_GEOGRAPHY_Y_CODES.all;

  if (normalized.asset && normalized.asset !== COST_OF_RISK_FILTER_ALL) {
    const assetKey = ASSET_KEY_BY_LABEL.get(normalized.asset) ?? normalized.asset;
    if (assetKey === "debt") return yCodes.debt ?? [];
    if (assetKey === "loans") return yCodes.loans ?? [];
  }

  return [...(yCodes.debt ?? []), ...(yCodes.loans ?? [])];
}

function getCostOfRiskGeographyFilterLabel(filters = {}) {
  const normalized = normalizeCostOfRiskFilters(filters);
  return [
    formatCostOfRiskGeographyBalanceScopeLabel(normalized.balanceScope),
    normalized.asset ? formatCostOfRiskAssetLabel(normalized.asset) : "All instruments",
    normalized.counterparty ? formatCostOfRiskCounterpartyLabel(normalized.counterparty) : "All counterparties"
  ].join(" / ");
}

function formatCostOfRiskGeographyBalanceScopeLabel(balanceScope) {
  const option = COST_OF_RISK_BALANCE_SCOPE_OPTIONS.find((candidate) => candidate.value === balanceScope);
  return option?.label ?? "In-balance";
}

function normalizeCostOfRiskGeographyCountryMode(countryMode = "top10") {
  return ["top10", "euro-area", "custom"].includes(countryMode) ? countryMode : "top10";
}

function selectCostOfRiskGeographyCountries(countries, countryMode, countryCodes = []) {
  if (countryMode === "euro-area") {
    const availableCodes = new Set(countries.map((country) => country.code));
    return COST_OF_RISK_GEOGRAPHY_EURO_AREA_COUNTRIES.filter((code) => availableCodes.has(code));
  }

  if (countryMode === "custom") {
    const availableCodes = new Set(countries.map((country) => country.code));
    return (countryCodes ?? []).filter((code) => availableCodes.has(code));
  }

  return countries.slice(0, 10).map((country) => country.code);
}

function getCostOfRiskGeographySelectedCell(countries, selectedCellKey = "") {
  const [countryCode, metric] = String(selectedCellKey ?? "").split(":");
  const selectedCountry = countries.find((country) => country.code === countryCode) ?? countries[0] ?? null;
  const selectedMetric = ["exposure", "nplRatio", "coverageRatio", "nonPerforming", "impairment"].includes(metric)
    ? metric
    : "exposure";
  if (!selectedCountry) return null;

  return {
    countryCode: selectedCountry.code,
    countryLabel: selectedCountry.label,
    key: `${selectedCountry.code}:${selectedMetric}`,
    metric: selectedMetric
  };
}

function buildCostOfRiskGeographyBenchmarkPoints(state, indexes, referenceColumns, yCodes, selectedCell, jstCode) {
  const exposureSeries = getCostOfRiskGeographyMetricSeries(
    state,
    indexes,
    referenceColumns,
    yCodes,
    selectedCell.countryCode,
    COST_OF_RISK_GEOGRAPHY_EXPOSURE_X_CODE,
    jstCode
  );
  const nonPerformingSeries = ["nplRatio", "nonPerforming", "coverageRatio"].includes(selectedCell.metric)
    ? getCostOfRiskGeographyMetricSeries(
      state,
      indexes,
      referenceColumns,
      yCodes,
      selectedCell.countryCode,
      COST_OF_RISK_GEOGRAPHY_NON_PERFORMING_X_CODE,
      jstCode
    )
    : [];
  const impairmentSeries = ["coverageRatio", "impairment"].includes(selectedCell.metric)
    ? getCostOfRiskGeographyMetricSeries(
      state,
      indexes,
      referenceColumns,
      yCodes,
      selectedCell.countryCode,
      COST_OF_RISK_GEOGRAPHY_IMPAIRMENT_X_CODE,
      jstCode
    )
    : [];

  return referenceColumns.map((referenceColumn, index) => {
    const exposure = exposureSeries[index] ?? 0;
    const nonPerforming = nonPerformingSeries[index] ?? 0;
    const impairment = impairmentSeries[index] ?? 0;
    return {
      date: referenceColumn.date,
      label: referenceColumn.label,
      value: getCostOfRiskGeographySelectedMetricValue(selectedCell.metric, exposure, nonPerforming, impairment)
    };
  });
}

function getCostOfRiskGeographyMetricSeries(state, indexes, referenceColumns, yCodes, countryCode, xCode, jstCode) {
  return referenceColumns.map((referenceColumn) => (
    yCodes.reduce((total, yCode) => {
      const rows = getIndexedRowsByCoordinates(state, COST_OF_RISK_GEOGRAPHY_TABLE_ID, {
        selectedXCode: xCode,
        selectedYCode: yCode,
        selectedZCode: countryCode
      }, jstCode);
      return total + rows.reduce((rowTotal, row) => rowTotal + parseNumericValue(row[referenceColumn.index], 0), 0);
    }, 0)
  ));
}

function getCostOfRiskGeographySelectedMetricValue(metric, exposure, nonPerforming, impairment) {
  if (metric === "nplRatio") return exposure ? nonPerforming / exposure : null;
  if (metric === "coverageRatio") return nonPerforming ? Math.abs(impairment) / nonPerforming : null;
  if (metric === "nonPerforming") return nonPerforming;
  if (metric === "impairment") return impairment;
  return exposure;
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
function getCostOfRiskStageBoxYSelection(state, filters = {}) {
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

function buildCostOfRiskSelectionFromFilters(state, filters = {}) {
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

function normalizeCostOfRiskFilters(filters) {
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

function buildCostOfRiskBenchmarkSeries(state, indexes, referenceColumns, selectedOption, xAxisCode, filters = {}, periodMode = COST_OF_RISK_PERIOD_MODE_QUARTERLY) {
  return getCostOfRiskPeerJstCodes(state).map((jstCode) => ({
    jstCode,
    points: buildCostOfRiskSelectionSeries(state, indexes, referenceColumns, selectedOption, xAxisCode, jstCode, filters, periodMode)
  }));
}

function getCostOfRiskPeerJstCodes(state) {
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

function getCostOfRiskMovementDenominator(
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
function resolveCostOfRiskDenominatorCellSeries(state, indexes, referenceColumns, jstCode, xCode, yCode) {
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
function resolveCostOfRiskDenominatorPointsSeries(state, indexes, referenceColumns, jstCode, xCodes, yCodes) {
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
