import { COST_OF_RISK_FILTER_ALL } from "../data/costOfRisk.js?v=20260806-cell-selection";
import { formatContributionPercentValue, formatMetricValue, formatSignedMetricValue } from "../data/core/formatting.js?v=20260710-bp-format";

let costOfRiskSummaryMosaicClickTimer = null;

const COST_OF_RISK_SUMMARY_COUNTERPARTY_ROWS = [
  { key: "all", level: 0 },
  { key: "nfc", level: 0 },
  { key: "nfc-smes", level: 1 },
  { key: "nfc-cre", level: 1 },
  { key: "households", level: 0 },
  { key: "hh-consumption", level: 1 },
  { key: "hh-rre", level: 1 },
  { key: "central-banks", label: "Other", level: 0 }
];

const COST_OF_RISK_SUMMARY_STATUS_ROWS = [
  { key: "all", level: 0 },
  { key: "stage1", level: 0 },
  { key: "stage2", level: 0 },
  { key: "stage3", level: 0 },
  { key: "poci", level: 0 },
  { spacer: true },
  { key: "performing", level: 0 },
  { key: "nonperforming", level: 0 }
];

const COST_OF_RISK_SUMMARY_STATUS_METRICS = [
  { key: "gca", kind: "ratio", label: "Ratio", targetTab: "stage-ratio" },
  { key: "coverage", kind: "level", label: "Coverage", targetTab: "coverage-ratio" },
  { key: "collateral", kind: "level", label: "Collateralisation", targetTab: "collateral-ratio" }
];

const COST_OF_RISK_COUNTERPARTY_SUMMARY_ROW_VALUES = {
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
  onCounterpartySelect,
  onOpenDetailTab,
  onRowSelect,
  referenceDate,
  selectedUnit = "millions",
  stageSummary
}) {
  if (!container) return;

  renderCostOfRiskSummaryRatioMosaic({
    activeCellKey,
    container,
    displayMode,
    filters,
    onCellSelect,
    onCounterpartySelect,
    onOpenDetailTab,
    selectedUnit,
    stageSummary
  });
  return;

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

function renderCostOfRiskSummaryRatioMosaic({
  activeCellKey,
  container,
  displayMode,
  filters,
  onCellSelect,
  onCounterpartySelect,
  onOpenDetailTab,
  selectedUnit,
  stageSummary
}) {
  const wrap = document.createElement("section");
  wrap.className = "cost-of-risk-summary-scope-grid";
  wrap.append(createCostOfRiskSummaryStatusScope({
    activeCellKey,
    displayMode,
    filters,
    onCellSelect,
    onOpenDetailTab,
    rows: stageSummary.rows ?? [],
    selectedUnit
  }));
  container.replaceChildren(wrap);
}

function createCostOfRiskSummaryCounterpartyScope({
  activeCellKey,
  displayMode,
  filters,
  onCounterpartySelect,
  onOpenDetailTab,
  rows,
  selectedUnit,
  statusRows
}) {
  const panel = document.createElement("article");
  panel.className = "cost-of-risk-summary-scope-panel cost-of-risk-summary-scope-panel--counterparty";
  const selectedMetric = getCostOfRiskSummarySelectedMetric(activeCellKey);
  const selectedStatusKey = getCostOfRiskSummaryCellRowKey(activeCellKey);
  const selectedStatusRow = statusRows.find((row) => row.key === selectedStatusKey) ?? null;

  const table = document.createElement("div");
  table.className = "cost-of-risk-summary-scope-table cost-of-risk-summary-counterparty-scope-table";
  const headRow = document.createElement("div");
  headRow.className = "cost-of-risk-summary-scope-head-row";
  headRow.append(document.createElement("div"));
  const breakdownHead = document.createElement("div");
  breakdownHead.className = "cost-of-risk-summary-scope-header";
  breakdownHead.classList.add("is-coordinate-column");
  breakdownHead.append(createCostOfRiskSummaryScopeText(getCostOfRiskSummaryDisplayMetricLabel(selectedMetric, displayMode)));
  headRow.append(breakdownHead);
  table.append(headRow);

  COST_OF_RISK_SUMMARY_COUNTERPARTY_ROWS.forEach((definition) => {
    const row = rows.find((candidate) => candidate.key === definition.key);
    if (!row) return;
    const rowKey = definition.key === "central-banks" ? "other" : definition.key;
    const label = definition.label ?? row.label;
    const tr = document.createElement("div");
    tr.className = "cost-of-risk-summary-scope-row";
    tr.classList.toggle("is-selected-row", row.value === filters?.counterparty);

    const labelCell = document.createElement("div");
    labelCell.className = `cost-of-risk-summary-scope-label cost-of-risk-summary-scope-label--level-${definition.level}`;
    labelCell.classList.toggle("is-coordinate-row", row.value === filters?.counterparty);
    labelCell.append(createCostOfRiskSummaryScopeText(label));
    labelCell.addEventListener("click", () => onCounterpartySelect?.(row.value, row.key));
    tr.append(labelCell);

    const key = `counterparty:${selectedMetric.key}:${selectedMetric.kind}:${row.key}`;
    const cellData = getCostOfRiskSummaryDisplayCell(row, selectedMetric, displayMode);
    const isAvailable = isCostOfRiskSummaryCellAvailable(selectedMetric, cellData, displayMode);
    const canOpenDetail = isCostOfRiskSummaryDetailAvailable(
      selectedMetric,
      selectedStatusRow,
      selectedStatusRow?.cells?.[selectedMetric.key]
    );
    const cell = document.createElement("div");
    cell.className = "cost-of-risk-summary-scope-cell";
    cell.classList.toggle("is-empty-cell", !isAvailable);
    cell.classList.toggle("is-active-cell", isAvailable && row.value === filters?.counterparty);
    if (isAvailable) {
      cell.dataset.costOfRiskCalculationDetail = "summary-cell";
      cell.dataset.costOfRiskCalculationValue = key;
      cell.addEventListener("click", () => onCounterpartySelect?.(row.value, row.key));
      if (canOpenDetail) {
        cell.addEventListener("dblclick", (event) => {
          event.preventDefault();
          onCounterpartySelect?.(row.value, row.key);
          onOpenDetailTab?.(selectedMetric.targetTab, selectedStatusRow.key);
        });
      }
    }
    cell.append(createCostOfRiskSummaryScopeValue(formatCostOfRiskSummaryMosaicValue(
      cellData,
      selectedMetric.key,
      selectedMetric.kind,
      selectedUnit,
      displayMode
    )));
    tr.append(cell);
    table.append(tr);
  });
  panel.append(table);
  return panel;
}

function createCostOfRiskSummaryStatusScope({
  activeCellKey,
  displayMode,
  filters,
  onCellSelect,
  onOpenDetailTab,
  rows,
  selectedUnit
}) {
  const panel = document.createElement("article");
  panel.className = "cost-of-risk-summary-scope-panel cost-of-risk-summary-scope-panel--status";

  const table = document.createElement("div");
  table.className = "cost-of-risk-summary-scope-table cost-of-risk-summary-status-scope-table";
  const activeStatusCell = getCostOfRiskSummaryStatusActiveCell(activeCellKey);
  let visibleRowIndex = 0;
  const headRow = document.createElement("div");
  headRow.className = "cost-of-risk-summary-scope-head-row";
  headRow.append(createCostOfRiskSummaryScopeHeaderCell("Category", "", { category: true }));
  COST_OF_RISK_SUMMARY_STATUS_METRICS.forEach((metric, metricIndex) => {
    headRow.append(createCostOfRiskSummaryScopeHeaderCell(
      getCostOfRiskSummaryDisplayMetricLabel(metric, displayMode),
      displayMode === "amount" ? "" : "%",
      { active: activeStatusCell.metricIndex === metricIndex }
    ));
  });
  table.append(headRow);

  COST_OF_RISK_SUMMARY_STATUS_ROWS.forEach((definition) => {
    if (definition.spacer) {
      const spacer = document.createElement("div");
      spacer.className = "cost-of-risk-summary-scope-spacer-row";
      table.append(spacer);
      return;
    }
    const row = rows.find((candidate) => candidate.key === definition.key);
    if (!row) return;
    const isSelectedRow = getCostOfRiskStageSummaryFilterValue(row.key) === filters?.stage;
    visibleRowIndex += 1;
    const tr = document.createElement("div");
    tr.className = "cost-of-risk-summary-scope-row";
    tr.classList.toggle("is-selected-row", isSelectedRow);

    const labelCell = document.createElement("div");
    labelCell.className = `cost-of-risk-summary-scope-label cost-of-risk-summary-scope-label--level-${definition.level}`;
    labelCell.classList.toggle("is-coordinate-row", activeStatusCell.rowKey === row.key);
    labelCell.append(createCostOfRiskSummaryCategoryMarker(row.key), createCostOfRiskSummaryScopeText(row.label));
    labelCell.addEventListener("click", () => onCellSelect(`gca:ratio:${row.key}`, row.key));
    tr.append(labelCell);

    COST_OF_RISK_SUMMARY_STATUS_METRICS.forEach((metric, metricIndex) => {
      const key = `${metric.key}:${metric.kind}:${row.key}`;
      const cell = getCostOfRiskSummaryDisplayCell(row, metric, displayMode);
      const ratioCell = row.cells?.[metric.key];
      const isAvailable = isCostOfRiskSummaryCellAvailable(metric, cell, displayMode);
      const canOpenDetail = isCostOfRiskSummaryDetailAvailable(metric, row, ratioCell);
      const td = document.createElement("div");
      td.className = "cost-of-risk-summary-scope-cell";
      td.classList.toggle("is-empty-cell", !isAvailable);
      td.classList.toggle("is-active-cell", isAvailable && activeCellKey === key);
      if (isAvailable) {
        td.dataset.costOfRiskCalculationDetail = "summary-cell";
        td.dataset.costOfRiskCalculationValue = key;
        td.addEventListener("click", () => onCellSelect(key, row.key));
        if (canOpenDetail) {
          td.addEventListener("dblclick", (event) => {
            event.preventDefault();
            onOpenDetailTab?.(metric.targetTab, row.key);
          });
        }
      }
      td.append(createCostOfRiskSummaryScopeValue(
        formatCostOfRiskSummaryMosaicValue(cell, metric.key, metric.kind, selectedUnit, displayMode)
      ));
      tr.append(td);
    });
    table.append(tr);
  });
  panel.append(table);
  return panel;
}

function createCostOfRiskSummaryScopeHeaderCell(label, unit = "", options = {}) {
  const th = document.createElement("div");
  th.className = "cost-of-risk-summary-scope-header";
  th.classList.toggle("is-coordinate-column", Boolean(options.active));
  th.classList.toggle("cost-of-risk-summary-scope-header--category", Boolean(options.category));
  th.append(createCostOfRiskSummaryScopeText(unit ? `${label} ${unit}` : label));
  return th;
}

function createCostOfRiskSummaryCategoryMarker(rowKey) {
  const marker = document.createElement("span");
  marker.className = "cost-of-risk-summary-category-marker";
  const markerMap = {
    all: { label: "◇", tone: "all" },
    nonperforming: { label: "!", tone: "nonperforming" },
    performing: { label: "✓", tone: "performing" },
    poci: { label: "P", tone: "poci" },
    stage1: { label: "1", tone: "stage1" },
    stage2: { label: "2", tone: "stage2" },
    stage3: { label: "3", tone: "stage3" }
  };
  const config = markerMap[rowKey] ?? { label: "", tone: "default" };
  marker.classList.add(`cost-of-risk-summary-category-marker--${config.tone}`);
  marker.textContent = config.label;
  marker.setAttribute("aria-hidden", "true");
  return marker;
}

function createCostOfRiskSummaryScopeHeader({
  activeCellKey,
  filters,
  rows,
  statusRows,
  selectedUnit
}) {
  const selectedMetric = getCostOfRiskSummarySelectedMetric(activeCellKey);
  const selectedStatusKey = getCostOfRiskSummaryCellRowKey(activeCellKey);
  const selectedStatusRow = statusRows.find((row) => row.key === selectedStatusKey) ?? null;
  const selectedRow = rows.find((row) => row.value === filters?.counterparty)
    ?? rows.find((row) => row.key === "all")
    ?? null;
  const value = selectedRow?.cells?.gca?.value;
  const detail = getCostOfRiskSummaryScopeDetail(selectedRow, selectedMetric, selectedStatusRow);
  const header = document.createElement("header");
  header.className = "cost-of-risk-summary-scope-overview";
  header.append(document.createTextNode("Selected scope: "));
  const valueNode = document.createElement("span");
  valueNode.textContent = Number.isFinite(value) ? formatMetricValue(value, selectedUnit) : "-";
  const unitNode = document.createElement("small");
  unitNode.textContent = getCostOfRiskScopeUnitLabel(selectedUnit);
  header.append(valueNode, unitNode);
  if (detail) {
    const detailNode = document.createElement("span");
    detailNode.className = "cost-of-risk-summary-scope-overview-detail";
    detailNode.textContent = detail;
    header.append(detailNode);
  }
  return header;
}

function getCostOfRiskSummaryScopeDetail(selectedRow, selectedMetric, selectedStatusRow) {
  if (!selectedRow || !selectedMetric) return "";
  if (selectedMetric.key === "gca") {
    if (!selectedStatusRow || selectedStatusRow.key === "all") return "";
    const ratio = selectedRow.cells?.gca?.ratio;
    return Number.isFinite(ratio)
      ? `including ${formatContributionPercentValue(ratio)} ${formatCostOfRiskSummaryScopeLabel(selectedStatusRow.label)}`
      : "";
  }
  if (selectedMetric.key === "coverage") {
    const ratio = selectedRow.cells?.coverage?.ratio;
    return Number.isFinite(ratio)
      ? `with ${formatContributionPercentValue(ratio)} coverage`
      : "";
  }
  if (selectedMetric.key === "collateral") {
    const ratio = selectedRow.cells?.collateral?.ratio;
    return Number.isFinite(ratio)
      ? `with ${formatContributionPercentValue(ratio)} collateralisation`
      : "";
  }
  return "";
}

function formatCostOfRiskSummaryScopeLabel(label) {
  return String(label ?? "").toLowerCase();
}

function getCostOfRiskScopeUnitLabel(selectedUnit) {
  return {
    billions: "B€",
    euros: "€",
    millions: "M€",
    thousands: "K€"
  }[selectedUnit] ?? "M€";
}

function createCostOfRiskSummaryScopeValue(value) {
  const span = document.createElement("span");
  span.className = "cost-of-risk-summary-scope-value";
  const text = document.createElement("span");
  text.className = "cost-of-risk-summary-scope-value-text";
  text.textContent = value;
  span.append(text);
  return span;
}

function createCostOfRiskSummaryScopeText(value) {
  const span = document.createElement("span");
  span.className = "cost-of-risk-summary-scope-text";
  span.textContent = value;
  return span;
}

function getCostOfRiskSummaryStatusActiveCell(activeCellKey) {
  const rowKey = getCostOfRiskSummaryCellRowKey(activeCellKey);
  const columnKey = getCostOfRiskSummaryCellColumnKey(activeCellKey);
  const metricIndex = COST_OF_RISK_SUMMARY_STATUS_METRICS.findIndex((metric) => `${metric.key}:${metric.kind}` === columnKey);
  const rowIndex = COST_OF_RISK_SUMMARY_STATUS_ROWS
    .filter((row) => !row.spacer)
    .findIndex((row) => row.key === rowKey);
  return { metricIndex, rowIndex, rowKey };
}

function getCostOfRiskSummarySelectedMetric(activeCellKey) {
  const columnKey = getCostOfRiskSummaryCellColumnKey(activeCellKey);
  return COST_OF_RISK_SUMMARY_STATUS_METRICS.find((metric) => `${metric.key}:${metric.kind}` === columnKey)
    ?? COST_OF_RISK_SUMMARY_STATUS_METRICS[0];
}

function isCostOfRiskSummaryDetailAvailable(metric, row, cell) {
  if (!metric?.targetTab || !row?.key || !isCostOfRiskSummaryCellAvailable(metric, cell, "ratio")) return false;
  if (metric.targetTab === "stage-ratio" || metric.targetTab === "coverage-ratio") {
    return ["stage1", "stage2", "stage3", "poci", "performing", "nonperforming"].includes(row.key);
  }
  if (metric.targetTab === "collateral-ratio") {
    return ["all", "performing", "nonperforming"].includes(row.key);
  }
  return false;
}

function isCostOfRiskSummaryCellAvailable(metric, cell, displayMode = "ratio") {
  if (!cell) return false;
  if (displayMode === "amount") return Number.isFinite(cell.value);
  if (metric?.kind === "ratio") return Number.isFinite(cell.ratio);
  if (metric?.key === "coverage" || metric?.key === "collateral") return Number.isFinite(cell.ratio) || Number.isFinite(cell.value);
  return Number.isFinite(cell.value);
}

function getCostOfRiskSummaryDisplayCell(row, metric, displayMode) {
  if (displayMode !== "amount") return row.cells?.[metric.key] ?? null;
  if (metric.key === "coverage") return row.cells?.allowances ?? null;
  if (metric.key === "collateral") return row.cells?.collateralAmount ?? null;
  return row.cells?.gca ?? null;
}

function getCostOfRiskSummaryDisplayMetricLabel(metric, displayMode) {
  if (displayMode !== "amount") return metric.label;
  if (metric.key === "coverage") return "allowances";
  if (metric.key === "collateral") return "collateral";
  return "GCA";
}

function createCostOfRiskSummaryCounterpartyGroup({
  activeCellKey,
  onCellSelect,
  onCounterpartySelect,
  rows,
  title
}) {
  const group = document.createElement("article");
  group.className = "cost-of-risk-summary-mosaic-group";

  const titleNode = document.createElement("h3");
  titleNode.textContent = title;
  group.append(titleNode);

  const cards = document.createElement("div");
  cards.className = "cost-of-risk-summary-mosaic-cards";
  ["nfc", "households", "central-banks", "governments", "credit-institutions", "other-financials"].forEach((rowKey) => {
    const row = rows.find((candidate) => candidate.key === rowKey);
    if (!row) return;
    cards.append(createCostOfRiskSummaryCounterpartyCard({
      activeCellKey,
      onCellSelect,
      onCounterpartySelect,
      row
    }));
  });
  group.append(cards);
  return group;
}

function createCostOfRiskSummaryCounterpartyCard({
  activeCellKey,
  onCellSelect,
  onCounterpartySelect,
  row
}) {
  const cell = row.cells?.gca ?? null;
  const key = `gca:ratio:${row.key}`;
  const card = document.createElement("button");
  card.className = "cost-of-risk-summary-ratio-card";
  card.classList.toggle("is-active", activeCellKey === key);
  card.type = "button";
  card.dataset.costOfRiskCalculationDetail = "summary-cell";
  card.dataset.costOfRiskCalculationValue = key;
  card.addEventListener("click", () => {
    if (onCounterpartySelect) {
      onCounterpartySelect(row.value, row.key);
    } else {
      onCellSelect?.(key, row.key);
    }
  });

  const label = document.createElement("span");
  label.className = "cost-of-risk-summary-ratio-card-label";
  label.textContent = row.label;

  const value = document.createElement("span");
  value.className = "cost-of-risk-summary-ratio-card-value";
  value.textContent = Number.isFinite(cell?.ratio) ? formatContributionPercentValue(cell.ratio) : "-";

  const variation = document.createElement("span");
  variation.className = "cost-of-risk-summary-ratio-card-variation";
  variation.textContent = formatSignedBasisPointsValue(cell?.ratioMomBasisPoints);

  card.append(label, value, variation);
  return card;
}

function createCostOfRiskSummaryMosaicGroup({
  activeCellKey,
  displayMode,
  metrics,
  onCellSelect,
  onOpenDetailTab,
  rows,
  selectedUnit,
  targetTab,
  title
}) {
  const group = document.createElement("article");
  group.className = "cost-of-risk-summary-mosaic-group";

  const titleNode = document.createElement("h3");
  titleNode.textContent = title;
  group.append(titleNode);

  const cards = document.createElement("div");
  cards.className = "cost-of-risk-summary-mosaic-cards";
  metrics.forEach((metricDefinition) => {
    metricDefinition.rowKeys.forEach((rowKey) => {
      const row = rows.find((candidate) => candidate.key === rowKey);
      if (!row) return;
      cards.append(createCostOfRiskSummaryRatioCard({
        activeCellKey,
        displayMode,
        kind: metricDefinition.kind,
        metric: metricDefinition.metric,
        onCellSelect,
        onOpenDetailTab,
        row,
        selectedUnit,
        targetTab
      }));
    });
  });
  group.append(cards);
  return group;
}

function createCostOfRiskSummaryRatioCard({
  activeCellKey,
  displayMode,
  kind,
  metric,
  onCellSelect,
  onOpenDetailTab,
  row,
  selectedUnit,
  targetTab
}) {
  const key = `${metric}:${kind}:${row.key}`;
  const variationKey = `${metric}:mom:${row.key}`;
  const cell = row.cells?.[metric] ?? null;
  const card = document.createElement("button");
  card.className = "cost-of-risk-summary-ratio-card";
  card.classList.toggle("is-active", activeCellKey === key);
  card.type = "button";
  card.dataset.costOfRiskCalculationDetail = "summary-cell";
  card.dataset.costOfRiskCalculationValue = key;
  card.addEventListener("click", (event) => {
    if (event.detail > 1) return;
    clearTimeout(costOfRiskSummaryMosaicClickTimer);
    costOfRiskSummaryMosaicClickTimer = setTimeout(() => {
      onCellSelect(key, row.key);
    }, 180);
  });
  card.addEventListener("dblclick", (event) => {
    event.preventDefault();
    clearTimeout(costOfRiskSummaryMosaicClickTimer);
    onOpenDetailTab?.(targetTab, row.key);
  });
  const label = document.createElement("span");
  label.className = "cost-of-risk-summary-ratio-card-label";
  label.textContent = row.label;

  const value = document.createElement("span");
  value.className = "cost-of-risk-summary-ratio-card-value";
  value.textContent = formatCostOfRiskSummaryMosaicValue(cell, metric, kind, selectedUnit, displayMode);

  const variation = document.createElement("span");
  variation.className = "cost-of-risk-summary-ratio-card-variation";
  variation.textContent = kind === "ratio"
    ? formatSignedBasisPointsValue(cell?.ratioMomBasisPoints)
    : formatCostOfRiskStageSummaryCell(cell, metric, "mom", selectedUnit, displayMode);

  card.append(label, value, variation);
  return card;
}

function formatCostOfRiskSummaryMosaicValue(cell, metric, kind, selectedUnit, displayMode) {
  if (!cell) return "-";
  if (displayMode === "amount") return Number.isFinite(cell.value) ? formatMetricValue(cell.value, selectedUnit) : "-";
  if (kind === "ratio") return Number.isFinite(cell.ratio) ? formatContributionPercentValue(cell.ratio) : "-";
  return formatCostOfRiskStageSummaryCell(cell, metric, kind, selectedUnit, displayMode);
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

function formatCostOfRiskStageSummaryCell(cell, metric, kind, selectedUnit, displayMode) {
  if (!cell) return "-";
  if (metric === "coverage" || metric === "collateral") {
    return kind === "mom"
      ? formatSignedBasisPointsValue(cell.momRatioBasisPoints)
      : (Number.isFinite(cell.ratio) ? formatContributionPercentValue(cell.ratio) : "-");
  }

  if (kind === "level") return Number.isFinite(cell.value) ? formatMetricValue(cell.value, selectedUnit) : "-";
  if (displayMode === "amount") return Number.isFinite(cell.mom) ? formatSignedMetricValue(cell.mom, selectedUnit) : "-";
  return formatSignedGrowthPercentValue(cell.momRatioBasisPoints);
}

function formatSignedBasisPointsValue(value) {
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
    collateral: "Collateral",
    coverage: "Coverage",
    gca: "GCA"
  }[selectedCell.metric] ?? selectedCell.metric;
  if (selectedCell.kind === "ratio" && selectedCell.metric === "gca") return "Exposure ratio";
  return selectedCell.kind === "mom" ? `${metricLabel} variation` : metricLabel;
}

export function getCostOfRiskStageSummaryFilterValue(rowKey) {
  return {
    all: COST_OF_RISK_FILTER_ALL,
    poci: "POCI",
    performing: "Performing",
    nonperforming: "Non-performing",
    stage1: "Stage 1",
    stage2: "Stage 2",
    stage3: "Stage 3"
  }[rowKey] ?? "";
}

export function getCostOfRiskCounterpartySummaryValue(rowKey) {
  return COST_OF_RISK_COUNTERPARTY_SUMMARY_ROW_VALUES[rowKey] ?? "";
}

export function getCostOfRiskSummaryCellColumnKey(cellKey) {
  const parts = String(cellKey ?? "").split(":");
  const [metric, kind] = parts[0] === "counterparty" ? [parts[1], parts[2]] : parts;
  return metric && kind ? `${metric}:${kind}` : "";
}

export function getCostOfRiskSummaryCellRowKey(cellKey) {
  const parts = String(cellKey ?? "").split(":");
  return parts[0] === "counterparty" ? (parts[3] ?? "") : (parts[2] ?? "");
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
  button.dataset.costOfRiskCalculationDetail = "summary-cell";
  button.dataset.costOfRiskCalculationValue = cellKey;
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
