export function formatMetricValue(value, selectedUnit, valueFormat = "") {
  if (isPercentFormat(valueFormat)) return formatPercentValue(value);

  const unit = getUnitDefinition(selectedUnit);
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value / unit.divisor);
}

export function formatSignedMetricValue(value, selectedUnit) {
  const unit = getUnitDefinition(selectedUnit);
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
    signDisplay: "exceptZero"
  }).format(value / unit.divisor);
}

export function isPercentFormat(valueFormat) {
  const format = String(valueFormat ?? "").trim().toLocaleLowerCase("fr-FR");
  if (!format) return false;

  return ["%", "pct", "percent", "percentage", "pourcent", "pourcentage"]
    .some((keyword) => format.includes(keyword));
}

export function formatPercentValue(value) {
  const percentValue = Math.abs(value) <= 1 ? value * 100 : value;

  return `${new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(percentValue)} %`;
}

export function formatContributionPercentValue(value) {
  return `${new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(value * 100)} %`;
}

export function formatBasisPointsValue(value) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "-";

  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0
  }).format(value)} bp`;
}

export function getUnitDefinition(selectedUnit) {
  const units = {
    billions: { divisor: 1_000_000_000 },
    euros: { divisor: 1 },
    millions: { divisor: 1_000_000 },
    thousands: { divisor: 1_000 }
  };

  return units[selectedUnit] ?? units.millions;
}
