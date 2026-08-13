import { getIrbOutputFloorModel, IRB_OUTPUT_FLOOR_DEFAULT_SCOPE } from "../data/irb.js?v=20260813-output-floor-scopes";
import { formatBasisPointsValue, formatMetricValue, formatSignedMetricValue } from "../data/core/formatting.js?v=20260710-bp-format";

const IRB_DEFAULT_TAB = "output-floor";
const IRB_DEFAULT_OUTPUT_FLOOR_HORIZON = "fully-loaded";

const elements = {
  outputFloorView: document.querySelector("#irb-output-floor-view"),
  tabs: [...document.querySelectorAll("[data-irb-tab]")],
  panels: [...document.querySelectorAll("[data-irb-panel]")]
};

let activeIrbTab = IRB_DEFAULT_TAB;
let activeOutputFloorHorizon = IRB_DEFAULT_OUTPUT_FLOOR_HORIZON;
let activeOutputFloorScope = IRB_OUTPUT_FLOOR_DEFAULT_SCOPE;
let activeOutputFloorReference = "";
let renderAppState = null;
let actionsRef = null;

export function wireIrbUi(actions, rerender) {
  actionsRef = actions;
  renderAppState = rerender;
  elements.tabs.forEach((button) => {
    button.addEventListener("click", () => {
      activeIrbTab = button.dataset.irbTab || IRB_DEFAULT_TAB;
      renderIrbTabs();
      rerender(actions.getState());
    });
  });
  renderIrbTabs();
}

export function renderIrb(state) {
  renderIrbTabs();
  if (activeIrbTab === "output-floor") renderOutputFloor(state);
}

function renderIrbTabs() {
  elements.tabs.forEach((button) => {
    const isActive = button.dataset.irbTab === activeIrbTab;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });

  elements.panels.forEach((panel) => {
    const isActive = panel.dataset.irbPanel === activeIrbTab;
    panel.classList.toggle("is-active", isActive);
    panel.hidden = !isActive;
  });
}

function renderOutputFloor(state) {
  const container = elements.outputFloorView;
  if (!container) return;

  const model = getIrbOutputFloorModel(
    state,
    activeOutputFloorHorizon,
    activeOutputFloorScope,
    activeOutputFloorReference
  );
  container.replaceChildren();

  if (model.status) {
    container.append(createIrbNotice(model.status));
    return;
  }

  activeOutputFloorScope = model.selectedScope.id;
  activeOutputFloorReference = model.referenceDate.name;

  container.append(
    createOutputFloorReferenceSelector(model, state),
    createOutputFloorSummary(model, state),
    createFullyLoadedAdjustmentEstimate(model, state),
    createScopeSelector(model, state)
  );
}

function createOutputFloorReferenceSelector(model, state) {
  const toolbar = document.createElement("div");
  toolbar.className = "irb-output-floor-toolbar";

  const label = document.createElement("label");
  label.className = "field compact-field irb-output-floor-reference-field";
  const caption = document.createElement("span");
  caption.textContent = "Reference date";
  const select = document.createElement("select");
  select.setAttribute("aria-label", "IRB reference date");

  model.referenceDates.forEach((reference) => {
    select.append(new Option(reference.label, reference.name, false, reference.name === model.referenceDate.name));
  });
  select.addEventListener("change", (event) => {
    activeOutputFloorReference = event.target.value;
    renderAppState?.(actionsRef?.getState?.() ?? state);
  });

  label.append(caption, select);
  toolbar.append(label);
  return toolbar;
}

function createOutputFloorSummary(model, state) {
  const section = document.createElement("section");
  section.className = "irb-output-floor-summary";

  const scope = model.selectedScope;
  const currentCard = createMetricCard({
    label: "Current RWA",
    value: formatOptionalMetric(scope.currentTrea, state.selectedUnit),
    detail: `${scope.label} - ${model.selectedSnapshot?.referenceLabel ?? "-"}`
  });
  const thresholdCard = createMetricCard({
    label: "Output floor threshold",
    value: formatOptionalMetric(scope.threshold, state.selectedUnit),
    detail: `${formatPercentFromFactor(model.selectedHorizon.factor)} × standardised RWA for this perimeter`
  });
  const gapCard = createMetricCard({
    label: "Gap to output floor",
    value: formatOptionalSignedMetric(scope.gap, state.selectedUnit),
    detail: scope.isBinding
      ? "Binding on this perimeter: positive gap"
      : "Not binding: negative gap shows the distance to the threshold",
    tone: scope.isBinding ? "negative" : "neutral"
  });
  const impactCard = createMetricCard({
    label: "CET1 impact",
    value: formatSignedBasisPoints(scope.impactBasisPoints),
    detail: scope.isBinding
      ? `Impact from the ${scope.label} add-on`
      : "No impact while this perimeter remains above its threshold",
    tone: scope.isBinding ? "negative" : "neutral"
  });

  const horizonPanel = document.createElement("div");
  horizonPanel.className = "irb-output-floor-horizons";
  model.selectedDateHorizonImpacts.forEach((snapshot) => {
    const horizonScope = snapshot.scopes?.find((candidate) => candidate.id === scope.id);
    const button = document.createElement("button");
    button.className = "irb-output-floor-horizon";
    button.classList.toggle("is-active", snapshot.factor === model.selectedHorizon.factor);
    button.type = "button";
    button.innerHTML = `
      <span>${snapshot.factor === 0.725 ? "FL" : Math.round(snapshot.factor * 100) + "%"}</span>
      <strong>${formatSignedBasisPoints(horizonScope?.distanceBasisPoints)}</strong>
    `;
    button.addEventListener("click", () => {
      activeOutputFloorHorizon = model.horizons.find((horizon) => horizon.factor === snapshot.factor)?.id || IRB_DEFAULT_OUTPUT_FLOOR_HORIZON;
      renderAppState?.(actionsRef?.getState?.() ?? state);
    });
    horizonPanel.append(button);
  });

  const mechanics = document.createElement("div");
  mechanics.className = "irb-output-floor-mechanics";
  mechanics.append(
    createMechanicRow("Standardised RWA", scope.standardisedTrea, state.selectedUnit),
    createMechanicRow("Perimeter add-on", scope.floorAddOn, state.selectedUnit, true),
    createMechanicRow("Total RWA after this add-on", scope.flooredTotalTrea, state.selectedUnit),
    createMechanicRow("Current CET1 ratio", scope.currentCet1Ratio, "percent"),
    createMechanicRow("CET1 ratio after this add-on", scope.flooredCet1Ratio, "percent")
  );

  section.append(currentCard, thresholdCard, gapCard, impactCard, horizonPanel, mechanics);
  return section;
}

function createFullyLoadedAdjustmentEstimate(model, state) {
  const section = document.createElement("section");
  section.className = "irb-output-floor-adjustment";

  const header = document.createElement("div");
  header.className = "irb-output-floor-section-title";
  header.textContent = "Fully loaded floor adjustment estimate - global perimeter";
  section.append(header);

  const estimate = model.selectedSnapshot.adjustedEstimate;
  if (!estimate?.available) {
    section.append(createIrbNotice("C04.00, row 0890 is not available for this JST/reference date."));
    return section;
  }

  const metrics = document.createElement("div");
  metrics.className = "irb-output-floor-adjustment-metrics";
  metrics.append(
    createMetricCard({
      label: "Initial floor threshold",
      value: formatOptionalMetric(model.selectedSnapshot.totalFloorThreshold, state.selectedUnit),
      detail: "Existing output floor calculation"
    }),
    createMetricCard({
      label: "Fully loaded adjustment",
      value: formatOptionalSignedMetric(estimate.fullyLoadedFloorAdjustment, state.selectedUnit),
      detail: "C04.00 x=0010, y=0890"
    }),
    createMetricCard({
      label: "Adjusted floor threshold",
      value: formatOptionalMetric(estimate.adjustedThreshold, state.selectedUnit),
      detail: "Initial threshold + fully loaded adjustment"
    }),
    createMetricCard({
      label: "Adjusted gap",
      value: formatOptionalSignedMetric(estimate.adjustedGap, state.selectedUnit),
      detail: estimate.isBinding
        ? "Binding: positive gap added to total RWA"
        : "Not binding: negative distance to adjusted threshold",
      tone: estimate.isBinding ? "negative" : "neutral"
    }),
    createMetricCard({
      label: estimate.isBinding ? "Adjusted CET1 impact" : "CET1 distance to bite",
      value: formatSignedBasisPoints(estimate.cet1ImpactOrDistanceBasisPoints),
      detail: estimate.isBinding
        ? "Estimated impact of the adjusted global add-on"
        : "Negative value shows the distance before the adjusted floor binds",
      tone: estimate.isBinding ? "negative" : "neutral"
    })
  );
  section.append(metrics);
  return section;
}

function createScopeSelector(model, state) {
  const section = document.createElement("section");
  section.className = "irb-output-floor-diagnostic";

  const header = document.createElement("div");
  header.className = "irb-output-floor-section-title";
  header.textContent = "Output floor perimeters - select a row to update the analysis above";

  if (model.scopeRows.length === 0) {
    const notice = createIrbNotice("No output floor perimeter is available for this JST/date.");
    section.append(header, notice);
    return section;
  }

  const table = document.createElement("table");
  table.className = "irb-output-floor-table";
  table.innerHTML = `
    <thead>
      <tr>
        <th>Perimeter</th>
        <th>Current TREA</th>
        <th>S-TREA</th>
        <th>Floor threshold</th>
        <th>Gap</th>
        <th>CET1 impact</th>
      </tr>
    </thead>
  `;

  const body = document.createElement("tbody");
  model.scopeRows.forEach((row) => {
    const tr = document.createElement("tr");
    const isSelected = row.id === model.selectedScope.id;
    tr.className = `irb-output-floor-scope-row${isSelected ? " is-selected" : ""}`;
    tr.tabIndex = 0;
    tr.setAttribute("role", "button");
    tr.setAttribute("aria-pressed", String(isSelected));
    tr.innerHTML = `
      <td>${row.label}</td>
      <td>${formatOptionalMetric(row.currentTrea, state.selectedUnit)}</td>
      <td>${formatOptionalMetric(row.standardisedTrea, state.selectedUnit)}</td>
      <td>${formatOptionalMetric(row.threshold, state.selectedUnit)}</td>
      <td class="${Number(row.gap) > 0 ? "is-binding" : ""}">${formatOptionalSignedMetric(row.gap, state.selectedUnit)}</td>
      <td class="${Number(row.floorAddOn) > 0 ? "is-binding" : ""}">${formatSignedBasisPoints(row.impactBasisPoints)}</td>
    `;
    const selectScope = () => {
      activeOutputFloorScope = row.id;
      renderAppState?.(actionsRef?.getState?.() ?? state);
    };
    tr.addEventListener("click", selectScope);
    tr.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      selectScope();
    });
    body.append(tr);
  });

  table.append(body);
  section.append(header, table);
  return section;
}

function createMetricCard({ detail, label, tone = "", value }) {
  const card = document.createElement("div");
  card.className = `irb-output-floor-card ${tone ? `is-${tone}` : ""}`;
  const labelNode = document.createElement("div");
  labelNode.className = "irb-output-floor-card-label";
  labelNode.textContent = label;
  const valueNode = document.createElement("div");
  valueNode.className = "irb-output-floor-card-value";
  valueNode.textContent = value || "-";
  const detailNode = document.createElement("div");
  detailNode.className = "irb-output-floor-card-detail";
  detailNode.textContent = detail || "";
  card.append(labelNode, valueNode, detailNode);
  return card;
}

function createMechanicRow(label, value, selectedUnit, signed = false) {
  const row = document.createElement("div");
  row.className = "irb-output-floor-mechanic-row";
  const labelNode = document.createElement("span");
  labelNode.textContent = label;
  const valueNode = document.createElement("strong");
  if (selectedUnit === "percent") {
    valueNode.textContent = formatPercentFromFraction(value);
  } else if (selectedUnit === "basis-points") {
    valueNode.textContent = formatSignedBasisPoints(value);
  } else {
    valueNode.textContent = signed
      ? formatOptionalSignedMetric(value, selectedUnit)
      : formatOptionalMetric(value, selectedUnit);
  }
  row.append(labelNode, valueNode);
  return row;
}

function createIrbNotice(message) {
  const notice = document.createElement("div");
  notice.className = "irb-empty-state";
  notice.textContent = message;
  return notice;
}

function formatPercentFromFraction(value) {
  if (!Number.isFinite(value)) return "-";
  return `${new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  }).format(value * 100)} %`;
}

function formatPercentFromFactor(value) {
  if (!Number.isFinite(value)) return "-";
  return `${new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: value === 0.725 ? 1 : 0
  }).format(value * 100)}%`;
}

function formatSignedBasisPoints(value) {
  if (!Number.isFinite(value)) return "-";
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatBasisPointsValue(value)}`;
}

function formatOptionalMetric(value, selectedUnit) {
  return Number.isFinite(value) ? formatMetricValue(value, selectedUnit) : "-";
}

function formatOptionalSignedMetric(value, selectedUnit) {
  return Number.isFinite(value) ? formatSignedMetricValue(value, selectedUnit) : "-";
}
