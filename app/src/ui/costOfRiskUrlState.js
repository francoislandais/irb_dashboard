const COST_OF_RISK_TAB_URL_PARAM = "cor_tab";
const COST_OF_RISK_DATE_URL_PARAM = "cor_date";
const COST_OF_RISK_VIEW_URL_PARAM = "cor_view";
const COST_OF_RISK_CELL_URL_PARAM = "cor_cell";
const COST_OF_RISK_PERIOD_URL_PARAM = "cor_period";
const COST_OF_RISK_PERIOD_URL_YTD = "ytd";
const COST_OF_RISK_PERIOD_URL_ANNUALIZED = "annualized";

const COST_OF_RISK_URL_TABS = new Set(["summary", "cost-of-risk", "geography", "npl-flows", "stage-transfers", "contributions"]);
const COST_OF_RISK_PERIOD_URL_TABS = new Set(["cost-of-risk", "stage-transfers", "contributions"]);
export const COST_OF_RISK_DISABLED_TABS = new Set(["f2-vs-f12", "stage-reconciliation", "core-definition", "analysis"]);

export function readCostOfRiskUrlState() {
  const params = readUrlStateParams();
  const tab = params.get(COST_OF_RISK_TAB_URL_PARAM);
  const view = params.get(COST_OF_RISK_VIEW_URL_PARAM);

  const periodMode = params.get(COST_OF_RISK_PERIOD_URL_PARAM);
  return {
    referenceDate: params.get(COST_OF_RISK_DATE_URL_PARAM) ?? "",
    periodMode: periodMode === COST_OF_RISK_PERIOD_URL_YTD || periodMode === COST_OF_RISK_PERIOD_URL_ANNUALIZED
      ? periodMode
      : "",
    selection: params.get(COST_OF_RISK_CELL_URL_PARAM) ?? "",
    summaryBreakdown: view === "counterparty" || view === "stage" ? view : "",
    tab: tab && COST_OF_RISK_URL_TABS.has(tab) ? tab : ""
  };
}

export function writeCostOfRiskUrlState({ activeTab, periodMode, referenceDate, selection, summaryBreakdown }) {
  const url = createUrlState();

  if (!COST_OF_RISK_URL_TABS.has(activeTab)) {
    url.searchParams.delete(COST_OF_RISK_TAB_URL_PARAM);
    url.searchParams.delete(COST_OF_RISK_DATE_URL_PARAM);
    url.searchParams.delete(COST_OF_RISK_VIEW_URL_PARAM);
    url.searchParams.delete(COST_OF_RISK_CELL_URL_PARAM);
    url.searchParams.delete(COST_OF_RISK_PERIOD_URL_PARAM);
    replaceCostOfRiskUrlState(url);
    return;
  }

  url.searchParams.set(COST_OF_RISK_TAB_URL_PARAM, activeTab);
  setOptionalUrlParam(url, COST_OF_RISK_DATE_URL_PARAM, referenceDate);
  setOptionalUrlParam(url, COST_OF_RISK_CELL_URL_PARAM, selection);
  if (
    COST_OF_RISK_PERIOD_URL_TABS.has(activeTab)
    && (periodMode === COST_OF_RISK_PERIOD_URL_YTD || periodMode === COST_OF_RISK_PERIOD_URL_ANNUALIZED)
  ) {
    url.searchParams.set(COST_OF_RISK_PERIOD_URL_PARAM, periodMode);
  } else {
    url.searchParams.delete(COST_OF_RISK_PERIOD_URL_PARAM);
  }

  if (activeTab === "summary") {
    url.searchParams.set(COST_OF_RISK_VIEW_URL_PARAM, summaryBreakdown || "stage");
  } else {
    url.searchParams.delete(COST_OF_RISK_VIEW_URL_PARAM);
  }

  replaceCostOfRiskUrlState(url);
}

function replaceCostOfRiskUrlState(url) {
  replaceUrlState(url);
}

function setOptionalUrlParam(url, key, value) {
  if (value) {
    url.searchParams.set(key, value);
  } else {
    url.searchParams.delete(key);
  }
}
import { createUrlState, readUrlStateParams, replaceUrlState } from "./urlState.js";
