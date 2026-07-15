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
      fontSize: "13px",
      fontWeight: "400"
    }
  };
}

export function renderCostOfRiskSmoothingBadge(chart, smoothingWindow, onClearSmoothing) {
  clearCostOfRiskSmoothingBadge(chart);
  const windowSize = Number(smoothingWindow);
  if (!chart?.renderer || !Number.isFinite(windowSize) || windowSize <= 1) return;

  const titleBox = chart.title?.getBBox?.();
  const titleX = chart.title?.alignAttr?.x ?? chart.plotLeft ?? 12;
  const titleY = chart.title?.alignAttr?.y ?? 8;
  const titleWidth = Number.isFinite(titleBox?.width) ? titleBox.width : 0;
  const badgeX = Math.min(chart.chartWidth - 104, titleX + titleWidth + 12);
  const badgeY = Math.max(4, titleY - 19);
  const labelText = `Smoothed ${windowSize}Q  ×`;
  const elements = [];

  const label = chart.renderer
    .label(labelText, badgeX, badgeY, "rect")
    .css({
      color: "#26332d",
      cursor: "pointer",
      fontSize: "9px",
      fontWeight: "400"
    })
    .attr({
      fill: "#eef2f0",
      padding: 3,
      r: 3,
      stroke: "none",
      zIndex: 12
    })
    .add();
  label.on("click", () => {
    if (typeof onClearSmoothing === "function") onClearSmoothing();
  });
  elements.push(label);

  chart.customCostOfRiskSmoothingBadge = elements;
}

export function clearCostOfRiskSmoothingBadge(chart) {
  chart?.customCostOfRiskSmoothingBadge?.forEach((element) => element?.destroy?.());
  if (chart) chart.customCostOfRiskSmoothingBadge = [];
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
