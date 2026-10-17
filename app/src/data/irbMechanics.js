import { getIndexedRowsByCoordinates } from "./dataIndex.js";
import { getReferenceColumns } from "./core/referenceColumns.js";
import { getTaxonomyFrameworkForDate } from "./taxonomyDimensionData.js";

// C_08.01, framework 4.0/4.2. Each entry is one reporting class, never an
// aggregate of different risk-weight functions. Y 0010 is the total row.
export const IRB_SEGMENTS = [
  { id: "corporateA", label: "Corporates · IRB A", z: "qx2013", kind: "corporate" },
  { id: "corporateF", label: "Corporates · IRB F", z: "qx2012", kind: "corporate" },
  { id: "sovereignA", label: "Central governments · IRB A", z: "qx2021", kind: "corporate" },
  { id: "sovereignF", label: "Central governments · IRB F", z: "qx2020", kind: "corporate" },
  { id: "institutions", label: "Institutions · IRB F", z: "qx2018", kind: "corporate" },
  { id: "retailMortgage", label: "Retail · residential mortgage", z: "qx2068", kind: "mortgage" },
  { id: "retailRevolving", label: "Retail · qualifying revolving", z: "qx2009", kind: "revolving" },
  { id: "retailOther", label: "Retail · other", z: "qx2081", kind: "retail" }
];

const normalCdf = (x) => {
  // Abramowitz–Stegun 7.1.26; sufficient precision for an explanatory chart.
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const density = Math.exp(-x * x / 2) / Math.sqrt(2 * Math.PI);
  const tail = density * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return x >= 0 ? 1 - tail : tail;
};

function inverseNormal(p) {
  if (p <= 0 || p >= 1) return NaN;
  // Acklam's rational approximation.
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const q = p < 0.5 ? Math.sqrt(-2 * Math.log(p)) : Math.sqrt(-2 * Math.log(1 - p));
  if (p < 0.02425 || p > 0.97575) {
    const x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    return p < 0.5 ? x : -x;
  }
  const x = p - 0.5;
  const r = x * x;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * x /
    (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

export function assetCorrelation(pd, kind, turnover = null, financialMultiplier = false) {
  const blend = (slope) => -Math.expm1(-slope * pd) / -Math.expm1(-slope);
  if (kind === "mortgage") return 0.15;
  if (kind === "revolving") return 0.04;
  if (kind === "retail") return 0.16 - 0.13 * blend(35);
  let correlation = 0.24 - 0.12 * blend(50);
  if (Number.isFinite(turnover) && turnover > 0 && turnover < 50) {
    correlation -= 0.04 * (1 - (Math.max(5, turnover) - 5) / 45);
  }
  return correlation * (financialMultiplier ? 1.25 : 1);
}

export function conditionalLossAtShock(pd, lgd, correlation, shock) {
  if (correlation === 0) return pd * lgd;
  return normalCdf((inverseNormal(pd) + Math.sqrt(correlation) * shock) / Math.sqrt(1 - correlation)) * lgd;
}

export function expectedLossShock(pd, correlation) {
  if (correlation === 0) return 0;
  return inverseNormal(pd) * (Math.sqrt(1 - correlation) - 1) / Math.sqrt(correlation);
}

// Independent standard-normal adverse shocks for an explanatory one-year sequence.
// A seed keeps the illustration stable when PD, LGD or R changes.
export function simulateSystemicShocks(count = 60, seed = 20261016) {
  if (!Number.isInteger(count) || count < 0 || count > 10_000) throw new RangeError("Invalid simulation length");
  let state = seed >>> 0;
  const uniform = () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 0x100000000;
  };
  return Array.from({ length: count }, () => {
    const u = Math.max(uniform(), Number.EPSILON);
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * uniform());
  });
}

export function calculateIrbMechanics({ pd, lgd, ead, maturity = 2.5, kind = "corporate", turnover = null, financialMultiplier = false, correlation: correlationOverride = null }) {
  if (![pd, lgd, ead].every(Number.isFinite) || !(pd > 0 && pd < 1)
    || !(lgd >= 0 && lgd <= 1) || ead < 0 || !Number.isFinite(maturity) || maturity <= 0
    || (correlationOverride !== null && (!Number.isFinite(correlationOverride) || correlationOverride < 0 || correlationOverride >= 1))) return null;
  const correlation = correlationOverride ?? assetCorrelation(pd, kind, turnover, financialMultiplier);
  const stressedPd = conditionalLossAtShock(pd, 1, correlation, inverseNormal(0.999));
  const expectedRate = pd * lgd;
  const stressRate = stressedPd * lgd;
  const maturityFactor = ["corporate"].includes(kind)
    ? (() => {
      const b = (0.11852 - 0.05478 * Math.log(pd)) ** 2;
      return (1 + (maturity - 2.5) * b) / (1 - 1.5 * b);
    })() : 1;
  const unexpectedRate = Math.max(0, (stressRate - expectedRate) * maturityFactor);
  return {
    correlation, stressedPd, expectedRate, stressRate, maturityFactor, unexpectedRate,
    expectedLoss: expectedRate * ead,
    unexpectedLoss: unexpectedRate * ead,
    rwa: unexpectedRate * ead * 12.5,
    riskWeight: unexpectedRate * 12.5
  };
}

function reportedCell(state, reference, institutionId, x, z, yCandidates = ["0010"]) {
  for (const y of yCandidates) {
    const rows = getIndexedRowsByCoordinates(state, "C_08.01", {
      selectedXCode: x, selectedYCode: y, selectedZCode: z
    }, institutionId);
    const values = new Set(rows.map((row) => String(row[reference.index] ?? "").trim())
      .filter(Boolean).map(Number).filter(Number.isFinite));
    if (values.size > 1) return { value: null, y, conflict: true };
    if (values.size === 1) return { value: [...values][0], y, conflict: false };
  }
  return { value: null, y: null, conflict: false };
}

export function buildIrbMechanicsModel(state, referenceName = "", segmentId = "corporateA") {
  if (!state?.dataIndexes || !state?.selectedJst) return { status: "no-data" };
  const references = getReferenceColumns(state.columns).map((reference) => ({
    ...reference, framework: getTaxonomyFrameworkForDate(state, "C_08.01", reference.date)
  })).filter((reference) => ["4.0", "4.2"].includes(reference.framework));
  if (!references.length) return { status: "no-framework" };
  const reference = references.find((item) => item.name === referenceName) ?? references.at(-1);
  const segment = IRB_SEGMENTS.find((item) => item.id === segmentId) ?? IRB_SEGMENTS[0];
  const read = (id, x, y = ["0010"]) => reportedCell(state, reference, id, x, segment.z, y);
  const institutionId = state.selectedJst;
  const reported = {
    pd: read(institutionId, "0010", ["0070", "0010"]),
    lgd: read(institutionId, "0230", ["0070", "0010"]),
    ead: read(institutionId, "0110"),
    maturityDays: read(institutionId, "0250", ["0070", "0010"]),
    rwaBefore: read(institutionId, "0255"),
    rwaAfter: read(institutionId, "0260"),
    expectedLoss: read(institutionId, "0280")
  };
  const selectedPeers = new Set(state.peerJstCodes ?? []);
  const peerIds = (state.jstOptions ?? []).filter((id) => id !== institutionId && selectedPeers.has(id));
  const peers = peerIds.map((id) => {
    const ead = read(id, "0110").value;
    const rwa = read(id, "0255").value;
    return { id, ead, rwa, riskWeight: ead > 0 && Number.isFinite(rwa) ? rwa / ead : null };
  }).filter((item) => item.riskWeight !== null);
  return { status: "ready", references, reference, segment, reported, peers, institutionId };
}
