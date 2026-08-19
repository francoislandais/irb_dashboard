import {
  COST_OF_RISK_DEFINITION_OPTIONS,
  createCostOfRiskChartData,
  formatCostOfRiskDisplayValue,
  getCostOfRiskYAxisBounds,
  smoothCostOfRiskPoints
} from "../data/costOfRisk.js?v=20260812-costofrisk-domain-split";
import { formatMetricValue } from "../data/core/formatting.js?v=20260710-bp-format";
import {
  createCostOfRiskQuarterAxisLabelsOptions,
  escapeHtml,
  getCostOfRiskAxisTickPositions
} from "./costOfRiskChartUtils.js?v=20260804-axis-year-labels";
import {
  renderBenchmarkEndpointLabels,
  scheduleBenchmarkEndpointLabels
} from "./benchmarkLineChart.js?v=20260812-costofrisk-domain-split";
import {
  destroyCostOfRiskMovementChart,
  getCostOfRiskMovementChart,
  renderCostOfRiskMovementTimeSeriesChart as renderMovementTimeSeriesChart
} from "./costOfRiskMovementTimeSeriesView.js?v=20260812-costofrisk-domain-split";
import { resolveCostOfRiskTabEmptyMessage } from "./costOfRiskTabEmptyMessages.js?v=20260812-costofrisk-domain-split";
import { primaryDark } from "./theme.js?v=20260709-flow-arrow-color";

let costOfRiskDefinitionComparisonChart = null;

export function destroyCostOfRiskDefinitionComparisonChart() {
  if (!costOfRiskDefinitionComparisonChart) return;
  costOfRiskDefinitionComparisonChart.destroy();
  costOfRiskDefinitionComparisonChart = null;
}

// The "vs F02" chart selection swaps the definition's own series for a
// two-line comparison against the income-statement F02 impairment series.
// f02Model is fetched by the caller (it goes through the same cached model
// builder as every other definition model) so this stays a pure transform.
export function buildCostOfRiskDefinitionVsF02ChartSelection(definitionModel, f02Model) {
  const currentSeriesName = getCostOfRiskDefinitionVsF02CurrentSeriesName(definitionModel);
  return {
    ...definitionModel,
    benchmarkSeries: [
      {
        jstCode: currentSeriesName,
        points: definitionModel.series ?? []
      },
      {
        jstCode: "F02",
        points: f02Model.series ?? []
      }
    ],
    selectedAreaSeriesName: "F02",
    series: definitionModel.series ?? []
  };
}

export function getCostOfRiskDefinitionVsF02CurrentSeriesName(definitionModel) {
  return definitionModel.definition?.label ?? "Current definition";
}

// Single-definition view: the panel (value + components/drivers) plus the
// shared movement time-series chart, swapped to the F02 comparison series
// when the total definition is selected and the user asked for it.
export function renderCostOfRiskDefinitionView({
  benchmarkMode,
  chartContainer,
  definitionId,
  definitionModel,
  displayMode,
  driverCode,
  emptyMessageContext,
  f02Model,
  focusSelectedYAxis,
  onClearSmoothing,
  onChangeSmoothing,
  onSelectJst,
  onSelectReferenceDate,
  onToggleBenchmarkMode,
  onToggleYAxisFocus,
  panelContainer,
  panelTab,
  peerDisplayMode,
  referenceDate,
  renderTabEmpty,
  selectedJst,
  selectedUnit,
  smoothingWindow
}) {
  destroyCostOfRiskDefinitionComparisonChart();
  renderCostOfRiskDefinitionPanel({
    container: panelContainer,
    definitionId,
    definitionModel,
    driverCode,
    displayMode,
    emptyMessageContext,
    panelTab,
    selectedUnit
  });
  if (getCostOfRiskMovementChart()?.renderTo !== chartContainer) {
    destroyCostOfRiskMovementChart();
  }

  const isTotalDefinitionSelected = !driverCode;
  const useF02Comparison = isTotalDefinitionSelected && benchmarkMode === "f02";
  const chartSelection = useF02Comparison
    ? buildCostOfRiskDefinitionVsF02ChartSelection(definitionModel, f02Model)
    : { ...definitionModel, series: definitionModel.chartSeries ?? definitionModel.series };
  const chartSelectedSeriesName = useF02Comparison
    ? getCostOfRiskDefinitionVsF02CurrentSeriesName(definitionModel)
    : selectedJst;

  renderMovementTimeSeriesChart({
    activeReferenceDate: referenceDate,
    container: chartContainer,
    displayMode,
    focusSelectedYAxis,
    jstCode: chartSelectedSeriesName,
    benchmarkMode,
    onClearSmoothing,
    onChangeSmoothing,
    onSelectJst: useF02Comparison ? () => {} : onSelectJst,
    onSelectReferenceDate,
    onToggleBenchmarkMode,
    onToggleYAxisFocus,
    peerDisplayMode: useF02Comparison ? "explicit" : peerDisplayMode,
    renderTabEmpty,
    selectedUnit,
    selection: chartSelection,
    showBenchmarkModeToggle: isTotalDefinitionSelected,
    smoothingWindow,
    titleText: "Cost of Risk - Time Evolution"
  });
}

// Comparison view (all definition methods side by side): the multi-line
// benchmark chart plus its own header, in place of the single-definition panel.
export function renderCostOfRiskDefinitionComparisonView({
  benchmarkMode,
  benchmarkModel,
  chartContainer,
  comparisonBenchmarkDefinitionId,
  comparisonModels,
  definitionId,
  displayMode,
  driverCode,
  f02Model,
  focusSelectedYAxis,
  onClearSmoothing,
  onChangeSmoothing,
  onSelectComparisonDefinition,
  onSelectJst,
  onSelectReferenceDate,
  onToggleBenchmarkMode,
  onToggleYAxisFocus,
  panelContainer,
  peerDisplayMode,
  referenceDate,
  renderTabEmpty,
  selectedJst,
  selectedUnit,
  smoothingWindow
}) {
  renderCostOfRiskDefinitionComparisonPanel({
    benchmarkModel,
    comparisonBenchmarkDefinitionId,
    comparisonModels,
    container: panelContainer,
    definitionId,
    displayMode,
    driverCode,
    onSelectComparisonDefinition,
    referenceDate,
    selectedUnit,
    smoothingWindow
  });
  if (getCostOfRiskMovementChart()?.renderTo !== chartContainer) {
    destroyCostOfRiskMovementChart();
  }

  const useF02Comparison = benchmarkMode === "f02";
  const chartSelection = useF02Comparison
    ? buildCostOfRiskDefinitionVsF02ChartSelection(benchmarkModel, f02Model)
    : benchmarkModel;
  const chartSelectedSeriesName = useF02Comparison
    ? getCostOfRiskDefinitionVsF02CurrentSeriesName(benchmarkModel)
    : selectedJst;

  renderMovementTimeSeriesChart({
    activeReferenceDate: referenceDate,
    container: chartContainer,
    displayMode,
    focusSelectedYAxis,
    jstCode: chartSelectedSeriesName,
    benchmarkMode,
    onClearSmoothing,
    onChangeSmoothing,
    onSelectJst: useF02Comparison ? () => {} : onSelectJst,
    onSelectReferenceDate,
    onToggleBenchmarkMode,
    onToggleYAxisFocus,
    peerDisplayMode: useF02Comparison ? "explicit" : peerDisplayMode,
    renderTabEmpty,
    selectedUnit,
    selection: chartSelection,
    showBenchmarkModeToggle: true,
    smoothingWindow,
    titleText: `Cost of Risk - ${benchmarkModel.definition?.label ?? "Selected definition"} Benchmark`
  });
}

function renderCostOfRiskDefinitionPanel({
  container,
  definitionId,
  definitionModel,
  displayMode,
  driverCode,
  emptyMessageContext,
  panelTab,
  selectedUnit = "millions"
}) {
  if (!container) return;
  if (definitionModel.status) {
    container.replaceChildren(createCostOfRiskDefinitionEmpty(definitionModel.status, emptyMessageContext));
    return;
  }

  const root = document.createElement("div");
  root.className = "cost-of-risk-definition-grid cost-of-risk-definition-grid--side";
  root.append(createCostOfRiskDefinitionSummary({ definitionId, definitionModel, displayMode, driverCode, selectedUnit }));

  const detail = document.createElement("div");
  detail.className = "cost-of-risk-definition-drivers";
  detail.append(createCostOfRiskDefinitionPanelTabs(panelTab));
  const activeItems = panelTab === "components" ? definitionModel.components ?? [] : definitionModel.drivers ?? [];
  if (activeItems.length === 0) {
    const empty = document.createElement("div");
    empty.className = "cost-of-risk-definition-driver-empty";
    empty.textContent = panelTab === "components"
      ? "No F12 component is available for the selected definition."
      : "No significant driver is available for the selected definition.";
    detail.append(empty);
  } else {
    activeItems.forEach((item) => {
      detail.append(createCostOfRiskDefinitionDetailRow(item, selectedUnit, panelTab, { definitionId, displayMode, driverCode }));
    });
  }

  root.append(detail);
  container.replaceChildren(root);
}

function createCostOfRiskDefinitionSummary({ definitionId, definitionModel, displayMode, driverCode, selectedUnit }) {
  const summary = document.createElement("div");
  summary.className = "cost-of-risk-definition-summary";
  summary.append(
    createCostOfRiskDefinitionButton(definitionId, definitionModel),
    createCostOfRiskDefinitionValueButton(definitionModel, driverCode, displayMode, selectedUnit),
    createCostOfRiskDefinitionScopeDetails(definitionModel, selectedUnit)
  );
  return summary;
}

function renderCostOfRiskDefinitionComparisonPanel({
  benchmarkModel,
  comparisonBenchmarkDefinitionId,
  comparisonModels,
  container,
  definitionId,
  displayMode,
  driverCode,
  onSelectComparisonDefinition,
  referenceDate,
  selectedUnit,
  smoothingWindow
}) {
  if (!container) return;
  if (!window.Highcharts) return;
  destroyCostOfRiskDefinitionComparisonChart();

  const root = document.createElement("div");
  root.className = "cost-of-risk-definition-comparison";
  root.append(createCostOfRiskDefinitionHeader(definitionId, benchmarkModel, driverCode, displayMode, selectedUnit));
  const chartContainer = document.createElement("div");
  chartContainer.className = "cost-of-risk-definition-comparison-chart";
  root.append(chartContainer);
  container.replaceChildren(root);

  const palette = ["#8f9893", "#a2aaa6", "#b4bbb8", "#7f8984"];
  const dashStyles = ["ShortDash", "ShortDot", "Dash", "Dot"];
  const series = comparisonModels.map((model, index) => {
    const modelDefinitionId = model.definition?.id ?? "";
    const isActive = modelDefinitionId === comparisonBenchmarkDefinitionId;
    const color = isActive ? primaryDark : palette[index % palette.length];
    const chartData = createCostOfRiskChartData(smoothCostOfRiskPoints(model.series ?? [], smoothingWindow), displayMode);
    return {
      clip: false,
      color,
      custom: {
        benchmarkLabel: model.definition?.label ?? modelDefinitionId,
        definitionId: modelDefinitionId
      },
      dashStyle: isActive ? "Solid" : dashStyles[index % dashStyles.length],
      data: chartData,
      fillColor: isActive ? "rgba(140, 148, 144, 0.12)" : "transparent",
      lineWidth: isActive ? 3.6 : 1.45,
      marker: {
        fillColor: isActive ? "#ffffff" : color,
        enabled: isActive,
        lineColor: color,
        lineWidth: isActive ? 1.5 : 0,
        radius: isActive ? 5 : 0,
        symbol: "circle"
      },
      name: modelDefinitionId,
      opacity: isActive ? 1 : 0.78,
      states: {
        hover: {
          enabled: true,
          halo: { size: isActive ? 9 : 0 },
          lineWidth: isActive ? 4 : 2.1,
          lineWidthPlus: 0
        },
        inactive: {
          opacity: isActive ? 1 : 0.42
        }
      },
      threshold: 0,
      type: isActive ? "area" : "line",
      zIndex: isActive ? 100 : 1
    };
  }).filter((serie) => serie.data.length > 0);
  if (series.length === 0) {
    chartContainer.textContent = "No cost of risk definition time series is available for the current selection.";
    return;
  }
  const yBounds = getCostOfRiskYAxisBounds(series);
  const selectedReferencePoint = benchmarkModel.series?.find((point) => point.label === referenceDate);

  const options = {
    chart: {
      animation: false,
      backgroundColor: "transparent",
      events: {
        render() {
          renderBenchmarkEndpointLabels(this, comparisonBenchmarkDefinitionId, onSelectComparisonDefinition);
        }
      },
      spacingRight: 128,
      type: "line",
      zooming: { type: "xy" },
      zoomType: "xy"
    },
    credits: { enabled: false },
    legend: { enabled: false },
    plotOptions: {
      series: {
        animation: false,
        cursor: "pointer",
        events: {
          click() {
            const clickedDefinitionId = this.userOptions?.custom?.definitionId ?? "";
            onSelectComparisonDefinition(clickedDefinitionId);
          }
        },
        point: {
          events: {
            click() {
              const clickedDefinitionId = this.series?.userOptions?.custom?.definitionId ?? "";
              setTimeout(() => onSelectComparisonDefinition(clickedDefinitionId, this.referenceLabel), 0);
            }
          }
        }
      }
    },
    series,
    title: { text: "" },
    tooltip: {
      headerFormat: "<span style=\"font-size:11px\">{point.key:%d/%m/%Y}</span><br/>",
      pointFormatter() {
        const label = this.series.userOptions?.custom?.benchmarkLabel ?? this.series.name;
        return `<span style="color:${this.series.color}">●</span> <b>${escapeHtml(label)}</b>: ${formatCostOfRiskDisplayValue(this.y, displayMode, selectedUnit)}`;
      },
      shared: false,
      split: false,
      stickOnContact: true,
      xDateFormat: "%d/%m/%Y"
    },
    xAxis: {
      labels: createCostOfRiskQuarterAxisLabelsOptions(),
      lineColor: "#c2cac5",
      lineWidth: 1,
      plotLines: selectedReferencePoint?.date instanceof Date ? [{
        color: "#7f8984",
        dashStyle: "ShortDash",
        value: selectedReferencePoint.date.getTime(),
        width: 1,
        zIndex: 3
      }] : [],
      tickColor: "#d9dedb",
      tickPositions: getCostOfRiskAxisTickPositions(comparisonModels.flatMap((model) => model.series ?? [])),
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
      max: yBounds.max,
      min: yBounds.min,
      lineColor: "#aeb8b2",
      lineWidth: 1,
      startOnTick: false,
      endOnTick: false,
      tickAmount: 6,
      title: { text: displayMode === "ratio" ? "Cost of risk (bp)" : "Amount" }
    }
  };

  costOfRiskDefinitionComparisonChart = window.Highcharts.chart(chartContainer, options);
  scheduleBenchmarkEndpointLabels(
    costOfRiskDefinitionComparisonChart,
    comparisonBenchmarkDefinitionId,
    onSelectComparisonDefinition
  );
}

function createCostOfRiskDefinitionHeader(definitionId, definitionModel, driverCode, displayMode, selectedUnit) {
  const header = document.createElement("div");
  header.className = "cost-of-risk-definition-header";
  header.append(
    createCostOfRiskDefinitionButton(definitionId, definitionModel),
    createCostOfRiskDefinitionValueButton(definitionModel, driverCode, displayMode, selectedUnit)
  );
  return header;
}

function createCostOfRiskDefinitionButton(definitionId, definitionModel) {
  const definition = COST_OF_RISK_DEFINITION_OPTIONS.find((option) => option.id === definitionId)
    ?? definitionModel.definition
    ?? COST_OF_RISK_DEFINITION_OPTIONS[0];
  const definitionButton = document.createElement("button");
  definitionButton.type = "button";
  definitionButton.className = "cost-of-risk-definition-local-chip";
  definitionButton.dataset.costOfRiskDefinitionFilterToggle = "true";
  definitionButton.setAttribute("aria-label", "Change cost of risk definition");
  const definitionPrefix = document.createElement("span");
  definitionPrefix.className = "cost-of-risk-definition-local-chip-prefix";
  definitionPrefix.textContent = "Cost of risk:";
  const definitionValue = document.createElement("span");
  definitionValue.className = "cost-of-risk-definition-local-chip-value";
  definitionValue.textContent = definition?.label ?? "Definition";
  definitionButton.append(definitionPrefix, definitionValue);
  return definitionButton;
}

function createCostOfRiskDefinitionValueButton(definitionModel, driverCode, displayMode, selectedUnit) {
  const valueButton = document.createElement("button");
  valueButton.type = "button";
  valueButton.className = "cost-of-risk-definition-headline-value";
  valueButton.classList.toggle("is-active", !driverCode);
  valueButton.dataset.costOfRiskDefinitionBenchmarkTarget = "total";
  valueButton.dataset.costOfRiskCalculationDetail = "cost-of-risk-total";
  valueButton.textContent = formatCostOfRiskDisplayValue(
    displayMode === "ratio"
      ? definitionModel.ratioBasisPoints
      : definitionModel.value,
    displayMode,
    selectedUnit,
    true
  );

  return valueButton;
}

function createCostOfRiskDefinitionScopeDetails(definitionModel, selectedUnit) {
  const details = document.createElement("div");
  details.className = "cost-of-risk-definition-scope-details";
  [
    {
      label: "Numerator",
      value: formatMetricValue(definitionModel.value, selectedUnit)
    },
    {
      label: "Denominator",
      value: formatMetricValue(definitionModel.denominator, selectedUnit)
    }
  ].forEach((item) => {
    const row = document.createElement("div");
    row.className = "cost-of-risk-definition-scope-row";

    const label = document.createElement("span");
    label.className = "cost-of-risk-definition-scope-label";
    label.textContent = `${item.label}:`;

    const value = document.createElement("span");
    value.className = "cost-of-risk-definition-scope-value";
    value.textContent = item.value;

    row.append(label, value);
    details.append(row);
  });

  return details;
}

function createCostOfRiskDefinitionPanelTabs(panelTab) {
  const tabs = document.createElement("div");
  tabs.className = "cost-of-risk-definition-detail-tabs";
  [
    { key: "components", label: "Components" },
    { key: "drivers", label: "Main drivers" }
  ].forEach((tab) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "cost-of-risk-definition-detail-tab";
    button.classList.toggle("is-active", panelTab === tab.key);
    button.dataset.costOfRiskDefinitionPanelTab = tab.key;
    button.textContent = tab.label;
    tabs.append(button);
  });
  return tabs;
}

function createCostOfRiskDefinitionDetailRow(item, selectedUnit, panelTab, { definitionId, displayMode, driverCode }) {
  const row = document.createElement("button");
  row.type = "button";
  row.className = "cost-of-risk-definition-driver";
  const showsCustomCheckbox = panelTab === "components" && item.code !== "component:f02-impairment";
  row.classList.toggle("has-checkbox", showsCustomCheckbox);
  row.classList.toggle("is-active", item.code === driverCode);
  row.classList.toggle("is-excluded", showsCustomCheckbox && item.included === false);
  row.classList.toggle("is-user-added", showsCustomCheckbox && item.userAdded === true);
  row.classList.toggle("is-user-removed", showsCustomCheckbox && item.userRemoved === true);
  row.dataset.costOfRiskDefinitionDriver = item.code;
  row.dataset.costOfRiskCalculationDetail = "cost-of-risk-driver";
  row.dataset.costOfRiskCalculationValue = item.code;

  if (showsCustomCheckbox) {
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "cost-of-risk-definition-component-checkbox";
    checkbox.checked = item.included !== false;
    checkbox.dataset.costOfRiskCustomDefinitionComponent = String(item.code ?? "").replace(/^component:/, "");
    checkbox.setAttribute("aria-label", `${checkbox.checked ? "Remove" : "Include"} ${item.label}`);
    row.append(checkbox);
  }

  const label = document.createElement("div");
  label.className = "cost-of-risk-definition-driver-label";
  label.textContent = item.label;
  label.title = item.source;

  const value = document.createElement("div");
  value.className = "cost-of-risk-definition-driver-value";
  value.textContent = formatCostOfRiskDisplayValue(
    displayMode === "ratio" ? item.ratioBasisPoints : item.value,
    displayMode,
    selectedUnit,
    true
  );

  row.append(label, value);
  return row;
}

function createCostOfRiskDefinitionEmpty(message, emptyMessageContext) {
  const empty = document.createElement("div");
  empty.className = "cost-of-risk-definition-empty";
  const resolvedMessage = resolveCostOfRiskTabEmptyMessage(message, emptyMessageContext);
  if (resolvedMessage instanceof Node) {
    empty.append(resolvedMessage);
  } else {
    empty.textContent = resolvedMessage;
  }
  return empty;
}
