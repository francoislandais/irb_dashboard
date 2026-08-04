const COST_OF_RISK_TAB_URL_PARAM = "cor_tab";
const COST_OF_RISK_DATE_URL_PARAM = "cor_date";
const COST_OF_RISK_VIEW_URL_PARAM = "cor_view";
const COST_OF_RISK_CELL_URL_PARAM = "cor_cell";
const COST_OF_RISK_PERIOD_URL_PARAM = "cor_period";
const COST_OF_RISK_PERIOD_URL_YTD = "ytd";

const COST_OF_RISK_URL_TABS = new Set(["summary", "cost-of-risk", "npl-flows", "stage-transfers", "contributions"]);
const COST_OF_RISK_PERIOD_URL_TABS = new Set(["cost-of-risk", "stage-transfers", "contributions"]);
export const COST_OF_RISK_DISABLED_TABS = new Set(["f2-vs-f12", "stage-reconciliation", "core-definition", "analysis"]);

export function readCostOfRiskUrlState() {
  const params = new URLSearchParams(window.location.search);
  const tab = params.get(COST_OF_RISK_TAB_URL_PARAM);
  const view = params.get(COST_OF_RISK_VIEW_URL_PARAM);

  return {
    referenceDate: params.get(COST_OF_RISK_DATE_URL_PARAM) ?? "",
    periodMode: params.get(COST_OF_RISK_PERIOD_URL_PARAM) === COST_OF_RISK_PERIOD_URL_YTD ? COST_OF_RISK_PERIOD_URL_YTD : "",
    selection: params.get(COST_OF_RISK_CELL_URL_PARAM) ?? "",
    summaryBreakdown: view === "counterparty" || view === "stage" ? view : "",
    tab: tab && COST_OF_RISK_URL_TABS.has(tab) ? tab : ""
  };
}

export function writeCostOfRiskUrlState({ activeTab, periodMode, referenceDate, selection, summaryBreakdown }) {
  const url = new URL(window.location.href);

  if (!COST_OF_RISK_URL_TABS.has(activeTab)) {
    url.searchParams.delete(COST_OF_RISK_TAB_URL_PARAM);
    url.searchParams.delete(COST_OF_RISK_DATE_URL_PARAM);
    url.searchParams.delete(COST_OF_RISK_VIEW_URL_PARAM);
    url.searchParams.delete(COST_OF_RISK_CELL_URL_PARAM);
    url.searchParams.delete(COST_OF_RISK_PERIOD_URL_PARAM);
    window.history.replaceState({}, "", url);
    return;
  }

  url.searchParams.set(COST_OF_RISK_TAB_URL_PARAM, activeTab);
  setOptionalUrlParam(url, COST_OF_RISK_DATE_URL_PARAM, referenceDate);
  setOptionalUrlParam(url, COST_OF_RISK_CELL_URL_PARAM, selection);
  if (COST_OF_RISK_PERIOD_URL_TABS.has(activeTab) && periodMode === COST_OF_RISK_PERIOD_URL_YTD) {
    url.searchParams.set(COST_OF_RISK_PERIOD_URL_PARAM, COST_OF_RISK_PERIOD_URL_YTD);
  } else {
    url.searchParams.delete(COST_OF_RISK_PERIOD_URL_PARAM);
  }

  if (activeTab === "summary") {
    url.searchParams.set(COST_OF_RISK_VIEW_URL_PARAM, summaryBreakdown || "stage");
  } else {
    url.searchParams.delete(COST_OF_RISK_VIEW_URL_PARAM);
  }

  window.history.replaceState({}, "", url);
}

function setOptionalUrlParam(url, key, value) {
  if (value) {
    url.searchParams.set(key, value);
  } else {
    url.searchParams.delete(key);
  }
}
