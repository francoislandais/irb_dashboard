import { formatReferenceQuarterLabel } from "../data/costOfRisk.js?v=20260803-refactor-cleanup";
import { createCostOfRiskAuditIntroHeader } from "./costOfRiskAuditPanelNodes.js?v=20260803-refactor-cleanup";

export function createCostOfRiskReferenceDatePanel({
  activeReferenceDate = "",
  onSelectReferenceDate = () => {},
  referenceColumns = []
} = {}) {
  const intro = createCostOfRiskAuditIntroHeader({
    articleClassName: "cost-of-risk-audit-intro cost-of-risk-reference-date-panel",
    eyebrow: "Reference date",
    lead: referenceColumns.length > 0
      ? "Choose the reporting quarter used by the upper view. This is synchronized with point selection on the temporal chart."
      : "No reference date is available in the loaded dataset.",
    title: "Reference quarter"
  });

  if (referenceColumns.length > 0) {
    const table = document.createElement("table");
    table.className = "cost-of-risk-filter-selection-table cost-of-risk-reference-date-table";
    const tbody = document.createElement("tbody");

    [...referenceColumns].reverse().forEach((column) => {
      const isActive = column.label === activeReferenceDate;
      const row = document.createElement("tr");
      row.className = "cost-of-risk-filter-selection-row";
      row.classList.toggle("is-active", isActive);

      const cell = document.createElement("td");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "cost-of-risk-filter-selection-option cost-of-risk-reference-date-option";
      button.setAttribute("role", "option");
      button.setAttribute("aria-selected", String(isActive));
      button.addEventListener("click", () => onSelectReferenceDate(column.label));

      const label = document.createElement("span");
      label.className = "cost-of-risk-filter-selection-option-label";
      label.textContent = formatReferenceQuarterLabel(column.label);
      button.append(label);
      cell.append(button);
      row.append(cell);
      tbody.append(row);
    });

    table.append(tbody);
    intro.append(table);
  }

  return intro;
}
