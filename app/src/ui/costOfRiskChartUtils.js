export const COST_OF_RISK_CHART_TITLE_POSITION = {
  margin: 10,
  x: 0,
  y: 5
};

// Shared by every Cost of Risk temporal chart so quarterly reference dates
// read "Q12026" on the x-axis instead of a raw date.
export function formatCostOfRiskQuarterAxisLabel(timestamp) {
  const date = new Date(timestamp);
  const quarter = Math.floor(date.getMonth() / 3) + 1;
  return `Q${quarter}${date.getFullYear()}`;
}

// Reference dates are real calendar quarter-ends (31/03, 30/06, ...), which
// are not evenly spaced in milliseconds. Highcharts' automatic datetime tick
// picker can land ticks off the actual data points, so charts pass their own
// reference dates here to keep labels aligned to real observations.
export function getCostOfRiskAxisTickPositions(points) {
  return [...new Set(
    (points ?? [])
      .filter((point) => point.date instanceof Date)
      .map((point) => point.date.getTime())
  )].sort((left, right) => left - right);
}

export function createCostOfRiskHighchartsTitle(text, position = COST_OF_RISK_CHART_TITLE_POSITION) {
  return {
    align: "left",
    margin: position.margin,
    text: text || "",
    x: position.x,
    y: position.y,
    style: {
      color: "#26332d",
      fontSize: "12px",
      fontWeight: "400"
    }
  };
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
