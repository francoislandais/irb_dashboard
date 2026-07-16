import {
  formatCostOfRiskAuditValue,
  formatReferenceQuarterLabel
} from "../data/costOfRisk.js?v=20260716-cost-risk-audit-intro-panel-view";

export function renderCostOfRiskAuditTableView({
  activeDateLabel,
  activeSeries,
  audit,
  container,
  displayMode = "amount",
  selectedUnit
}) {
  if (!container) return;

  const rows = (audit?.rows ?? []).filter((row) => {
    if (activeSeries === "movement") return true;
    if (activeSeries === "stage-transfer") return true;
    if (activeSeries === "f2") return row.section === "F2" || row.section === "Denominator" || row.section === "Denominator components";
    return row.section === "F12" || row.section === "F12 components" || row.section === "Denominator" || row.section === "Denominator components";
  });
  const dates = audit?.dates ?? [];

  if (rows.length === 0 || dates.length === 0) {
    container.textContent = "";
    return;
  }

  const matchingDateIndex = dates.findIndex((date) => date.label === activeDateLabel);
  const activeDateIndex = matchingDateIndex >= 0 ? matchingDateIndex : Math.max(0, dates.length - 1);
  const activeDate = dates[activeDateIndex] ?? dates.at(-1);

  if (activeSeries === "movement" || activeSeries === "stage-transfer") {
    renderCostOfRiskBlockAuditView({
      activeDate,
      activeDateIndex,
      audit,
      container,
      displayMode,
      rows,
      selectedUnit
    });
    return;
  }

  const title = document.createElement("div");
  title.className = "cost-of-risk-audit-title";
  const titlePrefix = activeSeries === "f2"
      ? "Audit trail - F2"
      : "Audit trail - F12 selected contributions";
  title.textContent = `${titlePrefix} - ${formatReferenceQuarterLabel(activeDate?.label)}`;

  const tableWrap = document.createElement("div");
  tableWrap.className = "cost-of-risk-audit-table-wrap";
  const table = document.createElement("table");
  table.className = "cost-of-risk-audit-table";
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  ["Step", "Component", "Source", "Selected date", "Value"].forEach((label) => {
    const cell = document.createElement("th");
    cell.scope = "col";
    cell.textContent = label;
    headerRow.append(cell);
  });
  thead.append(headerRow);

  const tbody = document.createElement("tbody");
  rows.forEach((row) => {
    const tr = document.createElement("tr");
    const sectionCell = document.createElement("td");
    sectionCell.className = "cost-of-risk-audit-section";
    sectionCell.textContent = row.section;
    const labelCell = document.createElement("td");
    labelCell.className = "cost-of-risk-audit-label";
    labelCell.textContent = row.label;
    const sourceCell = document.createElement("td");
    sourceCell.className = "cost-of-risk-audit-source";
    sourceCell.textContent = row.source;
    const dateCell = document.createElement("td");
    dateCell.className = "cost-of-risk-audit-date";
    dateCell.textContent = formatReferenceQuarterLabel(activeDate?.label);
    const valueCell = document.createElement("td");
    valueCell.className = "cost-of-risk-audit-value is-active-reference";
    valueCell.textContent = formatCostOfRiskAuditValue(row.values?.[activeDateIndex], row.type, selectedUnit);
    tr.append(sectionCell, labelCell, sourceCell, dateCell, valueCell);
    tbody.append(tr);
  });

  table.append(thead, tbody);
  tableWrap.append(table);
  container.replaceChildren(title, tableWrap);
}

function renderCostOfRiskBlockAuditView({
  activeDate,
  activeDateIndex,
  audit,
  container,
  displayMode,
  rows,
  selectedUnit
}) {
  const isRelative = displayMode === "ratio";
  const selectedRow = (isRelative
    ? rows.find((row) => row.section === "Calculation")
    : rows.find((row) => row.section === "Selected scope" && /^Displayed/i.test(row.label)))
    ?? rows[0];
  const heroValueDefinition = isRelative ? audit?.hero?.ratio : audit?.hero?.amount;
  const selectedValue = formatCostOfRiskAuditValue(
    heroValueDefinition ? heroValueDefinition.value : selectedRow?.values?.[activeDateIndex],
    heroValueDefinition ? heroValueDefinition.type : selectedRow?.type,
    selectedUnit
  );
  const activeDateText = formatReferenceQuarterLabel(activeDate?.label);

  const view = document.createElement("div");
  view.className = "cost-of-risk-audit-blocks";

  const title = document.createElement("div");
  title.className = "cost-of-risk-audit-title";
  title.textContent = "Audit trail";

  const hero = document.createElement("div");
  hero.className = "cost-of-risk-audit-hero";
  const heroLabel = document.createElement("div");
  heroLabel.className = "cost-of-risk-audit-hero-label";
  heroLabel.textContent = "Selected value";
  const heroValue = document.createElement("div");
  heroValue.className = "cost-of-risk-audit-hero-value";
  heroValue.textContent = selectedValue;
  const heroMeta = document.createElement("div");
  heroMeta.className = "cost-of-risk-audit-hero-meta";
  heroMeta.textContent = [
    audit?.title || "Movement in allowance",
    activeDateText,
    isRelative ? "Relative value" : "Absolute value"
  ].filter(Boolean).join(" · ");
  hero.append(heroLabel, heroValue, heroMeta);

  view.append(title, hero);

  const sectionOrder = isRelative
    ? ["Selected scope", "Denominator", "Calculation"]
    : ["Selected scope"];
  sectionOrder.forEach((section) => {
    const sectionRows = rows.filter((row) => (
      row.section === section
      && !(section === "Selected scope" && /^Displayed/i.test(row.label))
    ));
    if (sectionRows.length === 0) return;
    view.append(renderCostOfRiskMovementAuditSection({
      activeDateIndex,
      rows: sectionRows,
      selectedUnit,
      title: audit?.sectionTitles?.[section] ?? section
    }));
  });

  container.replaceChildren(view);
}

function renderCostOfRiskMovementAuditSection({
  activeDateIndex,
  rows,
  selectedUnit,
  title
}) {
  const section = document.createElement("section");
  section.className = "cost-of-risk-audit-block";

  const heading = document.createElement("h3");
  heading.className = "cost-of-risk-audit-block-heading";
  heading.textContent = title;
  section.append(heading);

  rows.forEach((row) => {
    const item = document.createElement("div");
    item.className = "cost-of-risk-audit-item";
    if (/gap/i.test(row.label)) item.classList.add("is-gap");

    const label = document.createElement("div");
    label.className = "cost-of-risk-audit-item-label";
    label.textContent = row.label;

    const source = document.createElement("div");
    source.className = "cost-of-risk-audit-item-source";
    source.textContent = getCostOfRiskAuditRowSourceText(row, activeDateIndex, selectedUnit);

    const value = document.createElement("div");
    value.className = "cost-of-risk-audit-item-value";
    value.textContent = formatCostOfRiskAuditValue(
      row.values?.[activeDateIndex],
      row.type,
      selectedUnit
    );

    item.append(label, source, value);
    section.append(item);
  });

  return section;
}

function getCostOfRiskAuditRowSourceText(row, activeDateIndex, selectedUnit) {
  if (row.section !== "Calculation" || !Array.isArray(row.numeratorValues) || !Array.isArray(row.denominatorValues)) {
    return row.source;
  }

  const numerator = formatCostOfRiskAuditValue(row.numeratorValues[activeDateIndex], "amount", selectedUnit);
  const denominator = formatCostOfRiskAuditValue(row.denominatorValues[activeDateIndex], "amount", selectedUnit);
  return `${numerator} / ${denominator}`;
}

export function clearCostOfRiskAuditTableView(container) {
  if (!container) return;
  container.textContent = "";
}
