import { normalizeAxisCode } from "../core/axisCode.js";
import { getRequiredAxisColumnIndexes as getRequiredIndexes } from "../core/axisColumns.js";
import { getReferenceColumns, parseNumericValue } from "../core/referenceColumns.js";
import {
  COST_OF_RISK_DENOMINATOR_CASH_Y_CODE,
  COST_OF_RISK_F02_TABLE_ID,
  COST_OF_RISK_F02_X_AXIS_CODE,
  COST_OF_RISK_F02_Y_AXIS_CODE,
  COST_OF_RISK_F12_RECONCILIATION_X_CODES,
  COST_OF_RISK_STAGE_BOX_TABLE_ID,
  COST_OF_RISK_TABLE_ID,
  COST_OF_RISK_TOTAL_CONTRIBUTION_X_CODE,
  COST_OF_RISK_WATERFALL_X_CODES,
  COST_OF_RISK_X_AXIS_CODE
} from "./definitions.js";
import {
  COST_OF_RISK_PERIOD_MODE_QUARTERLY,
  COST_OF_RISK_PERIOD_MODE_YTD,
  addSeriesValues,
  buildCostOfRiskSelectionFromFilters,
  createEmptySeries,
  formatCostOfRiskAllowanceMovementDisplayValue,
  getCostOfRiskAllowanceMovementPeriodSeries,
  getCostOfRiskAllowanceMovementSign,
  getCostOfRiskDenominatorComposition,
  getCostOfRiskMovementDenominator,
  getCostOfRiskPointRows,
  getCostOfRiskRatioDenominatorLabel,
  getCostOfRiskRatioDenominatorReferenceIndex,
  getCostOfRiskRatioDenominatorSeries,
  getCostOfRiskReferenceIndex,
  getCostOfRiskXAxisFullLabelMap,
  getCostOfRiskXAxisOptionsForCodes,
  getMappingDescription,
  getPointSeriesValues,
  normalizeCostOfRiskPeriodMode,
  resolveCostOfRiskDenominatorCellSeries,
  resolveCostOfRiskPeriodSeries
} from "./core.js";

export function getCostOfRiskWaterfallXAxisOptions(state) {
  return getCostOfRiskXAxisOptionsForCodes(state, COST_OF_RISK_WATERFALL_X_CODES);
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
