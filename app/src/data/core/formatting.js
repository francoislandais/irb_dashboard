export function formatMetricValue(value, selectedUnit, valueFormat = "") {
  if (isPercentFormat(valueFormat)) return formatPercentValue(value);

  const unit = getUnitDefinition(selectedUnit);
  const nativeScale = getNativeValueScale(valueFormat);
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format((value * nativeScale) / unit.divisor);
}

export function formatSignedMetricValue(value, selectedUnit, valueFormat = "") {
  const unit = getUnitDefinition(selectedUnit);
  const nativeScale = getNativeValueScale(valueFormat);
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
    signDisplay: "exceptZero"
  }).format((value * nativeScale) / unit.divisor);
}

// Most templates store value_decimal in plain euros, so the selected display
// unit (million/billion/thousand/€) is the only scaling ever needed. KRI's
// dictionary can instead declare the raw value's own native scale per
// indicator (see ITS_all_dimension_mapping.csv's format column) - some
// report already in thousands or millions rather than plain units. This
// normalizes back to plain units first, so the selected display unit still
// divides correctly regardless of what scale the source data came in.
export function getNativeValueScale(valueFormat) {
  const format = String(valueFormat ?? "").trim().toLocaleLowerCase("fr-FR");

  if (["thousand", "thousands", "millier", "milliers"].includes(format)) return 1_000;
  if (["million", "millions"].includes(format)) return 1_000_000;

  return 1;
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
    maximumFractionDigits: 0,
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
