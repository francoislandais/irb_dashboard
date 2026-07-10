import { primaryDark } from "./theme.js?v=20260709-flow-arrow-color";

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
  flowArrowColor,
  flowDiagram,
  formatValue,
  onSelectFlow,
  primaryDark,
  selectedFlowKey,
  selectedUnit
}) {
  if (!container) return;

  const flows = flowDiagram?.flows ?? [];
  const residuals = flowDiagram?.residuals ?? [];
  const writeOffs = flowDiagram?.writeOffs ?? [];
  const denominator = flowDiagram?.totalPreviousExposure ?? null;
  const displayFlows = flows.map((flow) => ({
    ...flow,
    displayValue: getStageTransferDisplayValue(flow.value, denominator, displayMode)
  }));
  const displayResiduals = residuals.map((residual) => ({
    ...residual,
    displayValue: getStageTransferDisplayValue(residual.value, denominator, displayMode)
  }));
  const displayWriteOffs = writeOffs.map((writeOff) => ({
    ...writeOff,
    displayValue: getStageTransferDisplayValue(writeOff.value, denominator, displayMode)
  }));
  const values = [
    ...displayFlows.map((flow) => flow.displayValue),
    ...displayResiduals.map((residual) => residual.displayValue),
    ...displayWriteOffs.map((writeOff) => writeOff.displayValue)
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
    color: flowArrowColor,
    direction: "right",
    flowKey: "transfer:1-2",
    isSelected: selectedFlowKey === "transfer:1-2",
    labelY: 130,
    maxFlow,
    maxLength: 280,
    minLength: 28,
    onSelect: onSelectFlow,
    primaryDark,
    value: getFlowValue(displayFlows, "1", "2"),
    width: arrowWidth,
    x: 280,
    y: 205
  }, formatValue, displayMode, selectedUnit);
  addHorizontalFlow(svg, {
    color: flowArrowColor,
    direction: "left",
    flowKey: "transfer:2-1",
    isSelected: selectedFlowKey === "transfer:2-1",
    labelY: 270,
    maxFlow,
    maxLength: 280,
    minLength: 28,
    onSelect: onSelectFlow,
    primaryDark,
    value: getFlowValue(displayFlows, "2", "1"),
    width: arrowWidth,
    x: 560,
    y: 205
  }, formatValue, displayMode, selectedUnit);
  addHorizontalFlow(svg, {
    color: flowArrowColor,
    direction: "right",
    flowKey: "transfer:2-3",
    isSelected: selectedFlowKey === "transfer:2-3",
    labelY: 130,
    maxFlow,
    maxLength: 280,
    minLength: 28,
    onSelect: onSelectFlow,
    primaryDark,
    value: getFlowValue(displayFlows, "2", "3"),
    width: arrowWidth,
    x: 840,
    y: 205
  }, formatValue, displayMode, selectedUnit);
  addHorizontalFlow(svg, {
    color: flowArrowColor,
    direction: "left",
    flowKey: "transfer:3-2",
    isSelected: selectedFlowKey === "transfer:3-2",
    labelY: 270,
    maxFlow,
    maxLength: 280,
    minLength: 28,
    onSelect: onSelectFlow,
    primaryDark,
    value: getFlowValue(displayFlows, "3", "2"),
    width: arrowWidth,
    x: 1120,
    y: 205
  }, formatValue, displayMode, selectedUnit);

  addDirectFlow(svg, {
    flowArrowColor,
    fromStage1Value: getFlowValue(displayFlows, "1", "3"),
    fromStage3Value: getFlowValue(displayFlows, "3", "1"),
    maxFlow,
    onSelectFlow,
    primaryDark,
    selectedFlowKey,
    width: arrowWidth
  }, formatValue, displayMode, selectedUnit);

  const stageArrowOffset = 26;

  [
    { stage: "1", x: 150 },
    { stage: "2", x: 710 },
    { stage: "3", x: 1270 }
  ].forEach((item) => {
    const residual = displayResiduals.find((candidate) => candidate.stage === item.stage);
    const writeOff = displayWriteOffs.find((candidate) => candidate.stage === item.stage);
    const hasWriteOff = Number.isFinite(writeOff?.displayValue) && writeOff.displayValue !== 0;
    const otherMovementsX = hasWriteOff ? item.x - stageArrowOffset : item.x;
    const writeOffX = item.x + stageArrowOffset;

    addResidualFlow(svg, {
      color: flowArrowColor,
      flowKey: `other:${item.stage}`,
      isSelected: selectedFlowKey === `other:${item.stage}`,
      label: ["Other", "movements"],
      labelSide: "left",
      maxFlow,
      onSelect: onSelectFlow,
      primaryDark,
      value: residual?.displayValue,
      width: arrowWidth,
      x: otherMovementsX,
      y: 250
    }, formatValue, displayMode, selectedUnit);

    addResidualFlow(svg, {
      color: flowArrowColor,
      flowKey: `writeoff:${item.stage}`,
      isSelected: selectedFlowKey === `writeoff:${item.stage}`,
      label: "Write-off",
      labelSide: "right",
      maxFlow,
      onSelect: onSelectFlow,
      primaryDark,
      value: writeOff?.displayValue,
      width: arrowWidth,
      x: writeOffX,
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

  const pathElement = svgElement("path", {
    d: path,
    fill: config.isSelected ? config.primaryDark : config.color,
    stroke: config.primaryDark,
    "stroke-width": 1
  });
  svg.append(pathElement);

  const hitThickness = Math.max(width, FLOW_HIT_AREA_MIN_THICKNESS);
  appendFlowHitArea(svg, {
    height: hitThickness,
    width: Math.abs(x2 - config.x) + FLOW_HIT_AREA_PADDING * 2,
    x: Math.min(config.x, x2) - FLOW_HIT_AREA_PADDING,
    y: config.y - hitThickness / 2
  }, config);

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
    config.isSelected,
    config.primaryDark
  );
}
function addDirectFlow(svg, config, formatValue, displayMode, selectedUnit) {
  addHorizontalFlow(svg, {
    color: config.flowArrowColor,
    direction: "right",
    flowKey: "transfer:1-3",
    isSelected: config.selectedFlowKey === "transfer:1-3",
    labelY: 38,
    maxFlow: config.maxFlow,
    maxLength: 900,
    minLength: 44,
    onSelect: config.onSelectFlow,
    primaryDark: config.primaryDark,
    value: config.fromStage1Value,
    width: config.width,
    x: 460,
    y: 80
  }, formatValue, displayMode, selectedUnit);

  addHorizontalFlow(svg, {
    color: config.flowArrowColor,
    direction: "left",
    flowKey: "transfer:3-1",
    isSelected: config.selectedFlowKey === "transfer:3-1",
    labelY: 116,
    maxFlow: config.maxFlow,
    maxLength: 900,
    minLength: 44,
    onSelect: config.onSelectFlow,
    primaryDark: config.primaryDark,
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

  const pathElement = svgElement("path", {
    d: createVerticalArrowPath(config.x, startY, endY, width),
    fill: config.isSelected ? config.primaryDark : config.color,
    stroke: config.primaryDark,
    "stroke-width": 1
  });
  svg.append(pathElement);

  const hitThickness = Math.max(width, FLOW_HIT_AREA_MIN_THICKNESS);
  appendFlowHitArea(svg, {
    height: Math.abs(endY - startY) + FLOW_HIT_AREA_PADDING * 2,
    width: hitThickness,
    x: config.x - hitThickness / 2,
    y: Math.min(startY, endY) - FLOW_HIT_AREA_PADDING
  }, config);

  // Single combined label (name + value stacked) instead of two separate
  // text blocks, positioned on the outer side of the arrow (away from the
  // stage center) so the "Other movements" and "Write-off" labels stay
  // separated even when the arrows are brought closer together.
  const isRightSide = config.labelSide !== "left";
  const anchor = isRightSide ? "start" : "end";
  const labelX = config.x + (isRightSide ? 34 : -34);
  const centerY = config.y + length / 2;
  const labelLines = Array.isArray(config.label) ? config.label : [config.label ?? "Other movements"];
  const lineHeight = 20;
  const labelStartY = centerY - (lineHeight * labelLines.length) / 2;

  const labelColor = config.isSelected ? config.primaryDark : "#000000";
  const labelWeight = config.isSelected ? "700" : "400";

  labelLines.forEach((line, index) => {
    const lineElement = addText(svg, line, labelX, labelStartY + index * lineHeight, "cost-of-risk-stage-flow-side-text", {
      "text-anchor": anchor
    });
    lineElement.setAttribute("fill", labelColor);
    lineElement.style.fontWeight = labelWeight;
  });

  addValueLabel(
    svg,
    value,
    labelX,
    labelStartY + labelLines.length * lineHeight + 6,
    formatValue,
    displayMode,
    selectedUnit,
    anchor,
    config.isSelected,
    config.primaryDark
  );
}
const FLOW_HIT_AREA_PADDING = 16;
const FLOW_HIT_AREA_MIN_THICKNESS = 46;

// Arrows can render very thin (low-value flows), making them hard to click.
// Each arrow gets its own invisible, generously padded hit area instead of
// relying on the thin visible shape to catch the click.
function appendFlowHitArea(svg, bounds, config) {
  if (!config.flowKey || typeof config.onSelect !== "function") return;

  const hitArea = svgElement("rect", {
    fill: "transparent",
    height: bounds.height,
    width: bounds.width,
    x: bounds.x,
    y: bounds.y
  });
  hitArea.style.cursor = "pointer";
  hitArea.addEventListener("click", () => config.onSelect(config.flowKey));
  svg.append(hitArea);
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

function addValueLabel(svg, value, x, y, formatValue, displayMode, selectedUnit, anchor = "middle", isSelected = false, selectedColor = primaryDark) {
  const label = addText(
    svg,
    formatValue(Math.abs(value), displayMode, selectedUnit, false),
    x,
    y,
    "cost-of-risk-stage-flow-value",
    { "text-anchor": anchor }
  );

  label.setAttribute("fill", isSelected ? selectedColor : "#000000");
  label.style.fontWeight = isSelected ? "700" : "400";
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
