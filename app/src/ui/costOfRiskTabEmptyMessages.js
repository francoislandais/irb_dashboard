import {
  COST_OF_RISK_BALANCE_SCOPE_IN_BALANCE,
  COST_OF_RISK_FILTER_ALL
} from "../data/costOfRisk.js?v=20260804-geography";
import {
  formatCostOfRiskCounterpartySelectionLabel,
  getCostOfRiskFilterParentValue,
  getCostOfRiskUnavailableMessage,
  isCostOfRiskIfrsStageFilterValue,
  isCostOfRiskPerformanceStatusFilterValue
} from "./costOfRiskFilterRules.js?v=20260803-refactor-cleanup";

// Turns the raw "no data" status message a tab renders into either plain
// text or an inline call-to-action (a button that clears the filter that's
// causing the gap), depending on what the message says. `context` carries
// everything that would otherwise be read from costOfRiskView.js module
// state: { activeTab, filters, filterOptions, onSelectFilter }, where
// onSelectFilter(filterKey, value) applies the change and clears any stale
// context-panel topic.
export function resolveCostOfRiskTabEmptyMessage(message, context) {
  const { activeTab, filters } = context;
  const resolvedMessage = !message
    || String(message).startsWith("No matching F")
    || String(message).startsWith("No F_")
    ? getCostOfRiskUnavailableMessage(filters)
    : message;

  if (String(resolvedMessage).startsWith("FINREP data does not support this level of detail with a breakdown by performing status")) {
    return createCostOfRiskRemoveStatusFilterMessage(context);
  }
  if (
    String(resolvedMessage).startsWith("FINREP data does not support this level of detail for off-balance")
    || String(resolvedMessage).startsWith("FINREP data does not support this level of detail for the combined")
    || String(resolvedMessage).startsWith("FINREP data does not support this level of detail for collateral analysis outside")
  ) {
    return createCostOfRiskSelectInBalanceMessage(resolvedMessage, context);
  }
  if (String(resolvedMessage).startsWith("FINREP data does not support this level of detail for")) {
    const counterpartyAction = createCostOfRiskFineCounterpartyMessage(resolvedMessage, context);
    if (counterpartyAction) return counterpartyAction;
  }
  if (
    activeTab === "collateral-ratio"
    && String(resolvedMessage).startsWith("Collateral information in F_18.00")
  ) {
    return createCostOfRiskCollateralStatusSelectionEmpty(resolvedMessage, context);
  }
  if (
    (activeTab === "stage-ratio" || activeTab === "coverage-ratio")
    && String(resolvedMessage).startsWith("This tab is stage or performing status specific")
  ) {
    return createCostOfRiskRatioStatusSelectionEmpty(resolvedMessage, context);
  }
  return resolvedMessage;
}

function createCostOfRiskSelectInBalanceMessage(message, { onSelectFilter }) {
  const wrap = document.createElement("span");
  wrap.className = "cost-of-risk-tab-empty-inline-action";
  wrap.append(document.createTextNode(`${message.replace(/ Select In-balance\\.?$/i, "")} `));
  wrap.append(createCostOfRiskTabEmptyActionButton("Select In-balance", () => {
    onSelectFilter("balanceScope", COST_OF_RISK_BALANCE_SCOPE_IN_BALANCE);
  }));
  wrap.append(document.createTextNode("."));
  return wrap;
}

function createCostOfRiskFineCounterpartyMessage(message, { filterOptions, filters, onSelectFilter }) {
  const counterparty = filters.counterparty;
  const parent = getCostOfRiskFilterParentValue("counterparty", counterparty);
  if (!counterparty || counterparty === COST_OF_RISK_FILTER_ALL || parent === COST_OF_RISK_FILTER_ALL) return null;

  const counterpartyLabel = getCostOfRiskCounterpartyFilterLabel(counterparty, filterOptions);
  const parentLabel = getCostOfRiskCounterpartyFilterLabel(parent, filterOptions);
  const wrap = document.createElement("span");
  wrap.className = "cost-of-risk-tab-empty-inline-action";
  wrap.append(document.createTextNode(`${message.replace(/ Select .*$/i, "")} `));

  const removeButton = createCostOfRiskTabEmptyActionButton(`Remove ${counterpartyLabel} filter`, () => {
    onSelectFilter("counterparty", COST_OF_RISK_FILTER_ALL);
  });
  const parentButton = createCostOfRiskTabEmptyActionButton(`Select ${parentLabel}`, () => {
    onSelectFilter("counterparty", parent);
  });

  wrap.append(removeButton, document.createTextNode(" or "), parentButton, document.createTextNode("."));
  return wrap;
}

function createCostOfRiskRemoveStatusFilterMessage({ onSelectFilter }) {
  const wrap = document.createElement("span");
  wrap.className = "cost-of-risk-tab-empty-inline-action";
  wrap.append(document.createTextNode("FINREP data does not support this level of detail with a breakdown by performing status. "));

  const button = createCostOfRiskTabEmptyActionButton("Remove this filter", () => {
    onSelectFilter("stage", COST_OF_RISK_FILTER_ALL);
  });
  wrap.append(button);
  wrap.append(document.createTextNode("."));
  return wrap;
}

function createCostOfRiskTabEmptyActionButton(label, onClick) {
  const button = document.createElement("button");
  button.className = "cost-of-risk-tab-empty-action";
  button.type = "button";
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
}

function getCostOfRiskCounterpartyFilterLabel(value, filterOptions) {
  const option = filterOptions?.counterparties?.find((candidate) => candidate.value === value);
  return formatCostOfRiskCounterpartySelectionLabel(option?.label ?? value);
}

function createCostOfRiskRatioStatusSelectionEmpty(message, { filterOptions, onSelectFilter }) {
  const wrap = document.createElement("div");
  wrap.className = "cost-of-risk-ratio-status-empty";

  const text = document.createElement("p");
  text.className = "cost-of-risk-ratio-status-empty-text";
  text.textContent = message;
  wrap.append(text);

  const options = filterOptions?.stages ?? [];
  wrap.append(createCostOfRiskRatioStatusOptionGroup(
    "Staging status",
    options.filter((option) => isCostOfRiskIfrsStageFilterValue(option.value)),
    onSelectFilter
  ));
  wrap.append(createCostOfRiskRatioStatusOptionGroup(
    "Performance status",
    options.filter((option) => isCostOfRiskPerformanceStatusFilterValue(option.value)),
    onSelectFilter
  ));

  return wrap;
}

function createCostOfRiskCollateralStatusSelectionEmpty(message, { filterOptions, onSelectFilter }) {
  const wrap = document.createElement("div");
  wrap.className = "cost-of-risk-ratio-status-empty";

  const text = document.createElement("p");
  text.className = "cost-of-risk-ratio-status-empty-text";
  text.textContent = message;
  wrap.append(text);

  const options = filterOptions?.stages ?? [];
  wrap.append(createCostOfRiskRatioStatusOptionGroup(
    "Collateral status",
    options.filter((option) => option.value === COST_OF_RISK_FILTER_ALL || isCostOfRiskPerformanceStatusFilterValue(option.value)),
    onSelectFilter
  ));

  return wrap;
}

function createCostOfRiskRatioStatusOptionGroup(titleText, options, onSelectFilter) {
  const group = document.createElement("section");
  group.className = "cost-of-risk-ratio-status-empty-group";

  const title = document.createElement("h3");
  title.className = "cost-of-risk-ratio-status-empty-title";
  title.textContent = titleText;
  group.append(title);

  const optionWrap = document.createElement("div");
  optionWrap.className = "cost-of-risk-ratio-status-empty-options";
  options.forEach((option) => {
    const button = document.createElement("button");
    button.className = "cost-of-risk-ratio-status-empty-option";
    button.type = "button";
    button.textContent = option.label;
    button.addEventListener("click", () => {
      onSelectFilter("stage", option.value);
    });
    optionWrap.append(button);
  });
  group.append(optionWrap);
  return group;
}
