import { normalizeAxisCode } from "./core/axisCode.js";
import { getRequiredAxisColumnIndexes } from "./core/axisColumns.js";
import { getReferenceColumns, parseNumericValue } from "./core/referenceColumns.js";

const IRB_DENSITY_TABLE_ID = "C_08.01";
export const IRB_DENSITY_TOTAL_Y_CODE = "0010";
const IRB_DENSITY_EAD_X_CODE = "0110";
const IRB_DENSITY_RWA_X_CODE = "0260";
export const IRB_DENSITY_TOTAL_PORTFOLIO_CODE = "qx01";
const densityCubeByRows = new WeakMap();

export function getIrbDensityModel(
  state,
  referenceName = "",
  portfolioCode = IRB_DENSITY_TOTAL_PORTFOLIO_CODE,
  yCode = IRB_DENSITY_TOTAL_Y_CODE
) {
  const indexes = getRequiredAxisColumnIndexes(state?.columns ?? []);
  const referenceDates = getReferenceColumns(state?.columns ?? []);
  const referenceDate = referenceDates.find((reference) => reference.name === referenceName)
    ?? referenceDates.at(-1)
    ?? null;

  if (!indexes || !state?.selectedJst || !referenceDate) {
    return {
      benchmark: [],
      portfolios: [],
      referenceDate,
      referenceDates,
      status: "Load a dataset containing C_08.01 and select a JST."
    };
  }

  const cube = getDensityCube(state, indexes, referenceDates);
  const yOptions = buildYAxisOptions(state, cube, state.selectedJst);
  const selectedY = yOptions.find((option) => option.code === normalizeAxisCode(yCode, "y"))
    ?? yOptions.find((option) => option.code === IRB_DENSITY_TOTAL_Y_CODE)
    ?? yOptions[0];
  const portfolios = selectedY
    ? buildPortfolioRows(state, cube, referenceDate, state.selectedJst, selectedY.code)
    : [];
  if (portfolios.length === 0) {
    return {
      benchmark: [],
      portfolios: [],
      referenceDate,
      referenceDates,
      status: "No C_08.01 IRB density data is available for this JST/reference date.",
      yOptions
    };
  }

  const selectedPortfolio = portfolios.find((portfolio) => portfolio.code === portfolioCode)
    ?? portfolios.find((portfolio) => portfolio.code === IRB_DENSITY_TOTAL_PORTFOLIO_CODE)
    ?? portfolios[0];

  return {
    benchmark: buildDensityBenchmark(state, cube, referenceDate, selectedPortfolio.code, selectedY.code),
    portfolios,
    referenceDate,
    referenceDates,
    selectedPortfolio,
    selectedY,
    status: "",
    yOptions
  };
}

export function getIrbDensityPoint(state, referenceName, jstCode, portfolioCode, yCode) {
  const indexes = getRequiredAxisColumnIndexes(state?.columns ?? []);
  const referenceDates = getReferenceColumns(state?.columns ?? []);
  const referenceDate = referenceDates.find((reference) => reference.name === referenceName);
  if (!indexes || !referenceDate || !jstCode || !portfolioCode || !yCode) return null;
  return readDensityPoint(
    state,
    getDensityCube(state, indexes, referenceDates),
    referenceDate,
    jstCode,
    portfolioCode,
    yCode
  );
}

function buildYAxisOptions(state, cube, jstCode) {
  return [...(cube.yCodesByJst.get(jstCode) ?? [])]
    .map((code) => ({ code, label: getAxisLabel(state, "y_axis_rc_code", code) }))
    .sort((left, right) => {
      if (left.code === IRB_DENSITY_TOTAL_Y_CODE) return -1;
      if (right.code === IRB_DENSITY_TOTAL_Y_CODE) return 1;
      return left.label.localeCompare(right.label, "fr", { numeric: true });
    });
}

function buildPortfolioRows(state, cube, referenceDate, jstCode, yCode) {
  return [...(cube.zCodesByJstY.get(makeCubeKey(jstCode, yCode)) ?? [])]
    .map((code) => readDensityPoint(state, cube, referenceDate, jstCode, code, yCode))
    .filter((portfolio) => Number.isFinite(portfolio.ead) || Number.isFinite(portfolio.rwa))
    .sort((left, right) => {
      if (left.code === IRB_DENSITY_TOTAL_PORTFOLIO_CODE) return -1;
      if (right.code === IRB_DENSITY_TOTAL_PORTFOLIO_CODE) return 1;
      return left.label.localeCompare(right.label, "fr", { numeric: true });
    });
}

function buildDensityBenchmark(state, cube, referenceDate, portfolioCode, yCode) {
  const peerCodes = state.peerJstCodes?.length ? state.peerJstCodes : state.jstOptions;
  return [...new Set([state.selectedJst, ...(peerCodes ?? [])].filter(Boolean))]
    .map((jstCode) => readDensityPoint(state, cube, referenceDate, jstCode, portfolioCode, yCode))
    .filter((point) => [point.density, point.ead, point.rwa].some(Number.isFinite));
}

function readDensityPoint(state, cube, referenceDate, jstCode, portfolioCode, yCode) {
  const entry = cube.points.get(makeCubeKey(jstCode, yCode, portfolioCode));
  const referenceIndex = cube.referenceIndexByName.get(referenceDate.name);
  const ead = entry?.ead[referenceIndex] ?? null;
  const rwa = entry?.rwa[referenceIndex] ?? null;
  return {
    code: portfolioCode,
    density: Number.isFinite(ead) && ead !== 0 && Number.isFinite(rwa) ? rwa / ead : null,
    ead,
    jstCode,
    label: getPortfolioLabel(state, portfolioCode),
    rwa
  };
}

function getDensityCube(state, indexes, referenceDates) {
  const rows = state?.rows;
  if (!Array.isArray(rows)) return createEmptyCube(referenceDates);
  const cached = densityCubeByRows.get(rows);
  if (cached) return cached;

  const cube = createEmptyCube(referenceDates);
  rows.forEach((row) => {
    if (row[indexes.tableId] !== IRB_DENSITY_TABLE_ID) return;
    const xCode = normalizeAxisCode(row[indexes.xAxisRcCode], "x");
    if (xCode !== IRB_DENSITY_EAD_X_CODE && xCode !== IRB_DENSITY_RWA_X_CODE) return;
    const jstCode = String(row[indexes.jstCode] ?? "").trim();
    const yCode = normalizeAxisCode(row[indexes.yAxisRcCode], "y");
    const zCode = String(row[indexes.zAxisRcCode] ?? "").trim();
    if (!jstCode || !yCode || !zCode) return;

    if (!cube.yCodesByJst.has(jstCode)) cube.yCodesByJst.set(jstCode, new Set());
    cube.yCodesByJst.get(jstCode).add(yCode);
    const jstYKey = makeCubeKey(jstCode, yCode);
    if (!cube.zCodesByJstY.has(jstYKey)) cube.zCodesByJstY.set(jstYKey, new Set());
    cube.zCodesByJstY.get(jstYKey).add(zCode);

    const pointKey = makeCubeKey(jstCode, yCode, zCode);
    if (!cube.points.has(pointKey)) {
      cube.points.set(pointKey, {
        ead: Array(referenceDates.length).fill(null),
        rwa: Array(referenceDates.length).fill(null)
      });
    }
    const values = xCode === IRB_DENSITY_EAD_X_CODE
      ? cube.points.get(pointKey).ead
      : cube.points.get(pointKey).rwa;
    referenceDates.forEach((reference, referenceIndex) => {
      const value = parseNumericValue(row[reference.index], null);
      if (!Number.isFinite(value)) return;
      values[referenceIndex] = (values[referenceIndex] ?? 0) + value;
    });
  });
  densityCubeByRows.set(rows, cube);
  return cube;
}

function createEmptyCube(referenceDates) {
  return {
    points: new Map(),
    referenceIndexByName: new Map(referenceDates.map((reference, index) => [reference.name, index])),
    yCodesByJst: new Map(),
    zCodesByJstY: new Map()
  };
}

function makeCubeKey(...parts) {
  return parts.join("\u001f");
}

function getPortfolioLabel(state, code) {
  const description = state?.dimensionMapping
    ?.find(IRB_DENSITY_TABLE_ID, "z_axis_rc_code", code)
    ?.description;
  if (!description) return code;
  const path = description.split("/").map((part) => part.trim()).filter(Boolean);
  if (path[0]?.toLowerCase() === "all exposure classes and approaches" && path.length > 1) {
    path.shift();
  }
  return path.join(" / ") || description;
}

function getAxisLabel(state, coordinate, code) {
  return state?.dimensionMapping?.find(IRB_DENSITY_TABLE_ID, coordinate, code)?.description || code;
}
