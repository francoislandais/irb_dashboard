export function createCostOfRiskSelectedDataDescription(text, highlightedValue = "") {
  const block = createCostOfRiskSelectedDataShell();
  const description = createCostOfRiskSelectedDataDescriptionNode(text, highlightedValue);

  block.append(createCostOfRiskSelectedDataLabel(), description);
  return block;
}

export function createCostOfRiskSelectedDataDescriptionWithDetail(text, detail, highlightedValue = "") {
  const block = createCostOfRiskSelectedDataShell();
  const description = createCostOfRiskSelectedDataDescriptionNode(text, highlightedValue);
  const detailNode = document.createElement("span");
  detailNode.className = "cost-of-risk-selected-data-summary-detail";
  detailNode.textContent = ` ${detail}`;

  description.append(detailNode);
  block.append(createCostOfRiskSelectedDataLabel(), description);
  return block;
}

export function createCostOfRiskSelectedDataPlaceholder() {
  const block = createCostOfRiskSelectedDataShell();
  block.classList.add("cost-of-risk-selected-data-summary--empty");

  const description = document.createElement("span");
  description.className = "cost-of-risk-selected-data-summary-description";
  description.textContent = "Select a data point to display a short description here.";

  block.append(createCostOfRiskSelectedDataLabel(), description);
  return block;
}

export function appendCostOfRiskHighlightedSelectionText(container, text, highlightedValue) {
  if (!highlightedValue || !text.includes(highlightedValue)) {
    container.textContent = text;
    return;
  }

  const [before, after] = text.split(highlightedValue);
  const value = document.createElement("span");
  value.className = "cost-of-risk-selected-data-summary-emphasis";
  value.textContent = highlightedValue;
  container.append(document.createTextNode(before), value, document.createTextNode(after));
}

// Every audit/filter-selection panel opens with the same
// eyebrow + title + lead header on an "article.cost-of-risk-audit-intro"
// element, ready to receive further sections via .append(...).
export function createCostOfRiskAuditIntroHeader({
  articleClassName = "cost-of-risk-audit-intro",
  eyebrow: eyebrowText,
  lead: leadText,
  leadModifierClass = "",
  title: titleText
}) {
  const article = document.createElement("article");
  article.className = articleClassName;

  const eyebrow = document.createElement("div");
  eyebrow.className = "cost-of-risk-audit-intro-eyebrow";
  eyebrow.textContent = eyebrowText;

  const title = document.createElement("h2");
  title.className = "cost-of-risk-audit-intro-title";
  title.textContent = titleText;

  const lead = document.createElement("p");
  lead.className = "cost-of-risk-audit-intro-lead";
  if (leadModifierClass) lead.classList.add(leadModifierClass);
  lead.textContent = leadText;

  article.append(eyebrow, title, lead);
  return article;
}

export function createCostOfRiskAuditInfoSection(titleText, lines) {
  const section = document.createElement("section");
  section.className = "cost-of-risk-audit-intro-section";

  const title = document.createElement("h3");
  title.textContent = titleText;

  const body = document.createElement("p");
  body.textContent = lines.filter(Boolean).join("\n");

  section.append(title, body);
  return section;
}

function createCostOfRiskSelectedDataShell() {
  const block = document.createElement("section");
  block.className = "cost-of-risk-selected-data-summary";
  return block;
}

function createCostOfRiskSelectedDataLabel() {
  const label = document.createElement("span");
  label.className = "cost-of-risk-selected-data-summary-label";
  label.textContent = "Selection";
  return label;
}

function createCostOfRiskSelectedDataDescriptionNode(text, highlightedValue) {
  const description = document.createElement("span");
  description.className = "cost-of-risk-selected-data-summary-description";
  appendCostOfRiskHighlightedSelectionText(description, text, highlightedValue);
  return description;
}
