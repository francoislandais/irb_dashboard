import {
  COST_OF_RISK_FILTER_ALL,
  formatReferenceQuarterLabel
} from "../data/costOfRisk.js?v=20260717-peer-panel";

let lastCostOfRiskActiveFiltersRenderKey = "";

export function renderCostOfRiskActiveFiltersView({
  activeTab,
  contributionDisplayMenuOpen,
  container,
  displayMode,
  summaryDisplayMenuOpen,
  stageTransferDisplayMenuOpen,
  filterOptions,
  filters,
  counterpartyMenuOpen,
  instrumentMenuOpen,
  referenceDate,
  stageMenuOpen
}) {
  if (!container) return;

  const renderKey = serializeCostOfRiskActiveFiltersPart({
    activeTab,
    contributionDisplayMenuOpen,
    displayMode,
    filters,
    labels: {
      asset: getCostOfRiskFilterOptionLabel(filterOptions.assets, filters.asset),
      counterparty: getCostOfRiskFilterOptionLabel(filterOptions.counterparties, filters.counterparty),
      stage: getCostOfRiskFilterOptionLabel(filterOptions.stages, filters.stage)
    },
    counterpartyMenuOpen,
    instrumentMenuOpen,
    referenceDate,
    summaryDisplayMenuOpen,
    stageMenuOpen,
    stageTransferDisplayMenuOpen
  });
  if (renderKey === lastCostOfRiskActiveFiltersRenderKey) return;
  lastCostOfRiskActiveFiltersRenderKey = renderKey;

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
    ...(activeTab === "summary"
      ? [createCostOfRiskDisplayModeChip({
        displayMode,
        isOpen: summaryDisplayMenuOpen,
        labels: {
          absolute: "Absolute Variation",
          relative: "Relative Variation",
          switchToAbsolute: "Switch to Absolute Variation",
          switchToRelative: "Switch to Relative Variation"
        },
        menuLabel: "Variation display",
        name: "summaryVariation"
      })]
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
      : [])
  ];

  container.replaceChildren(...chips);
  container.classList.toggle("is-empty", activeItems.length === 0);
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
  const kebabName = name.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
  const chip = document.createElement("div");
  chip.className = "cost-of-risk-filter-chip cost-of-risk-filter-chip--contribution-display";
  chip.classList.toggle("is-open", Boolean(isOpen));

  const toggle = document.createElement("button");
  toggle.className = "cost-of-risk-filter-chip-toggle";
  toggle.type = "button";
  toggle.dataset.costOfRiskDisplayModeToggle = name;
  toggle.setAttribute("aria-haspopup", "listbox");
  toggle.setAttribute("aria-expanded", String(Boolean(isOpen)));
  toggle.setAttribute("aria-label", `Change ${menuLabel.toLowerCase()}`);

  const label = document.createElement("span");
  label.className = "cost-of-risk-filter-chip-label cost-of-risk-filter-chip-value";
  label.textContent = isRelative ? labels.relative : labels.absolute;
  toggle.append(label);
  chip.append(toggle);

  if (isOpen) {
    const menu = document.createElement("div");
    menu.className = "cost-of-risk-stage-filter-menu cost-of-risk-contribution-display-menu";
    menu.setAttribute("role", "listbox");
    menu.setAttribute("aria-label", menuLabel);

    const option = document.createElement("button");
    option.className = "cost-of-risk-stage-filter-option";
    option.type = "button";
    option.dataset.costOfRiskDisplayModeOption = `${name}:${isRelative ? "amount" : "ratio"}`;
    option.dataset.costOfRiskDisplayModeScope = kebabName;
    option.setAttribute("role", "option");
    option.setAttribute("aria-selected", "false");
    option.textContent = isRelative
      ? labels.switchToAbsolute
      : labels.switchToRelative;
    menu.append(option);
    chip.append(menu);
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
  toggle.setAttribute("aria-haspopup", "listbox");
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

  if (isOpen) {
    chip.append(createCostOfRiskInstrumentFilterMenu(value, options));
  }

  return chip;
}

function createCostOfRiskInstrumentFilterMenu(value, options) {
  const menu = document.createElement("div");
  menu.className = "cost-of-risk-stage-filter-menu cost-of-risk-instrument-filter-menu";
  menu.setAttribute("role", "listbox");
  menu.setAttribute("aria-label", "Instruments filter");

  (options ?? []).forEach((option) => {
    const button = document.createElement("button");
    const isActive = option.value === value || (!value && option.value === COST_OF_RISK_FILTER_ALL);
    button.className = "cost-of-risk-stage-filter-option";
    button.classList.toggle("is-active", isActive);
    button.type = "button";
    button.dataset.costOfRiskInstrumentFilterOption = option.value;
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", String(isActive));
    button.textContent = option.value === COST_OF_RISK_FILTER_ALL ? "All Instruments" : option.label;
    menu.append(button);
  });

  return menu;
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
  toggle.setAttribute("aria-haspopup", "listbox");
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

  if (isOpen) {
    chip.append(createCostOfRiskCounterpartyFilterMenu(value, options));
  }

  return chip;
}

function createCostOfRiskCounterpartyFilterMenu(value, options) {
  const menu = document.createElement("div");
  menu.className = "cost-of-risk-stage-filter-menu cost-of-risk-counterparty-filter-menu";
  menu.setAttribute("role", "listbox");
  menu.setAttribute("aria-label", "Counterparty filter");

  (options ?? []).forEach((option) => {
    const button = document.createElement("button");
    const isActive = option.value === value || (!value && option.value === COST_OF_RISK_FILTER_ALL);
    button.className = "cost-of-risk-stage-filter-option";
    button.classList.toggle("is-active", isActive);
    button.type = "button";
    button.dataset.costOfRiskCounterpartyFilterOption = option.value;
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", String(isActive));
    button.textContent = option.value === COST_OF_RISK_FILTER_ALL ? "All Counterparties" : option.label;
    menu.append(button);
  });

  return menu;
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
  toggle.setAttribute("aria-haspopup", "listbox");
  toggle.setAttribute("aria-expanded", String(Boolean(isOpen)));
  toggle.setAttribute("aria-label", "Change stage filter");

  const label = document.createElement("span");
  label.className = "cost-of-risk-filter-chip-label";
  if (isAllStage) {
    label.textContent = "All Stage";
  } else {
    const labelPrefix = document.createElement("span");
    labelPrefix.className = "cost-of-risk-filter-chip-prefix";
    labelPrefix.textContent = "Stage: ";
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

  if (isOpen) {
    chip.append(createCostOfRiskStageFilterMenu(value, options));
  }

  return chip;
}

function createCostOfRiskStageFilterMenu(value, options) {
  const menu = document.createElement("div");
  menu.className = "cost-of-risk-stage-filter-menu";
  menu.setAttribute("role", "listbox");
  menu.setAttribute("aria-label", "Stage filter");

  (options ?? []).forEach((option) => {
    const button = document.createElement("button");
    const isActive = option.value === value || (!value && option.value === COST_OF_RISK_FILTER_ALL);
    button.className = "cost-of-risk-stage-filter-option";
    button.classList.toggle("is-active", isActive);
    button.type = "button";
    button.dataset.costOfRiskStageFilterOption = option.value;
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", String(isActive));
    button.textContent = option.value === COST_OF_RISK_FILTER_ALL ? "All Stage" : option.label;
    menu.append(button);
  });

  return menu;
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
