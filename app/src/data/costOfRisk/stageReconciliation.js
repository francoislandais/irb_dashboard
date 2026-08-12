import { getRequiredAxisColumnIndexes as getRequiredIndexes } from "../core/axisColumns.js";
import { getReferenceColumns } from "../core/referenceColumns.js";
import {
  COST_OF_RISK_STAGE_TRANSFER_FLOW_MOVEMENTS,
  COST_OF_RISK_STAGE_TRANSFER_STAGE_LABELS,
  COST_OF_RISK_TABLE_ID
} from "./definitions.js";
import {
  COST_OF_RISK_PERIOD_MODE_QUARTERLY,
  addSeriesValues,
  buildCostOfRiskSelectionFromFilters,
  computeCostOfRiskTransferFlowPeriodSeries,
  createEmptySeries,
  decumulateQuarterlySeries,
  getCostOfRiskPeerJstCodes,
  getCostOfRiskReferenceIndex,
  getCostOfRiskStageTransferXAxisLabelMap,
  getCostOfRiskStageTransferYSelection,
  getPointSeriesValues,
  normalizeCostOfRiskFilters
} from "./core.js";

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
