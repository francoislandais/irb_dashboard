import { buildIrbGradeDetailModel } from "../data/irbGradeDetail.js";
import { createIrbGradeYScale } from "../data/irbGradeScale.js";
import { getInstitutionDisplayInfo } from "../data/institutionDictionary.js";
import { createUrlState, readUrlStateParams, replaceUrlState } from "./urlState.js";

const root = document.querySelector("#irb-grades-view");
const controls = document.querySelector("#irb-grades-controls");
const chart = document.querySelector("#irb-grades-chart");
const resizer = document.querySelector("#irb-grades-panel-resizer");
const panel = root?.querySelector(".approach-context-panel");
const PORTFOLIO_PARAM = "grade_portfolio";
const REFERENCE_PARAM = "grade_reference";
const SCALE_PARAM = "grade_scale";
const WIDTH_KEY = "agoraIrbGradePanelWidth";
const MIN_WIDTH = 260;
const MAX_WIDTH = 900;
const PLOT_HEIGHT = 480;
let portfolioId = readUrlStateParams().get(PORTFOLIO_PARAM) || "total";
let referenceName = readUrlStateParams().get(REFERENCE_PARAM) || "";
let scaleMode = readUrlStateParams().get(SCALE_PARAM) === "log10" ? "log10" : "linear";
let currentState = null;
let plotObserver = null;
let sliderFrame = 0;
const SERIES_COLORS = ["#0b76a8", "#c47724", "#5b7c35", "#8b60a9", "#c04f65", "#17877f", "#7766b2", "#795846"];

function element(tag, className = "", value = "") {
  const result = document.createElement(tag);
  if (className) result.className = className;
  result.textContent = value;
  return result;
}

function svgElement(tag, attributes = {}, value = "") {
  const result = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [key, item] of Object.entries(attributes)) result.setAttribute(key, String(item));
  if (value) result.textContent = value;
  return result;
}

function updateUrl(model) {
  const url = createUrlState();
  if (model.portfolio) url.searchParams.set(PORTFOLIO_PARAM, model.portfolio.id);
  else url.searchParams.delete(PORTFOLIO_PARAM);
  if (model.reference) url.searchParams.set(REFERENCE_PARAM, model.reference.name);
  else url.searchParams.delete(REFERENCE_PARAM);
  if (scaleMode === "log10") url.searchParams.set(SCALE_PARAM, "log10");
  else url.searchParams.delete(SCALE_PARAM);
  replaceUrlState(url);
}

function panelWidthLimit() {
  return root.clientWidth > 0
    ? Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, root.clientWidth - 420))
    : MAX_WIDTH;
}

function setPanelWidth(value) {
  const width = Math.round(Math.max(MIN_WIDTH, Math.min(panelWidthLimit(), value)));
  root.style.setProperty("--approach-sidebar-width", `${width}px`);
  resizer.setAttribute("aria-valuemax", String(panelWidthLimit()));
  resizer.setAttribute("aria-valuenow", String(width));
  return width;
}

function wirePanelResize() {
  let storedWidth = 320;
  try { storedWidth = Number(localStorage.getItem(WIDTH_KEY)) || 320; } catch { /* Storage is optional. */ }
  setPanelWidth(storedWidth);
  let pointerStart = 0, widthStart = 0;
  resizer.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    pointerStart = event.clientX;
    widthStart = panel.getBoundingClientRect().width;
    resizer.setPointerCapture(event.pointerId);
    root.classList.add("is-resizing");
    event.preventDefault();
  });
  resizer.addEventListener("pointermove", (event) => {
    if (resizer.hasPointerCapture(event.pointerId)) setPanelWidth(widthStart + event.clientX - pointerStart);
  });
  const finish = (event) => {
    if (!resizer.hasPointerCapture(event.pointerId)) return;
    resizer.releasePointerCapture(event.pointerId);
    root.classList.remove("is-resizing");
    try { localStorage.setItem(WIDTH_KEY, resizer.getAttribute("aria-valuenow")); } catch { /* Keep session width. */ }
  };
  resizer.addEventListener("pointerup", finish);
  resizer.addEventListener("pointercancel", finish);
  resizer.addEventListener("keydown", (event) => {
    const current = panel.getBoundingClientRect().width;
    const width = event.key === "ArrowLeft" ? current - 24
      : event.key === "ArrowRight" ? current + 24
      : event.key === "Home" ? MIN_WIDTH
      : event.key === "End" ? panelWidthLimit() : null;
    if (width === null) return;
    event.preventDefault();
    const next = setPanelWidth(width);
    try { localStorage.setItem(WIDTH_KEY, String(next)); } catch { /* Keep session width. */ }
  });
  if (typeof ResizeObserver !== "undefined") new ResizeObserver(() => {
    const current = Number(resizer.getAttribute("aria-valuenow")) || 320;
    if (root.clientWidth && current > panelWidthLimit()) setPanelWidth(current);
  }).observe(root);
}

export function wireIrbGradeDetailUi() {
  if (!root || !controls || !chart || !resizer) return;
  wirePanelResize();
  controls.addEventListener("change", (event) => {
    if (event.target.id === "irb-grade-portfolio") {
      portfolioId = event.target.value;
    }
    if (event.target.id === "irb-grade-reference") {
      referenceName = event.target.value;
    }
    if (currentState) renderIrbGradeDetail(currentState);
  });
  controls.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-grade-scale]");
    if (!button || !currentState) return;
    scaleMode = button.dataset.gradeScale;
    renderIrbGradeDetail(currentState);
  });
  chart.addEventListener("input", (event) => {
    if (event.target.id !== "irb-grade-time-slider" || !currentState) return;
    const references = event.target._gradeReferences || [];
    referenceName = references[Number(event.target.value)]?.name || referenceName;
    const date = chart.querySelector(".irb-grade-timeline-current");
    if (date) date.textContent = references[Number(event.target.value)]?.label || "";
    if (sliderFrame) cancelAnimationFrame(sliderFrame);
    sliderFrame = requestAnimationFrame(() => {
      sliderFrame = 0;
      renderIrbGradeDetail(currentState);
    });
  });
}

function addSelect(container, id, label, options, selectedValue, valueKey, labelKey) {
  const field = element("label", "irb-grade-field");
  field.htmlFor = id;
  field.append(element("span", "irb-grade-field-label", label));
  const select = element("select", "irb-grade-select");
  select.id = id;
  for (const item of options) select.append(new Option(item[labelKey], item[valueKey], false, item[valueKey] === selectedValue));
  field.append(select);
  container.append(field);
}

function renderControls(model, state) {
  controls.replaceChildren();
  controls.append(element("div", "approach-context-eyebrow", "C_08.02 · IRB"));
  controls.append(element("h2", "irb-grade-title", "Detail by obligor grade"));
  const institution = getInstitutionDisplayInfo(state.institutionDictionary, state.selectedJst);
  controls.append(element("p", "irb-grade-institution", institution?.institutionName || state.selectedJst || "No institution selected"));
  if (model.references.length) {
    addSelect(controls, "irb-grade-portfolio", "Portfolio", model.portfolios, model.portfolio.id, "id", "label");
    addSelect(controls, "irb-grade-reference", "Reference date", model.references, model.reference.name, "name", "label");
  }
  const scaleField = element("div", "irb-grade-field");
  scaleField.append(element("span", "irb-grade-field-label", "PD scale"));
  const scaleButtons = element("div", "irb-grade-scale-options");
  for (const [value, label] of [["linear", "Linear"], ["log10", "Log10"]]) {
    const button = element("button", `irb-grade-scale-button${scaleMode === value ? " is-active" : ""}`, label);
    button.type = "button";
    button.dataset.gradeScale = value;
    button.setAttribute("aria-pressed", String(scaleMode === value));
    scaleButtons.append(button);
  }
  scaleField.append(scaleButtons);
  controls.append(scaleField);
  controls.append(element("p", "irb-grade-explanation", "Each point is a reported obligor grade ID (OGR) and its probability of default (PD, column 0010). IDs are sorted numerically; their original spelling is preserved."));
  if (model.pointCount) {
    controls.append(element("p", "irb-grade-count", `${model.pointCount.toLocaleString("en-US")} reported PD values across ${model.series.length} exposure classes · framework ${model.reference.framework}`));
    controls.append(element("p", "irb-grade-explanation", "Each exposure class keeps its own reported grades and PDs. Values from different classes are never combined."));
  }
  if (model.conflictingPoints) controls.append(element("p", "irb-grade-caution", `${model.conflictingPoints} class/grade observations contain conflicting reported PDs and are not plotted.`));
  if (scaleMode === "log10" && model.series.some((series) => series.points.some((point) => point.pd === 0))) {
    controls.append(element("p", "irb-grade-caution", "A zero PD has no logarithm; zero values are marked at the bottom of the plot and excluded from the connecting line."));
  }
}

const formatPercent = (value) => `${new Intl.NumberFormat("en-US", { maximumFractionDigits: value < 0.001 ? 4 : 2 }).format(value * 100)}%`;

function renderPlot(svg, series, grades, scale, width) {
  const left = 68, top = 28, right = 26, bottom = 95;
  const plotHeight = PLOT_HEIGHT - top - bottom;
  const plotWidth = width - left - right;
  const x = (index) => left + (grades.length === 1 ? plotWidth / 2 : index * plotWidth / (grades.length - 1));
  const gradeIndex = new Map(grades.map((grade, index) => [grade, index]));
  const y = (pd) => {
    const position = scale.position(pd);
    return position === null ? null : top + plotHeight * position;
  };
  svg.replaceChildren();
  svg.setAttribute("viewBox", `0 0 ${width} ${PLOT_HEIGHT}`);
  svg.setAttribute("aria-label", `Probability of default by obligor grade, ${scale.mode === "log10" ? "logarithmic" : "linear"} scale`);
  for (const tick of scale.ticks) {
    const yy = y(tick);
    svg.append(svgElement("line", { x1: left, x2: width - right, y1: yy, y2: yy, class: "irb-grade-grid" }));
    svg.append(svgElement("text", { x: left - 10, y: yy + 4, class: "irb-grade-y-label" }, formatPercent(tick)));
  }
  svg.append(svgElement("text", { x: 12, y: 18, class: "irb-grade-axis-title" }, scale.mode === "log10" ? "PD · log10" : "PD"));
  svg.append(svgElement("text", { x: width - right, y: PLOT_HEIGHT - 8, class: "irb-grade-axis-title irb-grade-x-title" }, "Obligor grade ID"));
  const dense = series.reduce((total, item) => total + item.points.length, 0) > plotWidth / 5;
  for (const [seriesIndex, item] of series.entries()) {
    const color = SERIES_COLORS[seriesIndex % SERIES_COLORS.length];
    let path = "", previousIndex = -2;
    for (const point of item.points) {
      const index = gradeIndex.get(point.gradeId);
      const yy = y(point.pd);
      if (yy === null) { previousIndex = -2; continue; }
      path += `${index === previousIndex + 1 ? "L" : "M"}${x(index).toFixed(1)},${yy.toFixed(1)} `;
      previousIndex = index;
    }
    const line = svgElement("path", { d: path.trim(), class: "irb-grade-line" });
    line.style.setProperty("--series-color", color);
    svg.append(line);
    for (const point of item.points) {
      const xx = x(gradeIndex.get(point.gradeId));
      const yy = y(point.pd);
      const circle = svgElement("circle", {
        cx: xx, cy: yy === null ? top + plotHeight : yy, r: dense ? 2.1 : 3.4,
        class: yy === null ? "irb-grade-zero-dot" : `irb-grade-dot${dense ? " is-dense" : ""}`
      });
      circle.style.setProperty("--series-color", color);
      circle.append(svgElement("title", {}, `${item.label} (${item.zCode}) · grade ${point.gradeId}: ${formatPercent(point.pd)}${yy === null ? " (zero is outside the log10 scale)" : ""}`));
      svg.append(circle);
    }
  }
  // Every reported point is plotted; only axis labels are thinned.
  const labelStep = Math.max(1, Math.ceil(grades.length / Math.max(1, Math.floor(plotWidth / 58))));
  for (let index = 0; index < grades.length; index++) {
    if (index % labelStep === 0 || index === grades.length - 1) {
      svg.append(svgElement("text", {
        transform: `translate(${x(index)},${PLOT_HEIGHT - bottom + 16}) rotate(-45)`, class: "irb-grade-x-label"
      }, grades[index]));
    }
  }
}

function renderFullPlot(model, plot) {
  const svg = svgElement("svg", { role: "img" });
  plot.replaceChildren(svg);
  const scale = createIrbGradeYScale(model.series.flatMap((item) => item.points), scaleMode);
  const draw = () => renderPlot(svg, model.series, model.grades, scale, Math.max(320, plot.clientWidth));
  if (typeof ResizeObserver !== "undefined") {
    plotObserver = new ResizeObserver(draw);
    plotObserver.observe(plot);
  }
  draw();
}

export function renderIrbGradeDetail(state) {
  if (!root || !controls || !chart) return;
  currentState = state;
  const model = buildIrbGradeDetailModel(state, referenceName, portfolioId);
  if (model.reference) referenceName = model.reference.name;
  if (model.portfolio) portfolioId = model.portfolio.id;
  updateUrl(model);
  renderControls(model, state);
  if (plotObserver) { plotObserver.disconnect(); plotObserver = null; }
  let headerSlot = chart.querySelector(".irb-grade-header-slot");
  let plotSlot = chart.querySelector(".irb-grade-plot");
  let legendSlot = chart.querySelector(".irb-grade-legend");
  let timelineSlot = chart.querySelector(".irb-grade-timeline");
  if (!headerSlot) {
    headerSlot = element("div", "irb-grade-header-slot");
    plotSlot = element("div", "irb-grade-plot");
    legendSlot = element("div", "irb-grade-legend");
    timelineSlot = element("div", "irb-grade-timeline");
    chart.replaceChildren(headerSlot, plotSlot, legendSlot, timelineSlot);
  }
  headerSlot.replaceChildren();
  plotSlot.replaceChildren();
  legendSlot.replaceChildren();
  const header = element("div", "irb-grade-chart-header");
  header.append(element("div", "approach-context-eyebrow", "PROBABILITY OF DEFAULT"));
  header.append(element("h2", "irb-grade-chart-title", model.portfolio?.label || "By obligor grade"));
  if (model.reference) header.append(element("span", "irb-grade-chart-date", `${model.reference.label} · framework ${model.reference.framework}`));
  headerSlot.append(header);
  if (model.status !== "ready") {
    const message = model.status === "no-grades"
      ? "No dated obligor-grade PD values are available for this institution. Rows without a grade ID cannot be plotted."
      : model.status === "no-portfolio-data"
        ? "No reported obligor-grade PD values are available for this portfolio and date."
        : "Load a C_08.02 dataset and select an institution to view its grades.";
    plotSlot.append(element("p", "irb-grade-empty", message));
  } else {
    renderFullPlot(model, plotSlot);
    model.series.forEach((item, index) => {
      const legend = element("div", "irb-grade-legend-item");
      const swatch = element("span", "irb-grade-legend-swatch");
      swatch.style.backgroundColor = SERIES_COLORS[index % SERIES_COLORS.length];
      legend.append(swatch, element("span", "", `${item.label} (${item.zCode})`));
      legendSlot.append(legend);
    });
  }
  if (model.references.length > 1) {
    let slider = timelineSlot.querySelector("#irb-grade-time-slider");
    if (!slider) {
      const labels = element("div", "irb-grade-timeline-labels");
      labels.append(element("span", "irb-grade-timeline-start"), element("span", "irb-grade-timeline-current"), element("span", "irb-grade-timeline-end"));
      slider = document.createElement("input");
      slider.id = "irb-grade-time-slider";
      slider.className = "irb-grade-time-slider";
      slider.type = "range";
      slider.min = "0";
      slider.step = "1";
      slider.setAttribute("aria-label", "Reference date");
      timelineSlot.append(slider, labels);
    }
    slider.max = String(model.references.length - 1);
    slider.value = String(model.references.findIndex((item) => item.name === model.reference.name));
    slider._gradeReferences = model.references;
    timelineSlot.querySelector(".irb-grade-timeline-start").textContent = model.references[0].label;
    timelineSlot.querySelector(".irb-grade-timeline-current").textContent = model.reference.label;
    timelineSlot.querySelector(".irb-grade-timeline-end").textContent = model.references.at(-1).label;
    timelineSlot.hidden = false;
  } else {
    timelineSlot.hidden = true;
  }
}
