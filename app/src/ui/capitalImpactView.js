import { buildCapitalImpactModel } from "../data/capitalImpact.js?v=20261020-relative-rwa";
import { getUnitDefinition } from "../data/core/formatting.js";
import { getInstitutionDisplayInfo } from "../data/institutionDictionary.js";
import { createUrlState, readUrlStateParams, replaceUrlState } from "./urlState.js";

const root = document.querySelector("#capital-impact-view");
const referenceSelect = document.querySelector("#capital-impact-reference");
const amountInput = document.querySelector("#capital-impact-amount");
const unitLabel = document.querySelector("#capital-impact-unit");
const results = document.querySelector("#capital-impact-results");
const REFERENCE_PARAM = "capital_reference";
const DELTA_PARAM = "capital_rwa_delta";
const initialParams = readUrlStateParams();
let referenceName = initialParams.get(REFERENCE_PARAM) || "";
let deltaRwaEur = initialParams.has(DELTA_PARAM) ? Number(initialParams.get(DELTA_PARAM)) : 0;
let currentState = null;

const percentFormatter = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 3 });
const bpsFormatter = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2, signDisplay: "exceptZero" });
const amountFormatter = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 3 });
const changePercentFormatter = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2, signDisplay: "exceptZero" });

function element(tag, className = "", value = "") {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.textContent = value;
  return node;
}

function displayReference(reference) {
  const date = reference.date;
  return `Q${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear()}`;
}

function formatAmount(value, divisor) {
  return `${amountFormatter.format(value / divisor)}`;
}

function updateUrl() {
  const url = createUrlState();
  if (referenceName) url.searchParams.set(REFERENCE_PARAM, referenceName);
  else url.searchParams.delete(REFERENCE_PARAM);
  if (Number.isFinite(deltaRwaEur) && deltaRwaEur !== 0) url.searchParams.set(DELTA_PARAM, String(deltaRwaEur));
  else url.searchParams.delete(DELTA_PARAM);
  replaceUrlState(url);
}

export function wireCapitalImpactUi() {
  if (!root || !referenceSelect || !amountInput || !results) return;
  referenceSelect.addEventListener("change", () => {
    referenceName = referenceSelect.value;
    updateUrl();
    if (currentState) renderCapitalImpact(currentState);
  });
  amountInput.addEventListener("input", () => {
    const entered = amountInput.value.trim();
    const amount = entered ? Number(entered) : NaN;
    deltaRwaEur = Number.isFinite(amount) ? amount * getUnitDefinition(currentState?.selectedUnit).divisor : NaN;
    updateUrl();
    if (currentState) renderResults(buildCapitalImpactModel(currentState, referenceName, deltaRwaEur), currentState);
  });
}

function renderRatioCard(ratio, primary) {
  const card = element("article", `capital-impact-card${primary ? " is-primary" : ""}`);
  card.append(element("h2", "capital-impact-card-title", `${ratio.label} ratio`));
  if (!Number.isFinite(ratio.current)) {
    card.append(element("p", "capital-impact-unavailable", "No reported ratio for this date."));
    return card;
  }
  const comparison = element("div", "capital-impact-comparison");
  const before = element("div", "capital-impact-ratio-value");
  before.append(element("span", "capital-impact-value-label", "Reported"));
  before.append(element("strong", "", `${percentFormatter.format(ratio.current * 100)} %`));
  const after = element("div", "capital-impact-ratio-value");
  after.append(element("span", "capital-impact-value-label", "After change"));
  after.append(element("strong", "", Number.isFinite(ratio.projected)
    ? `${percentFormatter.format(ratio.projected * 100)} %` : "—"));
  comparison.append(before, element("span", "capital-impact-arrow", "→"), after);
  card.append(comparison);
  if (Number.isFinite(ratio.impactBps)) {
    const impact = element("div", `capital-impact-bps${ratio.impactBps < 0 ? " is-negative" : ""}`,
      `${bpsFormatter.format(ratio.impactBps)} bp`);
    impact.setAttribute("aria-label", `${ratio.label} impact: ${bpsFormatter.format(ratio.impactBps)} basis points`);
    card.append(impact);
  }
  return card;
}

function renderResults(model, state) {
  results.replaceChildren();
  if (!model.reference) {
    results.append(element("p", "capital-impact-status", model.status));
    return;
  }
  const unit = getUnitDefinition(state.selectedUnit);
  const unitText = state.selectedUnit === "billions" ? "€ billion" : "€ million";
  const institution = getInstitutionDisplayInfo(state.institutionDictionary, state.selectedJst);
  results.append(element("p", "capital-impact-context",
    `${institution?.institutionName || state.selectedJst} · ${displayReference(model.reference)}`));
  const totals = element("div", "capital-impact-totals");
  totals.append(element("span", "", `Current RWA  ${formatAmount(model.currentRwa, unit.divisor)} ${unitText}`));
  if (Number.isFinite(model.deltaPercentOfCurrentRwa)) {
    totals.append(element("span", "capital-impact-relative-change",
      `Change / current RWA  ${changePercentFormatter.format(model.deltaPercentOfCurrentRwa)} %`));
  }
  if (Number.isFinite(model.projectedRwa)) {
    totals.append(element("span", "", `After change  ${formatAmount(model.projectedRwa, unit.divisor)} ${unitText}`));
  }
  results.append(totals);
  if (model.status) results.append(element("p", "capital-impact-status", model.status));
  const cards = element("div", "capital-impact-cards");
  model.ratios.forEach((ratio, index) => cards.append(renderRatioCard(ratio, index === 0)));
  results.append(cards);
  results.append(element("p", "capital-impact-method",
    "Impact = [reported ratio × current RWA ÷ (current RWA + change) − reported ratio] × 10,000. Source: C_03.00 ratios and C_02.00 total RWA; capital is unchanged."));
}

export function renderCapitalImpact(state) {
  if (!root || !referenceSelect || !amountInput || !results) return;
  currentState = state;
  const model = buildCapitalImpactModel(state, referenceName, deltaRwaEur);
  referenceName = model.reference?.name || "";
  referenceSelect.replaceChildren();
  model.references.forEach((reference) => {
    referenceSelect.append(new Option(displayReference(reference), reference.name, false, reference.name === referenceName));
  });
  referenceSelect.disabled = !model.references.length;
  const unit = getUnitDefinition(state.selectedUnit);
  amountInput.value = Number.isFinite(deltaRwaEur) ? String(deltaRwaEur / unit.divisor) : "";
  unitLabel.textContent = state.selectedUnit === "billions" ? "€ billion" : "€ million";
  renderResults(model, state);
}
