export const COST_OF_RISK_FILTER_SELECTION_META = {
  balanceScope: { allLabel: "In-balance", filterKey: "balanceScope", label: "Perimeter", optionsKey: "balanceScopes" },
  counterparty: { allLabel: "All Counterparties", filterKey: "counterparty", label: "Counterparty", optionsKey: "counterparties" },
  instrument: { allLabel: "All Instruments", filterKey: "asset", label: "Instruments", optionsKey: "assets" },
  stage: { allLabel: "All Stage", filterKey: "stage", label: "Stage", optionsKey: "stages" }
};

export const COST_OF_RISK_FINE_COUNTERPARTY_UNSUPPORTED_TABS = new Set([
  "analysis",
  "contributions",
  "cost-of-risk",
  "f2-vs-f12",
  "stage-reconciliation",
  "stage-transfers"
]);

// These tabs have no stage / performing-status breakdown in their source
// FINREP template, so the Stage filter can't narrow them down. Rather than
// blocking the user when a stage value happens to be selected elsewhere,
// these tabs simply ignore it (all-status) and hide the Stage chip.
export const COST_OF_RISK_STAGE_FILTER_UNSUPPORTED_TABS = new Set([
  "geography",
  "npl-flows",
  "stage-transfers"
]);
