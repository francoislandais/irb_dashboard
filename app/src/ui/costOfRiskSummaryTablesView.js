import { COST_OF_RISK_FILTER_ALL } from "../data/costOfRisk.js?v=20260717-allowances-group-tab";
import { formatContributionPercentValue, formatMetricValue, formatSignedMetricValue } from "../data/core/formatting.js?v=20260710-bp-format";

export const COST_OF_RISK_COUNTERPARTY_SUMMARY_ROW_VALUES = {
  all: COST_OF_RISK_FILTER_ALL,
  "central-banks": "Central banks",
  "credit-institutions": "Credit institutions",
  governments: "General governments",
  households: "Households",
  "hh-consumption": "HH_CONSUMPTION",
  "hh-rre": "HH_RRE",
  nfc: "Non-financial corporations",
  "nfc-cre": "NFC_CRE",
  "nfc-smes": "NFC_SMES",
  "other-financials": "Other financial corporations"
};

export function renderCostOfRiskStageSummaryTable({
  activeCellKey,
  container,
  displayMode,
  filters,
  formatReferenceQuarterLabel,
  onCellSelect,
  onColumnSelect,
  onRowSelect,
  referenceDate,
  selectedUnit = "millions",
  stageSummary
}) {
  if (!container) return;

  const table = document.createElement("table");
  table.className = "cost-of-risk-stage-summary-grid";
  table.append(createCostOfRiskStageSummaryColGroup());
  table.append(createCostOfRiskStageSummaryHead(activeCellKey, onColumnSelect));

  const tbody = document.createElement("tbody");
  (stageSummary.rows ?? []).forEach((row) => {
    const tr = document.createElement("tr");
    tr.className = "cost-of-risk-stage-summary-row";
    tr.classList.add(`cost-of-risk-stage-summary-row--level-${getCostOfRiskStageSummaryRowLevel(row.key)}`);
    tr.classList.toggle("is-total-row", row.key === "all");
    tr.classList.toggle("is-active-stage", getCostOfRiskStageSummaryFilterValue(row.key) === filters.stage);
    tr.classList.toggle("is-active-summary-row", getCostOfRiskSummaryCellRowKey(activeCellKey) === row.key);
    tr.dataset.costOfRiskStageSummaryRow = row.key;
    tr.addEventListener("click", () => onRowSelect(row.key));

    const labelCell = document.createElement("th");
    labelCell.scope = "row";
    labelCell.className = "cost-of-risk-stage-summary-row-label";
    labelCell.append(createCostOfRiskSummaryRowButton(row.label, () => onRowSelect(row.key)));
    tr.append(labelCell);

    ["gca", "allowances", "coverage"].forEach((metric, index) => {
      tr.append(createCostOfRiskStageSummaryDataCell({
        activeCellKey,
        displayMode,
        filters,
        formatReferenceQuarterLabel,
        metric,
        kind: "level",
        onCellSelect,
        referenceDate,
        row,
        selectedUnit
      }));
      tr.append(createCostOfRiskStageSummaryDataCell({
        activeCellKey,
        displayMode,
        filters,
        formatReferenceQuarterLabel,
        metric,
        kind: "mom",
        onCellSelect,
        referenceDate,
        row,
        selectedUnit
      }));
      if (index < 2) {
        const gap = document.createElement("td");
        gap.className = "cost-of-risk-stage-summary-gap";
        tr.append(gap);
      }
    });
    tbody.append(tr);
  });
  table.append(tbody);

  container.replaceChildren(table);
}

export function renderCostOfRiskCounterpartySummaryTable({
  activeCellKey,
  container,
  displayMode,
  filters,
  formatReferenceQuarterLabel,
  onCellSelect,
  onColumnSelect,
  onRowSelect,
  onToggleOther,
  otherOpen,
  referenceDate,
  selectedUnit = "millions",
  counterpartySummary
}) {
  if (!container) return;

  const table = document.createElement("table");
  table.className = "cost-of-risk-stage-summary-grid cost-of-risk-counterparty-summary-grid";
  table.append(createCostOfRiskStageSummaryColGroup());
  table.append(createCostOfRiskStageSummaryHead(activeCellKey, onColumnSelect));

  const tbody = document.createElement("tbody");
  (counterpartySummary.rows ?? []).forEach((row) => {
    if (row.type === "group") {
      tbody.append(createCostOfRiskCounterpartySummaryGroupRow(row, otherOpen, onToggleOther));
      return;
    }
    if (row.group === "other" && !otherOpen) return;

    const tr = document.createElement("tr");
    tr.className = "cost-of-risk-stage-summary-row";
    tr.classList.add(`cost-of-risk-stage-summary-row--level-${getCostOfRiskCounterpartySummaryRowLevel(row)}`);
    tr.classList.toggle("is-total-row", row.key === "all");
    tr.classList.toggle("is-active-stage", row.value === filters.counterparty);
    tr.classList.toggle("is-active-summary-row", getCostOfRiskSummaryCellRowKey(activeCellKey) === row.key);
    tr.dataset.costOfRiskCounterpartySummaryRow = row.key;
    tr.addEventListener("click", () => onRowSelect(row.key, row.value));

    const labelCell = document.createElement("th");
    labelCell.scope = "row";
    labelCell.className = `cost-of-risk-stage-summary-row-label${row.group === "other" ? " cost-of-risk-counterparty-summary-other-label" : ""}`;
    labelCell.append(createCostOfRiskSummaryRowButton(row.label, () => onRowSelect(row.key, row.value)));
    tr.append(labelCell);

    ["gca", "allowances", "coverage"].forEach((metric, index) => {
      tr.append(createCostOfRiskCounterpartySummaryDataCell({
        activeCellKey,
        displayMode,
        filters,
        formatReferenceQuarterLabel,
        metric,
        kind: "level",
        onCellSelect,
        referenceDate,
        row,
        selectedUnit
      }));
      tr.append(createCostOfRiskCounterpartySummaryDataCell({
        activeCellKey,
        displayMode,
        filters,
        formatReferenceQuarterLabel,
        metric,
        kind: "mom",
        onCellSelect,
        referenceDate,
        row,
        selectedUnit
      }));
      if (index < 2) {
        const gap = document.createElement("td");
        gap.className = "cost-of-risk-stage-summary-gap";
        tr.append(gap);
      }
    });
    tbody.append(tr);
  });
  table.append(tbody);

  container.replaceChildren(table);
}

export function formatCostOfRiskStageSummaryCell(cell, metric, kind, selectedUnit, displayMode) {
  if (!cell) return "-";
  if (metric === "coverage") {
    return kind === "mom"
      ? formatSignedBasisPointsValue(cell.momRatioBasisPoints)
      : (Number.isFinite(cell.ratio) ? formatContributionPercentValue(cell.ratio) : "-");
  }

  if (kind === "level") return Number.isFinite(cell.value) ? formatMetricValue(cell.value, selectedUnit) : "-";
  if (displayMode === "amount") return Number.isFinite(cell.mom) ? formatSignedMetricValue(cell.mom, selectedUnit) : "-";
  return formatSignedGrowthPercentValue(cell.momRatioBasisPoints);
}

export function formatSignedBasisPointsValue(value) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "-";

  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
    signDisplay: "exceptZero"
  }).format(value)} bp`;
}

export function formatSignedGrowthPercentValue(basisPointsValue) {
  if (basisPointsValue === null || basisPointsValue === undefined || !Number.isFinite(basisPointsValue)) return "-";

  return `${new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
    signDisplay: "exceptZero"
  }).format(basisPointsValue / 100)} %`;
}

export function getCostOfRiskStageSummaryMetricLabel(selectedCell) {
  const metricLabel = {
    allowances: "Allowances",
    coverage: "Coverage",
    gca: "GCA"
  }[selectedCell.metric] ?? selectedCell.metric;
  return selectedCell.kind === "mom" ? `${metricLabel} variation` : metricLabel;
}

export function getCostOfRiskStageSummaryFilterValue(rowKey) {
  return {
    all: COST_OF_RISK_FILTER_ALL,
    poci: "POCI",
    stage1: "Stage 1",
    stage2: "Stage 2",
    stage3: "Stage 3"
  }[rowKey] ?? "";
}

export function getCostOfRiskCounterpartySummaryValue(rowKey) {
  return COST_OF_RISK_COUNTERPARTY_SUMMARY_ROW_VALUES[rowKey] ?? "";
}

export function getCostOfRiskSummaryCellColumnKey(cellKey) {
  const [metric, kind] = String(cellKey ?? "").split(":");
  return metric && kind ? `${metric}:${kind}` : "";
}

export function getCostOfRiskSummaryCellRowKey(cellKey) {
  return String(cellKey ?? "").split(":")[2] ?? "";
}

function createCostOfRiskStageSummaryColGroup() {
  const colgroup = document.createElement("colgroup");
  const classes = [
    "cost-of-risk-stage-summary-col-label",
    "cost-of-risk-stage-summary-col-value",
    "cost-of-risk-stage-summary-col-mom",
    "cost-of-risk-stage-summary-col-gap",
    "cost-of-risk-stage-summary-col-value",
    "cost-of-risk-stage-summary-col-mom",
    "cost-of-risk-stage-summary-col-gap",
    "cost-of-risk-stage-summary-col-value",
    "cost-of-risk-stage-summary-col-mom"
  ];
  classes.forEach((className) => {
    const col = document.createElement("col");
    col.className = className;
    colgroup.append(col);
  });
  return colgroup;
}

function createCostOfRiskStageSummaryHead(activeCellKey, onColumnSelect) {
  const thead = document.createElement("thead");
  const tr = document.createElement("tr");
  tr.append(document.createElement("th"));
  [
    [{ label: "GCA", metric: "gca", kind: "level" }, { label: "Variation", metric: "gca", kind: "mom" }],
    [{ label: "Allowances", metric: "allowances", kind: "level" }, { label: "Variation", metric: "allowances", kind: "mom" }],
    [{ label: "Coverage", metric: "coverage", kind: "level" }, { label: "Variation", metric: "coverage", kind: "mom" }]
  ].forEach(([metricColumn, momColumn], index) => {
    const metric = document.createElement("th");
    metric.className = "cost-of-risk-stage-summary-metric-head";
    metric.append(createCostOfRiskSummaryHeaderButton(metricColumn, activeCellKey, onColumnSelect));
    tr.append(metric);

    const mom = document.createElement("th");
    mom.className = "cost-of-risk-stage-summary-mom-head";
    mom.append(createCostOfRiskSummaryHeaderButton(momColumn, activeCellKey, onColumnSelect));
    tr.append(mom);

    if (index < 2) {
      const gap = document.createElement("th");
      gap.className = "cost-of-risk-stage-summary-gap";
      tr.append(gap);
    }
  });
  thead.append(tr);
  return thead;
}

function createCostOfRiskSummaryHeaderButton(column, activeCellKey, onColumnSelect) {
  const button = document.createElement("button");
  button.className = "cost-of-risk-stage-summary-head-button";
  button.type = "button";
  button.textContent = column.label;
  button.addEventListener("click", () => onColumnSelect(column.metric, column.kind));
  return button;
}

function createCostOfRiskSummaryRowButton(label, onSelect) {
  const button = document.createElement("button");
  button.className = "cost-of-risk-stage-summary-row-button";
  button.type = "button";
  button.textContent = label;
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    onSelect();
  });
  return button;
}

function createCostOfRiskStageSummaryDataCell({
  activeCellKey,
  displayMode,
  filters,
  formatReferenceQuarterLabel,
  kind,
  metric,
  onCellSelect,
  referenceDate,
  row,
  selectedUnit
}) {
  const td = document.createElement("td");
  const cellKey = `${metric}:${kind}:${row.key}`;
  const button = createCostOfRiskSummaryDataButton({
    activeCellKey,
    cellKey,
    displayMode,
    filters,
    formatReferenceQuarterLabel,
    kind,
    metric,
    onSelect: () => onCellSelect(cellKey, row.key),
    referenceDate,
    row,
    selectedUnit,
    tooltipCounterpartyLabel: getActiveCostOfRiskCounterpartyTooltipLabel(filters),
    tooltipStageLabel: getCostOfRiskStageSummaryTooltipStageLabel(row)
  });
  button.dataset.costOfRiskStageSummaryCell = cellKey;
  td.append(button);
  return td;
}

function createCostOfRiskCounterpartySummaryGroupRow(row, otherOpen, onToggleOther) {
  const tr = document.createElement("tr");
  tr.className = "cost-of-risk-counterparty-summary-group-row";
  const cell = document.createElement("th");
  cell.colSpan = 9;
  const button = document.createElement("button");
  button.className = "cost-of-risk-counterparty-summary-toggle";
  button.type = "button";
  button.textContent = `${otherOpen ? "−" : "+"} ${row.label}`;
  button.addEventListener("click", onToggleOther);
  cell.append(button);
  tr.append(cell);
  return tr;
}

function createCostOfRiskCounterpartySummaryDataCell({
  activeCellKey,
  displayMode,
  filters,
  formatReferenceQuarterLabel,
  kind,
  metric,
  onCellSelect,
  referenceDate,
  row,
  selectedUnit
}) {
  const td = document.createElement("td");
  const cellKey = `${metric}:${kind}:${row.key}`;
  const button = createCostOfRiskSummaryDataButton({
    activeCellKey,
    cellKey,
    displayMode,
    filters,
    formatReferenceQuarterLabel,
    kind,
    metric,
    onSelect: () => onCellSelect(cellKey, row.value),
    referenceDate,
    row,
    selectedUnit,
    tooltipCounterpartyLabel: getCostOfRiskCounterpartySummaryTooltipLabel(row),
    tooltipStageLabel: getActiveCostOfRiskStageTooltipLabel(filters)
  });
  button.dataset.costOfRiskCounterpartySummaryCell = cellKey;
  td.append(button);
  return td;
}

function createCostOfRiskSummaryDataButton({
  activeCellKey,
  cellKey,
  displayMode,
  filters,
  formatReferenceQuarterLabel,
  kind,
  metric,
  onSelect,
  referenceDate,
  row,
  selectedUnit,
  tooltipCounterpartyLabel,
  tooltipStageLabel
}) {
  const button = document.createElement("button");
  const displayValue = formatCostOfRiskStageSummaryCell(row.cells?.[metric], metric, kind, selectedUnit, displayMode);
  button.className = "cost-of-risk-stage-summary-cell";
  button.classList.toggle("is-active", cellKey === activeCellKey);
  button.type = "button";
  button.textContent = displayValue;
  button.title = createCostOfRiskSummaryCellTooltip({
    counterpartyLabel: tooltipCounterpartyLabel,
    displayValue,
    filters,
    formatReferenceQuarterLabel,
    kind,
    metric,
    referenceDate,
    selectedUnit,
    stageLabel: tooltipStageLabel
  });
  button.setAttribute("aria-label", button.title);
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    onSelect();
  });
  return button;
}

function createCostOfRiskSummaryCellTooltip({
  counterpartyLabel,
  displayValue,
  filters,
  formatReferenceQuarterLabel,
  kind,
  metric,
  referenceDate,
  selectedUnit,
  stageLabel
}) {
  const dateLabel = formatReferenceQuarterLabel(referenceDate);
  const assetLabel = getActiveCostOfRiskAssetTooltipLabel(filters);
  const metricLabel = getCostOfRiskSummaryMetricTooltipLabel(metric);
  const scope = [stageLabel, counterpartyLabel, assetLabel].filter(Boolean).join(", ");

  if (displayValue === "-") {
    return `In ${dateLabel}, ${metricLabel.toLowerCase()} is not available for ${scope}.`;
  }

  if (kind === "mom") {
    return `In ${dateLabel}, the variation in ${metricLabel.toLowerCase()} for ${scope} is ${displayValue}.`;
  }

  if (metric === "coverage") {
    return `In ${dateLabel}, the coverage ratio for ${scope} is ${displayValue}.`;
  }

  return `In ${dateLabel}, ${metricLabel} for ${scope} is ${displayValue} ${getCostOfRiskUnitTooltipLabel(selectedUnit)}.`;
}

function getCostOfRiskSummaryMetricTooltipLabel(metric) {
  return {
    allowances: "allowances",
    coverage: "coverage",
    gca: "GCA"
  }[metric] ?? metric;
}

function getCostOfRiskUnitTooltipLabel(selectedUnit) {
  return {
    billions: "billion euros",
    euros: "euros",
    millions: "million euros",
    thousands: "thousand euros"
  }[selectedUnit] ?? "million euros";
}

function getCostOfRiskStageSummaryTooltipStageLabel(row) {
  return row.key === "all" ? "all stages" : row.label;
}

function getActiveCostOfRiskAssetTooltipLabel(filters) {
  return filters.asset === COST_OF_RISK_FILTER_ALL
    ? "all asset types"
    : filters.asset;
}

function getActiveCostOfRiskCounterpartyTooltipLabel(filters) {
  return getCostOfRiskCounterpartyTooltipLabel(filters.counterparty);
}

function getActiveCostOfRiskStageTooltipLabel(filters) {
  return filters.stage === COST_OF_RISK_FILTER_ALL
    ? "all stages"
    : filters.stage;
}

function getCostOfRiskCounterpartySummaryTooltipLabel(row) {
  return row.key === "all" ? "all counterparties" : getCostOfRiskCounterpartyTooltipLabel(row.value) || row.label;
}

function getCostOfRiskCounterpartyTooltipLabel(value) {
  if (!value || value === COST_OF_RISK_FILTER_ALL) return "all counterparties";

  return {
    HH_CONSUMPTION: "credit for consumption",
    HH_RRE: "residential real estate collateralised loans",
    NFC_CRE: "commercial real estate collateralised loans",
    NFC_SMES: "SMEs",
    "Non-financial corporations": "NFC"
  }[value] ?? value;
}

function getCostOfRiskStageSummaryRowLevel(rowKey) {
  return rowKey === "all" ? 0 : 1;
}

function getCostOfRiskCounterpartySummaryRowLevel(row) {
  if (row.key === "all") return 0;
  if (["nfc-smes", "nfc-cre", "hh-consumption", "hh-rre"].includes(row.key) || row.group === "other") return 2;
  return 1;
}
