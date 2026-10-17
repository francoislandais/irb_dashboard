import { assetCorrelation, buildIrbMechanicsModel, calculateIrbMechanics, conditionalLossAtShock, expectedLossShock, simulateSystemicShocks, IRB_SEGMENTS } from "../data/irbMechanics.js";
import { formatMetricValue } from "../data/core/formatting.js";
import { getInstitutionDisplayInfo } from "../data/institutionDictionary.js";
import { createUrlState, readUrlStateParams, replaceUrlState } from "./urlState.js";

const root = document.querySelector("#irb-mechanics-view");
const content = document.querySelector("#irb-mechanics-main-pane");
const context = document.querySelector("#irb-mechanics-context-selection");
const contextPanel = root?.querySelector(".approach-context-panel");
const panelResizer = document.querySelector("#irb-mechanics-panel-resizer");
const PARAM = "irb_segment";
const REFERENCE_PARAM = "irb_reference";
const PANEL_WIDTH_KEY = "agoraIrbMechanicsPanelWidth";
const MIN_PANEL_WIDTH = 260;
const MAX_PANEL_WIDTH = 900;
let segmentId = readUrlStateParams().get(PARAM) || "corporateA";
let scenario = null;
let currentState = null;
let currentModel = null;
let scenarioKey = "";
let simulationSeed = 20261016;

const node = (tag, className = "", value = "") => {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (value !== "") el.textContent = value;
  return el;
};
const pct = (value, digits = 2) => Number.isFinite(value)
  ? `${new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(value * 100)}%` : "—";
const amount = (value, state) => Number.isFinite(value) ? formatMetricValue(value, state.selectedUnit) : "—";
const institutionName = (state, id) => getInstitutionDisplayInfo(state.institutionDictionary, id)?.institutionName || id;

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
  try { storedWidth = Number(localStorage.getItem(PANEL_WIDTH_KEY)) || 300; } catch { /* Storage may be unavailable on file URLs. */ }
  setPanelWidth(storedWidth);
  let pointerStart = 0, widthStart = 0;
  panelResizer.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    pointerStart = event.clientX;
    widthStart = contextPanel.getBoundingClientRect().width;
    panelResizer.setPointerCapture(event.pointerId);
    root.classList.add("is-resizing");
    event.preventDefault();
  });
  panelResizer.addEventListener("pointermove", (event) => {
    if (panelResizer.hasPointerCapture(event.pointerId)) setPanelWidth(widthStart + event.clientX - pointerStart);
  });
  const finish = (event) => {
    if (!panelResizer.hasPointerCapture(event.pointerId)) return;
    panelResizer.releasePointerCapture(event.pointerId);
    root.classList.remove("is-resizing");
    try { localStorage.setItem(PANEL_WIDTH_KEY, panelResizer.getAttribute("aria-valuenow")); } catch { /* Keep session width. */ }
  };
  panelResizer.addEventListener("pointerup", finish);
  panelResizer.addEventListener("pointercancel", finish);
  panelResizer.addEventListener("keydown", (event) => {
    const current = contextPanel.getBoundingClientRect().width;
    const width = event.key === "ArrowLeft" ? current - 24
      : event.key === "ArrowRight" ? current + 24
      : event.key === "Home" ? MIN_PANEL_WIDTH
      : event.key === "End" ? panelWidthLimit() : null;
    if (width === null) return;
    event.preventDefault();
    const next = setPanelWidth(width);
    try { localStorage.setItem(PANEL_WIDTH_KEY, String(next)); } catch { /* Keep session width. */ }
  });
  new ResizeObserver(() => {
    const current = Number(panelResizer.getAttribute("aria-valuenow")) || 300;
    if (root.clientWidth && current > panelWidthLimit()) setPanelWidth(current);
  }).observe(root);
}

function makeScenario(model) {
  const { reported } = model;
  const hasPd = Number.isFinite(reported.pd.value) && reported.pd.value > 0 && reported.pd.value < 1;
  const hasLgd = Number.isFinite(reported.lgd.value) && reported.lgd.value >= 0 && reported.lgd.value <= 1;
  const hasDays = Number.isFinite(reported.maturityDays.value) && reported.maturityDays.value > 0;
  const hasEad = Number.isFinite(reported.ead.value) && reported.ead.value >= 0;
  const pd = hasPd ? reported.pd.value : 0.01;
  const lgd = hasLgd ? reported.lgd.value : 0.45;
  const days = hasDays ? reported.maturityDays.value : 913;
  const ead = hasEad ? reported.ead.value : 100_000_000;
  return {
    pd, lgd,
    ead,
    maturity: days / 365.25,
    turnover: null,
    financialMultiplier: false,
    correlation: null,
    source: { pd: hasPd, lgd: hasLgd, ead: hasEad, maturity: hasDays }
  };
}

function svgElement(tag, attributes = {}) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [key, value] of Object.entries(attributes)) el.setAttribute(key, String(value));
  return el;
}

function svgText(svg, x, y, text, className = "") {
  const el = svgElement("text", { x, y, class: className });
  el.textContent = text;
  svg.append(el);
}

function lossCurveSvg(input) {
  const width = 820, height = 420;
  const left = 54, plotRight = 654, densityBottom = 165;
  const stressShock = 3.090232306;
  const minShock = -3.5, maxShock = 3.5;
  const x = (shock) => left + (shock - minShock) / (maxShock - minShock) * (plotRight - left);
  const model = calculateIrbMechanics(input);
  const baselineR = assetCorrelation(input.pd, input.kind, input.turnover, input.financialMultiplier);
  const expectedX = x(expectedLossShock(input.pd, model.correlation));
  const stressX = x(stressShock);
  const svg = svgElement("svg", { viewBox: `0 0 ${width} ${height}`, role: "img",
    "aria-label": `Gaussian systemic shock. Expected loss ${pct(model.expectedRate)}; 99.9th-percentile conditional loss ${pct(model.stressRate)}; difference ${pct(model.stressRate - model.expectedRate)} before maturity adjustment. Asset correlation ${pct(model.correlation)}.` });
  const samples = Array.from({ length: 141 }, (_, i) => minShock + i * (maxShock - minShock) / 140);
  const densityY = (shock) => densityBottom - 110 * Math.exp(-shock * shock / 2);
  const densityPath = samples.map((shock, i) => `${i ? "L" : "M"}${x(shock).toFixed(1)},${densityY(shock).toFixed(1)}`).join(" ");
  svg.append(svgElement("path", { d: `${densityPath} L${plotRight},${densityBottom} L${left},${densityBottom} Z`, class: "irb-gaussian-fill" }));
  svg.append(svgElement("path", { d: densityPath, class: "irb-gaussian-line" }));
  svg.append(svgElement("line", { x1: left, y1: densityBottom, x2: plotRight, y2: densityBottom, class: "irb-axis" }));
  svgText(svg, left, 23, "Common economic shock · standard normal · right means more adverse", "irb-chart-label");
  const markerBottom = 355;
  svg.append(svgElement("line", { x1: expectedX, y1: 37, x2: expectedX, y2: markerBottom, class: "irb-expected-marker" }));
  svg.append(svgElement("line", { x1: stressX, y1: 37, x2: stressX, y2: markerBottom, class: "irb-tail-line" }));
  svgText(svg, expectedX - 8, 44, "Shock yielding EL", "irb-chart-label irb-chart-label-end irb-el-text");
  svgText(svg, stressX + 8, 44, "99.9% percentile", "irb-chart-label irb-tail-text");
  svgText(svg, expectedX, densityBottom + 19, `EL ${pct(model.expectedRate)}`, "irb-tick irb-el-text");
  svgText(svg, stressX, densityBottom + 19, `L₉₉.₉ ${pct(model.stressRate)}`, "irb-tick irb-tail-text");
  const lossTop = 230, lossBottom = 354;
  const maxLoss = Math.max(model.stressRate, conditionalLossAtShock(input.pd, input.lgd, baselineR, stressShock), model.expectedRate) * 1.12 || 0.01;
  const lossY = (rate) => lossBottom - rate / maxLoss * (lossBottom - lossTop);
  svgText(svg, left, 211, "Conditional loss given the same economic shock", "irb-chart-label");
  svg.append(svgElement("line", { x1: left, y1: lossBottom, x2: plotRight, y2: lossBottom, class: "irb-axis" }));
  const lossPath = (correlation) => samples.map((shock, i) => `${i ? "L" : "M"}${x(shock).toFixed(1)},${lossY(conditionalLossAtShock(input.pd, input.lgd, correlation, shock)).toFixed(1)}`).join(" ");
  if (input.correlation !== null) svg.append(svgElement("path", { d: lossPath(baselineR), class: "irb-loss-baseline" }));
  svg.append(svgElement("path", { d: lossPath(model.correlation), class: "irb-stress-curve" }));
  const expectedY = lossY(model.expectedRate), stressedY = lossY(model.stressRate);
  svg.append(svgElement("line", { x1: left, y1: expectedY, x2: plotRight + 17, y2: expectedY, class: "irb-expected-line" }));
  svg.append(svgElement("circle", { cx: expectedX, cy: expectedY, r: 4, class: "irb-expected-dot" }));
  svg.append(svgElement("circle", { cx: stressX, cy: stressedY, r: 5, class: "irb-tail-dot" }));
  const bracketX = plotRight + 18;
  svg.append(svgElement("line", { x1: bracketX, y1: stressedY, x2: bracketX, y2: expectedY, class: "irb-unexpected-bracket" }));
  for (const markerY of [stressedY, expectedY]) svg.append(svgElement("line", { x1: bracketX - 5, y1: markerY, x2: bracketX + 5, y2: markerY, class: "irb-unexpected-bracket" }));
  svgText(svg, bracketX + 10, (stressedY + expectedY) / 2, `UL ${pct(model.stressRate - model.expectedRate)}`, "irb-chart-label irb-ul-text");
  svgText(svg, left, 389, `Asset correlation R: ${pct(model.correlation, 1)}${input.correlation === null ? " · Basel formula" : ` · Basel baseline ${pct(baselineR, 1)} (dotted)`}`, "irb-chart-label");
  svgText(svg, left, 408, "UL shown before maturity adjustment; capital applies the maturity multiplier where relevant.", "irb-tick irb-note");
  return svg;
}

function systemicPathSvg(shocks, input, correlation) {
  const width = 820, height = 250, left = 55, right = 765, top = 22, bottom = 205;
  const bound = Math.max(3.6, ...shocks.map((shock) => Math.abs(shock))) + 0.2;
  const x = (index) => left + index / (shocks.length - 1) * (right - left);
  const y = (shock) => top + (bound - shock) / (2 * bound) * (bottom - top);
  const svg = svgElement("svg", { viewBox: `0 0 ${width} ${height}`, role: "img",
    "aria-label": `${shocks.length} simulated independent annual draws of the standard-normal adverse systemic factor; positive values mean more adverse conditions.` });
  svg.append(svgElement("rect", { x: left, y: y(1), width: right - left, height: y(-1) - y(1), class: "irb-shock-band" }));
  for (const level of [-1, 0, 1, 3.090232306]) {
    const lineY = y(level);
    svg.append(svgElement("line", { x1: left, y1: lineY, x2: right, y2: lineY,
      class: level === 3.090232306 ? "irb-shock-tail" : level === 0 ? "irb-axis" : "irb-shock-grid" }));
    svgText(svg, 46, lineY + 4, level === 3.090232306 ? "3.09" : String(level), "irb-shock-tick");
  }
  svgText(svg, right - 5, y(3.090232306) - 5, "99.9th percentile", "irb-shock-tail-label");
  const path = shocks.map((shock, index) => `${index ? "L" : "M"}${x(index).toFixed(1)},${y(shock).toFixed(1)}`).join(" ");
  svg.append(svgElement("path", { d: path, class: "irb-shock-path" }));
  shocks.forEach((shock, index) => {
    const point = svgElement("circle", { cx: x(index), cy: y(shock), r: 2.3, class: shock >= 2 ? "irb-shock-point is-severe" : "irb-shock-point" });
    const title = svgElement("title");
    title.textContent = `Illustrative year ${index + 1}: shock ${shock.toFixed(2)}σ; conditional loss ${pct(conditionalLossAtShock(input.pd, input.lgd, correlation, shock))}`;
    point.append(title); svg.append(point);
  });
  for (const index of [0, 19, 39, 59]) svgText(svg, x(index), 230, `${index + 1}`, "irb-tick");
  svgText(svg, right, 247, "Illustrative year", "irb-shock-tail-label");
  return svg;
}

function buildInput(label, key, min, max, step, format, unit = "") {
  const field = node("label", "irb-input");
  const title = node("span", "irb-input-title", label);
  const value = node("output", "", `${format(scenario[key])}${unit}`);
  const slider = node("input");
  slider.type = "range";
  slider.min = String(min); slider.max = String(max); slider.step = String(step);
  slider.value = String(key === "pd" || key === "lgd" ? scenario[key] * 100 : scenario[key]);
  slider.dataset.irbInput = key;
  const origin = node("small", "irb-input-origin", scenario.source[key] ? "C_08.01 · reported" : "Illustrative assumption");
  field.append(title, value, slider, origin);
  return field;
}

function buildCorrelationInput(result) {
  const field = node("label", "irb-input");
  const value = scenario.correlation ?? result.correlation;
  const slider = node("input");
  slider.type = "range";
  slider.min = "0"; slider.max = "80"; slider.step = "0.1";
  slider.value = String(value * 100);
  slider.dataset.irbInput = "correlation";
  field.append(node("span", "irb-input-title", "Asset correlation · R"),
    node("output", "", pct(value, 1)), slider,
    node("small", "irb-input-origin", scenario.correlation === null ? "Basel formula · varies with PD and class" : "Illustrative 0–80% range · dotted Basel baseline"));
  return field;
}

function renderSide(model, result, state) {
  context.replaceChildren();
  context.append(node("span", "approach-context-eyebrow", "IRB MODEL"),
    node("h2", "", "From expected loss to RWA"),
    node("p", "", model.segment.label));
  context.append(node("div", "approach-context-value", pct(result.riskWeight, 1)),
    node("small", "", "Illustrative model risk weight"));
  const ead = model.reported.ead.value;
  const rwa = model.reported.rwaBefore.value;
  if (ead > 0 && Number.isFinite(rwa)) {
    context.append(node("p", "irb-context-reported", `Reported before support factors · ${pct(rwa / ead, 1)}`));
  }
  context.append(node("p", "irb-context-losses", `Expected loss ${pct(result.expectedRate)} · 99.9% loss ${pct(result.stressRate)}`));
}

function buildPeerSection(model, state, result) {
  const section = node("section", "irb-peers");
  section.append(node("h3", "", "Reported peer risk weights"),
    node("p", "irb-muted", "C_08.01 X 0255 ÷ X 0110, same reporting class and reference date. The model estimate is shown separately."));
  if (state.peerDisplayMode === "anonymised") {
    const values = model.peers.map((peer) => peer.riskWeight).sort((a, b) => a - b);
    if (values.length) section.append(node("p", "irb-peer-median", `Peer median ${pct(values[Math.floor(values.length / 2)], 1)} · ${values.length} institutions`));
    else section.append(node("p", "irb-muted", "No peer value for this class."));
    return section;
  }
  const list = node("div", "irb-peer-list");
  for (const peer of model.peers.sort((a, b) => b.riskWeight - a.riskWeight)) {
    const row = node("div", "irb-peer-row");
    row.append(node("span", "", institutionName(state, peer.id)), node("strong", "", pct(peer.riskWeight, 1)));
    list.append(row);
  }
  section.append(list.childElementCount ? list : node("p", "irb-muted", "No peer value for this class."));
  return section;
}

function renderCurrent() {
  if (!currentState || !currentModel) return;
  const mainScrollTop = content.scrollTop;
  const contextScrollTop = contextPanel.scrollTop;
  const state = currentState, model = currentModel;
  const result = calculateIrbMechanics({ ...scenario, kind: model.segment.kind });
  content.replaceChildren();
  contextPanel.querySelector(".irb-controls")?.remove();
  const header = node("header", "approach-header");
  const title = node("div");
  title.append(node("span", "approach-eyebrow", "CREDIT RISK · IRB MECHANICS"),
    node("h1", "", "How the IRB risk weight is built"),
    node("p", "", `${institutionName(state, model.institutionId)} · ${model.reference.label} · Framework ${model.reference.framework}`));
  const referenceField = node("label", "approach-reference-field", "Reference date");
  const select = node("select"); select.id = "irb-reference";
  for (const ref of [...model.references].reverse()) select.append(new Option(ref.label, ref.name, false, ref.name === model.reference.name));
  referenceField.append(select); header.append(title, referenceField); content.append(header);

  const intro = node("p", "irb-intro", "A common economic shock follows a Gaussian distribution. Asset correlation determines how strongly that shock affects defaults. The 99.9th-percentile conditional loss minus expected loss gives unexpected loss before the maturity adjustment. This is an aggregate illustration, not a regulatory recalculation.");
  content.append(intro);
  const controls = node("section", "irb-controls");
  const top = node("div", "irb-controls-top");
  top.append(node("h3", "", "Choose a reporting class"));
  const segmentSelect = node("select"); segmentSelect.id = "irb-segment";
  for (const item of IRB_SEGMENTS) segmentSelect.append(new Option(item.label, item.id, false, item.id === model.segment.id));
  top.append(segmentSelect); controls.append(top);
  const inputs = node("div", "irb-input-grid");
  inputs.append(
    buildInput("Probability of default · PD", "pd", 0.05, 20, 0.01, (v) => (v * 100).toFixed(2), "%"),
    buildInput("Loss given default · LGD", "lgd", 0, 100, 1, (v) => (v * 100).toFixed(0), "%"),
    buildInput("Effective maturity · M", "maturity", 1, 5, 0.1, (v) => v.toFixed(1), " years"),
    buildCorrelationInput(result)
  );
  controls.append(inputs);
  if (model.segment.kind !== "corporate") inputs.querySelector('[data-irb-input="maturity"]').disabled = true;
  const reset = node("button", "irb-reset", "Restore reported inputs"); reset.type = "button"; reset.id = "irb-reset";
  controls.append(reset);
  contextPanel.append(controls);

  const shocks = simulateSystemicShocks(60, simulationSeed);
  const sampleMean = shocks.reduce((sum, shock) => sum + shock, 0) / shocks.length;
  const sampleSd = Math.sqrt(shocks.reduce((sum, shock) => sum + (shock - sampleMean) ** 2, 0) / shocks.length);
  const simulation = node("section", "irb-simulation");
  const simulationHeader = node("div", "irb-simulation-header");
  const simulationHeading = node("div");
  simulationHeading.append(node("h3", "", "One possible path of the common factor"),
    node("p", "irb-muted", "60 independent illustrative annual draws of adverse shock S ~ N(0, 1). This is a sequence of scenarios, not observed history or a forecast."));
  const redraw = node("button", "irb-simulation-redraw", "New draw");
  redraw.type = "button"; redraw.id = "irb-simulation-redraw";
  simulationHeader.append(simulationHeading, redraw);
  const simulationFigure = node("figure", "irb-simulation-figure");
  simulationFigure.append(systemicPathSvg(shocks, scenario, result.correlation));
  simulation.append(simulationHeader, simulationFigure,
    node("p", "irb-simulation-stats", `Theoretical mean 0 · standard deviation 1 · 99.9th percentile +3.09σ. In this draw: mean ${sampleMean.toFixed(2)}σ · standard deviation ${sampleSd.toFixed(2)}σ.`),
    node("p", "irb-muted", "A high positive S is adverse. The same S affects every borrower; each also has its own independent shock. R sets the share of latent asset-return variance driven by S. These draws do not enter the analytical RWA calculation."));
  content.append(simulation);

  const flow = node("section", "irb-flow");
  for (const [label, value, explanation] of [
    ["Expected loss", pct(result.expectedRate), "PD × LGD"],
    ["99.9% conditional loss", pct(result.stressRate), `Systemic downturn · R ${pct(result.correlation, 1)}`],
    ["Unexpected loss · capital", pct(result.unexpectedRate), `Difference × maturity factor ${result.maturityFactor.toFixed(2)}`],
    ["Model risk weight", pct(result.riskWeight, 1), "Capital × 12.5"]
  ]) {
    const card = node("div", "irb-flow-card");
    card.append(node("span", "", label), node("strong", "", value), node("small", "", explanation)); flow.append(card);
  }
  const chartSection = node("section", "irb-chart-section");
  chartSection.append(node("h3", "", "From the Gaussian shock to unexpected loss"),
    node("p", "irb-muted", "The bell curve shows economic shocks, not amounts of loss. The green line marks the shock at which conditional loss equals expected loss; moving right does not mean expected loss rose. The brown line is the fixed 99.9th-percentile shock. The lower curve converts each shock into a loss, and the bracket measures their difference. Increase R to see a stronger response to adverse shocks."));
  const figure = node("figure", "irb-main-figure");
  figure.append(lossCurveSvg({ ...scenario, kind: model.segment.kind }));
  chartSection.append(figure,
    node("p", "irb-chart-explanation", `Expected loss = PD ${pct(scenario.pd)} × LGD ${pct(scenario.lgd)} = ${pct(result.expectedRate)}. Its green marker is placed on the economic-shock axis, not a loss axis. A lower PD reduces expected loss; its equivalent-shock marker can still move right.`));
  content.append(chartSection);
  content.append(flow);
  const comparison = node("section", "irb-comparison");
  comparison.append(node("h3", "", "Illustration versus reported C_08.01"));
  const figures = node("div", "irb-compare-grid");
  const reportedRiskWeight = model.reported.ead.value > 0 && Number.isFinite(model.reported.rwaBefore.value)
    ? model.reported.rwaBefore.value / model.reported.ead.value : null;
  for (const [label, value, detail] of [
    ["Model RWA", amount(result.rwa, state), `EAD ${amount(scenario.ead, state)} · ${scenario.source.ead ? "reported" : "illustrative"}`],
    ["Reported RWA before support factors", amount(model.reported.rwaBefore.value, state), "X 0255 · directly reported"],
    ["Reported risk weight", pct(reportedRiskWeight, 1), "Reported RWA before factors ÷ reported EAD"],
    ["Reported RWA after support factors", amount(model.reported.rwaAfter.value, state), "X 0260 · directly reported"],
    ["Reported expected loss", amount(model.reported.expectedLoss.value, state), "X 0280 · directly reported"]
  ]) {
    const card = node("div", "irb-compare-card");
    card.append(node("span", "", label), node("strong", "", value), node("small", "", detail)); figures.append(card);
  }
  comparison.append(figures); content.append(comparison);
  content.append(buildPeerSection(model, state, result));
  const details = node("details", "irb-source-details"); details.append(node("summary", "", "Inputs, formulas and limitations"));
  const source = node("div", "irb-source-text");
  source.append(node("p", "", `Selected class Z ${model.segment.z}, row Y 0010. EAD is X 0110; PD X 0010, LGD X 0230 and maturity (days) X 0250 first search Y 0070, then Y 0010. The values below show what was actually found.`));
  for (const [key, x, label] of [["pd", "0010", "PD"], ["lgd", "0230", "LGD"], ["maturityDays", "0250", "Maturity"], ["ead", "0110", "EAD"]]) {
    const cell = model.reported[key];
    source.append(node("p", "", `${label}: ${cell.value === null ? "not reported" : (key === "pd" || key === "lgd" ? pct(cell.value) : key === "ead" ? amount(cell.value, state) : `${Math.round(cell.value)} days`)} · X ${x} · Y ${cell.y || "—"}${cell.conflict ? " · conflicting duplicate rows" : ""}`));
  }
  source.append(node("p", "", "Missing inputs use explicit illustrative defaults (PD 1%, LGD 45%, M 2.5 years, EAD €100m). R defaults to the Basel class/PD function; moving its slider is an illustrative scenario, not a reported parameter. The Gaussian represents the systemic factor; conditional losses are a nonlinear transformation, not normally distributed. The class may include defaulted, slotted or otherwise specially treated exposures. An aggregate PD/LGD inserted into a nonlinear exposure-level formula cannot reproduce summed reported RWA. SME firm size, financial-sector correlation uplift, floors, guarantees, slotting and supporting factors are not inferred from C_08.01 totals."));
  const link = node("a", "", "Basel CRE31 · official risk-weight functions");
  link.href = "https://www.bis.org/committees/bcbs/basel-framework/standard/cre/31/inforce/2023-01-01/published/2020-03-27";
  link.target = "_blank"; link.rel = "noopener noreferrer"; source.append(link);
  details.append(source); content.append(details);
  renderSide(model, result, state);
  content.scrollTop = mainScrollTop;
  contextPanel.scrollTop = contextScrollTop;
}

export function wireIrbMechanicsUi() {
  if (!root) return;
  wirePanelResize();
  root?.addEventListener("change", (event) => {
    const inputKey = event.target.dataset.irbInput;
    if (inputKey && scenario) {
      scenario[inputKey] = (["pd", "lgd", "correlation"].includes(inputKey)) ? Number(event.target.value) / 100 : Number(event.target.value);
      if (inputKey !== "correlation") scenario.source[inputKey] = false;
      renderCurrent();
      return;
    }
    if (event.target.id === "irb-segment") {
      segmentId = event.target.value; scenario = null;
      const url = createUrlState(); url.searchParams.set(PARAM, segmentId); replaceUrlState(url);
      renderIrbMechanics(currentState); return;
    }
    if (event.target.id === "irb-reference") {
      const url = createUrlState(); url.searchParams.set(REFERENCE_PARAM, event.target.value); replaceUrlState(url);
      scenario = null; renderIrbMechanics(currentState);
    }
  });
  root?.addEventListener("input", (event) => {
    const key = event.target.dataset.irbInput;
    if (!key || !scenario) return;
    scenario[key] = (["pd", "lgd", "correlation"].includes(key)) ? Number(event.target.value) / 100 : Number(event.target.value);
    if (key !== "correlation") scenario.source[key] = false;
    event.target.closest(".irb-input")?.querySelector("output")?.replaceChildren(document.createTextNode(
      key === "maturity" ? `${scenario[key].toFixed(1)} years`
        : `${(scenario[key] * 100).toFixed(key === "pd" ? 2 : key === "correlation" ? 1 : 0)}%`
    ));
  });
  root?.addEventListener("click", (event) => {
    if (event.target.id === "irb-simulation-redraw") {
      simulationSeed += 1;
      renderCurrent();
      return;
    }
    if (event.target.id !== "irb-reset") return;
    scenario = makeScenario(currentModel); renderCurrent();
  });
}

export function renderIrbMechanics(state) {
  currentState = state;
  const params = readUrlStateParams();
  const model = buildIrbMechanicsModel(state, params.get(REFERENCE_PARAM) || "", segmentId);
  currentModel = model.status === "ready" ? model : null;
  if (!currentModel) {
    context.replaceChildren();
    contextPanel.querySelector(".irb-controls")?.remove();
    content.replaceChildren(node("p", "approach-empty", "Load C_08.01 data under framework 4.0 or 4.2 to inspect the IRB calculation."));
    return;
  }
  const nextKey = `${model.institutionId}|${model.reference.name}|${model.segment.id}`;
  if (!scenario || scenarioKey !== nextKey) {
    scenario = makeScenario(model);
    scenarioKey = nextKey;
  }
  renderCurrent();
}
