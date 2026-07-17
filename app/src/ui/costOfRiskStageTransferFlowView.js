import { formatCostOfRiskDisplayValue } from "../data/costOfRisk.js?v=20260717-header-context-controls";
import { COST_OF_RISK_CHART_TITLE_POSITION } from "./costOfRiskChartUtils.js?v=20260717-header-context-controls";
import { renderCostOfRiskStageTransferFlowDiagram } from "./costOfRiskStageTransfers.js?v=20260717-header-context-controls";
import { flowArrowColor, primaryDark } from "./theme.js?v=20260709-flow-arrow-color";

export function renderCostOfRiskStageTransferFlowView({
  container,
  displayMode = "amount",
  flowDiagram,
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
    formatValue: formatCostOfRiskDisplayValue,
    onSelectFlow,
    primaryDark,
    selectedFlowKey,
    selectedUnit,
    titlePosition: COST_OF_RISK_CHART_TITLE_POSITION,
    titleText
  });
}
