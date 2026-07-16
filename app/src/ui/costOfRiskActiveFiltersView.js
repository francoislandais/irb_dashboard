import {
  COST_OF_RISK_FILTER_ALL,
  formatReferenceQuarterLabel
} from "../data/costOfRisk.js?v=20260716-cost-risk-summary-hidden-fix-view";

let lastCostOfRiskActiveFiltersRenderKey = "";

export function renderCostOfRiskActiveFiltersView({
  container,
  filterOptions,
  filters,
  referenceDate
}) {
  if (!container) return;

  const renderKey = serializeCostOfRiskActiveFiltersPart({
    filters,
    labels: {
      asset: getCostOfRiskFilterOptionLabel(filterOptions.assets, filters.asset),
      counterparty: getCostOfRiskFilterOptionLabel(filterOptions.counterparties, filters.counterparty),
      stage: getCostOfRiskFilterOptionLabel(filterOptions.stages, filters.stage)
    },
    referenceDate
  });
  if (renderKey === lastCostOfRiskActiveFiltersRenderKey) return;
  lastCostOfRiskActiveFiltersRenderKey = renderKey;

  const activeItems = [
    createCostOfRiskActiveFilterChip("asset", "Accounting", filters.asset, filterOptions.assets),
    createCostOfRiskActiveFilterChip("counterparty", "Counterparty", filters.counterparty, filterOptions.counterparties),
    createCostOfRiskActiveFilterChip("stage", "Stage", filters.stage, filterOptions.stages)
  ].filter(Boolean);
  const chips = [
    createCostOfRiskReferenceDateChip(referenceDate),
    ...(activeItems.length > 0 ? activeItems : [createCostOfRiskNoFilterChip()])
  ];

  container.replaceChildren(...chips);
  container.classList.toggle("is-empty", activeItems.length === 0);
}

function createCostOfRiskReferenceDateChip(referenceDate) {
  const chip = document.createElement("div");
  chip.className = "cost-of-risk-filter-chip cost-of-risk-filter-chip--locked cost-of-risk-filter-chip--date";
  const label = document.createElement("span");
  label.className = "cost-of-risk-filter-chip-label";
  label.textContent = formatReferenceQuarterLabel(referenceDate);
  chip.append(label);
  return chip;
}

function createCostOfRiskNoFilterChip() {
  const chip = document.createElement("div");
  chip.className = "cost-of-risk-filter-chip cost-of-risk-filter-chip--muted";
  const label = document.createElement("span");
  label.className = "cost-of-risk-filter-chip-label";
  label.textContent = "No perimeter filter";
  chip.append(label);
  return chip;
}

function createCostOfRiskActiveFilterChip(filterName, filterLabel, value, options) {
  if (!value || value === COST_OF_RISK_FILTER_ALL) return null;

  const chip = document.createElement("div");
  chip.className = "cost-of-risk-filter-chip";
  const label = document.createElement("span");
  label.className = "cost-of-risk-filter-chip-label";
  const labelPrefix = document.createElement("span");
  labelPrefix.className = "cost-of-risk-filter-chip-prefix";
  labelPrefix.textContent = `${filterLabel}: `;
  const labelValue = document.createElement("span");
  labelValue.className = "cost-of-risk-filter-chip-value";
  labelValue.textContent = getCostOfRiskFilterOptionLabel(options, value);
  label.append(labelPrefix, labelValue);
  const button = document.createElement("button");
  button.className = "cost-of-risk-filter-chip-close";
  button.type = "button";
  button.dataset.costOfRiskClearFilter = filterName;
  button.setAttribute("aria-label", `Remove ${labelValue.textContent} filter`);
  button.textContent = "×";
  chip.append(label, button);
  return chip;
}

function getCostOfRiskFilterOptionLabel(options, value) {
  return (options ?? []).find((option) => option.value === value)?.label ?? value;
}

function serializeCostOfRiskActiveFiltersPart(value) {
  if (Array.isArray(value)) return `[${value.map(serializeCostOfRiskActiveFiltersPart).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${key}:${serializeCostOfRiskActiveFiltersPart(value[key])}`).join(",")}}`;
  }
  return String(value);
}
