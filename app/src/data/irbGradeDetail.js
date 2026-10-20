import { APPROACH_PORTFOLIOS, APPROACH_TAXONOMY_MAP } from "./approachBenchmark.js";
import { getAxisColumnIndexes } from "./core/axisColumns.js";
import { normalizeAxisCode } from "./core/axisCode.js";
import { getReferenceColumns, parseNumericValue } from "./core/referenceColumns.js";
import { getIndexedRowsByTableJst } from "./dataIndex.js";
import { getTaxonomyDataForTemplateFramework, getTaxonomyFrameworkForDate } from "./taxonomyDimensionData.js";

export const IRB_GRADE_TABLE_ID = "C_08.02";
const PD_CODE = "0010";
const gradeCollator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });

export function compareIrbGradeIds(left, right) {
  const a = String(left), b = String(right);
  if (/^\d+$/.test(a) && /^\d+$/.test(b)) {
    const difference = BigInt(a) - BigInt(b);
    if (difference) return difference < 0n ? -1 : 1;
    // Equal numeric value, distinct source identifiers: 12 precedes 012.
    return a.length - b.length || a.localeCompare(b);
  }
  return gradeCollator.compare(a, b) || a.localeCompare(b);
}

function reportedValue(values) {
  return values.size === 1 ? values.values().next().value : null;
}

export function buildIrbGradeDetailModel(state, referenceName = "", portfolioId = "total") {
  const indexes = getAxisColumnIndexes(state?.columns ?? []);
  if (!state?.selectedJst || indexes.institutionId < 0 || indexes.tableId < 0
      || indexes.xAxisRcCode < 0 || indexes.yAxisRcCode < 0 || indexes.zAxisRcCode < 0) {
    return { status: "no-data", references: [], portfolios: [], series: [], grades: [], pointCount: 0 };
  }
  const indexedRows = getIndexedRowsByTableJst(state, IRB_GRADE_TABLE_ID);
  const rows = indexedRows.length || state.dataIndexes ? indexedRows : (state.rows ?? []).filter((row) => (
    row[indexes.tableId] === IRB_GRADE_TABLE_ID && row[indexes.institutionId] === state.selectedJst
  ));
  const pdRows = rows.filter((row) => (
    String(row[indexes.yAxisRcCode] ?? "").trim()
    && normalizeAxisCode(row[indexes.xAxisRcCode], "x") === PD_CODE
  ));
  const references = getReferenceColumns(state.columns).map((reference) => ({
    ...reference,
    framework: getTaxonomyFrameworkForDate(state, IRB_GRADE_TABLE_ID, reference.date)
  })).filter((reference) => (
    APPROACH_TAXONOMY_MAP[reference.framework]
    && pdRows.some((row) => String(row[reference.index] ?? "").trim())
  ));
  if (!references.length) return { status: "no-grades", references, portfolios: [], series: [], grades: [], pointCount: 0 };

  const reference = references.find((item) => item.name === referenceName) ?? references.at(-1);
  const sourcePortfolios = APPROACH_PORTFOLIOS.filter((portfolio) => (
    APPROACH_TAXONOMY_MAP[reference.framework].irb[portfolio.id]?.z.length
  ));
  const portfolios = sourcePortfolios.map((portfolio) => ({
    ...portfolio,
    zCodes: APPROACH_TAXONOMY_MAP[reference.framework].irb[portfolio.id].z
  }));
  const portfolio = portfolios.find((item) => item.id === portfolioId) ?? portfolios[0];
  const selectedZ = new Set(portfolio.zCodes);
  const byClass = new Map(portfolio.zCodes.map((code) => [code, new Map()]));
  for (const row of pdRows) {
    const gradeId = String(row[indexes.yAxisRcCode] ?? "").trim();
    if (!gradeId) continue;
    const zCode = normalizeAxisCode(row[indexes.zAxisRcCode], "z");
    if (!selectedZ.has(zCode)) continue;
    const raw = String(row[reference.index] ?? "").trim();
    if (!raw) continue;
    const value = parseNumericValue(raw, NaN);
    if (!Number.isFinite(value) || value < 0 || value > 1) continue;
    const grades = byClass.get(zCode);
    if (!grades.has(gradeId)) grades.set(gradeId, new Set());
    grades.get(gradeId).add(value);
  }
  const mapping = getTaxonomyDataForTemplateFramework(state, IRB_GRADE_TABLE_ID, reference.framework)?.dimensionMapping;
  let conflictingPoints = 0;
  const series = [...byClass].map(([zCode, gradeValues]) => {
    const points = [...gradeValues].map(([gradeId, values]) => {
      if (values.size > 1) { conflictingPoints++; return null; }
      return { gradeId, pd: reportedValue(values) };
    }).filter(Boolean).sort((a, b) => compareIrbGradeIds(a.gradeId, b.gradeId));
    const entry = mapping?.find(IRB_GRADE_TABLE_ID, "z_axis_rc_code", zCode);
    const label = entry?.description || zCode;
    const approach = /with own estimates|with an estimate/i.test(entry?.fullDescription || "") ? "IRB A"
      : /without own estimates|without an estimate/i.test(entry?.fullDescription || "") ? "IRB F" : "";
    return { zCode, label: approach ? `${label} · ${approach}` : label, points };
  }).filter((item) => item.points.length);
  const grades = [...new Set(series.flatMap((item) => item.points.map((point) => point.gradeId)))].sort(compareIrbGradeIds);
  const pointCount = series.reduce((count, item) => count + item.points.length, 0);

  return {
    status: pointCount ? "ready" : "no-portfolio-data",
    reference, references, portfolio, portfolios, series, grades, pointCount, conflictingPoints,
    institutionId: state.selectedJst
  };
}
