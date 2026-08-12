import { getRequiredAxisColumnIndexes as getRequiredIndexes } from "../core/axisColumns.js";
import { getReferenceColumns } from "../core/referenceColumns.js";
import {
  COST_OF_RISK_FILTER_ALL,
  DEFAULT_COST_OF_RISK_COUNTERPARTY_SUMMARY_CELL
} from "./definitions.js";
import {
  buildCostOfRiskCounterpartySummaryPointsForJst,
  buildCostOfRiskCounterpartySummaryRowsForJst,
  getCostOfRiskPeerJstCodes,
  getCostOfRiskReferenceIndex,
  getCostOfRiskStageBoxYSelection,
  normalizeCostOfRiskFilters,
  parseCostOfRiskCounterpartySummaryCellKey
} from "./core.js";

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
