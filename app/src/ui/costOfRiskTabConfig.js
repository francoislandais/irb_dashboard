export const COST_OF_RISK_FILTER_SELECTION_TOPIC_PREFIX = "filter-selection:";
export const COST_OF_RISK_TABS_WITH_DEDICATED_DISPLAY_MODE = new Set([
  "collateral-ratio",
  "contributions",
  "coverage-ratio",
  "geography",
  "npl-flows",
  "stage-ratio",
  "stage-transfers",
  "summary"
]);

export const COST_OF_RISK_TABS_WITH_CONTEXT_RENDERER = new Set([
  ...COST_OF_RISK_TABS_WITH_DEDICATED_DISPLAY_MODE,
  "cost-of-risk"
]);
