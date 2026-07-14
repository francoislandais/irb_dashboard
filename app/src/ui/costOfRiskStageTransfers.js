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
  onContextMenu,
  onSelectFlow,
  primaryDark,
  selectedFlowKey,
  selectedUnit,
  titlePosition = null,
  titleText = ""
}) {
  if (!container) return;

  const flows = flowDiagram?.flows ?? [];
  const residuals = flowDiagram?.residuals ?? [];
  const stageBalances = flowDiagram?.stageBalances ?? [];
  const writeOffs = flowDiagram?.writeOffs ?? [];
  const denominator = flowDiagram?.ratioDenominator ?? null;
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
  const displayStageBalances = stageBalances.map((item) => ({
    ...item,
    displayValue: getStageTransferDisplayValue(item.value, item.ratioDenominator ?? denominator, displayMode)
  }));
  const stageBalanceByStage = new Map(displayStageBalances.map((item) => [item.stage, item.displayValue]));
  const hasStageBalance = stageBalances.some((item) => Number.isFinite(item.value));

  if (values.length === 0 && !hasStageBalance) {
    container.textContent = flowDiagram?.status || "";
    return;
  }

  const maxFlow = Math.max(...values.map((value) => Math.abs(value)), 1);
  const viewBox = {
    height: 400,
    minX: -80,
    minY: 0,
    width: 1560
  };
  const svg = svgElement("svg", {
    class: "cost-of-risk-stage-flow-diagram",
    role: "img",
    viewBox: `${viewBox.minX} ${viewBox.minY} ${viewBox.width} ${viewBox.height}`,
    "aria-label": "F12.02 IFRS 9 stage transfer flow diagram"
  });
  const stageFill = "#f7f8f7";
  const stageStroke = "#c6cec8";
  const arrowWidth = 14;
  const selectedStage = getSelectedStageBoxStage(selectedFlowKey);

  addStageBox(svg, 40, 160, "Stage 1", stageFill, stageStroke, {
    flowKey: "stagebox:1",
    isSelected: selectedFlowKey === "stagebox:1",
    onContextMenu,
    onSelect: onSelectFlow,
    primaryDark,
    valueLabel: formatStageBoxValueLabel(stageBalanceByStage.get("1"), formatValue, displayMode, selectedUnit)
  });
  addStageBox(svg, 600, 160, "Stage 2", stageFill, stageStroke, {
    flowKey: "stagebox:2",
    isSelected: selectedFlowKey === "stagebox:2",
    onContextMenu,
    onSelect: onSelectFlow,
    primaryDark,
    valueLabel: formatStageBoxValueLabel(stageBalanceByStage.get("2"), formatValue, displayMode, selectedUnit)
  });
  addStageBox(svg, 1160, 160, "Stage 3", stageFill, stageStroke, {
    flowKey: "stagebox:3",
    isSelected: selectedFlowKey === "stagebox:3",
    onContextMenu,
    onSelect: onSelectFlow,
    primaryDark,
    valueLabel: formatStageBoxValueLabel(stageBalanceByStage.get("3"), formatValue, displayMode, selectedUnit)
  });

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
    isStageRelated: isFlowRelatedToSelectedStage("transfer:1-2", selectedStage),
    isSelected: selectedFlowKey === "transfer:1-2",
    labelY: 130,
    maxFlow,
    onContextMenu,
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
    isStageRelated: isFlowRelatedToSelectedStage("transfer:2-1", selectedStage),
    isSelected: selectedFlowKey === "transfer:2-1",
    labelY: 270,
    maxFlow,
    onContextMenu,
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
    isStageRelated: isFlowRelatedToSelectedStage("transfer:2-3", selectedStage),
    isSelected: selectedFlowKey === "transfer:2-3",
    labelY: 130,
    maxFlow,
    onContextMenu,
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
    isStageRelated: isFlowRelatedToSelectedStage("transfer:3-2", selectedStage),
    isSelected: selectedFlowKey === "transfer:3-2",
    labelY: 270,
    maxFlow,
    onContextMenu,
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
    onContextMenu,
    onSelectFlow,
    primaryDark,
    selectedStage,
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
      isStageRelated: isFlowRelatedToSelectedStage(`other:${item.stage}`, selectedStage),
      isSelected: selectedFlowKey === `other:${item.stage}`,
      label: ["Other", "movements"],
      labelSide: "left",
      maxFlow,
      onContextMenu,
      onSelect: onSelectFlow,
      primaryDark,
      value: residual?.displayValue,
      width: arrowWidth,
      x: otherMovementsX,
      y: 260
    }, formatValue, displayMode, selectedUnit);

    addResidualFlow(svg, {
      color: flowArrowColor,
      flowKey: `writeoff:${item.stage}`,
      isStageRelated: isFlowRelatedToSelectedStage(`writeoff:${item.stage}`, selectedStage),
      isSelected: selectedFlowKey === `writeoff:${item.stage}`,
      label: "Write-off",
      labelSide: "right",
      maxFlow,
      onContextMenu,
      onSelect: onSelectFlow,
      primaryDark,
      value: writeOff?.displayValue,
      width: arrowWidth,
      x: writeOffX,
      y: 260
    }, formatValue, displayMode, selectedUnit);
  });

  if (titleText) {
    const title = document.createElement("div");
    title.className = "cost-of-risk-stage-flow-title";
    title.textContent = titleText;
    title.style.left = `${12 + Number(titlePosition?.x ?? 0)}px`;
    title.style.top = `${8 + Number(titlePosition?.y ?? 5)}px`;
    container.replaceChildren(title, svg);
    return;
  }

  container.replaceChildren(svg);
}

function getSelectedStageBoxStage(selectedFlowKey) {
  return String(selectedFlowKey ?? "").match(/^stagebox:(\d)$/)?.[1] ?? "";
}

function isFlowRelatedToSelectedStage(flowKey, selectedStage) {
  if (!selectedStage) return false;

  const key = String(flowKey ?? "");
  const transferMatch = key.match(/^transfer:(\d)-(\d)$/);
  if (transferMatch) return transferMatch[1] === selectedStage || transferMatch[2] === selectedStage;

  const stageMovementMatch = key.match(/^(other|writeoff):(\d)$/);
  if (stageMovementMatch) return stageMovementMatch[2] === selectedStage;

  return false;
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

function scaleArrowLength(value, length) {
  if (!Number.isFinite(value) || value === 0) return 8;
  return length;
}

function scaleArrowWidth(value, maxFlow, minWidth =4, maxWidth = 32) {

  if (!Number.isFinite(value) || value === 0) return 0;

  const ratio = Math.abs(value) / maxFlow;

  return minWidth + ratio * (maxWidth - minWidth);

}

function addStageBox(svg, x, y, label, fill, stroke, config = {}) {
  const isSelected = Boolean(config.isSelected);
  const valueLabel = String(config.valueLabel ?? "");
  const rect = svgElement("rect", {
    fill: isSelected ? config.primaryDark : fill,
    height: 90,
    rx: 0,
    stroke: isSelected ? config.primaryDark : stroke,
    "stroke-width": 1,
    width: 220,
    x,
    y
  });
  svg.append(rect);
  const text = addText(svg, label, x + 110, y + (valueLabel && valueLabel !== "-" ? 40 : 50), "cost-of-risk-stage-flow-stage-label", {
    "text-anchor": "middle"
  });
  const value = valueLabel && valueLabel !== "-"
    ? addText(svg, valueLabel, x + 110, y + 66, "cost-of-risk-stage-flow-stage-value", {
      "text-anchor": "middle"
    })
    : null;
  if (isSelected) {
    text.style.fill = "#ffffff";
    if (value) value.style.fill = "#ffffff";
  }

  if (config.flowKey && typeof config.onSelect === "function") {
    [rect, text, value].filter(Boolean).forEach((element) => {
      element.style.cursor = "pointer";
      element.addEventListener("click", () => config.onSelect(config.flowKey));
      wireFlowElementContextMenu(element, config);
    });
  }
}

function formatStageBoxValueLabel(value, formatValue, displayMode, selectedUnit) {
  if (!Number.isFinite(value)) return "-";
  if (displayMode !== "ratio") return formatValue(value, displayMode, selectedUnit, false);

  return `${new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
  }).format(value / 100)} %`;
}

function addHorizontalFlow(svg, config, formatValue, displayMode, selectedUnit) {

  const value = config.value;

  if (!Number.isFinite(value) || value === 0) return;

  const maxFlow = config.maxFlow ?? Math.abs(value);

  const length = scaleArrowLength(value, 132);

  const width = scaleArrowWidth(value, maxFlow, 6, 32);

  const x2 = config.direction === "right" ? config.x + length : config.x - length;

  const path = createHorizontalArrowPath(config.x, config.y, x2, width);

  const pathElement = svgElement("path", {
    d: path,
    fill: config.isSelected ? config.primaryDark : config.color,
    stroke: config.isStageRelated ? config.primaryDark : "none",
    "stroke-linejoin": "round",
    "stroke-width": config.isStageRelated ? 2.5 : 0
  });
  makeFlowElementClickable(pathElement, config);
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
    config.primaryDark,
    config
  );
}
function addDirectFlow(svg, config, formatValue, displayMode, selectedUnit) {
  addHorizontalFlow(svg, {
    color: config.flowArrowColor,
    direction: "right",
    flowKey: "transfer:1-3",
    isStageRelated: isFlowRelatedToSelectedStage("transfer:1-3", config.selectedStage),
    isSelected: config.selectedFlowKey === "transfer:1-3",
    labelY: 38,
    maxFlow: config.maxFlow,
    onContextMenu: config.onContextMenu,
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
    isStageRelated: isFlowRelatedToSelectedStage("transfer:3-1", config.selectedStage),
    isSelected: config.selectedFlowKey === "transfer:3-1",
    labelY: 116,
    maxFlow: config.maxFlow,
    onContextMenu: config.onContextMenu,
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
  const length = scaleArrowLength(value, 108);

  const isIncrease = value >= 0;
  const startY = isIncrease ? config.y + length : config.y;
  const endY = isIncrease ? config.y : config.y + length;

  const pathElement = svgElement("path", {
    d: createVerticalArrowPath(config.x, startY, endY, width),
    fill: config.isSelected ? config.primaryDark : config.color,
    stroke: config.isStageRelated ? config.primaryDark : "none",
    "stroke-linejoin": "round",
    "stroke-width": config.isStageRelated ? 2.5 : 0
  });
  makeFlowElementClickable(pathElement, config);
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
    makeFlowElementClickable(lineElement, config);
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
    config.primaryDark,
    config
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
  wireFlowElementContextMenu(hitArea, config);
  svg.append(hitArea);
}

function makeFlowElementClickable(element, config) {
  if (!element || !config.flowKey || typeof config.onSelect !== "function") return;

  element.style.cursor = "pointer";
  element.addEventListener("click", (event) => {
    event.stopPropagation();
    config.onSelect(config.flowKey);
  });
  wireFlowElementContextMenu(element, config);
}

// Right-click support for the "Where does it come from?" audit trail —
// wired onto the same elements as the left-click selection (arrow shape,
// hit area, label, value) so any part of a flow can be right-clicked.
function wireFlowElementContextMenu(element, config) {
  if (!element || !config.flowKey || typeof config.onContextMenu !== "function") return;

  element.addEventListener("contextmenu", (event) => {
    event.stopPropagation();
    config.onContextMenu(config.flowKey, event);
  });
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

function addValueLabel(svg, value, x, y, formatValue, displayMode, selectedUnit, anchor = "middle", isSelected = false, selectedColor = primaryDark, flowConfig = null) {
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
  makeFlowElementClickable(label, flowConfig);
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
