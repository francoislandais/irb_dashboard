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
