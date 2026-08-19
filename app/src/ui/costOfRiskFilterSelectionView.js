import {
  COST_OF_RISK_BALANCE_SCOPE_IN_BALANCE,
  COST_OF_RISK_DEFINITION_OPTIONS,
  COST_OF_RISK_FILTER_ALL
} from "../data/costOfRisk.js?v=20260812-costofrisk-domain-split";
import {
  COST_OF_RISK_FILTER_SELECTION_META,
  COST_OF_RISK_FINE_COUNTERPARTY_UNSUPPORTED_TABS
} from "./costOfRiskFilterSelectionConfig.js?v=20260806-cell-selection";
import {
  formatCostOfRiskCounterpartySelectionLabel,
  getCostOfRiskFilterParentValue as getFilterParentValue,
  isCostOfRiskIfrsStageFilterValue,
  isCostOfRiskPerformanceStatusFilterValue
} from "./costOfRiskFilterRules.js?v=20260812-costofrisk-domain-split";
import { createCostOfRiskAuditIntroHeader } from "./costOfRiskAuditPanelNodes.js?v=20260806-cell-selection";

export function renderCostOfRiskFilterSelectionPanel({
  activeDefinitionId,
  activeFilters,
  activeTab,
  filterOptions,
  kind,
  onSelectDefinition,
  onSelectFilter,
  previewRenderer,
  renderPlaceholder,
  replaceContent
}) {
  if (kind === "definition") {
    renderDefinitionSelectionPanel({ activeDefinitionId, onSelectDefinition, previewRenderer, replaceContent });
    return;
  }

  if (kind === "stage") {
    renderStageSelectionPanel({ activeFilters, filterOptions, onSelectFilter, previewRenderer, replaceContent });
    return;
  }

  if (kind === "balanceScope") {
    renderBalanceScopeSelectionPanel({ activeFilters, filterOptions, onSelectFilter, previewRenderer, replaceContent });
    return;
  }

  const meta = COST_OF_RISK_FILTER_SELECTION_META[kind];
  if (!meta) {
    renderPlaceholder();
    return;
  }

  const previewToken = previewRenderer.resetQueue();
  const options = filterOptions?.[meta.optionsKey] ?? [];
  const activeValue = activeFilters[meta.filterKey];

  const intro = createCostOfRiskAuditIntroHeader({
    articleClassName: "cost-of-risk-audit-intro cost-of-risk-filter-selection-panel",
    eyebrow: "Breakdown of selection by :",
    title: getFilterSelectionPanelTitle(kind)
  });

  const table = document.createElement("table");
  table.className = "cost-of-risk-filter-selection-table";
  const tbody = document.createElement("tbody");

  const isAllActive = !activeValue || activeValue === COST_OF_RISK_FILTER_ALL;
  tbody.append(createFilterSelectionRow(meta.allLabel, isAllActive, () => {
    onSelectFilter(meta.filterKey, COST_OF_RISK_FILTER_ALL);
  }, {
    selectionValue: COST_OF_RISK_FILTER_ALL,
    preview: { kind, token: previewToken, value: COST_OF_RISK_FILTER_ALL }
  }, previewRenderer));
  options.filter((option) => option.value !== COST_OF_RISK_FILTER_ALL).forEach((option) => {
    const optionState = getFilterSelectionOptionState(kind, option, activeTab);
    if (optionState.hidden) return;
    tbody.append(createFilterSelectionRow(optionState.label, option.value === activeValue, () => {
      onSelectFilter(meta.filterKey, option.value);
    }, {
      ...optionState,
      selectionValue: option.value,
      preview: { kind, token: previewToken, value: option.value }
    }, previewRenderer));
  });

  table.append(tbody);
  intro.append(table);

  replaceContent(intro);
  previewRenderer.clearSnapshot();
}

function renderBalanceScopeSelectionPanel({ activeFilters, filterOptions, onSelectFilter, previewRenderer, replaceContent }) {
  const previewToken = previewRenderer.resetQueue();
  const meta = COST_OF_RISK_FILTER_SELECTION_META.balanceScope;
  const options = filterOptions?.[meta.optionsKey] ?? [];
  const activeValue = activeFilters.balanceScope || COST_OF_RISK_BALANCE_SCOPE_IN_BALANCE;

  const intro = createCostOfRiskAuditIntroHeader({
    articleClassName: "cost-of-risk-audit-intro cost-of-risk-filter-selection-panel",
    eyebrow: "Breakdown of selection by :",
    title: "Balance sheet status"
  });

  const table = document.createElement("table");
  table.className = "cost-of-risk-filter-selection-table";
  const tbody = document.createElement("tbody");
  options.forEach((option) => {
    tbody.append(createFilterSelectionRow(option.label, option.value === activeValue, () => {
      onSelectFilter("balanceScope", option.value);
    }, {
      selectionValue: option.value,
      preview: { kind: "balanceScope", token: previewToken, value: option.value }
    }, previewRenderer));
  });
  table.append(tbody);
  intro.append(table);

  replaceContent(intro);
  previewRenderer.clearSnapshot();
}

function renderStageSelectionPanel({ activeFilters, filterOptions, onSelectFilter, previewRenderer, replaceContent }) {
  const previewToken = previewRenderer.resetQueue();
  const meta = COST_OF_RISK_FILTER_SELECTION_META.stage;
  const options = filterOptions?.[meta.optionsKey] ?? [];
  const activeValue = activeFilters[meta.filterKey];

  const intro = createCostOfRiskAuditIntroHeader({
    articleClassName: "cost-of-risk-audit-intro cost-of-risk-filter-selection-panel",
    eyebrow: "Breakdown of selection by :",
    title: "Accounting status"
  });

  const allTable = document.createElement("table");
  allTable.className = "cost-of-risk-filter-selection-table";
  const allBody = document.createElement("tbody");
  const isAllActive = !activeValue || activeValue === COST_OF_RISK_FILTER_ALL;
  allBody.append(createFilterSelectionRow(meta.allLabel, isAllActive, () => {
    onSelectFilter(meta.filterKey, COST_OF_RISK_FILTER_ALL);
  }, {
    selectionValue: COST_OF_RISK_FILTER_ALL,
    preview: { kind: "stage", token: previewToken, value: COST_OF_RISK_FILTER_ALL }
  }, previewRenderer));
  allTable.append(allBody);
  intro.append(allTable);

  intro.append(createStageSelectionGroup("Staging status", options.filter((option) => isCostOfRiskIfrsStageFilterValue(option.value)), activeValue, previewToken, { onSelectFilter, previewRenderer }));
  intro.append(createStageSelectionGroup("Performance status", options.filter((option) => isCostOfRiskPerformanceStatusFilterValue(option.value)), activeValue, previewToken, { onSelectFilter, previewRenderer }));

  replaceContent(intro);
  previewRenderer.clearSnapshot();
}

function createStageSelectionGroup(titleText, options, activeValue, previewToken, { onSelectFilter, previewRenderer }) {
  const group = document.createElement("section");
  group.className = "cost-of-risk-filter-selection-group";

  const title = document.createElement("h3");
  title.className = "cost-of-risk-filter-selection-group-title";
  title.textContent = titleText;
  group.append(title);

  const table = document.createElement("table");
  table.className = "cost-of-risk-filter-selection-table";
  const tbody = document.createElement("tbody");
  options.forEach((option) => {
    tbody.append(createFilterSelectionRow(option.label, option.value === activeValue, () => {
      onSelectFilter("stage", option.value);
    }, {
      selectionValue: option.value,
      preview: { kind: "stage", token: previewToken, value: option.value }
    }, previewRenderer));
  });
  table.append(tbody);
  group.append(table);
  return group;
}

function getFilterSelectionOptionState(kind, option, activeTab) {
  if (kind !== "counterparty") {
    return { disabled: false, indent: false, label: option.label };
  }

  const parent = getFilterParentValue("counterparty", option.value);
  const isFineCounterparty = parent !== COST_OF_RISK_FILTER_ALL;
  return {
    hidden: isFineCounterparty && COST_OF_RISK_FINE_COUNTERPARTY_UNSUPPORTED_TABS.has(activeTab),
    indent: isFineCounterparty,
    label: formatCostOfRiskCounterpartySelectionLabel(option.label)
  };
}

export function createFilterSelectionRow(label, isActive, onSelect, options = {}, previewRenderer) {
  const row = document.createElement("tr");
  row.className = "cost-of-risk-filter-selection-row";
  if (options.selectionValue !== undefined) {
    row.dataset.costOfRiskSelectionValue = String(options.selectionValue);
  }
  row.classList.toggle("is-active", isActive);
  row.classList.toggle("is-disabled", Boolean(options.disabled));
  row.classList.toggle("is-indented", Boolean(options.indent));

  const cell = document.createElement("td");
  if (options.disabledReason) {
    row.title = options.disabledReason;
    cell.title = options.disabledReason;
  }
  const button = document.createElement("button");
  button.type = "button";
  button.className = "cost-of-risk-filter-selection-option";
  button.setAttribute("role", "option");
  button.setAttribute("aria-selected", String(isActive));
  if (options.disabled) {
    button.setAttribute("aria-disabled", "true");
    button.tabIndex = -1;
    if (options.disabledReason) button.title = options.disabledReason;
  }
  let barNode = null;
  if (options.preview) {
    barNode = document.createElement("span");
    barNode.className = "cost-of-risk-filter-selection-option-bar";
    barNode.setAttribute("aria-hidden", "true");
    button.append(barNode);
  }
  const labelNode = document.createElement("span");
  labelNode.className = "cost-of-risk-filter-selection-option-label";
  labelNode.textContent = label;
  button.append(labelNode);
  if (options.valueLabel || options.preview) {
    const valueNode = document.createElement("span");
    valueNode.className = "cost-of-risk-filter-selection-option-value";
    if (options.preview) previewRenderer.markValueNode(valueNode, options.preview);
    const snapshotValue = previewRenderer.consumeSnapshotValue(options.preview);
    const initialValue = snapshotValue ?? options.valueLabel ?? "";
    valueNode.textContent = initialValue;
    button.append(valueNode);
    if (barNode) previewRenderer.recordMagnitude(options.preview?.token, barNode, initialValue);
    if (options.preview) {
      previewRenderer.scheduleValue(valueNode, options.preview, barNode, {
        preserveValue: snapshotValue !== null
      });
    }
  }
  if (!options.disabled) button.addEventListener("click", () => {
    if (options.selectionValue !== undefined) {
      updateSelectionRows(row.closest(".cost-of-risk-filter-selection-panel"), options.selectionValue);
    }
    onSelect();
  });
  cell.append(button);
  row.append(cell);
  return row;
}

function renderDefinitionSelectionPanel({ activeDefinitionId, onSelectDefinition, previewRenderer, replaceContent }) {
  const previewToken = previewRenderer.resetQueue();
  const intro = createCostOfRiskAuditIntroHeader({
    articleClassName: "cost-of-risk-audit-intro cost-of-risk-filter-selection-panel",
    eyebrow: "Filter",
    lead: "Choose the calculation method used for the cost of risk ratio. The change applies immediately.",
    title: "Cost of risk definition"
  });

  const table = document.createElement("table");
  table.className = "cost-of-risk-filter-selection-table cost-of-risk-filter-selection-table--definition";
  const tbody = document.createElement("tbody");

  COST_OF_RISK_DEFINITION_OPTIONS.forEach((definition) => {
    const isActive = definition.id === activeDefinitionId;
    const row = document.createElement("tr");
    row.className = "cost-of-risk-filter-selection-row";
    row.dataset.costOfRiskSelectionValue = definition.id;
    row.classList.toggle("is-active", isActive);

    const cell = document.createElement("td");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "cost-of-risk-filter-selection-option cost-of-risk-filter-selection-option--definition";
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", String(isActive));
    button.title = definition.description;

    const barNode = document.createElement("span");
    barNode.className = "cost-of-risk-filter-selection-option-bar";
    barNode.setAttribute("aria-hidden", "true");
    button.append(barNode);
    const optionTitle = document.createElement("span");
    optionTitle.className = "cost-of-risk-filter-selection-option-title";
    optionTitle.textContent = definition.label;
    const optionValue = document.createElement("span");
    optionValue.className = "cost-of-risk-filter-selection-option-value";
    const preview = {
      kind: "definition",
      token: previewToken,
      value: definition.id
    };
    optionValue.textContent = "";
    previewRenderer.scheduleValue(optionValue, preview, barNode);
    const optionDescription = document.createElement("span");
    optionDescription.className = "cost-of-risk-filter-selection-option-description";
    optionDescription.textContent = definition.description;
    const optionSource = document.createElement("span");
    optionSource.className = "cost-of-risk-filter-selection-option-source";
    optionSource.textContent = definition.source;
    button.append(optionTitle);
    button.append(optionValue);
    button.append(optionDescription, optionSource);

    button.addEventListener("click", () => {
      updateSelectionRows(intro, definition.id);
      onSelectDefinition(definition.id);
    });

    cell.append(button);
    row.append(cell);
    tbody.append(row);
  });

  table.append(tbody);
  intro.append(table);

  replaceContent(intro);
  previewRenderer.clearSnapshot();
}

function updateSelectionRows(panel, selectedValue) {
  panel?.querySelectorAll?.("[data-cost-of-risk-selection-value]").forEach((row) => {
    const isActive = row.dataset.costOfRiskSelectionValue === String(selectedValue);
    row.classList.toggle("is-active", isActive);
    row.querySelector("[role='option']")?.setAttribute("aria-selected", String(isActive));
  });
}

function getFilterSelectionPanelTitle(kind) {
  if (kind === "instrument") return "Type of instrument";
  if (kind === "counterparty") return "Type of counterparty";
  return COST_OF_RISK_FILTER_SELECTION_META[kind]?.label ?? "";
}
