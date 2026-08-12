import { getRequiredAxisColumnIndexes as getRequiredIndexes } from "../core/axisColumns.js";
import { getReferenceColumns } from "../core/referenceColumns.js";
import {
  COST_OF_RISK_FILTER_ALL,
  COST_OF_RISK_STAGE_SUMMARY_ROWS,
  DEFAULT_COST_OF_RISK_STAGE_SUMMARY_CELL
} from "./definitions.js";
import {
  buildCostOfRiskCounterpartySummaryPointsForJst,
  buildCostOfRiskCounterpartySummaryRowsForJst,
  buildCostOfRiskCoverageSeries,
  buildCostOfRiskStageSummarySeries,
  createCostOfRiskCoverageCellValues,
  createCostOfRiskStageSummaryCellValues,
  getCostOfRiskPeerJstCodes,
  getCostOfRiskRatioDenominatorSeries,
  getCostOfRiskReferenceIndex,
  getCostOfRiskStageBoxYSelection,
  getCostOfRiskStageSummaryRatioValue,
  getFiniteDelta,
  normalizeCostOfRiskFilters,
  parseCostOfRiskCounterpartySummaryCellKey
} from "./core.js";

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
    ? selectedCell.metric === "gca" && (selectedCell.kind === "ratio" || selectedCell.kind === "ratioMom")
      ? getCostOfRiskRatioDenominatorSeries(state, indexes, referenceColumns, jstCode, {
        ...filters,
        stage: COST_OF_RISK_FILTER_ALL
      })
      : buildCostOfRiskStageSummarySeries(state, indexes, referenceColumns, ySelection, jstCode, selectedCell.metric, "all")
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

function buildCostOfRiskStageSummaryMetricSeries(state, indexes, referenceColumns, ySelection, filters, jstCode, metric, stageKey) {
  if (metric === "collateralAmount") {
    return buildCostOfRiskStageSummarySeries(state, indexes, referenceColumns, ySelection, jstCode, "collateral", stageKey);
  }
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

function parseCostOfRiskStageSummaryCellKey(cellKey) {
  const [metric, kind, stageKey] = String(cellKey ?? "").split(":");
  const isMetric = ["gca", "allowances", "coverage", "collateral", "collateralAmount"].includes(metric);
  const isKind = ["level", "mom", "ratio", "ratioMom"].includes(kind);
  const isStage = COST_OF_RISK_STAGE_SUMMARY_ROWS.some((row) => row.key === stageKey);
  return isMetric && isKind && isStage ? { key: `${metric}:${kind}:${stageKey}`, kind, metric, stageKey } : null;
}
