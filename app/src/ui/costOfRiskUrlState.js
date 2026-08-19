const COST_OF_RISK_TAB_URL_PARAM = "cor_tab";
const COST_OF_RISK_DATE_URL_PARAM = "cor_date";
const COST_OF_RISK_VIEW_URL_PARAM = "cor_view";
const COST_OF_RISK_CELL_URL_PARAM = "cor_cell";
const COST_OF_RISK_PERIOD_URL_PARAM = "cor_period";
const COST_OF_RISK_PERIOD_URL_QUARTERLY = "quarterly";
const COST_OF_RISK_BALANCE_SCOPE_URL_PARAM = "cor_balance";
const COST_OF_RISK_ASSET_URL_PARAM = "cor_asset";
const COST_OF_RISK_COUNTERPARTY_URL_PARAM = "cor_counterparty";
const COST_OF_RISK_STAGE_URL_PARAM = "cor_stage";
const COST_OF_RISK_DISPLAY_URL_PARAM = "cor_display";
const COST_OF_RISK_SMOOTH_URL_PARAM = "cor_smooth";
const COST_OF_RISK_FOCUS_URL_PARAM = "cor_focus";
const COST_OF_RISK_DETAIL_TAB_URL_PARAM = "cor_detail";
const COST_OF_RISK_BENCHMARK_URL_PARAM = "cor_benchmark";
const COST_OF_RISK_X_AXIS_URL_PARAM = "cor_x";
const COST_OF_RISK_COMPONENTS_URL_PARAM = "cor_components";
const COST_OF_RISK_MOVEMENTS_URL_PARAM = "cor_movements";
const COST_OF_RISK_PANEL_URL_PARAM = "cor_panel";
const COST_OF_RISK_PERIOD_URL_YTD = "ytd";
const COST_OF_RISK_PERIOD_URL_ANNUALIZED = "annualized";

const COST_OF_RISK_URL_TABS = new Set([
  "summary", "cost-of-risk", "geography", "npl-flows", "stage-transfers", "contributions",
  "stage-ratio", "coverage-ratio", "collateral-ratio"
]);
const COST_OF_RISK_PERIOD_URL_TABS = new Set(["cost-of-risk", "stage-transfers", "contributions"]);
export const COST_OF_RISK_DISABLED_TABS = new Set(["f2-vs-f12", "stage-reconciliation", "core-definition", "analysis"]);

export function readCostOfRiskUrlState() {
  const params = readUrlStateParams();
  const tab = params.get(COST_OF_RISK_TAB_URL_PARAM);
  const view = params.get(COST_OF_RISK_VIEW_URL_PARAM);

  const periodMode = params.get(COST_OF_RISK_PERIOD_URL_PARAM);
  return {
    asset: params.get(COST_OF_RISK_ASSET_URL_PARAM) ?? "",
    balanceScope: params.get(COST_OF_RISK_BALANCE_SCOPE_URL_PARAM) ?? "",
    benchmarkMode: params.get(COST_OF_RISK_BENCHMARK_URL_PARAM) === "f02" ? "f02" : "",
    components: params.get(COST_OF_RISK_COMPONENTS_URL_PARAM) ?? "",
    counterparty: params.get(COST_OF_RISK_COUNTERPARTY_URL_PARAM) ?? "",
    detailTab: params.get(COST_OF_RISK_DETAIL_TAB_URL_PARAM) === "drivers" ? "drivers" : "",
    displayMode: params.get(COST_OF_RISK_DISPLAY_URL_PARAM) === "amount" ? "amount" : params.get(COST_OF_RISK_DISPLAY_URL_PARAM) === "ratio" ? "ratio" : "",
    focusSelectedYAxis: params.get(COST_OF_RISK_FOCUS_URL_PARAM) === "1",
    movementComponents: params.get(COST_OF_RISK_MOVEMENTS_URL_PARAM) ?? "",
    panel: normalizeContextPanel(params.get(COST_OF_RISK_PANEL_URL_PARAM)),
    referenceDate: params.get(COST_OF_RISK_DATE_URL_PARAM) ?? "",
    periodMode: periodMode === COST_OF_RISK_PERIOD_URL_QUARTERLY || periodMode === COST_OF_RISK_PERIOD_URL_YTD || periodMode === COST_OF_RISK_PERIOD_URL_ANNUALIZED
      ? periodMode
      : "",
    selection: params.get(COST_OF_RISK_CELL_URL_PARAM) ?? "",
    smoothingWindow: normalizeSmoothingWindow(params.get(COST_OF_RISK_SMOOTH_URL_PARAM)),
    stage: params.get(COST_OF_RISK_STAGE_URL_PARAM) ?? "",
    summaryBreakdown: view === "counterparty" || view === "stage" ? view : "",
    tab: tab && COST_OF_RISK_URL_TABS.has(tab) ? tab : "",
    xAxisCode: params.get(COST_OF_RISK_X_AXIS_URL_PARAM) ?? ""
  };
}

export function writeCostOfRiskUrlState({
  activeTab, asset, balanceScope, benchmarkMode, components, counterparty, detailTab,
  displayMode, focusSelectedYAxis, movementComponents, panel, periodMode, referenceDate, selection, smoothingWindow,
  stage, summaryBreakdown, xAxisCode
}) {
  const url = createUrlState();

  if (!COST_OF_RISK_URL_TABS.has(activeTab)) {
    url.searchParams.delete(COST_OF_RISK_TAB_URL_PARAM);
    url.searchParams.delete(COST_OF_RISK_DATE_URL_PARAM);
    url.searchParams.delete(COST_OF_RISK_VIEW_URL_PARAM);
    url.searchParams.delete(COST_OF_RISK_CELL_URL_PARAM);
    url.searchParams.delete(COST_OF_RISK_PERIOD_URL_PARAM);
    for (const key of getCostOfRiskExtendedUrlParams()) url.searchParams.delete(key);
    replaceCostOfRiskUrlState(url);
    return;
  }

  url.searchParams.set(COST_OF_RISK_TAB_URL_PARAM, activeTab);
  setOptionalUrlParam(url, COST_OF_RISK_DATE_URL_PARAM, referenceDate);
  setOptionalUrlParam(url, COST_OF_RISK_CELL_URL_PARAM, selection);
  setOptionalUrlParam(url, COST_OF_RISK_BALANCE_SCOPE_URL_PARAM, balanceScope);
  setOptionalUrlParam(url, COST_OF_RISK_ASSET_URL_PARAM, asset);
  setOptionalUrlParam(url, COST_OF_RISK_COUNTERPARTY_URL_PARAM, counterparty);
  setOptionalUrlParam(url, COST_OF_RISK_STAGE_URL_PARAM, stage);
  setOptionalUrlParam(url, COST_OF_RISK_DISPLAY_URL_PARAM, displayMode);
  setOptionalUrlParam(url, COST_OF_RISK_SMOOTH_URL_PARAM, smoothingWindow);
  setOptionalUrlParam(url, COST_OF_RISK_FOCUS_URL_PARAM, focusSelectedYAxis ? "1" : "0");
  setOptionalUrlParam(url, COST_OF_RISK_DETAIL_TAB_URL_PARAM, detailTab);
  setOptionalUrlParam(url, COST_OF_RISK_BENCHMARK_URL_PARAM, benchmarkMode);
  setOptionalUrlParam(url, COST_OF_RISK_X_AXIS_URL_PARAM, xAxisCode);
  setOptionalUrlParam(url, COST_OF_RISK_COMPONENTS_URL_PARAM, components);
  setOptionalUrlParam(url, COST_OF_RISK_MOVEMENTS_URL_PARAM, movementComponents);
  setOptionalUrlParam(url, COST_OF_RISK_PANEL_URL_PARAM, normalizeContextPanel(panel));
  if (
    COST_OF_RISK_PERIOD_URL_TABS.has(activeTab)
    && (periodMode === COST_OF_RISK_PERIOD_URL_QUARTERLY || periodMode === COST_OF_RISK_PERIOD_URL_YTD || periodMode === COST_OF_RISK_PERIOD_URL_ANNUALIZED)
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

function normalizeSmoothingWindow(value) {
  const numeric = Number(value);
  return Number.isInteger(numeric) && numeric >= 1 && numeric <= 4 ? numeric : null;
}

function normalizeContextPanel(value) {
  const panel = String(value ?? "");
  const fixedPanels = new Set([
    "jst-code", "reference-date", "period-mode", "display-mode",
    "peer-selection", "stage-transfer-denominator"
  ]);
  if (fixedPanels.has(panel)) return panel;
  return /^filter-selection:(instrument|counterparty|balanceScope|stage|definition)$/.test(panel) ? panel : "";
}

function getCostOfRiskExtendedUrlParams() {
  return [
    COST_OF_RISK_BALANCE_SCOPE_URL_PARAM, COST_OF_RISK_ASSET_URL_PARAM,
    COST_OF_RISK_COUNTERPARTY_URL_PARAM, COST_OF_RISK_STAGE_URL_PARAM,
    COST_OF_RISK_DISPLAY_URL_PARAM, COST_OF_RISK_SMOOTH_URL_PARAM,
    COST_OF_RISK_FOCUS_URL_PARAM, COST_OF_RISK_DETAIL_TAB_URL_PARAM,
    COST_OF_RISK_BENCHMARK_URL_PARAM, COST_OF_RISK_X_AXIS_URL_PARAM,
    COST_OF_RISK_COMPONENTS_URL_PARAM, COST_OF_RISK_MOVEMENTS_URL_PARAM,
    COST_OF_RISK_PANEL_URL_PARAM
  ];
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
