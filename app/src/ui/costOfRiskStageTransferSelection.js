import { COST_OF_RISK_FILTER_ALL } from "../data/costOfRisk.js?v=20260716-cost-risk-filters-below-tabs-view";

export const DEFAULT_COST_OF_RISK_STAGE_TRANSFER_FLOW_KEY = "transfer:1-2";

export function getCostOfRiskStageTransferStage(stageValue) {
  if (stageValue === "Stage 1") return "1";
  if (stageValue === "Stage 2") return "2";
  if (stageValue === "Stage 3") return "3";
  return "3";
}

export function getCostOfRiskStageTransferFlowKeyForStageFilter(stageValue) {
  if (stageValue === "Stage 1") return "stagebox:1";
  if (stageValue === "Stage 2") return "stagebox:2";
  if (stageValue === "Stage 3") return "stagebox:3";
  return "";
}

export function getCostOfRiskStageFilterForStageTransferFlowKey(flowKey) {
  if (flowKey === "stagebox:1") return "Stage 1";
  if (flowKey === "stagebox:2") return "Stage 2";
  if (flowKey === "stagebox:3") return "Stage 3";
  return "";
}

export function getSyncedCostOfRiskStageTransferFlowKey(stageValue, currentFlowKey) {
  const flowKey = getCostOfRiskStageTransferFlowKeyForStageFilter(stageValue);
  if (flowKey) return flowKey;
  if (currentFlowKey?.startsWith("stagebox:")) return DEFAULT_COST_OF_RISK_STAGE_TRANSFER_FLOW_KEY;
  return currentFlowKey || DEFAULT_COST_OF_RISK_STAGE_TRANSFER_FLOW_KEY;
}

export function normalizeCostOfRiskStageFilterValue(stageValue) {
  return stageValue || COST_OF_RISK_FILTER_ALL;
}

export function isCostOfRiskAllStageValue(stageValue) {
  return !stageValue || stageValue === COST_OF_RISK_FILTER_ALL;
}
