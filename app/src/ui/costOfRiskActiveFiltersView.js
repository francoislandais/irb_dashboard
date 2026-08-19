import {
  COST_OF_RISK_DEFINITION_OPTIONS,
  COST_OF_RISK_BALANCE_SCOPE_IN_BALANCE,
  COST_OF_RISK_FILTER_ALL,
  COST_OF_RISK_PERIOD_MODE_ANNUALIZED,
  COST_OF_RISK_PERIOD_MODE_YTD,
  formatReferenceQuarterLabel
} from "../data/costOfRisk.js?v=20260812-costofrisk-domain-split";
import { COST_OF_RISK_STAGE_FILTER_UNSUPPORTED_TABS } from "./costOfRiskFilterSelectionConfig.js?v=20260806-cell-selection";

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
  periodMode,
  filterOptions,
  filters,
  counterpartyMenuOpen,
  balanceScopeMenuOpen,
  instrumentMenuOpen,
  selectedJst,
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
    selectedJst,
    referenceDate,
    summaryDisplayMenuOpen,
    nplFlowsDisplayMenuOpen,
    periodMode,
    stageMenuOpen,
    stageTransferDisplayMenuOpen
  });
  if (renderKey === lastCostOfRiskActiveFiltersRenderKey) return;
  lastCostOfRiskActiveFiltersRenderKey = renderKey;

  const balanceScopeItem = createCostOfRiskPerimeterFilterChip("balanceScope", filters.balanceScope, filterOptions.balanceScopes, balanceScopeMenuOpen);
  const instrumentItem = createCostOfRiskPerimeterFilterChip("instrument", filters.asset, filterOptions.assets, instrumentMenuOpen);
  const counterpartyItem = createCostOfRiskPerimeterFilterChip("counterparty", filters.counterparty, filterOptions.counterparties, counterpartyMenuOpen);
  const stageItem = COST_OF_RISK_STAGE_FILTER_UNSUPPORTED_TABS.has(activeTab)
    ? null
    : createCostOfRiskPerimeterFilterChip("stage", filters.stage, filterOptions.stages, stageMenuOpen);
  const remainingActiveItems = [
    instrumentItem,
    counterpartyItem,
    stageItem
  ].filter(Boolean);
  const activeItems = remainingActiveItems.filter((item) => !item.dataset.costOfRiskAllFilter);
  const chips = [
    createCostOfRiskJstChip(selectedJst),
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
    ...(shouldShowCostOfRiskPeriodModeChip(activeTab)
      ? [createCostOfRiskPeriodModeChip(periodMode)]
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
    ...(activeTab === "geography"
      ? [createCostOfRiskDisplayModeChip({
        displayMode,
        isOpen: false,
        labels: {
          absolute: "Amounts",
          relative: "Ratios",
          switchToAbsolute: "Switch to Amounts",
          switchToRelative: "Switch to Ratios"
        },
        menuLabel: "Geography display",
        name: "geography"
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

function createCostOfRiskJstChip(selectedJst) {
  const chip = document.createElement("div");
  chip.className = "cost-of-risk-filter-chip cost-of-risk-filter-chip--locked cost-of-risk-filter-chip--jst";
  const toggle = document.createElement("button");
  toggle.className = "cost-of-risk-filter-chip-toggle";
  toggle.type = "button";
  toggle.dataset.costOfRiskJstHelp = "true";
  toggle.setAttribute("aria-label", "Change JST code");
  const label = document.createElement("span");
  label.className = "cost-of-risk-filter-chip-label cost-of-risk-filter-chip-value";
  label.textContent = selectedJst || "JST";
  toggle.append(label);
  chip.append(toggle);
  return chip;
}

function shouldShowCostOfRiskPeriodModeChip(activeTab) {
  return activeTab === "contributions"
    || activeTab === "stage-transfers"
    || activeTab === "cost-of-risk";
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

  const value = document.createElement("span");
  value.className = "cost-of-risk-filter-chip-value";
  value.textContent = activeDefinition.label;
  toggle.append(value);
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

  if (name === "stageTransfer" && isRelative) {
    const help = document.createElement("button");
    help.className = "cost-of-risk-filter-chip-help";
    help.type = "button";
    help.dataset.costOfRiskStageTransferDenominatorHelp = "true";
    help.setAttribute("aria-label", "Explain relative transfer denominator");
    help.textContent = "?";
    chip.append(help);
  }

  return chip;
}

function createCostOfRiskPeriodModeChip(periodMode) {
  const isYtd = periodMode === COST_OF_RISK_PERIOD_MODE_YTD;
  const isAnnualized = periodMode === COST_OF_RISK_PERIOD_MODE_ANNUALIZED;
  const chip = document.createElement("div");
  chip.className = "cost-of-risk-filter-chip cost-of-risk-filter-chip--period-mode";

  const toggle = document.createElement("button");
  toggle.className = "cost-of-risk-filter-chip-toggle";
  toggle.type = "button";
  toggle.dataset.costOfRiskPeriodModeToggle = "true";
  toggle.setAttribute("aria-label", "Change period view");

  const value = document.createElement("span");
  value.className = "cost-of-risk-filter-chip-value";
  value.textContent = isAnnualized ? "Annualized" : isYtd ? "Year-to-date" : "Quarterly flow";
  toggle.append(value);
  chip.append(toggle);

  return chip;
}

// Instrument/Counterparty/Stage/Balance-scope chips share the same shape
// (toggle button showing the active value, optional close button to reset to
// the default) — only the wording, dataset key and default-value predicate
// differ, so they're built from one config-driven function.
const COST_OF_RISK_PERIMETER_FILTER_CONFIGS = {
  balanceScope: {
    clearFilterName: "balanceScope",
    closeAriaLabel: () => "Reset perimeter to In-balance",
    isDefaultValue: (value) => (value || COST_OF_RISK_BALANCE_SCOPE_IN_BALANCE) === COST_OF_RISK_BALANCE_SCOPE_IN_BALANCE,
    normalizeValue: (value) => value || COST_OF_RISK_BALANCE_SCOPE_IN_BALANCE,
    toggleAriaLabel: "Change balance-sheet perimeter",
    toggleDataset: "costOfRiskBalanceScopeFilterToggle"
  },
  counterparty: {
    clearFilterName: "counterparty",
    closeAriaLabel: (label) => `Remove ${label} filter`,
    defaultLabel: "All Counterparties",
    isDefaultValue: (value) => !value || value === COST_OF_RISK_FILTER_ALL,
    toggleAriaLabel: "Change counterparty filter",
    toggleDataset: "costOfRiskCounterpartyFilterToggle"
  },
  instrument: {
    clearFilterName: "asset",
    closeAriaLabel: (label) => `Remove ${label} filter`,
    defaultLabel: "All Instruments",
    isDefaultValue: (value) => !value || value === COST_OF_RISK_FILTER_ALL,
    toggleAriaLabel: "Change instruments filter",
    toggleDataset: "costOfRiskInstrumentFilterToggle"
  },
  stage: {
    clearFilterName: "stage",
    closeAriaLabel: (label) => `Remove ${label} filter`,
    defaultLabel: "All Stage",
    isDefaultValue: (value) => !value || value === COST_OF_RISK_FILTER_ALL,
    toggleAriaLabel: "Change stage filter",
    toggleDataset: "costOfRiskStageFilterToggle"
  }
};

function createCostOfRiskPerimeterFilterChip(kind, value, options, isOpen) {
  const config = COST_OF_RISK_PERIMETER_FILTER_CONFIGS[kind];
  const normalizedValue = config.normalizeValue ? config.normalizeValue(value) : value;
  const isDefault = config.isDefaultValue(value);
  const chip = document.createElement("div");
  chip.className = `cost-of-risk-filter-chip cost-of-risk-filter-chip--${kind === "balanceScope" ? "balance-scope" : kind}`;
  chip.classList.toggle("is-open", Boolean(isOpen));
  if (isDefault) chip.dataset.costOfRiskAllFilter = "true";

  const toggle = document.createElement("button");
  toggle.className = "cost-of-risk-filter-chip-toggle";
  toggle.type = "button";
  toggle.dataset[config.toggleDataset] = "true";
  toggle.setAttribute("aria-expanded", String(Boolean(isOpen)));
  toggle.setAttribute("aria-label", config.toggleAriaLabel);

  const label = document.createElement("span");
  label.className = "cost-of-risk-filter-chip-label";
  const resolvedLabel = getCostOfRiskFilterOptionLabel(options, normalizedValue);
  const labelValue = document.createElement("span");
  labelValue.className = "cost-of-risk-filter-chip-value";
  if (isDefault && config.defaultLabel) {
    labelValue.textContent = config.defaultLabel;
  } else {
    labelValue.textContent = resolvedLabel;
  }
  label.append(labelValue);
  toggle.append(label);
  chip.append(toggle);

  if (!isDefault) {
    const button = document.createElement("button");
    button.className = "cost-of-risk-filter-chip-close";
    button.type = "button";
    button.dataset.costOfRiskClearFilter = config.clearFilterName;
    button.setAttribute("aria-label", config.closeAriaLabel(resolvedLabel));
    button.textContent = "×";
    chip.append(button);
  }

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
