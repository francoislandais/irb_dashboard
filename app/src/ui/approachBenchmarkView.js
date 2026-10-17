import {
  APPROACHES,
  APPROACH_BENCHMARK_METRICS,
  APPROACH_PORTFOLIOS,
  approachMetricValue,
  isApproachPercentMetric,
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
const contextResizer = document.querySelector("#approach-context-resizer");
const centerResizer = document.querySelector("#approach-center-resizer");
const chartWrap = root?.querySelector(".approach-context-chart-wrap");
const REFERENCE_PARAM = "approach_reference";
const PORTFOLIO_PARAM = "approach_portfolio";
const METRIC_PARAM = "approach_metric";
const PANEL_WIDTH_KEY = "agoraApproachPanelWidth";
const SELECTION_HEIGHT_KEY = "agoraApproachSelectionHeightV2";
const MIN_PANEL_WIDTH = 260;
const MAX_PANEL_WIDTH = 900;
const MIN_SELECTION_HEIGHT = 180;
const MIN_CHART_HEIGHT = 180;
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

const METRIC_GROUPS = [
  ["Comparison", ["eadShare", "rwaShare", "density.standard", "density.irb"]],
  ["IRB parameters", ["pd.irb", "lgd.irb"]],
  ["Reported amounts", ["original", "afterCrm", "ead", "rwa"].flatMap((stage) =>
    [`${stage}.standard`, `${stage}.irb`])]
];

function metricLabel(metricId) {
  if (metricId === "eadShare") return "EAD · standardised share";
  if (metricId === "rwaShare") return "RWA · standardised share";
  if (metricId === "density.standard") return "RWA density · Standardised";
  if (metricId === "density.irb") return "RWA density · IRB";
  if (metricId === "pd.irb") return "Average PD · IRB";
  if (metricId === "lgd.irb") return "Average LGD · IRB";
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

function indicatorValue(portfolio, metricId, state) {
  const value = approachMetricValue(portfolio, metricId);
  if (!Number.isFinite(value)) return "—";
  return isApproachPercentMetric(metricId) ? percent(value) : amount(value, state);
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

function selectionHeightLimit() {
  if (!contextPanel.clientHeight) return 900;
  return Math.max(MIN_SELECTION_HEIGHT, contextPanel.clientHeight - MIN_CHART_HEIGHT - 8);
}

function setSelectionHeight(value) {
  const height = Math.round(Math.max(MIN_SELECTION_HEIGHT, Math.min(selectionHeightLimit(), value)));
  root.style.setProperty("--approach-selection-height", `${height}px`);
  contextResizer.setAttribute("aria-valuemax", String(selectionHeightLimit()));
  contextResizer.setAttribute("aria-valuenow", String(height));
  return height;
}

function savePanelSizes() {
  try {
    localStorage.setItem(PANEL_WIDTH_KEY, panelResizer.getAttribute("aria-valuenow"));
    localStorage.setItem(SELECTION_HEIGHT_KEY, contextResizer.getAttribute("aria-valuenow"));
  } catch { /* Keep the current sizes for this session. */ }
}

function wireCenterResize() {
  let pointerX = 0, pointerY = 0, widthStart = 0, heightStart = 0;
  centerResizer.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    pointerX = event.clientX;
    pointerY = event.clientY;
    widthStart = contextPanel.getBoundingClientRect().width;
    heightStart = contextSelection.getBoundingClientRect().height;
    centerResizer.setPointerCapture(event.pointerId);
    root.classList.add("is-resizing-center");
    event.preventDefault();
  });
  centerResizer.addEventListener("pointermove", (event) => {
    if (!centerResizer.hasPointerCapture(event.pointerId)) return;
    setPanelWidth(widthStart + event.clientX - pointerX);
    setSelectionHeight(heightStart + event.clientY - pointerY);
  });
  const finishResize = (event) => {
    if (!centerResizer.hasPointerCapture(event.pointerId)) return;
    centerResizer.releasePointerCapture(event.pointerId);
    root.classList.remove("is-resizing-center");
    savePanelSizes();
  };
  centerResizer.addEventListener("pointerup", finishResize);
  centerResizer.addEventListener("pointercancel", finishResize);
  centerResizer.addEventListener("keydown", (event) => {
    const width = contextPanel.getBoundingClientRect().width;
    const height = contextSelection.getBoundingClientRect().height;
    if (event.key === "ArrowLeft") setPanelWidth(width - 24);
    else if (event.key === "ArrowRight") setPanelWidth(width + 24);
    else if (event.key === "ArrowUp") setSelectionHeight(height - 24);
    else if (event.key === "ArrowDown") setSelectionHeight(height + 24);
    else return;
    event.preventDefault();
    savePanelSizes();
  });
}

function wireContextResize() {
  let storedHeight = 420;
  try { storedHeight = Number(localStorage.getItem(SELECTION_HEIGHT_KEY)) || 420; } catch { /* Keep the default. */ }
  setSelectionHeight(storedHeight);
  let pointerStart = 0;
  let heightStart = 0;
  contextResizer.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    pointerStart = event.clientY;
    heightStart = contextSelection.getBoundingClientRect().height;
    contextResizer.setPointerCapture(event.pointerId);
    root.classList.add("is-resizing-selection");
    event.preventDefault();
  });
  contextResizer.addEventListener("pointermove", (event) => {
    if (!contextResizer.hasPointerCapture(event.pointerId)) return;
    setSelectionHeight(heightStart + event.clientY - pointerStart);
  });
  const finishResize = (event) => {
    if (!contextResizer.hasPointerCapture(event.pointerId)) return;
    contextResizer.releasePointerCapture(event.pointerId);
    root.classList.remove("is-resizing-selection");
    try { localStorage.setItem(SELECTION_HEIGHT_KEY, contextResizer.getAttribute("aria-valuenow")); } catch { /* Keep this session's height. */ }
  };
  contextResizer.addEventListener("pointerup", finishResize);
  contextResizer.addEventListener("pointercancel", finishResize);
  contextResizer.addEventListener("keydown", (event) => {
    const previous = contextSelection.getBoundingClientRect().height;
    const height = event.key === "ArrowUp" ? previous - 24
      : event.key === "ArrowDown" ? previous + 24
      : event.key === "Home" ? MIN_SELECTION_HEIGHT
      : event.key === "End" ? selectionHeightLimit() : null;
    if (height === null) return;
    event.preventDefault();
    const next = setSelectionHeight(height);
    try { localStorage.setItem(SELECTION_HEIGHT_KEY, String(next)); } catch { /* Keep this session's height. */ }
  });
  new ResizeObserver(() => {
    const current = Number(contextResizer.getAttribute("aria-valuenow")) || storedHeight;
    if (current > selectionHeightLimit()) setSelectionHeight(current);
  }).observe(contextPanel);
  new ResizeObserver(() => resizeExplorerBenchmarkChart(chart)).observe(chartWrap);
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
  wireContextResize();
  wireCenterResize();
  if (readUrlStateParams().has("approach_benchmark")) syncUrl();
  root.addEventListener("click", (event) => {
    const button = event.target.closest("[data-approach-metric], [data-approach-portfolio]");
    if (!button || !root.contains(button)) return;
    if (button.dataset.approachPortfolio) selectedPortfolioId = button.dataset.approachPortfolio;
    selectedMetricId = button.dataset.approachMetric ?? selectedMetricId;
    const portfolio = currentModel?.portfolios.find((item) => item.id === selectedPortfolioId);
    if (portfolio?.stages.ead.standard.expected === 0 &&
      ["eadShare", "rwaShare", "density.standard"].includes(selectedMetricId)) selectedMetricId = "density.irb";
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

function buildPortfolioCard(portfolio, state) {
  const card = element("div", "approach-portfolio-card");
  card.classList.toggle("is-active", selectedPortfolioId === portfolio.id);
  const button = element("button", "approach-portfolio-main");
  button.type = "button";
  button.dataset.approachPortfolio = portfolio.id;
  button.dataset.approachMetric = selectedMetricId;
  button.setAttribute("aria-pressed", String(selectedPortfolioId === portfolio.id));
  const top = element("div", "approach-portfolio-top");
  top.append(element("h4", "", portfolio.label), element("span", "approach-portfolio-share", indicatorValue(portfolio, selectedMetricId, state)));
  button.append(top);
  if (["eadShare", "rwaShare"].includes(selectedMetricId) &&
    portfolio.stages.ead.standard.expected && portfolio.stages.ead.irb.expected) {
    button.append(shareBar(approachMetricValue(portfolio, selectedMetricId), metricLabel(selectedMetricId)));
  }
  card.append(button);
  card.append(element("p", "approach-portfolio-note", portfolio.note));
  const parameter = selectedMetricId === "pd.irb" ? portfolio.getParameter("pd")
    : selectedMetricId === "lgd.irb" ? portfolio.getParameter("lgd") : null;
  if (parameter) card.append(element("small", "approach-portfolio-coverage",
    `${parameter.present}/${parameter.expected} IRB classes with a reported parameter and positive EAD`));
  const incomplete = [portfolio.stages.ead.standard, portfolio.stages.ead.irb, portfolio.stages.rwa.standard, portfolio.stages.rwa.irb]
    .some((metric) => metric.present < metric.expected);
  if (incomplete) card.append(element("small", "approach-portfolio-coverage", "Based on reported classes only; missing classes are omitted"));
  return card;
}

function buildPeerDistribution(model) {
  if (!["pd.irb", "lgd.irb", "density.standard", "density.irb"].includes(selectedMetricId)) return null;
  const section = element("section", "approach-distribution");
  const heading = element("div", "approach-section-title");
  heading.append(element("h3", "", `Peer distribution · ${metricLabel(selectedMetricId)}`),
    element("p", "", "Distribution of institution-level values at the selected date; this is not the distribution of borrower-level PDs."));
  section.append(heading);
  const values = [model.selectedPortfolio, ...model.peers]
    .map((item) => approachMetricValue(item, selectedMetricId))
    .filter(Number.isFinite);
  if (values.length < 2) {
    section.append(element("p", "approach-method-note", "At least two institutions with reported values are needed for a distribution."));
    return section;
  }
  const min = Math.min(...values), max = Math.max(...values);
  const bins = Math.min(6, Math.max(3, Math.round(Math.sqrt(values.length))));
  const counts = Array(bins).fill(0);
  values.forEach((value) => counts[Math.min(bins - 1, Math.floor((value - min) / (max - min || 1) * bins))] += 1);
  const selectedValue = approachMetricValue(model.selectedPortfolio, selectedMetricId);
  const selectedBin = Number.isFinite(selectedValue)
    ? Math.min(bins - 1, Math.floor((selectedValue - min) / (max - min || 1) * bins)) : -1;
  const histogram = element("div", "approach-distribution-bars");
  const peak = Math.max(...counts);
  counts.forEach((count, index) => {
    const lower = min + (max - min) * index / bins;
    const upper = min + (max - min) * (index + 1) / bins;
    const bar = element("div", "approach-distribution-bin");
    if (index === selectedBin) bar.classList.add("is-selected");
    bar.style.setProperty("--distribution-height", `${count ? Math.max(5, count / peak * 100) : 0}%`);
    bar.setAttribute("aria-label", `${percent(lower)} to ${percent(upper)}: ${count} institutions`);
    bar.append(element("span", "approach-distribution-count", String(count)), element("span", "approach-distribution-bar"));
    histogram.append(bar);
  });
  const axis = element("div", "approach-distribution-axis");
  axis.append(element("span", "", percent(min)), element("span", "", `${values.length} institutions · selected range in blue`), element("span", "", percent(max)));
  section.append(histogram, axis);
  return section;
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
    element("p", "", `${model.selectedPortfolio.label} · ${metricLabel(selectedMetricId)}; peers follow the global Peers selection.`));
  section.append(heading);
  if (state.peerDisplayMode === "anonymised") {
    section.append(element("p", "approach-anonymous-note", "Peer identities are hidden in anonymised mode. The median and middle 50% remain above."));
    return section;
  }
  const table = element("table", "approach-peer-table");
  const head = document.createElement("thead");
  const header = document.createElement("tr");
  ["Institution", metricLabel(selectedMetricId), "Standardised EAD share", "Standardised RWA share"].forEach((label) => {
    const cell = element("th", "", label);
    cell.scope = "col";
    header.append(cell);
  });
  head.append(header);
  const body = document.createElement("tbody");
  const institutions = [{ institutionId: model.institutionId, ...model.selectedPortfolio },
    ...model.peers.sort((a, b) => (approachMetricValue(b, selectedMetricId) ?? -1) - (approachMetricValue(a, selectedMetricId) ?? -1))];
  institutions.forEach((institution, index) => {
    const row = element("tr", index === 0 ? "is-selected" : "");
    const name = element("th", "", institutionName(state, institution.institutionId));
    name.scope = "row";
    row.append(name, element("td", "", indicatorValue(institution, selectedMetricId, state)),
      element("td", "", percent(institution.eadShare)), element("td", "", percent(institution.rwaShare)));
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
    element("p", "", "Historical values and framework by reference date."));
  section.append(heading);
  const scroller = element("div", "approach-history-scroll");
  const table = element("table", "approach-history-table");
  const head = document.createElement("thead");
  const header = document.createElement("tr");
  for (const label of ["Reference", "Framework", metricLabel(selectedMetricId), "Standardised EAD", "IRB EAD", "Standardised EAD share", "Standardised RWA", "IRB RWA", "Standardised RWA share"]) {
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
    dateCell.textContent = item.reference.label;
    row.append(dateCell, element("td", "", item.reference.framework),
      element("td", "", indicatorValue(item, selectedMetricId, state)));
    for (const stage of ["ead", "rwa"]) {
      row.append(
        element("td", "", amount(item.stages[stage].standard.value, state)),
        element("td", "", amount(item.stages[stage].irb.value, state)),
        element("td", "", percent(item[`${stage}Share`]))
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
  const previousScroll = contextSelection.scrollTop;
  contextSelection.replaceChildren();
  const heading = element("div", "approach-context-heading");
  heading.append(element("h2", "", metricLabel(selectedMetricId)),
    element("span", "approach-context-date", model.reference.label));
  contextSelection.append(element("span", "approach-context-eyebrow", "INDICATOR"),
    heading, element("p", "approach-context-portfolio", model.selectedPortfolio.label));
  for (const [groupLabel, metricIds] of METRIC_GROUPS) {
    const group = element("div", "approach-context-metric-group");
    group.append(element("h3", "", groupLabel));
    const options = element("div", "approach-context-metric-grid");
    for (const metricId of metricIds) {
      if (model.selectedPortfolio.irbOnly && ["eadShare", "rwaShare", "density.standard"].includes(metricId)) continue;
      const button = element("button", "approach-context-metric-option");
      button.type = "button";
      button.dataset.approachMetric = metricId;
      button.setAttribute("aria-pressed", String(selectedMetricId === metricId));
      button.append(element("span", "", metricLabel(metricId)),
        element("strong", "", indicatorValue(model.selectedPortfolio, metricId, state)));
      options.append(button);
    }
    group.append(options);
    contextSelection.append(group);
  }
  contextSelection.append(element("small", "approach-context-footnote",
    `Framework ${model.framework} · ${state.peerDisplayMode === "anonymised" ? "Anonymized peers" : "Named peers"} · RWA density = RWA / EAD`));
  contextSelection.scrollTop = previousScroll;
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
  if (APPROACH_PORTFOLIOS.find((item) => item.id === selectedPortfolioId)?.irbOnly &&
    ["eadShare", "rwaShare", "density.standard"].includes(selectedMetricId)) selectedMetricId = "density.irb";
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

  const portfolioSection = element("section", "approach-portfolios");
  const portfolioHeading = element("div", "approach-section-title");
  portfolioHeading.append(element("h3", "", "Counterparty lens"),
    element("p", "", `Select a group to trace its reporting stages · ${metricLabel(selectedMetricId)}.`));
  portfolioSection.append(portfolioHeading);
  const grid = element("div", "approach-portfolio-grid");
  model.portfolios.forEach((portfolio) => grid.append(buildPortfolioCard(portfolio, state)));
  portfolioSection.append(grid);
  content.append(portfolioSection);
  const distribution = buildPeerDistribution(model);
  if (distribution) content.append(distribution);
  content.append(buildStages(selectedPortfolio, state), buildHistoryTable(model, state), buildPeerTable(model, state));
  content.append(element("p", "approach-method-note",
    "The bridge covers the last pre-CRR3 framework (3.2) and post-CRR3 frameworks 4.0 and 4.2. Portfolio groups are analytical comparisons, not a partition of the reported total. Empty source classes are omitted from sums; a missing whole approach contributes zero only when the other has reported data. A class that the taxonomy does not identify is never treated as zero. Conflicting duplicate values remain unavailable."));
  renderContextBenchmark(model, state);
}
