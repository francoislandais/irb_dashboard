import { getRequiredAxisColumnIndexes as getRequiredIndexes } from "../core/axisColumns.js";
import { getReferenceColumns } from "../core/referenceColumns.js";
import {
  COST_OF_RISK_BALANCE_SCOPE_IN_BALANCE,
  COST_OF_RISK_FILTER_ALL,
  COST_OF_RISK_NPL_FLOW_COUNTERPARTY_ROWS,
  COST_OF_RISK_NPL_FLOW_DEFINITION,
  COST_OF_RISK_NPL_FLOW_INFLOW_X_CODE,
  COST_OF_RISK_NPL_FLOW_OUTFLOW_X_CODE,
  COST_OF_RISK_NPL_FLOW_TABLE_ID
} from "./definitions.js";
import {
  addSeriesValues,
  createEmptySeries,
  decumulateQuarterlySeries,
  getCostOfRiskDenominatorComposition,
  getCostOfRiskMovementDenominator,
  getCostOfRiskPeerJstCodes,
  getCostOfRiskRatioDenominatorSeries,
  getCostOfRiskReferenceIndex,
  getPointSeriesValues,
  normalizeCostOfRiskFilters
} from "./core.js";

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
