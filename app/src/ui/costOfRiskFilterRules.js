import { COST_OF_RISK_FILTER_ALL } from "../data/costOfRisk.js?v=20260717-staging-menu-tab";

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

export function getCostOfRiskFilterParentValue(filterName, value) {
  return COST_OF_RISK_FILTER_PARENT_VALUES[filterName]?.[value] ?? COST_OF_RISK_FILTER_ALL;
}

export function getCostOfRiskUnavailableMessage(filters) {
  const counterparty = filters.counterparty;
  const parent = getCostOfRiskFilterParentValue("counterparty", counterparty);
  if (parent !== COST_OF_RISK_FILTER_ALL) {
    const detailLabel = COST_OF_RISK_FILTER_UNAVAILABLE_LABELS.counterparty[counterparty] ?? counterparty;
    const parentLabel = COST_OF_RISK_FILTER_PARENT_LABELS.counterparty[parent] ?? parent;
    return `FINREP data does not support this level of detail for ${detailLabel}. Select ${parentLabel} instead.`;
  }

  return COST_OF_RISK_UNAVAILABLE_MESSAGE;
}
