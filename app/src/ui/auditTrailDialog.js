// Generic "Where does it come from?" audit trail modal. Any module can call
// showAuditTrailDialog(...) to reconstruct, from raw data points, how a
// displayed value (numerator and/or denominator) was computed — establishing
// an audit trail across the app. First used by the Cost of Risk Stage
// Transfers flow diagram, but the data shape here is intentionally generic
// so any other chart/table can reuse it.
//
// Expected shape:
// {
//   title: string,            e.g. "Stage 1 -> Stage 2"
//   subtitle: string,         e.g. "JST_A - Q1 2026"
//   valueLabel: string,       e.g. "10.5 bp" - the value the user clicked on
//   definition: string,       plain-language explanation of what it represents
//   sections: [{
//     title: string,          e.g. "F_12.02 - x_axis 0010"
//     description: string?,   optional formula/explanation for this section
//     columns: [{ key, header, align? }],
//     rows: [{ [key]: displayString }],
//     totalRow: { [key]: displayString }?
//   }],
//   formula: string?          e.g. "165 - 42 + 8 = 131"
// }
let activeDialog = null;

export function showAuditTrailDialog(auditTrail) {
  hideAuditTrailDialog();
  if (!auditTrail) return;

  activeDialog = createAuditTrailDialog(auditTrail);
  document.body.append(activeDialog);
}

export function hideAuditTrailDialog() {
  activeDialog?.remove();
  activeDialog = null;
}

function createAuditTrailDialog(auditTrail) {
  const overlay = document.createElement("div");
  overlay.className = "audit-trail-overlay";
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) hideAuditTrailDialog();
  });

  const dialog = document.createElement("section");
  dialog.className = "audit-trail-dialog";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-label", "Where does it come from?");

  const header = document.createElement("header");
  header.className = "audit-trail-header";

  const headerText = document.createElement("div");
  const eyebrow = document.createElement("span");
  eyebrow.className = "audit-trail-eyebrow";
  eyebrow.textContent = "Where does it come from?";
  const title = document.createElement("strong");
  title.textContent = auditTrail.title || "";
  const subtitle = document.createElement("span");
  subtitle.className = "audit-trail-subtitle";
  subtitle.textContent = auditTrail.subtitle || "";
  headerText.append(eyebrow, title, subtitle);

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.setAttribute("aria-label", "Close");
  closeButton.textContent = "×";
  closeButton.addEventListener("click", hideAuditTrailDialog);

  header.append(headerText, closeButton);

  const body = document.createElement("div");
  body.className = "audit-trail-body";

  if (auditTrail.valueLabel || auditTrail.definition) {
    const summary = document.createElement("div");
    summary.className = "audit-trail-summary";
    if (auditTrail.valueLabel) {
      const value = document.createElement("div");
      value.className = "audit-trail-summary-value";
      value.textContent = auditTrail.valueLabel;
      summary.append(value);
    }
    if (auditTrail.definition) {
      const definition = document.createElement("div");
      definition.className = "audit-trail-summary-definition";
      definition.textContent = auditTrail.definition;
      summary.append(definition);
    }
    body.append(summary);
  }

  (auditTrail.sections ?? []).forEach((section) => {
    body.append(createAuditTrailSection(section));
  });

  if (auditTrail.formula) {
    const formula = document.createElement("div");
    formula.className = "audit-trail-formula";
    formula.textContent = auditTrail.formula;
    body.append(formula);
  }

  dialog.append(header, body);
  overlay.append(dialog);
  return overlay;
}

function createAuditTrailSection(section) {
  const wrap = document.createElement("div");
  wrap.className = "audit-trail-section";

  const title = document.createElement("div");
  title.className = "audit-trail-section-title";
  title.textContent = section.title || "";
  wrap.append(title);

  if (section.description) {
    const description = document.createElement("div");
    description.className = "audit-trail-section-description";
    description.textContent = section.description;
    wrap.append(description);
  }

  const columns = section.columns ?? [];
  const tableWrap = document.createElement("div");
  tableWrap.className = "audit-trail-table-wrap";
  const table = document.createElement("table");
  table.className = "audit-trail-table";

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  columns.forEach((column) => {
    const cell = document.createElement("th");
    cell.scope = "col";
    cell.textContent = column.header;
    if (column.align === "right") cell.classList.add("is-numeric");
    headerRow.append(cell);
  });
  thead.append(headerRow);

  const tbody = document.createElement("tbody");
  (section.rows ?? []).forEach((row) => {
    tbody.append(createAuditTrailRow(row, columns));
  });
  if (section.totalRow) {
    const totalRow = createAuditTrailRow(section.totalRow, columns);
    totalRow.classList.add("is-total");
    tbody.append(totalRow);
  }

  table.append(thead, tbody);
  tableWrap.append(table);
  wrap.append(tableWrap);
  return wrap;
}

function createAuditTrailRow(row, columns) {
  const tr = document.createElement("tr");
  columns.forEach((column) => {
    const cell = document.createElement("td");
    cell.textContent = row[column.key] ?? "-";
    if (column.align === "right") cell.classList.add("is-numeric");
    tr.append(cell);
  });
  return tr;
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") hideAuditTrailDialog();
});
