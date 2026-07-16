import {
  createCostOfRiskChartData,
  formatCostOfRiskDisplayValue,
  getCostOfRiskYAxisBounds,
  smoothCostOfRiskPoints
} from "../data/costOfRisk.js?v=20260716-cost-risk-filters-below-tabs-view";
import { formatMetricValue } from "../data/core/formatting.js?v=20260710-bp-format";
import {
  formatCostOfRiskQuarterAxisLabel,
  getCostOfRiskAxisTickPositions,
  renderCostOfRiskSmoothingBadge
} from "./costOfRiskChartUtils.js?v=20260716-cost-risk-filters-below-tabs-view";
import { primaryDark } from "./theme.js?v=20260709-flow-arrow-color";

let costOfRiskF2VsF12Chart = null;

export function getCostOfRiskF2VsF12Chart() {
  return costOfRiskF2VsF12Chart;
}

export function destroyCostOfRiskF2VsF12Chart() {
  if (!costOfRiskF2VsF12Chart) return;
  costOfRiskF2VsF12Chart.destroy();
  costOfRiskF2VsF12Chart = null;
}

export function renderCostOfRiskF2VsF12Chart({
  activeReferenceDate,
  container,
  displayMode = "ratio",
  f02Series,
  f12Series,
  onClearSmoothing,
  onSelectAuditSeries,
  renderTabEmpty,
  selectedUnit = "millions",
  smoothingWindow = 1
}) {
  if (!container || !window.Highcharts) return;

  const series = [
    {
      color: "#b8b8b8",
      dashStyle: "ShortDash",
      data: createCostOfRiskChartData(smoothCostOfRiskPoints(f12Series.points, smoothingWindow), displayMode),
      lineWidth: 2.6,
      marker: {
        enabled: true,
        fillColor: "#b8b8b8",
        lineColor: "#b8b8b8",
        lineWidth: 1.2,
        radius: 3,
        symbol: "circle"
      },
      name: "F12 total selected contributions",
      custom: { auditSeries: "f12" }
    },
    {
      color: primaryDark,
      data: createCostOfRiskChartData(smoothCostOfRiskPoints(f02Series.points, smoothingWindow), displayMode),
      lineWidth: 2.8,
      marker: {
        enabled: true,
        fillColor: primaryDark,
        lineColor: primaryDark,
        lineWidth: 1.2,
        radius: 3,
        symbol: "circle"
      },
      name: "F2",
      custom: { auditSeries: "f2" }
    }
  ].filter((item) => item.data.length > 0);

  if (series.length === 0) {
    destroyCostOfRiskF2VsF12Chart();
    renderTabEmpty("No F2/F12 time series is available for the current selection.");
    return;
  }

  const yBounds = getCostOfRiskYAxisBounds(series);
  const activePoint = [...(f02Series.points ?? []), ...(f12Series.points ?? [])]
    .find((point) => point.label === activeReferenceDate && point.date instanceof Date);
  const options = {
    chart: {
      animation: false,
      backgroundColor: "transparent",
      events: {
        render() {
          renderCostOfRiskSmoothingBadge(this, smoothingWindow, onClearSmoothing);
        }
      },
      type: "line",
      zooming: { type: "xy" },
      zoomType: "xy"
    },
    credits: { enabled: false },
    legend: {
      enabled: true,
      align: "center",
      verticalAlign: "bottom",
      layout: "horizontal",
      y: 8
    },
    plotOptions: {
      series: {
        animation: false,
        cursor: "pointer",
        point: {
          events: {
            click() {
              onSelectAuditSeries(this.series.options.custom?.auditSeries, this.referenceLabel);
            }
          }
        },
        states: {
          hover: {
            animation: false,
            lineWidthPlus: 0
          }
        }
      }
    },
    series,
    title: { text: null },
    tooltip: {
      shared: false,
      formatter() {
        const date = new Date(this.x);
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        const year = date.getFullYear();

        return `
          <span style="font-size:11px">Q${quarter} ${year}</span><br/>
          <span style="color:${this.series.color}">●</span>
          <b>${this.series.name}</b>: ${formatCostOfRiskDisplayValue(this.y, displayMode, selectedUnit)}
        `;
      }
    },
    xAxis: {
      labels: {
        formatter() {
          return formatCostOfRiskQuarterAxisLabel(this.value);
        },
        rotation: -45,
        style: { color: "#5f6b65" }
      },
      lineColor: "#c2cac5",
      lineWidth: 1,
      plotLines: activePoint ? [{
        color: "#7f8984",
        dashStyle: "ShortDash",
        value: activePoint.date.getTime(),
        width: 1,
        zIndex: 3
      }] : [],
      tickColor: "#d9dedb",
      tickPositions: getCostOfRiskAxisTickPositions([...(f02Series.points ?? []), ...(f12Series.points ?? [])]),
      type: "datetime"
    },
    yAxis: {
      gridLineColor: "#edf0ee",
      labels: {
        formatter() {
          return displayMode === "ratio"
            ? new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(this.value)
            : formatMetricValue(this.value, selectedUnit);
        },
        style: { color: "#5f6b65" }
      },
      lineColor: "#aeb8b2",
      lineWidth: 1,
      max: yBounds.max,
      min: yBounds.min,
      startOnTick: false,
      endOnTick: false,
      tickAmount: 8,
      title: { text: displayMode === "ratio" ? "Growth rate (bp)" : "Amount" }
    }
  };

  if (costOfRiskF2VsF12Chart) {
    costOfRiskF2VsF12Chart.update(options, true, true, false);
  } else {
    costOfRiskF2VsF12Chart = window.Highcharts.chart(container, options);
  }
}
