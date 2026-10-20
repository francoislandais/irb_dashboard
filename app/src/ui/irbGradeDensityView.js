import { buildIrbGradeDensityModel } from "../data/irbGradeDensity.js";
import { getInstitutionDisplayInfo } from "../data/institutionDictionary.js";
import { createUrlState, readUrlStateParams, replaceUrlState } from "./urlState.js";

const root = document.querySelector("#irb-grade-density-view");
const controls = document.querySelector("#irb-grade-density-controls");
const chart = document.querySelector("#irb-grade-density-chart");
const resizer = document.querySelector("#irb-grade-density-resizer");
const panel = root?.querySelector(".approach-context-panel");
const PORTFOLIO_PARAM = "grade_density_z";
const REFERENCE_PARAM = "grade_density_reference";
const SCALE_PARAM = "grade_density_pd_scale";
const WIDTH_KEY = "agoraIrbGradeDensityPanelWidth";
const COLORS = ["#0b76a8", "#c57924", "#4d8a58", "#8f67ad", "#c35165", "#1c8e89", "#7d6d35", "#656db3", "#ad588b", "#566f83"];
let zCode = readUrlStateParams().get(PORTFOLIO_PARAM) || "";
let referenceName = readUrlStateParams().get(REFERENCE_PARAM) || "";
let xScaleMode = readUrlStateParams().get(SCALE_PARAM) === "linear" ? "linear" : "log10";
let currentState = null;
let plotObserver = null;

function element(tag, className = "", value = "") {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.textContent = value;
  return node;
}

function svgElement(tag, attributes = {}, value = "") {
  const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [key, item] of Object.entries(attributes)) node.setAttribute(key, String(item));
  if (value) node.textContent = value;
  return node;
}

function formatPercent(value) {
  return new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: value < 0.001 ? 6 : 1 }).format(value);
}

function institutionLabel(state, id) {
  const name = getInstitutionDisplayInfo(state.institutionDictionary, id)?.institutionName;
  return name && name !== id ? `${name} (${id})` : id;
}

function syncUrl(model) {
  const url = createUrlState();
  if (model.portfolio) url.searchParams.set(PORTFOLIO_PARAM, model.portfolio.zCode);
  else url.searchParams.delete(PORTFOLIO_PARAM);
  if (model.reference) url.searchParams.set(REFERENCE_PARAM, model.reference.name);
  else url.searchParams.delete(REFERENCE_PARAM);
  if (xScaleMode === "linear") url.searchParams.set(SCALE_PARAM, "linear");
  else url.searchParams.delete(SCALE_PARAM);
  replaceUrlState(url);
}

function widthLimit() {
  return root.clientWidth > 0 ? Math.max(260, Math.min(900, root.clientWidth - 420)) : 900;
}

function setPanelWidth(value) {
  const width = Math.round(Math.max(260, Math.min(widthLimit(), value)));
  root.style.setProperty("--approach-sidebar-width", `${width}px`);
  resizer.setAttribute("aria-valuemax", String(widthLimit()));
  resizer.setAttribute("aria-valuenow", String(width));
  return width;
}

function wireResize() {
  let stored = 310;
  try { stored = Number(localStorage.getItem(WIDTH_KEY)) || 310; } catch { /* Optional storage. */ }
  setPanelWidth(stored);
  let startX = 0, startWidth = 0;
  resizer.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    startX = event.clientX;
    startWidth = panel.getBoundingClientRect().width;
    resizer.setPointerCapture(event.pointerId);
    root.classList.add("is-resizing");
    event.preventDefault();
  });
  resizer.addEventListener("pointermove", (event) => {
    if (resizer.hasPointerCapture(event.pointerId)) setPanelWidth(startWidth + event.clientX - startX);
  });
  const finish = (event) => {
    if (!resizer.hasPointerCapture(event.pointerId)) return;
    resizer.releasePointerCapture(event.pointerId);
    root.classList.remove("is-resizing");
    try { localStorage.setItem(WIDTH_KEY, resizer.getAttribute("aria-valuenow")); } catch { /* Optional storage. */ }
  };
  resizer.addEventListener("pointerup", finish);
  resizer.addEventListener("pointercancel", finish);
  resizer.addEventListener("keydown", (event) => {
    const width = panel.getBoundingClientRect().width;
    const next = event.key === "ArrowLeft" ? width - 24 : event.key === "ArrowRight" ? width + 24
      : event.key === "Home" ? 260 : event.key === "End" ? widthLimit() : null;
    if (next === null) return;
    event.preventDefault();
    try { localStorage.setItem(WIDTH_KEY, String(setPanelWidth(next))); } catch { setPanelWidth(next); }
  });
  if (typeof ResizeObserver !== "undefined") new ResizeObserver(() => {
    const width = Number(resizer.getAttribute("aria-valuenow")) || 310;
    if (root.clientWidth && width > widthLimit()) setPanelWidth(width);
  }).observe(root);
}

export function wireIrbGradeDensityUi() {
  if (!root || !controls || !chart || !resizer) return;
  wireResize();
  controls.addEventListener("change", (event) => {
    if (event.target.id === "irb-grade-density-z") zCode = event.target.value;
    if (event.target.id === "irb-grade-density-reference") referenceName = event.target.value;
    if (currentState) renderIrbGradeDensity(currentState);
  });
  controls.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-density-scale]");
    if (!button || !currentState) return;
    xScaleMode = button.dataset.densityScale;
    renderIrbGradeDensity(currentState);
  });
}

function addSelect(label, id, options, selected, valueKey, labelKey) {
  const field = element("label", "irb-grade-field");
  field.htmlFor = id;
  field.append(element("span", "irb-grade-field-label", label));
  const select = element("select", "irb-grade-select");
  select.id = id;
  for (const item of options) select.append(new Option(item[labelKey], item[valueKey], false, item[valueKey] === selected));
  field.append(select);
  controls.append(field);
}

function renderControls(model) {
  controls.replaceChildren();
  controls.append(element("div", "approach-context-eyebrow", "C_08.02 · IRB"));
  controls.append(element("h2", "irb-grade-title", "PD × risk density"));
  controls.append(element("p", "irb-grade-institution", "Compare all reporting institutions"));
  if (model.reference) {
    addSelect("Exposure class (Z)", "irb-grade-density-z", model.portfolios, model.portfolio?.zCode, "zCode", "label");
    addSelect("Reference date", "irb-grade-density-reference", model.references, model.reference.name, "name", "label");
  }
  const scaleField = element("div", "irb-grade-field");
  scaleField.append(element("span", "irb-grade-field-label", "PD axis"));
  const scaleButtons = element("div", "irb-grade-scale-options");
  for (const [mode, label] of [["log10", "Log10"], ["linear", "Linear"]]) {
    const button = element("button", `irb-grade-scale-button${xScaleMode === mode ? " is-active" : ""}`, label);
    button.type = "button";
    button.dataset.densityScale = mode;
    button.setAttribute("aria-pressed", String(xScaleMode === mode));
    scaleButtons.append(button);
  }
  scaleField.append(scaleButtons);
  controls.append(scaleField);
  controls.append(element("p", "irb-grade-explanation", "Each point is one reported obligor grade. PD is X 0010; risk density is RWA after supporting factors (X 0260) divided by EAD (X 0110) for the same institution, Z class, grade and date."));
  if (model.pointCount) controls.append(element("p", "irb-grade-count", `${model.pointCount.toLocaleString("en-US")} grades · ${model.series.length} institutions · framework ${model.reference.framework}`));
  if (model.conflictingPoints) controls.append(element("p", "irb-grade-caution", `${model.conflictingPoints} observations contain conflicting source values and are excluded.`));
  if (xScaleMode === "log10" && model.series.some((item) => item.points.some((point) => point.pd === 0))) {
    controls.append(element("p", "irb-grade-caution", "Zero PD values are not shown on the logarithmic axis. Select Linear to include them."));
  }
}

function drawPlot(svg, model, state, width) {
  const height = 550, left = 72, right = 32, top = 32, bottom = 74;
  const innerWidth = width - left - right, innerHeight = height - top - bottom;
  const allPoints = model.series.flatMap((series) => series.points);
  const positivePds = allPoints.map((point) => point.pd).filter((pd) => pd > 0);
  const smallestPositive = positivePds.reduce((minimum, pd) => Math.min(minimum, pd), Infinity);
  const minPd = Number.isFinite(smallestPositive) ? Math.min(0.1, 10 ** Math.floor(Math.log10(smallestPositive))) : 1e-4;
  const maxDensity = allPoints.reduce((maximum, point) => Math.max(maximum, point.density), 0.1);
  const roughStep = maxDensity * 1.04 / 5;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const step = [1, 2, 5, 10].find((candidate) => candidate * magnitude >= roughStep) * magnitude;
  const yMax = Math.ceil(maxDensity / step) * step;
  const x = (pd) => xScaleMode === "linear" ? left + innerWidth * pd
    : pd > 0 ? left + innerWidth * (Math.log10(pd) - Math.log10(minPd)) / -Math.log10(minPd) : null;
  const y = (density) => top + innerHeight * (1 - density / yMax);
  svg.replaceChildren();
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("aria-label", `Risk density versus probability of default for ${model.portfolio.label}, ${model.reference.label}`);
  for (let index = 0; index <= Math.round(yMax / step); index++) {
    const value = index * step, yy = y(value);
    svg.append(svgElement("line", { x1: left, x2: width - right, y1: yy, y2: yy, class: "irb-grade-grid" }));
    svg.append(svgElement("text", { x: left - 10, y: yy + 4, class: "irb-grade-y-label" }, formatPercent(value)));
  }
  const xTicks = xScaleMode === "linear" ? [0, 0.2, 0.4, 0.6, 0.8, 1]
    : Array.from({ length: Math.round(-Math.log10(minPd)) + 1 }, (_, index) => minPd * 10 ** index);
  for (const value of xTicks) {
    const xx = x(value);
    svg.append(svgElement("line", { x1: xx, x2: xx, y1: top, y2: top + innerHeight, class: "irb-grade-density-vgrid" }));
    svg.append(svgElement("text", { x: xx, y: height - bottom + 20, class: "irb-grade-density-x-label" }, formatPercent(value)));
  }
  svg.append(svgElement("text", { x: 12, y: 18, class: "irb-grade-axis-title" }, "RWA / EAD"));
  svg.append(svgElement("text", { x: width - right, y: height - 9, class: "irb-grade-axis-title irb-grade-x-title" }, `Probability of default${xScaleMode === "log10" ? " · log10" : ""}`));
  model.series.forEach((series, index) => {
    const color = COLORS[index % COLORS.length];
    const focused = series.institutionId === state.selectedJst;
    const group = svgElement("g", { class: `irb-grade-density-series${focused ? " is-focused" : ""}` });
    for (const point of series.points) {
      const xx = x(point.pd);
      if (xx === null) continue;
      const circle = svgElement("circle", { cx: xx, cy: y(point.density), r: focused ? 3.4 : 2.8,
        fill: color, "fill-opacity": focused ? 0.82 : 0.55 });
      circle.append(svgElement("title", {}, `${institutionLabel(state, series.institutionId)} · grade ${point.gradeId}\nPD: ${formatPercent(point.pd)} · RWA / EAD: ${formatPercent(point.density)}`));
      group.append(circle);
    }
    svg.append(group);
  });
}

export function renderIrbGradeDensity(state) {
  if (!root || !controls || !chart) return;
  currentState = state;
  const model = buildIrbGradeDensityModel(state, referenceName, zCode);
  if (model.reference) referenceName = model.reference.name;
  if (model.portfolio) zCode = model.portfolio.zCode;
  syncUrl(model);
  renderControls(model);
  if (plotObserver) { plotObserver.disconnect(); plotObserver = null; }
  chart.replaceChildren();
  const header = element("div", "irb-grade-chart-header");
  header.append(element("div", "approach-context-eyebrow", "IRB GRADE BENCHMARK"));
  header.append(element("h2", "irb-grade-chart-title", model.portfolio?.label || "PD × risk density"));
  if (model.reference) header.append(element("span", "irb-grade-chart-date", `${model.reference.label} · framework ${model.reference.framework}`));
  chart.append(header);
  if (model.status !== "ready") {
    chart.append(element("p", "irb-grade-empty", model.status === "no-grades"
      ? "No C_08.02 obligor-grade data is available for this dataset."
      : "No complete PD, EAD and RWA observations are available for this exposure class and date."));
    return;
  }
  const plot = element("div", "irb-grade-density-plot");
  const svg = svgElement("svg", { role: "img" });
  plot.append(svg);
  chart.append(plot);
  const draw = () => drawPlot(svg, model, state, Math.max(360, plot.clientWidth));
  if (typeof ResizeObserver !== "undefined") {
    plotObserver = new ResizeObserver(draw);
    plotObserver.observe(plot);
  }
  draw();
  const legend = element("div", "irb-grade-density-legend");
  model.series.forEach((series, index) => {
    const item = element("div", `irb-grade-density-legend-item${series.institutionId === state.selectedJst ? " is-focused" : ""}`);
    const swatch = element("span", "irb-grade-legend-swatch");
    swatch.style.backgroundColor = COLORS[index % COLORS.length];
    item.append(swatch, element("span", "", `${institutionLabel(state, series.institutionId)} · ${series.points.length} grades`));
    legend.append(item);
  });
  chart.append(legend);
}
