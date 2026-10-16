import { getIndexedRowsByCoordinates } from "./dataIndex.js";
import { getReferenceColumns } from "./core/referenceColumns.js";
import { getTaxonomyFrameworkForDate } from "./taxonomyDimensionData.js";

export const APPROACH_FRAMEWORKS = ["3.2", "4.0", "4.2"];
export const APPROACH_BENCHMARK_METRICS = ["eadShare", "rwaShare", ...["original", "afterCrm", "ead", "rwa"].flatMap(
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
  { id: "retail", label: "Retail · excluding property-secured", note: "Property-secured exposures are excluded on both sides because the standardised mortgage class also contains non-retail counterparties." },
  { id: "sme", label: "SMEs · memo subset", note: "Cross-cutting subset, not additive with other groups. Standardised uses row 0020; IRB uses explicit SME classes." }
];

const source = (z, y = "0010") => ({ y, z });
const postCrr3 = {
  standard: {
    total: source(["qx01"]), sovereign: source(["qx16"]), regional: source(["qx23", "qx22"]),
    institutions: source(["qx19"]), corporates: source(["qx2036", "qx2037"]), retail: source(["qx26"]),
    sme: source(["qx01"], "0020")
  },
  irb: {
    total: source(["qx2023", "qx2022", "qx2082"]), sovereign: source(["qx2020", "qx2021"]),
    regional: source(["qx2071", "qx2072", "qx2073", "qx2074"]),
    institutions: source(["qx2018"]),
    corporates: source(["qx2012", "qx2013", "qx2014", "qx2015", "qx2075", "qx2076"]),
    retail: source(["qx2009", "qx2055", "qx2081"]),
    sme: source(["qx2079", "qx2080", "qx2008", "qx2011"])
  }
};

// Explicit crosswalk from the last pre-CRR3 taxonomy to the two post-CRR3
// releases. Parent totals are used only where their children are not also
// included; this prevents double counting IRB A/F and the SME memo subsets.
export const APPROACH_TAXONOMY_MAP = {
  "3.2": {
    standard: {
      total: source(["0001"]), sovereign: source(["0002"]), regional: source(["0003", "0004"]),
      institutions: source(["0007"]), corporates: source(["0008"]), retail: source(["0009"]),
      sme: source(["0001"], "0020")
    },
    irb: {
      total: source(["0001", "0002"]), sovereign: source(["0003", "0004"]),
      regional: source([]), institutions: source(["0005", "0006"]),
      corporates: source(["0007", "0008", "0009", "0010", "0011", "0012"]),
      retail: source(["0015", "0016", "0017"]),
      sme: source(["0007", "0008", "0013", "0016"])
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
  return {
    ...portfolio,
    stages,
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

function benchmarkValue(metrics, metricId) {
  if (metricId === "eadShare" || metricId === "rwaShare") {
    const share = metrics[metricId];
    return Number.isFinite(share) ? share * 100 : null;
  }
  const [stage, approach] = metricId.split(".");
  return metrics.stages[stage]?.[approach]?.value ?? null;
}

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
  const totalPeers = peerIds.map((id) => ({ institutionId: id, ...metricsFor(reference, id, APPROACH_PORTFOLIOS[0]) }))
    .filter((peer) => peer.eadShare !== null || peer.rwaShare !== null);
  const peers = selectedPortfolio.id === "total" ? totalPeers : peerIds
    .map((id) => ({ institutionId: id, ...metricsFor(reference, id, selectedPortfolio) }))
    .filter((peer) => peer.eadShare !== null || peer.rwaShare !== null);
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
    isPercent: selectedMetricId.endsWith("Share"),
    metricId: selectedMetricId,
    series: [institutionId, ...peerIds].map((id) => ({
      jstCode: id,
      values: references.map((candidate) => ({
        date: candidate.date,
        label: candidate.label,
        value: benchmarkValue(metricsFor(candidate, id, selectedPortfolio), selectedMetricId)
      }))
    })).filter((item) => item.values.some((point) => Number.isFinite(point.value)))
  };
  return { status: "ready", framework: reference.framework, reference, references, institutionId, portfolios, total, selectedPortfolio, timeline, peers, distribution, benchmark };
}
