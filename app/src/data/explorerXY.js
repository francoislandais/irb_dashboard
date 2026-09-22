import { getExplorerAxisPointsConfig } from "./timeSeries.js?v=20260921-hierarchy-gt-escape";
import { getAvailableExplorerAxisCodes, getExplorerRowsForTemplate, EXPLORER_ALL_CURRENCIES_CODE, explorerTableHasCurrencyZAxis } from "./explorer.js?v=20260922-native-all-currency";
import { getCompleteAxisColumnIndexes } from "./core/axisColumns.js";
import { normalizeAxisCode } from "./core/axisCode.js?v=20260921-z-axis-padding";
import { getReferenceColumns, parseNumericValue } from "./core/referenceColumns.js";
import { unescapeHierarchySegment } from "./core/hierarchyPath.js?v=20260921-hierarchy-gt-escape";

function axisPoints(state, tableId, axis, configId) {
  const seen = new Set();
  const configured = getExplorerAxisPointsConfig(state, tableId, axis, configId).filter((point) => {
    if (seen.has(point.code)) return false;
    seen.add(point.code);
    return true;
  });
  return configured.length ? configured : getAvailableExplorerAxisCodes(state, tableId, axis).map((code) => ({
    code, description: code, displayDescription: code, hierarchyPath: code, parentPath: "", indentLevel: 0, format: ""
  }));
}

// Only the active reference date and Z are fixed; neither X nor Y is a
// filter. Aggregate source records once before building the matrix.
export function buildExplorerXYSeries(state, { tableId, yConfigTableId = tableId, selectedZCode = "", referenceLabel = "", onlyCodes } = {}) {
  const reference = getReferenceColumns(state.columns).find((date) => date.label === referenceLabel)
    ?? getReferenceColumns(state.columns).at(-1);
  const indexes = getCompleteAxisColumnIndexes(state.columns);
  const columnAxis = "x";
  const xPoints = axisPoints(state, tableId, "x", yConfigTableId);
  const yPoints = axisPoints(state, tableId, "y", yConfigTableId);
  const columns = xPoints.map((point) => ({ ...point, label: point.description || point.code }));
  const rowPoints = yPoints.filter((point) => !onlyCodes || onlyCodes.has(point.code));
  const empty = { xy: true, columnAxis, reference, dateColumns: columns, rows: [], status: "" };
  if (!reference || !indexes || !state.selectedJst) return { ...empty, status: "Select a dataset, JST and reference date." };
  if (!xPoints.length || !yPoints.length) return { ...empty, status: "XY view requires both Row and Column dimensions for this template." };
  const zCode = selectedZCode === EXPLORER_ALL_CURRENCIES_CODE ? "" : normalizeAxisCode(selectedZCode, "z");
  const blankZ = selectedZCode === EXPLORER_ALL_CURRENCIES_CODE || explorerTableHasCurrencyZAxis(state, tableId);
  const values = new Map();
  for (const row of getExplorerRowsForTemplate(state, tableId)) {
    const z = normalizeAxisCode(row[indexes.zAxisRcCode], "z");
    if (zCode ? z !== zCode : blankZ && z !== "") continue;
    const raw = String(row[reference.index] ?? "").trim();
    const value = raw ? parseNumericValue(raw, NaN) : NaN;
    if (!Number.isFinite(value)) continue;
    const key = JSON.stringify([normalizeAxisCode(row[indexes.xAxisRcCode], "x"), normalizeAxisCode(row[indexes.yAxisRcCode], "y")]);
    values.set(key, (values.get(key) ?? 0) + value);
  }
  const zFormat = state.explorerPoints?.find((point) => point.tableId === tableId && point.coordinate === "z_axis_rc_code" && point.code === zCode)?.format || "";
  return {
    ...empty,
    rows: rowPoints.map((row) => ({
      ...row,
      values: columns.map((column) => {
        const x = column;
        const y = row;
        return { isImpossible: Boolean(state.impossibleXYCombinations?.isImpossible(tableId, x.code, y.code)),
          xCode: x.code, yCode: y.code, label: reference.label, date: reference.date,
          format: y.format || zFormat || x.format || "",
          value: values.get(JSON.stringify([x.code, y.code])) ?? null };
      })
    }))
  };
}

// Merge only adjacent siblings with identical full ancestry. A leaf spans
// the remaining levels, so unequal-depth branches do not create blank cells.
export function buildExplorerXYHeaders(columns) {
  // column.hierarchyPath already has every literal ">" escaped by
  // parseDescriptionHierarchy before being joined with " > " (see
  // core/hierarchyPath.js), so splitting on ">" here is unambiguous - and
  // unescaping each segment restores it for display. The (?!=) guard stays
  // as a safety net for the column.description/column.code fallback below,
  // which is raw, unescaped text (used only when a column has no
  // hierarchyPath at all).
  const paths = columns.map((column) => String(column.hierarchyPath || column.description || column.code)
    .split(/\s*(?:>(?!=)|\/)\s*/).filter(Boolean).map(unescapeHierarchySegment));
  const depth = Math.max(1, ...paths.map((path) => path.length));
  return Array.from({ length: depth }, (_, level) => {
    const cells = [];
    for (let index = 0; index < columns.length;) {
      const path = paths[index];
      if (level >= path.length) { index++; continue; }
      const leaf = level === path.length - 1;
      let span = 1;
      if (!leaf) {
        const key = JSON.stringify(path.slice(0, level + 1));
        while (index + span < columns.length && paths[index + span].length > level + 1
          && JSON.stringify(paths[index + span].slice(0, level + 1)) === key) span++;
      }
      cells.push({ label: path[level], code: leaf ? columns[index].code : "", columnIndex: index,
        colSpan: span, rowSpan: leaf ? depth - level : 1, leaf });
      index += span;
    }
    return markDuplicateExplorerXYGroupLabels(cells);
  });
}

// Some EBA taxonomies reuse a row concept's own name one level deeper as a
// sibling branch's ancestor (e.g. C_08.06's "Volatility adjustment to the
// exposure" is both 0120's own leaf label and the immediate parent of
// 0130/0140) - two adjacent header cells on the same row then show the
// exact same text side by side. When that happens for a group (non-leaf)
// cell, blank its label - the full text still lands on the cell via
// fullLabel/title for anyone hovering or using a screen reader - and flag
// the cell before it so the render step can drop the border between them:
// same concept, so the two cells should read as one open region rather
// than two separately boxed ones.
function markDuplicateExplorerXYGroupLabels(cells) {
  const labels = cells.map((cell) => cell.label);
  for (let index = 1; index < cells.length; index++) {
    if (cells[index].leaf || labels[index] !== labels[index - 1]) continue;
    cells[index - 1].opensIntoNextDuplicate = true;
    cells[index] = { ...cells[index], label: "", fullLabel: labels[index], isDuplicateLabel: true };
  }
  return cells;
}
