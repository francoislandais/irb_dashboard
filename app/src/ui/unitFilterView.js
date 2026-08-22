export const UNIT_FILTER_OPTIONS = [
  { value: "millions", shortLabel: "€ million", label: "€ million" },
  { value: "billions", shortLabel: "€ billion", label: "€ billion" },
  { value: "thousands", shortLabel: "€ thousand", label: "€ thousand" },
  { value: "euros", shortLabel: "€", label: "€" }
];

export function getUnitFilterLabel(selectedUnit) {
  return UNIT_FILTER_OPTIONS.find((option) => option.value === selectedUnit)?.shortLabel ?? "€ million";
}

export function createUnitFilterChip({ selectedUnit, isOpen = false, onOpen, dataset = {} }) {
  const chip = document.createElement("div");
  chip.className = "cost-of-risk-filter-chip cost-of-risk-filter-chip--unit";
  chip.classList.toggle("is-open", isOpen);

  const toggle = document.createElement("button");
  toggle.className = "cost-of-risk-filter-chip-toggle";
  toggle.type = "button";
  Object.entries(dataset).forEach(([key, value]) => {
    toggle.dataset[key] = value;
  });
  toggle.setAttribute("aria-expanded", String(isOpen));
  toggle.setAttribute("aria-label", "Change display unit");

  const label = document.createElement("span");
  label.className = "cost-of-risk-filter-chip-label cost-of-risk-filter-chip-value";
  label.textContent = getUnitFilterLabel(selectedUnit);
  toggle.append(label);
  if (onOpen) toggle.addEventListener("click", onOpen);
  chip.append(toggle);
  return chip;
}

export function createUnitSelectionPanel({ selectedUnit, onSelect }) {
  const article = document.createElement("article");
  article.className = "cost-of-risk-audit-intro cost-of-risk-reference-date-panel unit-selection-panel";
  article.innerHTML = '<span class="cost-of-risk-audit-intro-eyebrow">Breakdown of selection by:</span><h2 class="cost-of-risk-audit-intro-title">Display unit</h2>';

  const table = document.createElement("table");
  table.className = "cost-of-risk-filter-selection-table";
  const body = document.createElement("tbody");
  UNIT_FILTER_OPTIONS.forEach((option) => {
    const row = document.createElement("tr");
    row.className = `cost-of-risk-filter-selection-row${option.value === selectedUnit ? " is-active" : ""}`;
    const cell = document.createElement("td");
    const button = document.createElement("button");
    button.className = "cost-of-risk-filter-selection-option";
    button.type = "button";
    const label = document.createElement("span");
    label.className = "cost-of-risk-filter-selection-option-label";
    label.textContent = option.label;
    button.append(label);
    button.addEventListener("click", () => onSelect(option.value));
    cell.append(button);
    row.append(cell);
    body.append(row);
  });
  table.append(body);
  article.append(table);
  return article;
}
