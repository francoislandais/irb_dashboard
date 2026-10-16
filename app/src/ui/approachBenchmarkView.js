import {
  APPROACHES,
  APPROACH_BENCHMARK_METRICS,
  APPROACH_PORTFOLIOS,
  buildApproachBenchmarkModel
} from "../data/approachBenchmark.js?v=20261016-approach-benchmark";
import { formatMetricValue } from "../data/core/formatting.js";
import { getInstitutionDisplayInfo } from "../data/institutionDictionary.js";
import { createUrlState, readUrlStateParams, replaceUrlState } from "./urlState.js";
import { destroyExplorerBenchmarkChart, renderExplorerBenchmarkView, resizeExplorerBenchmarkChart } from "./explorerBenchmarkView.js?v=20261016-approach-resize";

const root = document.querySelector("#approaches-view");
const content = document.querySelector("#approach-main-pane");
const contextSelection = document.querySelector("#approach-context-selection");
const chart = document.querySelector("#approach-benchmark-chart");
const contextPanel = root?.querySelector(".approach-context-panel");
const panelResizer = document.querySelector("#approach-panel-resizer");
const REFERENCE_PARAM = "approach_reference";
const PORTFOLIO_PARAM = "approach_portfolio";
const METRIC_PARAM = "approach_metric";
const PANEL_WIDTH_KEY = "agoraApproachPanelWidth";
const MIN_PANEL_WIDTH = 260;
const MAX_PANEL_WIDTH = 900;
const DETAIL_WIDTH = 560;
let selectedReferenceName = readUrlStateParams().get(REFERENCE_PARAM) ?? "";
let selectedPortfolioId = readUrlStateParams().get(PORTFOLIO_PARAM) ?? "total";
let selectedMetricId = readUrlStateParams().get(METRIC_PARAM) ?? "eadShare";
let benchmarkSmoothingWindow = 1;
let benchmarkFocusYAxis = false;
let panelIsDetailed = false;
let lastPanelWidth = 0;
let rerender = null;
let currentState = null;
let currentModel = null;

const STAGE_LABELS = {
  original: "Original exposure",
  afterCrm: "After CRM · pre conversion",
  ead: "EAD",
  rwa: "RWA"
};

function metricLabel(metricId) {
  if (metricId === "eadShare") return "EAD · standardised share";
  if (metricId === "rwaShare") return "RWA · standardised share";
  const [stage, approach] = metricId.split(".");
  return `${STAGE_LABELS[stage]} · ${approach === "standard" ? "Standardised" : "IRB"}`;
}

function element(tag, className = "", value = "") {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (value !== "") node.textContent = value;
  return node;
}

function percent(value) {
  return Number.isFinite(value)
    ? new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 1 }).format(value)
    : "—";
}

function amount(value, state) {
  return Number.isFinite(value) ? formatMetricValue(value, state.selectedUnit) : "—";
}

function institutionName(state, id) {
  return getInstitutionDisplayInfo(state.institutionDictionary, id)?.institutionName || id;
}

function syncUrl() {
  const url = createUrlState();
  if (selectedReferenceName) url.searchParams.set(REFERENCE_PARAM, selectedReferenceName);
  else url.searchParams.delete(REFERENCE_PARAM);
  if (selectedPortfolioId !== "total") url.searchParams.set(PORTFOLIO_PARAM, selectedPortfolioId);
  else url.searchParams.delete(PORTFOLIO_PARAM);
  if (selectedMetricId !== "eadShare") url.searchParams.set(METRIC_PARAM, selectedMetricId);
  else url.searchParams.delete(METRIC_PARAM);
  url.searchParams.delete("approach_benchmark");
  replaceUrlState(url);
}

function panelWidthLimit() {
  return root.clientWidth > 0
    ? Math.max(MIN_PANEL_WIDTH, Math.min(MAX_PANEL_WIDTH, root.clientWidth - 420))
    : MAX_PANEL_WIDTH;
}

function setPanelWidth(value) {
  const width = Math.round(Math.max(MIN_PANEL_WIDTH, Math.min(panelWidthLimit(), value)));
  root.style.setProperty("--approach-sidebar-width", `${width}px`);
  panelResizer.setAttribute("aria-valuemax", String(panelWidthLimit()));
  panelResizer.setAttribute("aria-valuenow", String(width));
  return width;
}

function wirePanelResize() {
  let storedWidth = 300;
  try { storedWidth = Number(localStorage.getItem(PANEL_WIDTH_KEY)) || 300; } catch { /* File URLs may block storage. */ }
  setPanelWidth(storedWidth);
  let pointerStart = 0;
  let widthStart = 0;
  panelResizer.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    pointerStart = event.clientX;
    widthStart = contextPanel.getBoundingClientRect().width;
    panelResizer.setPointerCapture(event.pointerId);
    root.classList.add("is-resizing");
    event.preventDefault();
  });
  panelResizer.addEventListener("pointermove", (event) => {
    if (!panelResizer.hasPointerCapture(event.pointerId)) return;
    setPanelWidth(widthStart + event.clientX - pointerStart);
  });
  const finishResize = (event) => {
    if (!panelResizer.hasPointerCapture(event.pointerId)) return;
    panelResizer.releasePointerCapture(event.pointerId);
    root.classList.remove("is-resizing");
    try { localStorage.setItem(PANEL_WIDTH_KEY, panelResizer.getAttribute("aria-valuenow")); } catch { /* Keep the current width for this session. */ }
  };
  panelResizer.addEventListener("pointerup", finishResize);
  panelResizer.addEventListener("pointercancel", finishResize);
  panelResizer.addEventListener("keydown", (event) => {
    const previous = contextPanel.getBoundingClientRect().width;
    const width = event.key === "ArrowLeft" ? previous - 24
      : event.key === "ArrowRight" ? previous + 24
      : event.key === "Home" ? MIN_PANEL_WIDTH
      : event.key === "End" ? panelWidthLimit() : null;
    if (width === null) return;
    event.preventDefault();
    const next = setPanelWidth(width);
    try { localStorage.setItem(PANEL_WIDTH_KEY, String(next)); } catch { /* Keep the current width for this session. */ }
  });
  new ResizeObserver(() => {
    const width = Math.round(contextPanel.getBoundingClientRect().width);
    if (!width || width === lastPanelWidth) return;
    const requestedWidth = Number(panelResizer.getAttribute("aria-valuenow")) || width;
    if (requestedWidth > panelWidthLimit()) {
      setPanelWidth(requestedWidth);
      return;
    }
    lastPanelWidth = width;
    const detailed = chart.getBoundingClientRect().width >= DETAIL_WIDTH;
    if (detailed !== panelIsDetailed) {
      panelIsDetailed = detailed;
      contextPanel.classList.toggle("is-chart-wide", detailed);
      if (currentModel && currentState) renderContextBenchmark(currentModel, currentState);
    } else {
      resizeExplorerBenchmarkChart(chart);
    }
  }).observe(contextPanel);
  window.addEventListener("resize", () => {
    const current = Number(panelResizer.getAttribute("aria-valuenow")) || 300;
    if (current > panelWidthLimit()) setPanelWidth(current);
  });
}

export function wireApproachBenchmarkUi(actions, rerenderApp) {
  if (!root) return;
  rerender = rerenderApp;
  currentActions = actions;
  wirePanelResize();
  if (readUrlStateParams().has("approach_benchmark")) syncUrl();
  root.addEventListener("change", (event) => {
    if (event.target.id !== "approach-reference") return;
    selectedReferenceName = event.target.value;
    syncUrl();
    if (currentState) rerender(currentState);
  });
  root.addEventListener("click", (event) => {
    const dateButton = event.target.closest("[data-approach-reference]");
    if (dateButton && root.contains(dateButton)) {
      selectedReferenceName = dateButton.dataset.approachReference;
      if (dateButton.dataset.approachMetric) selectedMetricId = dateButton.dataset.approachMetric;
      syncUrl();
      if (currentState) rerender(currentState);
      return;
    }
    const button = event.target.closest("[data-approach-metric], [data-approach-portfolio]");
    if (!button || !root.contains(button)) return;
    if (button.dataset.approachPortfolio) selectedPortfolioId = button.dataset.approachPortfolio;
    selectedMetricId = button.dataset.approachMetric ?? "eadShare";
    syncUrl();
    if (currentState) rerender(currentState);
  });
}

function shareBar(share, label) {
  const bar = element("div", "approach-share-bar");
  if (share === null) {
    bar.classList.add("is-unavailable");
    bar.textContent = "Insufficient reported data";
    return bar;
  }
  const standard = element("span", "approach-share-standard");
  standard.style.width = `${share * 100}%`;
  const irb = element("span", "approach-share-irb");
  irb.style.width = `${(1 - share) * 100}%`;
  bar.setAttribute("role", "img");
  bar.setAttribute("aria-label", `${label}: ${percent(share)} standardised, ${percent(1 - share)} IRB`);
  bar.append(standard, irb);
  return bar;
}

function buildShareCard(title, stage, share, state, distribution) {
  const card = element("button", "approach-share-card");
  card.type = "button";
  card.dataset.approachPortfolio = "total";
  card.dataset.approachMetric = title.startsWith("EAD") ? "eadShare" : "rwaShare";
  card.classList.toggle("is-active", selectedPortfolioId === "total" && selectedMetricId === card.dataset.approachMetric);
  const heading = element("div", "approach-card-heading");
  heading.append(element("span", "approach-card-title", title), element("span", "approach-card-share", percent(share)));
  card.append(heading, shareBar(share, title));
  const amounts = element("div", "approach-share-amounts");
  amounts.append(
    element("span", "", `Standardised ${amount(stage.standard.value, state)}`),
    element("span", "", `IRB ${amount(stage.irb.value, state)}`)
  );
  card.append(amounts);
  if (distribution.count) {
    card.append(element("p", "approach-peer-context",
      `Peer median ${percent(distribution.median)} standardised · middle 50% ${percent(distribution.lower)}–${percent(distribution.upper)} · ${distribution.count} peers`));
  }
  return card;
}

function buildPortfolioCard(portfolio, state) {
  const card = element("div", "approach-portfolio-card");
  card.classList.toggle("is-active", selectedPortfolioId === portfolio.id);
  const button = element("button", "approach-portfolio-main");
  button.type = "button";
  button.dataset.approachPortfolio = portfolio.id;
  button.dataset.approachMetric = "eadShare";
  button.setAttribute("aria-pressed", String(selectedPortfolioId === portfolio.id && selectedMetricId === "eadShare"));
  const top = element("div", "approach-portfolio-top");
  top.append(element("h4", "", portfolio.label), element("span", "approach-portfolio-share", percent(portfolio.eadShare)));
  button.append(top, shareBar(portfolio.eadShare, "EAD share"));
  const rwa = element("button", "approach-portfolio-rwa");
  rwa.type = "button";
  rwa.dataset.approachPortfolio = portfolio.id;
  rwa.dataset.approachMetric = "rwaShare";
  rwa.setAttribute("aria-pressed", String(selectedPortfolioId === portfolio.id && selectedMetricId === "rwaShare"));
  rwa.append(element("span", "", "RWA standardised share"), element("strong", "", percent(portfolio.rwaShare)));
  card.append(button, rwa, element("p", "approach-portfolio-note", portfolio.note));
  const incomplete = [portfolio.stages.ead.standard, portfolio.stages.ead.irb, portfolio.stages.rwa.standard, portfolio.stages.rwa.irb]
    .some((metric) => metric.present < metric.expected);
  if (incomplete) card.append(element("small", "approach-portfolio-coverage", "Based on reported classes only; missing classes are omitted"));
  return card;
}

function buildStages(portfolio, state) {
  const section = element("section", "approach-stages");
  const title = element("div", "approach-section-title");
  title.append(element("h3", "", `From exposure to RWA · ${portfolio.label}`),
    element("p", "", "Each amount is read directly from the reported column; stages are not summed together."));
  section.append(title);
  const table = element("table", "approach-stage-table");
  const head = document.createElement("thead");
  const headRow = document.createElement("tr");
  ["Reporting stage", "Standardised · C_07.00", "IRB · C_08.01"].forEach((label) => {
    const cell = element("th", "", label);
    cell.scope = "col";
    headRow.append(cell);
  });
  head.append(headRow);
  const body = document.createElement("tbody");
  for (const [stage, label] of [
    ["original", "Original exposure"],
    ["afterCrm", "After credit risk mitigation · pre conversion"],
    ["ead", "Exposure value · EAD"],
    ["rwa", "Risk weighted exposure amount · RWA"]
  ]) {
    const row = document.createElement("tr");
    const heading = element("th", "", label);
    heading.scope = "row";
    row.append(heading);
    for (const approach of ["standard", "irb"]) {
      const metric = portfolio.stages[stage][approach];
      const cell = element("td");
      const valueButton = element("button", "approach-metric-button", amount(metric.value, state));
      valueButton.type = "button";
      valueButton.dataset.approachMetric = `${stage}.${approach}`;
      valueButton.setAttribute("aria-pressed", String(selectedMetricId === valueButton.dataset.approachMetric));
      cell.append(valueButton);
      const code = element("small", "", `X ${APPROACHES[approach].stages[stage]}`);
      cell.append(code);
      if (metric.present < metric.expected) {
        cell.append(element("small", "approach-stage-coverage", `${metric.present}/${metric.expected} classes reported`));
      }
      row.append(cell);
    }
    body.append(row);
  }
  table.append(head, body);
  const tableScroll = element("div", "approach-stage-scroll");
  tableScroll.append(table);
  section.append(tableScroll);
  const mapping = element("details", "approach-source-details");
  mapping.append(element("summary", "", "Show source coordinates for this comparison"));
  const mappingTable = element("table", "approach-source-table");
  const mappingHead = document.createElement("thead");
  const mappingHeadRow = document.createElement("tr");
  for (const label of ["Stage", "Standardised · C_07.00", "IRB · C_08.01"]) {
    const cell = element("th", "", label);
    cell.scope = "col";
    mappingHeadRow.append(cell);
  }
  mappingHead.append(mappingHeadRow);
  const mappingBody = document.createElement("tbody");
  for (const [stage, label] of [["original", "Original"], ["afterCrm", "After CRM"], ["ead", "EAD"], ["rwa", "RWA"]]) {
    const row = document.createElement("tr");
    const heading = element("th", "", label);
    heading.scope = "row";
    row.append(heading);
    for (const approach of ["standard", "irb"]) {
      const source = portfolio.stages[stage][approach].source;
      row.append(element("td", "", source.z.length
        ? `X ${source.x} · Y ${source.y} · Z ${source.z.join(" + ")}`
        : "Not separately identifiable in this taxonomy"));
    }
    mappingBody.append(row);
  }
  mappingTable.append(mappingHead, mappingBody);
  mapping.append(mappingTable);
  section.append(mapping);
  if (portfolio.id === "total") {
    const standard = portfolio.stages.ead.standard.source;
    const irb = portfolio.stages.ead.irb.source;
    const foot = element("p", "approach-stages-footnote",
      `Both approaches use row 0010 (Total exposures). Standardised Z ${standard.z.join(" + ")}; IRB Z ${irb.z.join(" + ")}.`);
    section.append(foot);
  }
  return section;
}

function buildPeerTable(model, state) {
  const section = element("section", "approach-peers");
  const heading = element("div", "approach-section-title");
  heading.append(element("h3", "", "Institution benchmark"),
    element("p", "", `${model.selectedPortfolio.label} · share of Standardised + IRB; peers follow the global Peers selection.`));
  section.append(heading);
  if (state.peerDisplayMode === "anonymised") {
    section.append(element("p", "approach-anonymous-note", "Peer identities are hidden in anonymised mode. The median and middle 50% remain above."));
    return section;
  }
  const table = element("table", "approach-peer-table");
  const head = document.createElement("thead");
  const header = document.createElement("tr");
  ["Institution", "Standardised EAD share", "Standardised RWA share"].forEach((label) => {
    const cell = element("th", "", label);
    cell.scope = "col";
    header.append(cell);
  });
  head.append(header);
  const body = document.createElement("tbody");
  const institutions = [{ institutionId: model.institutionId, ...model.selectedPortfolio },
    ...model.peers.sort((a, b) => (b.eadShare ?? -1) - (a.eadShare ?? -1))];
  institutions.forEach((institution, index) => {
    const row = element("tr", index === 0 ? "is-selected" : "");
    const name = element("th", "", institutionName(state, institution.institutionId));
    name.scope = "row";
    row.append(name, element("td", "", percent(institution.eadShare)), element("td", "", percent(institution.rwaShare)));
    body.append(row);
  });
  table.append(head, body);
  const tableScroll = element("div", "approach-peer-scroll");
  tableScroll.append(table);
  section.append(tableScroll);
  return section;
}

function buildHistoryTable(model, state) {
  const section = element("section", "approach-history");
  const heading = element("div", "approach-section-title");
  heading.append(element("h3", "", `Historical bridge · ${model.selectedPortfolio.label}`),
    element("p", "", "Click a date to inspect the corresponding taxonomy and source coordinates."));
  section.append(heading);
  const scroller = element("div", "approach-history-scroll");
  const table = element("table", "approach-history-table");
  const head = document.createElement("thead");
  const header = document.createElement("tr");
  for (const label of ["Reference", "Framework", "Standardised EAD", "IRB EAD", "Standardised EAD share", "Standardised RWA", "IRB RWA", "Standardised RWA share"]) {
    const cell = element("th", "", label);
    cell.scope = "col";
    header.append(cell);
  }
  head.append(header);
  const body = document.createElement("tbody");
  for (const item of [...model.timeline].reverse()) {
    const row = element("tr", item.reference.name === model.reference.name ? "is-selected" : "");
    const dateCell = document.createElement("th");
    dateCell.scope = "row";
    const dateButton = element("button", "approach-history-date", item.reference.label);
    dateButton.type = "button";
    dateButton.dataset.approachReference = item.reference.name;
    dateCell.append(dateButton);
    row.append(dateCell, element("td", "", item.reference.framework));
    for (const stage of ["ead", "rwa"]) {
      const metricButton = (value, metricId) => {
        const cell = element("td");
        const button = element("button", "approach-history-value", value);
        button.type = "button";
        button.dataset.approachReference = item.reference.name;
        button.dataset.approachMetric = metricId;
        cell.append(button);
        return cell;
      };
      row.append(
        metricButton(amount(item.stages[stage].standard.value, state), `${stage}.standard`),
        metricButton(amount(item.stages[stage].irb.value, state), `${stage}.irb`),
        metricButton(percent(item[`${stage}Share`]), `${stage}Share`)
      );
    }
    body.append(row);
  }
  table.append(head, body);
  scroller.append(table);
  section.append(scroller);
  return section;
}

function renderContextBenchmark(model, state) {
  contextSelection.replaceChildren();
  contextSelection.append(element("span", "approach-context-eyebrow", "BENCHMARK"),
    element("h2", "", metricLabel(selectedMetricId)),
    element("p", "", model.selectedPortfolio.label));
  const selectedShare = model.selectedPortfolio[selectedMetricId];
  const metric = model.benchmark.isPercent
    ? (Number.isFinite(selectedShare) ? selectedShare * 100 : null)
    : (() => {
      const [stage, approach] = selectedMetricId.split(".");
      return model.selectedPortfolio.stages[stage]?.[approach]?.value;
    })();
  contextSelection.append(element("div", "approach-context-value",
    model.benchmark.isPercent ? (Number.isFinite(metric) ? `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(metric)}%` : "—") : amount(metric, state)));
  contextSelection.append(element("small", "", `${model.reference.label} · ${state.peerDisplayMode === "anonymised" ? "Anonymized peers" : "Named peers"}`));
  const chartOptions = {
    benchmark: model.benchmark,
    focusYAxis: benchmarkFocusYAxis,
    formatValue: (value) => model.benchmark.isPercent
      ? `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value)}%`
      : amount(value, state),
    institutionDictionary: state.institutionDictionary,
    onClearSmoothing: () => {
      benchmarkSmoothingWindow = 1;
      if (currentModel && currentState) renderContextBenchmark(currentModel, currentState);
    },
    onChangeSmoothing: () => {
      benchmarkSmoothingWindow = benchmarkSmoothingWindow >= 4 ? 1 : benchmarkSmoothingWindow + 1;
      if (currentModel && currentState) renderContextBenchmark(currentModel, currentState);
    },
    onSelectJst: (id) => currentState && rerender && currentState.selectedJst !== id && currentActions?.updateSelectedInstitution(id),
    onSelectReference: (label) => {
      const reference = model.references.find((item) => item.label === label);
      if (!reference) return;
      selectedReferenceName = reference.name;
      syncUrl();
      if (currentState) rerender(currentState);
    },
    onToggleYAxisFocus: () => {
      benchmarkFocusYAxis = !benchmarkFocusYAxis;
      if (currentModel && currentState) renderContextBenchmark(currentModel, currentState);
    },
    peerDisplayMode: state.peerDisplayMode,
    selectedReferenceLabel: model.reference.label,
    selectedJst: model.institutionId,
    smoothingWindow: benchmarkSmoothingWindow
  };
  renderExplorerBenchmarkView({ ...chartOptions, compact: !panelIsDetailed, container: chart });
}

let currentActions = null;

export function renderApproachBenchmark(state) {
  if (!root || !content) return;
  currentState = state;
  if (!APPROACH_BENCHMARK_METRICS.includes(selectedMetricId)) selectedMetricId = "eadShare";
  const model = buildApproachBenchmarkModel(state, selectedReferenceName, selectedPortfolioId, selectedMetricId);
  currentModel = model.status === "ready" ? model : null;
  content.replaceChildren();
  if (model.status !== "ready") {
    destroyExplorerBenchmarkChart(chart);
    contextSelection.replaceChildren();
    content.append(element("p", "approach-empty", model.status === "no-framework"
      ? "No matching reference date is available under frameworks 3.2, 4.0 or 4.2 for both templates."
      : "Load a dataset containing both C_07.00 and C_08.01 to compare Standardised and IRB approaches."));
    return;
  }
  selectedReferenceName = model.reference.name;
  if (!APPROACH_PORTFOLIOS.some((item) => item.id === selectedPortfolioId)) selectedPortfolioId = "total";
  const selectedPortfolio = model.selectedPortfolio;

  const header = element("header", "approach-header");
  const heading = element("div", "");
  heading.append(element("span", "approach-eyebrow", "CREDIT RISK · APPROACHES"),
    element("h1", "", "Standardised vs IRB"),
    element("p", "", `EAD and RWA across reported portfolios · ${institutionName(state, model.institutionId)} · Framework ${model.framework}`));
  const dateField = element("label", "approach-reference-field");
  dateField.append(element("span", "", "Reference date"));
  const select = document.createElement("select");
  select.id = "approach-reference";
  [...model.references].reverse().forEach((reference) => {
    select.append(new Option(`${reference.label} · ${reference.framework}`, reference.name, false, reference.name === model.reference.name));
  });
  dateField.append(select);
  header.append(heading, dateField);
  content.append(header);

  const cards = element("div", "approach-overview");
  cards.append(
    buildShareCard("EAD · standardised share", model.total.stages.ead, model.total.eadShare, state, model.distribution.eadShare),
    buildShareCard("RWA · standardised share", model.total.stages.rwa, model.total.rwaShare, state, model.distribution.rwaShare)
  );
  content.append(cards);

  const portfolioSection = element("section", "approach-portfolios");
  const portfolioHeading = element("div", "approach-section-title");
  portfolioHeading.append(element("h3", "", "Counterparty lens"),
    element("p", "", "Select a group to trace its reporting stages. Shares use EAD; RWA shares appear below each bar."));
  portfolioSection.append(portfolioHeading);
  const grid = element("div", "approach-portfolio-grid");
  model.portfolios.forEach((portfolio) => grid.append(buildPortfolioCard(portfolio, state)));
  portfolioSection.append(grid);
  content.append(portfolioSection, buildStages(selectedPortfolio, state), buildHistoryTable(model, state), buildPeerTable(model, state));
  content.append(element("p", "approach-method-note",
    "The bridge covers the last pre-CRR3 framework (3.2) and post-CRR3 frameworks 4.0 and 4.2. Portfolio groups are analytical comparisons, not a partition of the reported total. Empty source classes are omitted from sums; a missing whole approach contributes zero only when the other has reported data. A class that the taxonomy does not identify is never treated as zero. Conflicting duplicate values remain unavailable."));
  renderContextBenchmark(model, state);
}
