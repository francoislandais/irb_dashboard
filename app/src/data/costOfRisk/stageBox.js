import { getRequiredAxisColumnIndexes as getRequiredIndexes } from "../core/axisColumns.js";
import { getReferenceColumns } from "../core/referenceColumns.js";
import {
  COST_OF_RISK_STAGE_BOX_X_CODES
} from "./definitions.js";
import {
  computeCostOfRiskStageExposureLevels,
  getCostOfRiskPeerJstCodes,
  getCostOfRiskRatioDenominatorSeries,
  getCostOfRiskStageBoxYSelection,
  getCostOfRiskStageTransferDenominatorFilters
} from "./core.js";

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
