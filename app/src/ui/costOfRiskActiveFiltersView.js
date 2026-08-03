import {
  COST_OF_RISK_DEFINITION_OPTIONS,
  COST_OF_RISK_BALANCE_SCOPE_IN_BALANCE,
  COST_OF_RISK_FILTER_ALL,
  formatReferenceQuarterLabel
} from "../data/costOfRisk.js?v=20260803-refactor-cleanup";

let lastCostOfRiskActiveFiltersRenderKey = "";

export function renderCostOfRiskActiveFiltersView({
  activeTab,
  contributionDisplayMenuOpen,
  container,
  costOfRiskDefinitionId,
  costOfRiskDefinitionMenuOpen,
  displayMode,
  summaryDisplayMenuOpen,
  stageTransferDisplayMenuOpen,
  nplFlowsDisplayMenuOpen,
  filterOptions,
  filters,
  counterpartyMenuOpen,
  balanceScopeMenuOpen,
  instrumentMenuOpen,
  referenceDate,
  stageMenuOpen
}) {
  if (!container) return;

  const renderKey = serializeCostOfRiskActiveFiltersPart({
    activeTab,
    contributionDisplayMenuOpen,
    costOfRiskDefinitionId,
    costOfRiskDefinitionMenuOpen,
    displayMode,
    filters,
    labels: {
      asset: getCostOfRiskFilterOptionLabel(filterOptions.assets, filters.asset),
      balanceScope: getCostOfRiskFilterOptionLabel(filterOptions.balanceScopes, filters.balanceScope),
      counterparty: getCostOfRiskFilterOptionLabel(filterOptions.counterparties, filters.counterparty),
      stage: getCostOfRiskFilterOptionLabel(filterOptions.stages, filters.stage)
    },
    counterpartyMenuOpen,
    balanceScopeMenuOpen,
    instrumentMenuOpen,
    referenceDate,
    summaryDisplayMenuOpen,
    nplFlowsDisplayMenuOpen,
    stageMenuOpen,
    stageTransferDisplayMenuOpen
  });
  if (renderKey === lastCostOfRiskActiveFiltersRenderKey) return;
  lastCostOfRiskActiveFiltersRenderKey = renderKey;

  const balanceScopeItem = createCostOfRiskBalanceScopeFilterChip(filters.balanceScope, filterOptions.balanceScopes, balanceScopeMenuOpen);
  const instrumentItem = createCostOfRiskInstrumentFilterChip(filters.asset, filterOptions.assets, instrumentMenuOpen);
  const counterpartyItem = createCostOfRiskCounterpartyFilterChip(filters.counterparty, filterOptions.counterparties, counterpartyMenuOpen);
  const stageItem = createCostOfRiskStageFilterChip(filters.stage, filterOptions.stages, stageMenuOpen);
  const remainingActiveItems = [
    instrumentItem,
    counterpartyItem,
    stageItem
  ].filter(Boolean);
  const activeItems = remainingActiveItems.filter((item) => !item.dataset.costOfRiskAllFilter);
  const chips = [
    createCostOfRiskReferenceDateChip(referenceDate),
    balanceScopeItem,
    ...(remainingActiveItems.length > 0
      ? remainingActiveItems
      : activeItems.length === 0 ? [createCostOfRiskNoFilterChip()] : []),
    ...(activeTab === "contributions"
      ? [createCostOfRiskDisplayModeChip({
        displayMode,
        isOpen: contributionDisplayMenuOpen,
        labels: {
          absolute: "Absolute Contribution",
          relative: "Relative Contribution",
          switchToAbsolute: "Switch to Absolute Contribution",
          switchToRelative: "Switch to Relative Contribution"
        },
        menuLabel: "Contribution display",
        name: "contribution"
      })]
      : []),
    ...(activeTab === "cost-of-risk"
      ? [
        createCostOfRiskDisplayModeChip({
          displayMode,
          isOpen: contributionDisplayMenuOpen,
          labels: {
            absolute: "Absolute value",
            relative: "Basis points",
            switchToAbsolute: "Switch to Absolute value",
            switchToRelative: "Switch to Basis points"
          },
          menuLabel: "Cost of risk display",
          name: "costOfRiskDefinition"
        })
      ]
      : []),
    ...(activeTab === "stage-transfers"
      ? [createCostOfRiskDisplayModeChip({
        displayMode,
        isOpen: stageTransferDisplayMenuOpen,
        labels: {
          absolute: "Absolute Transfer",
          relative: "Relative Transfer",
          switchToAbsolute: "Switch to Absolute Transfer",
          switchToRelative: "Switch to Relative Transfer"
        },
        menuLabel: "Transfer display",
        name: "stageTransfer"
      })]
      : []),
    ...(activeTab === "npl-flows"
      ? [createCostOfRiskDisplayModeChip({
        displayMode,
        isOpen: nplFlowsDisplayMenuOpen,
        labels: {
          absolute: "Absolute Flow",
          relative: "Relative Flow",
          switchToAbsolute: "Switch to Absolute Flow",
          switchToRelative: "Switch to Relative Flow"
        },
        menuLabel: "NPL flow display",
        name: "nplFlows"
      })]
      : []),
    ...(activeTab === "summary"
      ? [createCostOfRiskDisplayModeChip({
        displayMode,
        isOpen: summaryDisplayMenuOpen,
        labels: {
          absolute: "Absolute Value",
          relative: "Ratio",
          switchToAbsolute: "Switch to Absolute Value",
          switchToRelative: "Switch to Ratio"
        },
        menuLabel: "Summary display",
        name: "summaryVariation"
      })]
      : [])
  ];

  container.replaceChildren(...chips);
  container.classList.toggle("is-empty", activeItems.length === 0);
}

function createCostOfRiskDefinitionChip(definitionId, isOpen) {
  const activeDefinition = COST_OF_RISK_DEFINITION_OPTIONS.find((definition) => definition.id === definitionId)
    ?? COST_OF_RISK_DEFINITION_OPTIONS[0];
  const chip = document.createElement("div");
  chip.className = "cost-of-risk-filter-chip cost-of-risk-filter-chip--definition";
  chip.classList.toggle("is-open", Boolean(isOpen));

  const toggle = document.createElement("button");
  toggle.className = "cost-of-risk-filter-chip-toggle";
  toggle.type = "button";
  toggle.dataset.costOfRiskDefinitionFilterToggle = "true";
  toggle.setAttribute("aria-expanded", String(Boolean(isOpen)));
  toggle.setAttribute("aria-label", "Change cost of risk definition");

  const prefix = document.createElement("span");
  prefix.className = "cost-of-risk-filter-chip-prefix";
  prefix.textContent = "Cost of risk: ";
  const value = document.createElement("span");
  value.className = "cost-of-risk-filter-chip-value";
  value.textContent = activeDefinition.label;
  toggle.append(prefix, value);
  chip.append(toggle);

  return chip;
}

function createCostOfRiskReferenceDateChip(referenceDate) {
  const chip = document.createElement("div");
  chip.className = "cost-of-risk-filter-chip cost-of-risk-filter-chip--locked cost-of-risk-filter-chip--date";
  const toggle = document.createElement("button");
  toggle.className = "cost-of-risk-filter-chip-toggle";
  toggle.type = "button";
  toggle.dataset.costOfRiskReferenceDateHelp = "true";
  toggle.setAttribute("aria-label", "Explain the reference date");
  const label = document.createElement("span");
  label.className = "cost-of-risk-filter-chip-label";
  label.textContent = formatReferenceQuarterLabel(referenceDate);
  toggle.append(label);
  chip.append(toggle);
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

function createCostOfRiskDisplayModeChip({
  displayMode,
  isOpen,
  labels,
  menuLabel,
  name
}) {
  const isRelative = displayMode === "ratio";
  const chip = document.createElement("div");
  chip.className = "cost-of-risk-filter-chip cost-of-risk-filter-chip--contribution-display";
  chip.classList.toggle("is-open", Boolean(isOpen));

  const toggle = document.createElement("button");
  toggle.className = "cost-of-risk-filter-chip-toggle";
  toggle.type = "button";
  toggle.dataset.costOfRiskDisplayModeToggle = name;
  toggle.setAttribute("aria-pressed", String(isRelative));
  toggle.setAttribute("aria-label", `Change ${menuLabel.toLowerCase()}`);

  const label = document.createElement("span");
  label.className = "cost-of-risk-filter-chip-label cost-of-risk-filter-chip-value";
  label.textContent = isRelative ? labels.relative : labels.absolute;
  toggle.append(label);
  chip.append(toggle);

  return chip;
}

function createCostOfRiskBalanceScopeFilterChip(value, options, isOpen) {
  const activeValue = value || COST_OF_RISK_BALANCE_SCOPE_IN_BALANCE;
  const isInBalance = activeValue === COST_OF_RISK_BALANCE_SCOPE_IN_BALANCE;
  const chip = document.createElement("div");
  chip.className = "cost-of-risk-filter-chip cost-of-risk-filter-chip--balance-scope";
  chip.classList.toggle("is-open", Boolean(isOpen));
  if (isInBalance) chip.dataset.costOfRiskAllFilter = "true";

  const toggle = document.createElement("button");
  toggle.className = "cost-of-risk-filter-chip-toggle";
  toggle.type = "button";
  toggle.dataset.costOfRiskBalanceScopeFilterToggle = "true";
  toggle.setAttribute("aria-expanded", String(Boolean(isOpen)));
  toggle.setAttribute("aria-label", "Change balance-sheet perimeter");

  const label = document.createElement("span");
  label.className = "cost-of-risk-filter-chip-label";
  const labelPrefix = document.createElement("span");
  labelPrefix.className = "cost-of-risk-filter-chip-prefix";
  labelPrefix.textContent = "Perimeter: ";
  const labelValue = document.createElement("span");
  labelValue.className = "cost-of-risk-filter-chip-value";
  labelValue.textContent = getCostOfRiskFilterOptionLabel(options, activeValue);
  label.append(labelPrefix, labelValue);
  toggle.append(label);
  chip.append(toggle);

  if (!isInBalance) {
    const button = document.createElement("button");
    button.className = "cost-of-risk-filter-chip-close";
    button.type = "button";
    button.dataset.costOfRiskClearFilter = "balanceScope";
    button.setAttribute("aria-label", `Reset perimeter to In-balance`);
    button.textContent = "×";
    chip.append(button);
  }

  return chip;
}

function createCostOfRiskInstrumentFilterChip(value, options, isOpen) {
  const isAllInstrument = !value || value === COST_OF_RISK_FILTER_ALL;
  const chip = document.createElement("div");
  chip.className = "cost-of-risk-filter-chip cost-of-risk-filter-chip--instrument";
  chip.classList.toggle("is-open", Boolean(isOpen));
  if (isAllInstrument) chip.dataset.costOfRiskAllFilter = "true";

  const toggle = document.createElement("button");
  toggle.className = "cost-of-risk-filter-chip-toggle";
  toggle.type = "button";
  toggle.dataset.costOfRiskInstrumentFilterToggle = "true";
  toggle.setAttribute("aria-expanded", String(Boolean(isOpen)));
  toggle.setAttribute("aria-label", "Change instruments filter");

  const label = document.createElement("span");
  label.className = "cost-of-risk-filter-chip-label";
  if (isAllInstrument) {
    label.textContent = "All Instruments";
  } else {
    const labelPrefix = document.createElement("span");
    labelPrefix.className = "cost-of-risk-filter-chip-prefix";
    labelPrefix.textContent = "Instruments: ";
    const labelValue = document.createElement("span");
    labelValue.className = "cost-of-risk-filter-chip-value";
    labelValue.textContent = getCostOfRiskFilterOptionLabel(options, value);
    label.append(labelPrefix, labelValue);
  }
  toggle.append(label);
  chip.append(toggle);

  if (!isAllInstrument) {
    const button = document.createElement("button");
    button.className = "cost-of-risk-filter-chip-close";
    button.type = "button";
    button.dataset.costOfRiskClearFilter = "asset";
    button.setAttribute("aria-label", `Remove ${getCostOfRiskFilterOptionLabel(options, value)} filter`);
    button.textContent = "×";
    chip.append(button);
  }

  return chip;
}

function createCostOfRiskCounterpartyFilterChip(value, options, isOpen) {
  const isAllCounterparty = !value || value === COST_OF_RISK_FILTER_ALL;
  const chip = document.createElement("div");
  chip.className = "cost-of-risk-filter-chip cost-of-risk-filter-chip--counterparty";
  chip.classList.toggle("is-open", Boolean(isOpen));
  if (isAllCounterparty) chip.dataset.costOfRiskAllFilter = "true";

  const toggle = document.createElement("button");
  toggle.className = "cost-of-risk-filter-chip-toggle";
  toggle.type = "button";
  toggle.dataset.costOfRiskCounterpartyFilterToggle = "true";
  toggle.setAttribute("aria-expanded", String(Boolean(isOpen)));
  toggle.setAttribute("aria-label", "Change counterparty filter");

  const label = document.createElement("span");
  label.className = "cost-of-risk-filter-chip-label";
  if (isAllCounterparty) {
    label.textContent = "All Counterparties";
  } else {
    const labelPrefix = document.createElement("span");
    labelPrefix.className = "cost-of-risk-filter-chip-prefix";
    labelPrefix.textContent = "Counterparty: ";
    const labelValue = document.createElement("span");
    labelValue.className = "cost-of-risk-filter-chip-value";
    labelValue.textContent = getCostOfRiskFilterOptionLabel(options, value);
    label.append(labelPrefix, labelValue);
  }
  toggle.append(label);
  chip.append(toggle);

  if (!isAllCounterparty) {
    const button = document.createElement("button");
    button.className = "cost-of-risk-filter-chip-close";
    button.type = "button";
    button.dataset.costOfRiskClearFilter = "counterparty";
    button.setAttribute("aria-label", `Remove ${getCostOfRiskFilterOptionLabel(options, value)} filter`);
    button.textContent = "×";
    chip.append(button);
  }

  return chip;
}

function createCostOfRiskStageFilterChip(value, options, isOpen) {
  const isAllStage = !value || value === COST_OF_RISK_FILTER_ALL;
  const chip = document.createElement("div");
  chip.className = "cost-of-risk-filter-chip cost-of-risk-filter-chip--stage";
  chip.classList.toggle("is-open", Boolean(isOpen));
  if (isAllStage) chip.dataset.costOfRiskAllFilter = "true";

  const toggle = document.createElement("button");
  toggle.className = "cost-of-risk-filter-chip-toggle";
  toggle.type = "button";
  toggle.dataset.costOfRiskStageFilterToggle = "true";
  toggle.setAttribute("aria-expanded", String(Boolean(isOpen)));
  toggle.setAttribute("aria-label", "Change stage filter");

  const label = document.createElement("span");
  label.className = "cost-of-risk-filter-chip-label";
  if (isAllStage) {
    label.textContent = "All Stage";
  } else {
    const labelPrefix = document.createElement("span");
    labelPrefix.className = "cost-of-risk-filter-chip-prefix";
    labelPrefix.textContent = "Status: ";
    const labelValue = document.createElement("span");
    labelValue.className = "cost-of-risk-filter-chip-value";
    labelValue.textContent = getCostOfRiskFilterOptionLabel(options, value);
    label.append(labelPrefix, labelValue);
  }
  toggle.append(label);
  chip.append(toggle);

  if (!isAllStage) {
    const button = document.createElement("button");
    button.className = "cost-of-risk-filter-chip-close";
    button.type = "button";
    button.dataset.costOfRiskClearFilter = "stage";
    button.setAttribute("aria-label", `Remove ${getCostOfRiskFilterOptionLabel(options, value)} filter`);
    button.textContent = "×";
    chip.append(button);
  }

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
