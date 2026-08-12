import { normalizeAxisCode } from "../core/axisCode.js";
import { getRequiredAxisColumnIndexes as getRequiredIndexes } from "../core/axisColumns.js";
import { getReferenceColumns } from "../core/referenceColumns.js";
import {
  COST_OF_RISK_DENOMINATOR_CASH_Y_CODE,
  COST_OF_RISK_F02_TABLE_ID,
  COST_OF_RISK_F02_X_AXIS_CODE,
  COST_OF_RISK_F02_Y_AXIS_CODE,
  COST_OF_RISK_F12_RECONCILIATION_X_CODES,
  COST_OF_RISK_STAGE_BOX_TABLE_ID,
  COST_OF_RISK_TABLE_ID
} from "./definitions.js";
import {
  COST_OF_RISK_PERIOD_MODE_QUARTERLY,
  addSeriesValues,
  buildCostOfRiskSelectionFromFilters,
  createEmptySeries,
  decumulateQuarterlySeries,
  formatCostOfRiskAllowanceMovementDisplayValue,
  getCostOfRiskAllowanceMovementPeriodSeries,
  getCostOfRiskDenominatorComposition,
  getCostOfRiskMovementDenominator,
  getCostOfRiskRatioDenominatorSeries,
  getCostOfRiskXAxisFullLabelMap,
  getMappingDescription,
  getPointSeriesValues,
  resolveCostOfRiskDenominatorCellSeries
} from "./core.js";

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
