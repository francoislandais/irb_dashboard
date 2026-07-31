import {
  COST_OF_RISK_BALANCE_SCOPE_IN_BALANCE,
  COST_OF_RISK_BALANCE_SCOPE_OFF_BALANCE,
  COST_OF_RISK_BALANCE_SCOPE_TOTAL,
  COST_OF_RISK_FILTER_ALL
} from "../data/costOfRisk.js?v=20260731-compact-smoothing-help";

const COST_OF_RISK_FILTER_PARENT_VALUES = {
  counterparty: {
    HH_CONSUMPTION: "Households",
    HH_RRE: "Households",
    NFC_CRE: "Non-financial corporations",
    NFC_SMES: "Non-financial corporations"
  }
};

const COST_OF_RISK_FILTER_UNAVAILABLE_LABELS = {
  counterparty: {
    HH_CONSUMPTION: "credit for consumption",
    HH_RRE: "residential real estate collateralised loans",
    NFC_CRE: "commercial real estate collateralised loans",
    NFC_SMES: "SMEs"
  }
};

const COST_OF_RISK_FILTER_PARENT_LABELS = {
  counterparty: {
    "Households": "Households",
    "Non-financial corporations": "NFC"
  }
};

const COST_OF_RISK_UNAVAILABLE_MESSAGE = "FINREP data does not support this level of detail for the current selection.";
const COST_OF_RISK_PERFORMANCE_STATUS_VALUES = new Set(["Performing", "Non-performing"]);

export function getCostOfRiskFilterParentValue(filterName, value) {
  if (filterName === "balanceScope") return COST_OF_RISK_BALANCE_SCOPE_IN_BALANCE;
  return COST_OF_RISK_FILTER_PARENT_VALUES[filterName]?.[value] ?? COST_OF_RISK_FILTER_ALL;
}

export function getCostOfRiskUnavailableMessage(filters) {
  const balanceScope = filters.balanceScope || COST_OF_RISK_BALANCE_SCOPE_IN_BALANCE;
  if (balanceScope === COST_OF_RISK_BALANCE_SCOPE_OFF_BALANCE) {
    return "FINREP data does not support this level of detail for off-balance sheet exposures. Select In-balance.";
  }
  if (balanceScope === COST_OF_RISK_BALANCE_SCOPE_TOTAL) {
    return "FINREP data does not support this level of detail for the combined in-balance and off-balance perimeter. Select In-balance.";
  }

  const stage = filters.stage;
  if (COST_OF_RISK_PERFORMANCE_STATUS_VALUES.has(stage)) {
    return "FINREP data does not support this level of detail with a breakdown by performing status. Remove this filter.";
  }

  const counterparty = filters.counterparty;
  const parent = getCostOfRiskFilterParentValue("counterparty", counterparty);
  if (parent !== COST_OF_RISK_FILTER_ALL) {
    const detailLabel = COST_OF_RISK_FILTER_UNAVAILABLE_LABELS.counterparty[counterparty] ?? counterparty;
    const parentLabel = COST_OF_RISK_FILTER_PARENT_LABELS.counterparty[parent] ?? parent;
    return `FINREP data does not support this level of detail for ${detailLabel}. Select ${parentLabel} or higher.`;
  }

  return COST_OF_RISK_UNAVAILABLE_MESSAGE;
}
