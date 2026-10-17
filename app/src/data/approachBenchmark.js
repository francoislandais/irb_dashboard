import { getIndexedRowsByCoordinates } from "./dataIndex.js";
import { getReferenceColumns } from "./core/referenceColumns.js";
import { getTaxonomyFrameworkForDate } from "./taxonomyDimensionData.js";

export const APPROACH_FRAMEWORKS = ["3.2", "4.0", "4.2"];
export const APPROACH_BENCHMARK_METRICS = ["eadShare", "rwaShare", "density.standard", "density.irb", "pd.irb", "lgd.irb", "elRate.irb", "provisionsRate.irb", ...["original", "afterCrm", "ead", "rwa"].flatMap(
  (stage) => ["standard", "irb"].map((approach) => `${stage}.${approach}`)
)];

export const APPROACHES = {
  standard: {
    label: "Standardised",
    tableId: "C_07.00",
    stages: { original: "0010", afterCrm: "0110", ead: "0200", rwa: "0220" }
  },
  irb: {
    label: "IRB",
    tableId: "C_08.01",
    stages: { original: "0020", afterCrm: "0090", ead: "0110", rwa: "0260" }
  }
};

// Analytical groups are stable across releases; their source coordinates are
// defined separately below. SME memo subsets are not additive to the groups.
export const APPROACH_PORTFOLIOS = [
  { id: "total", label: "All exposures", note: "IRB adds the IRB A and IRB F totals; post-2025 CIU exposures are included when reported." },
  { id: "sovereign", label: "Central governments & central banks", note: "Central-government and central-bank classes on both sides." },
  { id: "regional", label: "Regional government & public sector", note: "Pre-2025 IRB does not isolate this group: no cross-approach share is calculated for those dates." },
  { id: "institutions", label: "Institutions", note: "The standardised mixed short-term institution/corporate class is excluded in every version." },
  { id: "corporates", label: "Corporates", note: "The standardised mixed short-term class is excluded. IRB SME, specialised lending and other corporates are included." },
  { id: "specialisedLending", label: "Specialised lending", note: "Separately comparable after 2025; the pre-CRR3 standardised class is not isolated." },
  { id: "retail", label: "Retail · excluding property-secured", note: "Property-secured exposures are excluded on both sides because the standardised mortgage class also contains non-retail counterparties." },
  { id: "sme", label: "SMEs · memo subset", note: "Cross-cutting subset, not additive with other groups. Standardised uses row 0020; IRB uses explicit SME classes." },
  { id: "corporateSme", label: "Corporate SMEs · IRB", irbOnly: true, note: "IRB corporate-SME classes only; no matching standardised corporate-SME class." },
  { id: "largeCorporates", label: "Large corporates · IRB memo", irbOnly: true, note: "IRB-only memo class in the post-2025 taxonomy. No separately identifiable standardised equivalent or pre-2025 series." },
  { id: "retailRevolving", label: "Retail · qualifying revolving · IRB", irbOnly: true, note: "IRB-specific retail class; no separately identifiable standardised counterpart." }
];

const source = (z, y = "0010") => ({ y, z });
const postCrr3 = {
  standard: {
    total: source(["qx01"]), sovereign: source(["qx16"]), regional: source(["qx23", "qx22"]),
    institutions: source(["qx19"]), corporates: source(["qx2036", "qx2037"]),
    specialisedLending: source(["qx2037"]), retail: source(["qx26"]),
    sme: source(["qx01"], "0020"), corporateSme: source([]), largeCorporates: source([]), retailRevolving: source([])
  },
  irb: {
    total: source(["qx2023", "qx2022", "qx2082"]), sovereign: source(["qx2020", "qx2021"]),
    regional: source(["qx2071", "qx2072", "qx2073", "qx2074"]),
    institutions: source(["qx2018"]), specialisedLending: source(["qx2014", "qx2015"]),
    corporates: source(["qx2012", "qx2013", "qx2014", "qx2015", "qx2075", "qx2076"]),
    retail: source(["qx2009", "qx2055", "qx2081"]),
    sme: source(["qx2079", "qx2080", "qx2008", "qx2011"]),
    corporateSme: source(["qx2079", "qx2080"]), largeCorporates: source(["qx2077", "qx2078"]),
    retailRevolving: source(["qx2009"])
  }
};

// Explicit crosswalk from the last pre-CRR3 taxonomy to the two post-CRR3
// releases. Parent totals are used only where their children are not also
// included; this prevents double counting IRB A/F and the SME memo subsets.
export const APPROACH_TAXONOMY_MAP = {
  "3.2": {
    standard: {
      total: source(["0001"]), sovereign: source(["0002"]), regional: source(["0003", "0004"]),
      institutions: source(["0007"]), corporates: source(["0008"]), specialisedLending: source([]), retail: source(["0009"]),
      sme: source(["0001"], "0020"), corporateSme: source([]), largeCorporates: source([]), retailRevolving: source([])
    },
    irb: {
      total: source(["0001", "0002"]), sovereign: source(["0003", "0004"]),
      regional: source([]), institutions: source(["0005", "0006"]), specialisedLending: source(["0009", "0010"]),
      corporates: source(["0007", "0008", "0009", "0010", "0011", "0012"]),
      retail: source(["0015", "0016", "0017"]),
      sme: source(["0007", "0008", "0013", "0016"]), corporateSme: source(["0007", "0008"]),
      largeCorporates: source([]), retailRevolving: source(["0015"])
    }
  },
  "4.0": postCrr3,
  "4.2": postCrr3
};

function cellValue(state, reference, institutionId, tableId, xCode, yCode, zCode) {
  const rows = getIndexedRowsByCoordinates(state, tableId, {
    selectedXCode: xCode, selectedYCode: yCode, selectedZCode: zCode
  }, institutionId);
  const values = new Set(rows.map((row) => String(row[reference.index] ?? "").trim())
    .filter(Boolean).map(Number).filter(Number.isFinite));
  // Duplicate extractions with the same value are harmless; conflicting
  // values must not be silently summed into a misleading benchmark.
  return { value: values.size === 1 ? [...values][0] : null, conflict: values.size > 1 };
}

function irbParameter(state, reference, institutionId, portfolio, xCode) {
  const mapping = APPROACH_TAXONOMY_MAP[reference.framework].irb[portfolio.id];
  let weightedSum = 0, weightSum = 0, present = 0, conflict = false;
  for (const zCode of mapping.z) {
    // The grade/pool row is the reporting basis for PD and LGD; a template
    // that only reports the total row remains usable with the same Z class.
    let parameter = cellValue(state, reference, institutionId, "C_08.01", xCode, "0070", zCode);
    let exposure = cellValue(state, reference, institutionId, "C_08.01", "0110", "0070", zCode);
    if (parameter.value === null && !parameter.conflict) {
      parameter = cellValue(state, reference, institutionId, "C_08.01", xCode, "0010", zCode);
      exposure = cellValue(state, reference, institutionId, "C_08.01", "0110", "0010", zCode);
    }
    conflict ||= parameter.conflict || exposure.conflict;
    if (Number.isFinite(parameter.value) && parameter.value >= 0 && parameter.value <= 1
      && Number.isFinite(exposure.value) && exposure.value > 0) {
      weightedSum += parameter.value * exposure.value;
      weightSum += exposure.value;
      present += 1;
    }
  }
  return {
    value: !conflict && weightSum > 0 ? weightedSum / weightSum : null,
    present, expected: mapping.z.length, conflict,
    source: { tableId: "C_08.01", x: xCode, y: "0070 → 0010", z: mapping.z }
  };
}

function sumPortfolio(state, reference, institutionId, approach, portfolio, stage) {
  const definition = APPROACHES[approach];
  const mapping = APPROACH_TAXONOMY_MAP[reference.framework][approach][portfolio.id];
  const zCodes = mapping.z;
  const yCode = mapping.y;
  const values = zCodes.map((zCode) => cellValue(
    state, reference, institutionId, definition.tableId, definition.stages[stage], yCode, zCode
  ));
  const present = values.filter((cell) => cell.value !== null);
  const conflict = values.some((cell) => cell.conflict);
  return {
    value: !conflict && present.length ? present.reduce((total, cell) => total + cell.value, 0) : null,
    present: present.length,
    expected: zCodes.length,
    source: { tableId: definition.tableId, x: definition.stages[stage], y: yCode, z: zCodes },
    conflict
  };
}

function irbReportedAmountRate(state, reference, institutionId, portfolio, xCode) {
  const { y, z } = APPROACH_TAXONOMY_MAP[reference.framework].irb[portfolio.id];
  let numerator = 0, ead = 0, present = 0, conflict = false;
  for (const zCode of z) {
    // Keep numerator and denominator on the same reported IRB class. An
    // absent amount in one class must not be divided by another class's EAD.
    const amountCell = cellValue(state, reference, institutionId, "C_08.01", xCode, y, zCode);
    const eadCell = cellValue(state, reference, institutionId, "C_08.01", "0110", y, zCode);
    conflict ||= amountCell.conflict || eadCell.conflict;
    if (Number.isFinite(amountCell.value)
      && Number.isFinite(eadCell.value) && eadCell.value > 0) {
      // X 0290 is labelled "(-) value adjustments and provisions"; use its
      // magnitude so either reporting sign convention yields a coverage rate.
      numerator += xCode === "0290" ? Math.abs(amountCell.value) : amountCell.value;
      ead += eadCell.value;
      present += 1;
    }
  }
  return {
    value: !conflict && ead > 0 && numerator >= 0 ? numerator / ead : null,
    present, expected: z.length, conflict,
    source: { tableId: "C_08.01", numeratorX: xCode, denominatorX: "0110", y, z }
  };
}

export function standardShare(standard, irb) {
  if (!Number.isFinite(standard) || !Number.isFinite(irb) || standard < 0 || irb < 0) return null;
  const total = standard + irb;
  return total > 0 ? standard / total : null;
}

function availableShare(standard, irb) {
  if (standard.conflict || irb.conflict || standard.expected === 0 || irb.expected === 0
    || (standard.present === 0 && irb.present === 0)) return null;
  // Missing source classes are omitted. If one approach has no reported
  // class, its contribution to this available-data share is zero.
  return standardShare(standard.value ?? 0, irb.value ?? 0);
}

function portfolioMetrics(state, reference, institutionId, portfolio) {
  const stages = {};
  for (const stage of ["original", "afterCrm", "ead", "rwa"]) {
    stages[stage] = {
      standard: sumPortfolio(state, reference, institutionId, "standard", portfolio, stage),
      irb: sumPortfolio(state, reference, institutionId, "irb", portfolio, stage)
    };
  }
  const parameterCache = new Map();
  return {
    ...portfolio,
    stages,
    getExpectedLossRate: () => {
      if (!parameterCache.has("elRate")) parameterCache.set("elRate",
        irbReportedAmountRate(state, reference, institutionId, portfolio, "0280"));
      return parameterCache.get("elRate");
    },
    getProvisionsRate: () => {
      if (!parameterCache.has("provisionsRate")) parameterCache.set("provisionsRate",
        irbReportedAmountRate(state, reference, institutionId, portfolio, "0290"));
      return parameterCache.get("provisionsRate");
    },
    getParameter: (kind) => {
      if (!parameterCache.has(kind)) parameterCache.set(kind,
        irbParameter(state, reference, institutionId, portfolio, kind === "pd" ? "0010" : "0230"));
      return parameterCache.get(kind);
    },
    density: Object.fromEntries(["standard", "irb"].map((approach) => {
      const ead = stages.ead[approach], rwa = stages.rwa[approach];
      return [approach, !ead.conflict && !rwa.conflict && ead.value > 0 && Number.isFinite(rwa.value)
        ? rwa.value / ead.value : null];
    })),
    eadShare: availableShare(stages.ead.standard, stages.ead.irb),
    rwaShare: availableShare(stages.rwa.standard, stages.rwa.irb)
  };
}

function percentile(sorted, fraction) {
  if (!sorted.length) return null;
  const position = (sorted.length - 1) * fraction;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

export function approachMetricValue(metrics, metricId) {
  if (metricId === "eadShare" || metricId === "rwaShare") {
    return metrics[metricId] ?? null;
  }
  const [stage, approach] = metricId.split(".");
  if (stage === "density") return metrics.density[approach];
  if (stage === "elRate") return approach === "irb" ? metrics.getExpectedLossRate().value : null;
  if (stage === "provisionsRate") return approach === "irb" ? metrics.getProvisionsRate().value : null;
  if (stage === "pd" || stage === "lgd") return approach === "irb" ? metrics.getParameter(stage)?.value ?? null : null;
  return metrics.stages[stage]?.[approach]?.value ?? null;
}

export const isApproachPercentMetric = (metricId) => metricId.endsWith("Share") ||
  metricId.startsWith("density.") || metricId === "pd.irb" || metricId === "lgd.irb" || metricId === "elRate.irb" || metricId === "provisionsRate.irb";

export function buildApproachBenchmarkModel(state, referenceName = "", portfolioId = "total", metricId = "eadShare") {
  if (!state?.dataIndexes || !state?.selectedJst) return { status: "no-data" };
  const references = getReferenceColumns(state.columns).map((reference) => {
    const frameworks = Object.values(APPROACHES).map(({ tableId }) =>
      getTaxonomyFrameworkForDate(state, tableId, reference.date));
    return { ...reference, framework: frameworks[0] === frameworks[1] ? frameworks[0] : null };
  }).filter((reference) => APPROACH_FRAMEWORKS.includes(reference.framework));
  if (!references.length) return { status: "no-framework" };

  const reference = references.find((candidate) => candidate.name === referenceName) ?? references.at(-1);
  const institutionId = state.selectedJst;
  const selectedMetricId = APPROACH_BENCHMARK_METRICS.includes(metricId) ? metricId : "eadShare";
  const metricCache = new Map();
  const metricsFor = (candidate, id, portfolio) => {
    const key = `${candidate.name}|${id}|${portfolio.id}`;
    if (!metricCache.has(key)) metricCache.set(key, portfolioMetrics(state, candidate, id, portfolio));
    return metricCache.get(key);
  };
  const portfolios = APPROACH_PORTFOLIOS.map((portfolio) => metricsFor(reference, institutionId, portfolio));
  const total = portfolios[0];
  const selectedPortfolio = portfolios.find((portfolio) => portfolio.id === portfolioId) ?? total;
  const timeline = references.map((candidate) => ({
    reference: candidate,
    ...metricsFor(candidate, institutionId, selectedPortfolio)
  }));
  const selectedPeers = new Set(state.peerJstCodes ?? []);
  const peerIds = (state.jstOptions ?? []).filter((id) => id !== institutionId && selectedPeers.has(id));
  const totalPeers = peerIds.map((id) => ({ institutionId: id, ...metricsFor(reference, id, APPROACH_PORTFOLIOS[0]) }));
  const peers = (selectedPortfolio.id === "total" ? totalPeers : peerIds
    .map((id) => ({ institutionId: id, ...metricsFor(reference, id, selectedPortfolio) })))
    .filter((peer) => approachMetricValue(peer, selectedMetricId) !== null);
  const distribution = Object.fromEntries(["eadShare", "rwaShare"].map((key) => {
    const values = totalPeers.map((peer) => peer[key]).filter((value) => value !== null).sort((a, b) => a - b);
    return [key, {
      count: values.length,
      lower: percentile(values, 0.25),
      median: percentile(values, 0.5),
      upper: percentile(values, 0.75)
    }];
  }));
  const benchmark = {
    dates: references,
    isPercent: isApproachPercentMetric(selectedMetricId),
    metricId: selectedMetricId,
    series: [institutionId, ...peerIds].map((id) => ({
      jstCode: id,
      values: references.map((candidate) => ({
        date: candidate.date,
        label: candidate.label,
        value: (() => {
          const value = approachMetricValue(metricsFor(candidate, id, selectedPortfolio), selectedMetricId);
          return value !== null && isApproachPercentMetric(selectedMetricId) ? value * 100 : value;
        })()
      }))
    })).filter((item) => item.values.some((point) => Number.isFinite(point.value)))
  };
  return { status: "ready", framework: reference.framework, reference, references, institutionId, portfolios, total, selectedPortfolio, timeline, peers, distribution, benchmark };
}
