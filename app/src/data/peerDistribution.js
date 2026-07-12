// Pure statistics helpers for the anonymised peer benchmark mode. No DOM, no
// Highcharts - safe to unit test in isolation and safe to reuse from any
// chart in the app that shows a JST against its peer population.

export const MIN_ANONYMISED_PEER_COUNT = 5;
export const DEFAULT_PEER_DISPLAY_MODE = "explicit";

// Linear-interpolation percentile (the same convention as numpy's default
// "linear" method): for a sorted array, position = (n - 1) * p locates a
// point between two ranks, interpolated by its fractional weight. Values
// must already be filtered to finite numbers and sorted ascending.
export function calculatePercentile(sortedValues, percentile) {
  if (!sortedValues.length) return null;

  const position = (sortedValues.length - 1) * percentile;
  const lowerIndex = Math.floor(position);
  const upperIndex = Math.ceil(position);

  if (lowerIndex === upperIndex) return sortedValues[lowerIndex];

  const weight = position - lowerIndex;
  return sortedValues[lowerIndex] * (1 - weight) + sortedValues[upperIndex] * weight;
}

// peerChartSeries: [{ name: jstCode, data: [{ x, y, referenceLabel }, ...] }]
// - the same per-series point shape produced for the app's Highcharts
// benchmark series, already excluding the selected JST. Percentiles are
// computed independently per x (reference date): a peer missing a value at
// a given date is simply excluded from that date's population, never
// backfilled from another date.
export function buildPeerDistributionByDate(peerChartSeries, minimumPeerCount = MIN_ANONYMISED_PEER_COUNT) {
  const byX = new Map();

  (peerChartSeries ?? []).forEach((series) => {
    (series.data ?? []).forEach((point) => {
      if (!Number.isFinite(point?.x) || !Number.isFinite(point?.y)) return;
      if (!byX.has(point.x)) byX.set(point.x, { referenceLabel: point.referenceLabel, values: [] });
      byX.get(point.x).values.push(point.y);
    });
  });

  return [...byX.entries()]
    .sort(([leftX], [rightX]) => leftX - rightX)
    .map(([x, { referenceLabel, values }]) => {
      const sorted = [...values].sort((left, right) => left - right);
      const peerCount = sorted.length;

      if (peerCount < minimumPeerCount) {
        return { median: null, p01: null, p25: null, p75: null, p99: null, peerCount, referenceLabel, status: "insufficient-population", x };
      }

      return {
        median: calculatePercentile(sorted, 0.5),
        p01: calculatePercentile(sorted, 0.01),
        p25: calculatePercentile(sorted, 0.25),
        p75: calculatePercentile(sorted, 0.75),
        p99: calculatePercentile(sorted, 0.99),
        peerCount,
        referenceLabel,
        status: "available",
        x
      };
    });
}
