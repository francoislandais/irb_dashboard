import { getAxisColumnIndexes } from "./core/axisColumns.js";
import { normalizeAxisCode } from "./core/axisCode.js";
import { getReferenceColumns, parseNumericValue } from "./core/referenceColumns.js";
import { getIndexedInstitutionIds, getIndexedRowsByTableJst } from "./dataIndex.js";
import { getTaxonomyDataForTemplateFramework, getTaxonomyFrameworkForDate } from "./taxonomyDimensionData.js";
import { compareIrbGradeIds, IRB_GRADE_TABLE_ID } from "./irbGradeDetail.js";

const SOURCE_CODES = new Set(["0010", "0110", "0260"]);

function reportedNumber(values) {
  return values?.size === 1 ? values.values().next().value : null;
}

function portfolioLabel(mapping, zCode) {
  const entry = mapping?.find(IRB_GRADE_TABLE_ID, "z_axis_rc_code", zCode);
  if (!entry) return zCode;
  const parent = entry.fullDescription || "";
  const approach = /without own estimates|without an estimate/i.test(parent) ? "IRB F"
    : /with own estimates|with an estimate/i.test(parent) ? "IRB A" : "";
  return `${entry.description}${approach && !/^IRB [AF]\b/i.test(entry.description) ? ` · ${approach}` : ""} (${zCode})`;
}

/** One observation is one institution × Z class × reported grade × date. */
export function buildIrbGradeDensityModel(state, referenceName = "", zSelection = "") {
  const indexes = getAxisColumnIndexes(state?.columns ?? []);
  if ([indexes.institutionId, indexes.tableId, indexes.xAxisRcCode, indexes.yAxisRcCode, indexes.zAxisRcCode].some((index) => index < 0)) {
    return { status: "no-data", references: [], portfolios: [], series: [], pointCount: 0 };
  }
  const institutionIds = getIndexedInstitutionIds(state);
  const allRows = institutionIds.flatMap((id) => getIndexedRowsByTableJst(state, IRB_GRADE_TABLE_ID, id));
  const rows = allRows.length || state.dataIndexes ? allRows : (state.rows ?? []).filter((row) => row[indexes.tableId] === IRB_GRADE_TABLE_ID);
  const sourceRows = rows.filter((row) => String(row[indexes.yAxisRcCode] ?? "").trim()
    && SOURCE_CODES.has(normalizeAxisCode(row[indexes.xAxisRcCode], "x")));
  const references = getReferenceColumns(state.columns).map((reference) => ({
    ...reference,
    framework: getTaxonomyFrameworkForDate(state, IRB_GRADE_TABLE_ID, reference.date)
  })).filter((reference) => reference.framework
    && sourceRows.some((row) => String(row[reference.index] ?? "").trim()));
  if (!references.length) return { status: "no-grades", references, portfolios: [], series: [], pointCount: 0 };

  const reference = references.find((item) => item.name === referenceName) ?? references.at(-1);
  const mapping = getTaxonomyDataForTemplateFramework(state, IRB_GRADE_TABLE_ID, reference.framework)?.dimensionMapping;
  const observations = new Map();
  for (const row of sourceRows) {
    const raw = String(row[reference.index] ?? "").trim();
    if (!raw) continue;
    const value = parseNumericValue(raw, NaN);
    if (!Number.isFinite(value)) continue;
    const institutionId = String(row[indexes.institutionId] ?? "").trim();
    const zCode = normalizeAxisCode(row[indexes.zAxisRcCode], "z");
    const gradeId = String(row[indexes.yAxisRcCode] ?? "").trim();
    const xCode = normalizeAxisCode(row[indexes.xAxisRcCode], "x");
    const key = `${institutionId}\u001f${zCode}\u001f${gradeId}`;
    if (!observations.has(key)) observations.set(key, { institutionId, zCode, gradeId, values: new Map() });
    const values = observations.get(key).values;
    if (!values.has(xCode)) values.set(xCode, new Set());
    values.get(xCode).add(value);
  }

  let conflictingPoints = 0;
  const byZ = new Map();
  for (const observation of observations.values()) {
    const pd = reportedNumber(observation.values.get("0010"));
    const ead = reportedNumber(observation.values.get("0110"));
    const rwa = reportedNumber(observation.values.get("0260"));
    if (["0010", "0110", "0260"].some((code) => observation.values.get(code)?.size > 1)) {
      conflictingPoints++;
      continue;
    }
    if (!Number.isFinite(pd) || pd < 0 || pd > 1 || !Number.isFinite(ead) || ead <= 0
      || !Number.isFinite(rwa) || rwa < 0) continue;
    if (!byZ.has(observation.zCode)) byZ.set(observation.zCode, new Map());
    const institutions = byZ.get(observation.zCode);
    if (!institutions.has(observation.institutionId)) institutions.set(observation.institutionId, []);
    institutions.get(observation.institutionId).push({ gradeId: observation.gradeId, pd, density: rwa / ead, ead, rwa });
  }

  const portfolios = [...byZ.keys()].sort((left, right) => left.localeCompare(right, "en", { numeric: true }))
    .map((zCode) => ({ zCode, label: portfolioLabel(mapping, zCode) }));
  const selectedPortfolio = portfolios.find((item) => item.zCode === zSelection)
    ?? portfolios.find((item) => item.zCode === "qx2023")
    ?? portfolios[0] ?? null;
  const series = selectedPortfolio ? [...(byZ.get(selectedPortfolio.zCode) ?? [])].map(([institutionId, points]) => ({
    institutionId, points: points.sort((a, b) => compareIrbGradeIds(a.gradeId, b.gradeId))
  })).sort((a, b) => a.institutionId.localeCompare(b.institutionId)) : [];
  const pointCount = series.reduce((total, item) => total + item.points.length, 0);
  return {
    status: pointCount ? "ready" : "no-portfolio-data", reference, references,
    portfolio: selectedPortfolio, portfolios, series, pointCount, conflictingPoints
  };
}
