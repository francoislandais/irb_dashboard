const lastCostOfRiskCoreDefinitionRenderKeys = new Map();

export function renderCostOfRiskCoreDefinitionTables({
  f2F12Container,
  f2F12Options,
  f2F12SelectedCodes,
  movementContainer,
  movementOptions,
  movementSelectedCodes
}) {
  renderCostOfRiskCoreDefinitionTable({
    container: movementContainer,
    isCompact: false,
    options: movementOptions,
    scope: "movement",
    selectedCodes: movementSelectedCodes
  });
  renderCostOfRiskCoreDefinitionTable({
    container: f2F12Container,
    isCompact: true,
    options: f2F12Options,
    scope: "f2-f12",
    selectedCodes: f2F12SelectedCodes
  });
}

export function getCostOfRiskCoreSectionLabel(code) {
  const numericCode = Number(code);
  if (!Number.isFinite(numericCode)) return "";
  return numericCode >= 110 ? "Direct P&L impact" : "Allowances variation";
}

function renderCostOfRiskCoreDefinitionTable({
  container,
  isCompact = false,
  options,
  scope = "movement",
  selectedCodes
}) {
  if (!container) return;

  const normalizedSelectedCodes = selectedCodes ?? [];
  const renderKey = serializeCostOfRiskCoreDefinitionPart({
    isCompact,
    options: (options ?? []).map((option) => ({ code: option.code, label: option.label })),
    scope,
    selectedCodes: normalizedSelectedCodes
  });
  if (lastCostOfRiskCoreDefinitionRenderKeys.get(scope) === renderKey) return;
  lastCostOfRiskCoreDefinitionRenderKeys.set(scope, renderKey);
  const selectedCodeSet = new Set(normalizedSelectedCodes);
  const table = document.createElement("table");
  table.className = isCompact
    ? "cost-of-risk-core-table cost-of-risk-core-table--compact"
    : "cost-of-risk-core-table";
  table.append(createCostOfRiskCoreColumnGroup(isCompact));

  const tbody = document.createElement("tbody");
  let previousSectionLabel = "";
  (options ?? []).forEach((option) => {
    const sectionLabel = getCostOfRiskCoreSectionLabel(option.code);
    if (sectionLabel && sectionLabel !== previousSectionLabel) {
      tbody.append(createCostOfRiskCoreSectionRow(sectionLabel));
      previousSectionLabel = sectionLabel;
    }

    const row = document.createElement("tr");
    row.classList.toggle("is-disabled", !selectedCodeSet.has(option.code));

    const checkboxCell = document.createElement("td");
    checkboxCell.className = "cost-of-risk-core-check";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = selectedCodeSet.has(option.code);
    checkbox.dataset.costOfRiskCoreCode = option.code;
    checkbox.dataset.costOfRiskCoreScope = scope;
    checkbox.setAttribute("aria-label", `Use ${option.code}`);
    checkboxCell.append(checkbox);

    const codeCell = document.createElement("td");
    codeCell.className = "cost-of-risk-core-code";
    codeCell.textContent = option.code;

    const labelCell = document.createElement("td");
    labelCell.className = "cost-of-risk-core-label";
    labelCell.textContent = option.label;

    row.append(checkboxCell, codeCell, labelCell);
    tbody.append(row);
  });

  table.append(tbody);
  container.replaceChildren(table);
}

function createCostOfRiskCoreColumnGroup(isCompact) {
  const colgroup = document.createElement("colgroup");
  [
    isCompact ? "22px" : "26px",
    isCompact ? "42px" : "48px",
    "auto"
  ].forEach((width) => {
    const col = document.createElement("col");
    col.style.width = width;
    colgroup.append(col);
  });
  return colgroup;
}

function createCostOfRiskCoreSectionRow(sectionLabel) {
  const row = document.createElement("tr");
  row.className = "cost-of-risk-core-section-row";
  const cell = document.createElement("td");
  cell.colSpan = 3;
  cell.textContent = sectionLabel;
  row.append(cell);
  return row;
}

function serializeCostOfRiskCoreDefinitionPart(value) {
  if (Array.isArray(value)) return `[${value.map(serializeCostOfRiskCoreDefinitionPart).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${key}:${serializeCostOfRiskCoreDefinitionPart(value[key])}`).join(",")}}`;
  }
  return String(value);
}
