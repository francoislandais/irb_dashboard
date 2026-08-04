import { formatCostOfRiskDisplayValue } from "../data/costOfRisk.js?v=20260804-lazy-index";
import { COST_OF_RISK_CHART_TITLE_POSITION } from "./costOfRiskChartUtils.js?v=20260803-refactor-cleanup";
import { renderCostOfRiskStageTransferFlowDiagram } from "./costOfRiskStageTransferFlowDiagramView.js?v=20260803-refactor-cleanup";
import { flowArrowColor, primaryDark } from "./theme.js?v=20260709-flow-arrow-color";

export function renderCostOfRiskStageTransferFlowView({
  container,
  displayMode = "amount",
  flowDiagram,
  onShowCalculationDetails,
  onSelectFlow,
  selectedFlowKey,
  selectedUnit,
  titleElement
}) {
  if (!container) return;

  const titleText = "Stage Transfer Flows";
  if (titleElement) titleElement.textContent = titleText;

  renderCostOfRiskStageTransferFlowDiagram({
    container,
    displayMode,
    flowArrowColor,
    flowDiagram,
    onShowCalculationDetails,
    formatValue: formatCostOfRiskDisplayValue,
    onSelectFlow,
    primaryDark,
    selectedFlowKey,
    selectedUnit,
    titlePosition: COST_OF_RISK_CHART_TITLE_POSITION,
    titleText
  });
}
