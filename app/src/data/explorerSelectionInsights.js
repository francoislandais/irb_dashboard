import { getCompleteAxisColumnIndexes } from "./core/axisColumns.js";
import { getBenchmarkRows } from "./explorerBenchmark.js?v=20260917-kri-data-only-rows";
import { getExplorerTemplateReferenceDates } from "./explorerReferenceDates.js";
import { getTaxonomyDataForTemplateFramework, getTaxonomyFrameworkForDate } from "./taxonomyDimensionData.js?v=20260929-reference-taxonomy";

function monthKey(date) {
  return date.getFullYear() * 12 + date.getMonth();
}

function reportedSum(rows, index) {
  const reported = rows.map((row) => String(row[index] ?? "").trim()).filter(Boolean);
  if (!reported.length) return null;
  const values = reported.map((value) => Number(value.replace(",", ".")));
  return values.every(Number.isFinite) ? values.reduce((sum, value) => sum + value, 0) : null;
}

function getFrameworkCodes(state, tableId, framework, cache) {
  if (!framework || !state?.taxonomySource) return null;
  if (cache.has(framework)) return cache.get(framework);
  const data = getTaxonomyDataForTemplateFramework(state, tableId, framework);
  if (!data) { cache.set(framework, null); return null; }
  const codes = new Map();
  (data.explorerPoints ?? []).filter((point) => point.tableId === tableId).forEach((point) => {
    if (!codes.has(point.coordinate)) codes.set(point.coordinate, new Set());
    codes.get(point.coordinate).add(point.code);
  });
  cache.set(framework, codes);
  return codes;
}

function isUnavailableInFramework(codes, selections, currentCodes) {
  if (!codes) return false;
  return [["x_axis_rc_code", selections.selectedXCode],
    ["y_axis_rc_code", selections.selectedYCode],
    ["z_axis_rc_code", selections.selectedZCode]].some(([axis, code]) => {
    if (!code) return false;
    // Currency members of older open axes were implicit in the DPM layout.
    if (axis === "z_axis_rc_code" && currentCodes?.get(axis)?.has("qx46")
      && currentCodes?.get(axis)?.has("EUR") && currentCodes.get(axis).has(code)) return false;
    return !codes.get(axis).has(code);
  });
}

export function buildExplorerSelectionHistory(state, {
  tableId, institutionId, selections, denominator = null, format = ""
}) {
  const dates = getExplorerTemplateReferenceDates(state, tableId);
  const indexes = getCompleteAxisColumnIndexes(state?.columns ?? []);
  if (!indexes || !institutionId || !dates.length) return { points: [], format };

  const numeratorRows = getBenchmarkRows(state, indexes, tableId, selections, institutionId);
  const denominatorRows = denominator
    ? getBenchmarkRows(state, indexes, denominator.tableId || tableId, denominator.selections, institutionId)
    : [];
  const frameworks = new Map();
  const currentFramework = state?.selectedTaxonomiesByTemplate?.[tableId] ?? "";
  const currentCodes = getFrameworkCodes(state, tableId, currentFramework, frameworks);
  const points = dates.map((date) => {
    const framework = getTaxonomyFrameworkForDate(state, tableId, date.date) || "";
    const codes = getFrameworkCodes(state, tableId, framework, frameworks);
    if (isUnavailableInFramework(codes, selections, currentCodes)) {
      return { date: date.date, label: date.label, framework, status: "code-unavailable", value: null };
    }
    const numerator = reportedSum(numeratorRows, date.index);
    const base = denominator ? reportedSum(denominatorRows, date.index) : null;
    const value = denominator ? (base !== null && base !== 0 && numerator !== null ? numerator / base : null) : numerator;
    return { date: date.date, label: date.label, framework,
      status: value === null ? "missing" : "valid", value };
  });
  return { points, format: denominator ? "Percent" : format };
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function previousAt(points, index, months) {
  const target = monthKey(points[index].date) - months;
  return points.findIndex((point) => monthKey(point.date) === target);
}

export function analyzeExplorerSelectionHistory(history, selectedLabel, requestedFrequencyMonths = 3) {
  const points = history.points ?? [];
  const currentIndex = points.findIndex((point) => point.label === selectedLabel);
  if (currentIndex < 0) return { currentIndex, comparisons: [], cadenceMonths: requestedFrequencyMonths,
    chartPoints: [], chartComparisons: [], direction: "", unusual: null };
  const gaps = points.slice(1).map((point, index) => monthKey(point.date) - monthKey(points[index].date))
    .filter((gap) => gap > 0);
  const nativeMonths = gaps.length ? Math.min(...gaps) : requestedFrequencyMonths;
  const cadenceMonths = Math.max(nativeMonths, Math.round(requestedFrequencyMonths / nativeMonths) * nativeMonths);
  const current = points[currentIndex];
  const comparisonAt = (months, label) => {
    const index = previousAt(points, currentIndex, months);
    const previous = points[index];
    const comparable = current.status === "valid" && previous?.status === "valid";
    const absolute = comparable ? current.value - previous.value : null;
    return { label, months, previous, absolute,
      relative: comparable && previous.value !== 0 ? absolute / Math.abs(previous.value) : null };
  };
  const cadenceLabel = { 1: "month", 3: "quarter", 6: "half-year", 12: "year" }[cadenceMonths] ?? "period";
  const horizons = [{ label: `Previous ${cadenceLabel}`, months: cadenceMonths }];
  if (cadenceMonths !== 12) horizons.push({ label: "One year earlier", months: 12 });
  const comparisons = horizons.map(({ label, months }) => comparisonAt(months, label));
  const chartComparisons = [comparisonAt(3, "3m"), comparisonAt(12, "1y")];

  // Keep the selected date in view, including dates after it, so every visible
  // observation can itself be selected. 24 monthly points also cover a full
  // year for the two chart annotations.
  const chartStart = Math.max(0, Math.min(currentIndex - 19, points.length - 24));
  const chartPoints = points.slice(chartStart, chartStart + 24);

  const consecutive = current.status === "valid" ? [current] : [];
  while (consecutive.length > 0 && consecutive.length < 4) {
    const index = previousAt(points, currentIndex, cadenceMonths * consecutive.length);
    const point = points[index];
    if (point?.status !== "valid") break;
    consecutive.unshift(point);
  }
  let direction = "";
  if (consecutive.length === 4) {
    const changes = consecutive.slice(1).map((point, index) => point.value - consecutive[index].value);
    if (changes.every((change) => change > 0)) direction = "Three consecutive increases";
    if (changes.every((change) => change < 0)) direction = "Three consecutive decreases";
  }

  // Compare the latest move with earlier moves at the same cadence. A zero MAD
  // means there is no defensible scale estimate.
  const latest = comparisons[0];
  const historicalDeltas = [];
  for (let index = previousAt(points, currentIndex, cadenceMonths); index >= 0; index = previousAt(points, index, cadenceMonths)) {
    const point = points[index];
    if (point.status !== "valid") break;
    const previousIndex = previousAt(points, index, cadenceMonths);
    const previous = points[previousIndex];
    if (!previous || previous.status !== "valid") break;
    historicalDeltas.push(point.value - previous.value);
    if (historicalDeltas.length >= 16) break;
  }
  let unusual = null;
  if (Number.isFinite(latest.absolute) && historicalDeltas.length >= 8) {
    const center = median(historicalDeltas);
    const mad = median(historicalDeltas.map((change) => Math.abs(change - center)));
    const typicalMove = median(historicalDeltas.map(Math.abs));
    if (mad > 0 && Math.abs(latest.absolute - center) / (1.4826 * mad) > 3.5
      && Math.abs(latest.absolute - center) > 2 * typicalMove) {
      unusual = { comparisonCount: historicalDeltas.length, typicalMove: center };
    }
  }
  return { currentIndex, comparisons, chartComparisons, cadenceMonths, chartPoints, direction, unusual };
}
