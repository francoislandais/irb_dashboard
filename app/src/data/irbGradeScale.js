export function createIrbGradeYScale(points, mode = "linear") {
  const values = points.map((point) => point.pd).filter((value) => Number.isFinite(value) && value >= 0);
  const max = values.reduce((highest, value) => Math.max(highest, value), 0);
  if (mode !== "log10") {
    const top = Math.min(1, Math.max(0.001, max * 1.1));
    return {
      mode: "linear",
      ticks: Array.from({ length: 5 }, (_, index) => top * index / 4),
      position: (value) => Number.isFinite(value) && value >= 0 ? 1 - value / top : null
    };
  }
  const positive = values.filter((value) => value > 0);
  if (!positive.length) return { mode: "log10", ticks: [], position: () => null };
  const minimum = positive.reduce((lowest, value) => Math.min(lowest, value), Infinity);
  const maximum = positive.reduce((highest, value) => Math.max(highest, value), 0);
  const low = Math.floor(Math.log10(minimum));
  const high = Math.max(low + 1, Math.ceil(Math.log10(maximum)));
  const step = Math.max(1, Math.ceil((high - low) / 6));
  const ticks = [];
  for (let exponent = low; exponent <= high; exponent += step) ticks.push(10 ** exponent);
  if (ticks.at(-1) !== 10 ** high) ticks.push(10 ** high);
  return {
    mode: "log10",
    ticks,
    position: (value) => Number.isFinite(value) && value > 0
      ? (high - Math.log10(value)) / (high - low)
      : null
  };
}
