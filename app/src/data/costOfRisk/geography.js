import { getIndexedRowsByAxisPoint, getIndexedRowsByCoordinates } from "../dataIndex.js?v=20260804-lazy-index";
import { normalizeAxisCode } from "../core/axisCode.js";
import { getRequiredAxisColumnIndexes as getRequiredIndexes } from "../core/axisColumns.js";
import { getReferenceColumns, parseNumericValue } from "../core/referenceColumns.js";
import {
  ASSET_KEY_BY_LABEL,
  COST_OF_RISK_BALANCE_SCOPE_IN_BALANCE,
  COST_OF_RISK_BALANCE_SCOPE_OPTIONS,
  COST_OF_RISK_FILTER_ALL,
  COST_OF_RISK_GEOGRAPHY_EURO_AREA_COUNTRIES,
  COST_OF_RISK_GEOGRAPHY_EXPOSURE_X_CODE,
  COST_OF_RISK_GEOGRAPHY_IMPAIRMENT_X_CODE,
  COST_OF_RISK_GEOGRAPHY_NON_PERFORMING_X_CODE,
  COST_OF_RISK_GEOGRAPHY_TABLE_ID,
  COST_OF_RISK_GEOGRAPHY_Y_CODES
} from "./definitions.js";
import {
  formatCostOfRiskAssetLabel,
  formatCostOfRiskCounterpartyLabel,
  getCostOfRiskPeerJstCodes,
  getCostOfRiskReferenceIndex,
  normalizeCostOfRiskFilters
} from "./core.js";

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
