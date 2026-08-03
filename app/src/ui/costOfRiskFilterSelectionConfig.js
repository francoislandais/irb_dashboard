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
