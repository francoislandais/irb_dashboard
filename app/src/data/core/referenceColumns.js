export const REFERENCE_COLUMN_PATTERN = /^ref_(\d{4})_(\d{2})_(\d{2})$/;

export function getReferenceColumns(columns) {
  return columns
    .map((name, index) => {
      const match = String(name).match(REFERENCE_COLUMN_PATTERN);
      if (!match) return null;

      const [, year, month, day] = match;
      const date = new Date(Number(year), Number(month) - 1, Number(day));
      return {
        date,
        index,
        label: formatReferenceDate(date),
        name
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.date - right.date);
}

export function formatReferenceDate(date) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}

export function parseNumericValue(value, fallback = 0) {
  const parsed = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : fallback;
}
