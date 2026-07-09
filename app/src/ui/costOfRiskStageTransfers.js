import { primaryDark } from "./theme.js";

export function renderCostOfRiskStageExposureTable({
  activeReferenceDate,
  container,
  exposureTable,
  formatMetricValue,
  formatReferenceQuarterLabel,
  formatSignedMetricValue,
  onSelectReferenceDate,
  selectedUnit
}) {
  if (!container) return;

  const rows = exposureTable?.rows ?? [];
  const dates = exposureTable?.dates ?? [];
  if (rows.length === 0 || dates.length === 0) {
    container.textContent = exposureTable?.status || "";
    return;
  }

  const title = document.createElement("div");
  title.className = "cost-of-risk-stage-exposure-title";
  title.textContent = `F04.04.1 gross carrying amount - ${exposureTable.label}`;

  const tableWrap = document.createElement("div");
  tableWrap.className = "cost-of-risk-stage-exposure-table-wrap";
  const table = document.createElement("table");
  table.className = "cost-of-risk-stage-exposure-table";
  const selectedReferenceDate = activeReferenceDate || dates.at(-1)?.label || "";

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  const stageHeader = document.createElement("th");
  stageHeader.scope = "col";
  stageHeader.textContent = "Stage";
  headerRow.append(stageHeader);

  dates.forEach((date) => {
    const cell = document.createElement("th");
    cell.scope = "col";
    cell.textContent = formatReferenceQuarterLabel(date.label);
    if (date.label === selectedReferenceDate) cell.classList.add("is-active-reference");
    cell.addEventListener("click", () => {
      if (date.label) onSelectReferenceDate(date.label);
    });
    headerRow.append(cell);
  });
  thead.append(headerRow);

  const tbody = document.createElement("tbody");
  rows.forEach((row) => {
    const tr = document.createElement("tr");
    if (row.isActive) tr.classList.add("is-active-stage");

    const labelCell = document.createElement("th");
    labelCell.scope = "row";
    labelCell.textContent = row.label;
    tr.append(labelCell);

    row.values.forEach((value, index) => {
      const date = dates[index];
      const valueCell = document.createElement("td");
      valueCell.textContent = Number.isFinite(value) ? formatMetricValue(value, selectedUnit) : "-";
      if (date?.label === selectedReferenceDate) valueCell.classList.add("is-active-reference");
      valueCell.addEventListener("click", () => {
        if (date?.label) onSelectReferenceDate(date.label);
      });
      tr.append(valueCell);
    });

    tbody.append(tr);
    tbody.append(createDeltaRow({
      dates,
      formatSignedMetricValue,
      onSelectReferenceDate,
      row,
      selectedReferenceDate,
      selectedUnit
    }));
  });

  table.append(thead, tbody);
  tableWrap.append(table);
  container.replaceChildren(title, tableWrap);
}

function createDeltaRow({
  dates,
  formatSignedMetricValue,
  onSelectReferenceDate,
  row,
  selectedReferenceDate,
  selectedUnit
}) {
  const deltaRow = document.createElement("tr");
  deltaRow.className = "cost-of-risk-stage-exposure-delta";
  if (row.isActive) deltaRow.classList.add("is-active-stage");

  const deltaLabelCell = document.createElement("th");
  deltaLabelCell.scope = "row";
  deltaLabelCell.textContent = "Delta";
  deltaRow.append(deltaLabelCell);

  row.values.forEach((value, index) => {
    const date = dates[index];
    const previousValue = row.values[index - 1];
    const deltaCell = document.createElement("td");
    const delta = Number.isFinite(value) && Number.isFinite(previousValue) ? value - previousValue : null;
    deltaCell.textContent = Number.isFinite(delta) ? formatSignedMetricValue(delta, selectedUnit) : "-";
    if (date?.label === selectedReferenceDate) deltaCell.classList.add("is-active-reference");
    deltaCell.addEventListener("click", () => {
      if (date?.label) onSelectReferenceDate(date.label);
    });
    deltaRow.append(deltaCell);
  });

  return deltaRow;
}

export function createStageTransferWaterfallData(contributions, stage, globalVariation = null, residual = null) {
  const outflows = contributions.filter((point) => point.flowDirection === "outflow");
  const inflows = contributions.filter((point) => point.flowDirection === "inflow");
  let runningTotal = 0;
  const items = [];
  const values = [0];
  const groups = [
    ...(globalVariation ? [{ label: "Global variation", points: [globalVariation], resetAfter: true }] : []),
    { label: `Entering Stage ${stage}`, points: inflows },
    { label: `Leaving Stage ${stage}`, points: outflows },
    ...(residual ? [{ label: "Residual", points: [residual] }] : [])
  ];

  groups.forEach((group, groupIndex) => {
    if (group.resetBefore || (groupIndex > 0 && groups[groupIndex - 1]?.resetAfter)) {
      runningTotal = 0;
    }

    group.points.forEach((point, pointIndex) => {
      const start = runningTotal;
      const end = runningTotal + point.y;
      items.push({
        axisLabel: point.axisLabel,
        color: point.color,
        contribution: point.y,
        end,
        groupIndex,
        groupLabel: pointIndex === 0 ? group.label : "",
        name: point.name,
        start
      });
      values.push(end);
      runningTotal = end;
    });
  });

  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue;
  const padding = range > 0 ? range * 0.08 : 1;

  return {
    items,
    max: maxValue + padding,
    min: minValue - padding
  };
}

export function getStageTransferAxisLabel(point) {
  const label = String(point.label ?? "");
  const toStage = label.match(/\bto\s+stage\s+(\d+)/i)?.[1];
  const fromStage = label.match(/\bfrom\s+stage\s+(\d+)/i)?.[1];

  if (point.sign < 0 && toStage) return `To\nStage ${toStage}`;
  if (point.sign >= 0 && fromStage) return `From\nStage ${fromStage}`;

  return label;
}

export function getStageTransferDisplayValue(value, denominator, displayMode) {
  if (!Number.isFinite(value)) return null;
  if (displayMode !== "ratio") return value;
  return Number.isFinite(denominator) && denominator !== 0 ? (value / denominator) * 10000 : null;
}

export function renderCostOfRiskStageTransferFlowDiagram({
  container,
  displayMode,
  flowDiagram,
  formatValue,
  primaryDark,
  selectedUnit
}) {
  if (!container) return;

  const flows = flowDiagram?.flows ?? [];
  const residuals = flowDiagram?.residuals ?? [];
  const denominator = flowDiagram?.totalPreviousExposure ?? null;
  const displayFlows = flows.map((flow) => ({
    ...flow,
    displayValue: getStageTransferDisplayValue(flow.value, denominator, displayMode)
  }));
  const displayResiduals = residuals.map((residual) => ({
    ...residual,
    displayValue: getStageTransferDisplayValue(residual.value, denominator, displayMode)
  }));
  const values = [
    ...displayFlows.map((flow) => flow.displayValue),
    ...displayResiduals.map((residual) => residual.displayValue)
  ].filter((value) => Number.isFinite(value));

  if (values.length === 0) {
    container.textContent = flowDiagram?.status || "";
    return;
  }

  const maxFlow = Math.max(...values.map((value) => Math.abs(value)), 1);
  const svg = svgElement("svg", {
    class: "cost-of-risk-stage-flow-diagram",
    role: "img",
    viewBox: "0 0 1400 520",
    "aria-label": "F12.02 IFRS 9 stage transfer flow diagram"
  });
  const mutedArrow = "#c9cecb";
  const stageFill = "#f7f8f7";
  const stageStroke = "#c6cec8";
  const arrowWidth = 14;

  addStageBox(svg, 40, 160, "Stage 1", stageFill, stageStroke);
  addStageBox(svg, 600, 160, "Stage 2", stageFill, stageStroke);
  addStageBox(svg, 1160, 160, "Stage 3", stageFill, stageStroke);

  addStage1ToStage3Junction(svg, {
  x1: 150,
  x2: 1270,
  yTop: 100,
  yDown: 160,
  color: "#d9d9d9"
});

  addHorizontalFlow(svg, {
    color: primaryDark,
    direction: "right",
    labelY: 130,
    maxFlow,
    maxLength: 280,
    minLength: 28,
    value: getFlowValue(displayFlows, "1", "2"),
    width: arrowWidth,
    x: 280,
    y: 205
  }, formatValue, displayMode, selectedUnit);
  addHorizontalFlow(svg, {
    color: mutedArrow,
    direction: "left",
    labelY: 270,
    maxFlow,
    maxLength: 280,
    minLength: 28,
    value: getFlowValue(displayFlows, "2", "1"),
    width: arrowWidth,
    x: 560,
    y: 205
  }, formatValue, displayMode, selectedUnit);
  addHorizontalFlow(svg, {
    color: primaryDark,
    direction: "right",
    labelY: 130,
    maxFlow,
    maxLength: 280,
    minLength: 28,
    value: getFlowValue(displayFlows, "2", "3"),
    width: arrowWidth,
    x: 840,
    y: 205
  }, formatValue, displayMode, selectedUnit);
  addHorizontalFlow(svg, {
    color: mutedArrow,
    direction: "left",
    labelY: 270,
    maxFlow,
    maxLength: 280,
    minLength: 28,
    value: getFlowValue(displayFlows, "3", "2"),
    width: arrowWidth,
    x: 1120,
    y: 205
  }, formatValue, displayMode, selectedUnit);

  addDirectFlow(svg, {
    fromStage1Value: getFlowValue(displayFlows, "1", "3"),
    fromStage3Value: getFlowValue(displayFlows, "3", "1"),
    maxFlow,
    mutedArrow,
    primaryDark,
    width: arrowWidth
  }, formatValue, displayMode, selectedUnit);

  [
    { stage: "1", x: 150 },
    { stage: "2", x: 710 },
    { stage: "3", x: 1270 }
  ].forEach((item) => {
    const residual = displayResiduals.find((candidate) => candidate.stage === item.stage);
    addResidualFlow(svg, {
      color: residual?.displayValue >= 0 ? primaryDark : mutedArrow,
      label: "Other movements",
      maxFlow,
      value: residual?.displayValue,
      width: arrowWidth,
      x: item.x,
      y: 250
    }, formatValue, displayMode, selectedUnit);
  });

  container.replaceChildren(svg);
}

function addStage1ToStage3Junction(svg, {
  x1 = 150,
  x2 = 1270,
  yTop = 55,
  yDown = 100,
  color = "#d9d9d9"
} = {}) {
  svg.append(svgElement("path", {
    d: [
      `M ${x1} ${yDown}`,
      `L ${x1} ${yTop}`,
      `L ${x2} ${yTop}`,
      `L ${x2} ${yDown}`
    ].join(" "),
    fill: "none",
    stroke: color,
    "stroke-width": 3,
    "stroke-dasharray": "4 2",
    "stroke-linecap": "butt",
    "stroke-linejoin": "miter"
  }));
  addText(

    svg,

    "Direct transfer",

    (x1 + x2) / 2,

    yTop - 15,

    "cost-of-risk-stage-flow-direct-transfer-label",

    { "text-anchor": "middle" }

  );
}

function getFlowValue(flows, from, to) {
  return flows.find((flow) => flow.from === from && flow.to === to)?.displayValue ?? null;
}

function scaleArrowLength(value, maxFlow, minLength, maxLength) {
  if (!Number.isFinite(value) || value === 0) return 8;
  return 140;
}

function scaleArrowWidth(value, maxFlow, minWidth =4, maxWidth = 32) {

  if (!Number.isFinite(value) || value === 0) return 0;

  const ratio = Math.abs(value) / maxFlow;

  return minWidth + ratio * (maxWidth - minWidth);

}

function addStageBox(svg, x, y, label, fill, stroke) {
  svg.append(svgElement("rect", {
    fill,
    height: 90,
    rx: 0,
    stroke,
    "stroke-width": 1,
    width: 220,
    x,
    y
  }));
  addText(svg, label, x + 110, y + 50, "cost-of-risk-stage-flow-stage-label", {
    "text-anchor": "middle"
  });
}
function addHorizontalFlow(svg, config, formatValue, displayMode, selectedUnit) {

  const value = config.value;

  if (!Number.isFinite(value) || value === 0) return;

  const maxFlow = config.maxFlow ?? Math.abs(value);

  const length = scaleArrowLength(value, maxFlow, config.minLength ?? 70, config.maxLength ?? 280);

  const width = scaleArrowWidth(value, maxFlow, 6, 32);

  const x2 = config.direction === "right" ? config.x + length : config.x - length;

  const path = createHorizontalArrowPath(config.x, config.y, x2, width);

  svg.append(svgElement("path", {

    d: path,

    fill: config.color

  }));

  const labelOffset = 40; // distance au-dessus de la flèche

  addValueLabel(
    svg,
    value,
    (config.x + x2) / 2,
    config.y - labelOffset,
    formatValue,
    displayMode,
    selectedUnit,
    "middle",
    config.color
  );
}
function addDirectFlow(svg, config, formatValue, displayMode, selectedUnit) {
  addHorizontalFlow(svg, {
    color: config.primaryDark,
    direction: "right",
    labelY: 38,
    maxFlow: config.maxFlow,
    maxLength: 900,
    minLength: 44,
    value: config.fromStage1Value,
    width: config.width,
    x: 460,
    y: 80
  }, formatValue, displayMode, selectedUnit);

  addHorizontalFlow(svg, {
    color: config.mutedArrow,
    direction: "left",
    labelY: 116,
    maxFlow: config.maxFlow,
    maxLength: 900,
    minLength: 44,
    value: config.fromStage3Value,
    width: config.width,
    x: 960,
    y: 80
  }, formatValue, displayMode, selectedUnit);
}

function addResidualFlow(svg, config, formatValue, displayMode, selectedUnit) {
  const value = config.value;
  if (!Number.isFinite(value) || value === 0) return;

  const maxFlow = config.maxFlow ?? Math.abs(value);
  const width = scaleArrowWidth(value, maxFlow, 6, 32);
  const length = scaleArrowLength(value, maxFlow, 28, 180);

  const isIncrease = value >= 0;
  const startY = isIncrease ? config.y + length : config.y;
  const endY = isIncrease ? config.y : config.y + length;

  svg.append(svgElement("path", {
    d: createVerticalArrowPath(config.x, startY, endY, width),
    fill: config.color
  }));

  addText(svg, "Other", config.x - 130, 335, "cost-of-risk-stage-flow-side-text");
  addText(svg, "movements", config.x - 130, 359, "cost-of-risk-stage-flow-side-text");

  addValueLabel(
    svg,
    value,
    config.x + 55,
    config.y + length / 2,
    formatValue,
    displayMode,
    selectedUnit,
    "start",
    config.color
  );
}
function createHorizontalArrowPath(x1, y, x2, width) {
  const direction = x2 >= x1 ? 1 : -1;
  const half = width / 2;
  const headLength = 24;
  const headHalf = width;
  const shaftEnd = x2 - direction * headLength;

  return [
    `M ${x1} ${y - half}`,
    `L ${shaftEnd} ${y - half}`,
    `L ${shaftEnd} ${y - headHalf}`,
    `L ${x2} ${y}`,
    `L ${shaftEnd} ${y + headHalf}`,
    `L ${shaftEnd} ${y + half}`,
    `L ${x1} ${y + half}`,
    "Z"
  ].join(" ");
}

function createVerticalArrowPath(x, y1, y2, width) {
  const direction = y2 >= y1 ? 1 : -1;
  const half = width / 2;
  const headLength = 24;
  const headHalf = width;
  const shaftEnd = y2 - direction * headLength;

  return [
    `M ${x - half} ${y1}`,
    `L ${x + half} ${y1}`,
    `L ${x + half} ${shaftEnd}`,
    `L ${x + headHalf} ${shaftEnd}`,
    `L ${x} ${y2}`,
    `L ${x - headHalf} ${shaftEnd}`,
    `L ${x - half} ${shaftEnd}`,
    "Z"
  ].join(" ");
}

function addValueLabel(svg, value, x, y, formatValue, displayMode, selectedUnit, anchor = "middle", color = null) {
  const label = addText(
    svg,
    formatValue(Math.abs(value), displayMode, selectedUnit, false),
    x,
    y,
    "cost-of-risk-stage-flow-value",
    { "text-anchor": anchor }
  );

  label.setAttribute("fill", color ?? (value >= 0 ? primaryDark : "#4c5651"));
}

function addText(svg, value, x, y, className, attrs = {}) {
  const text = svgElement("text", {
    class: className,
    x,
    y,
    ...attrs
  });
  text.textContent = value;
  svg.append(text);
  return text;
}

function svgElement(name, attrs = {}) {
  const element = document.createElementNS("http://www.w3.org/2000/svg", name);
  Object.entries(attrs).forEach(([key, value]) => {
    if (value !== null && value !== undefined) element.setAttribute(key, value);
  });
  return element;
}
