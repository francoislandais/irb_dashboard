const CREDIT_RISK_TAB_URL_PARAM = "credit_tab";
const CREDIT_RISK_DATE_URL_PARAM = "credit_date";
const CREDIT_RISK_VIEW_URL_PARAM = "credit_view";
const CREDIT_RISK_CELL_URL_PARAM = "credit_cell";
const CREDIT_RISK_PERIOD_URL_PARAM = "credit_period";
const CREDIT_RISK_PERIOD_URL_QUARTERLY = "quarterly";
const CREDIT_RISK_BALANCE_SCOPE_URL_PARAM = "credit_balance";
const CREDIT_RISK_ASSET_URL_PARAM = "credit_asset";
const CREDIT_RISK_COUNTERPARTY_URL_PARAM = "credit_counterparty";
const CREDIT_RISK_STAGE_URL_PARAM = "credit_stage";
const CREDIT_RISK_DISPLAY_URL_PARAM = "credit_display";
const CREDIT_RISK_SMOOTH_URL_PARAM = "credit_smooth";
const CREDIT_RISK_FOCUS_URL_PARAM = "credit_focus";
const CREDIT_RISK_DETAIL_TAB_URL_PARAM = "credit_detail";
const CREDIT_RISK_BENCHMARK_URL_PARAM = "credit_benchmark";
const CREDIT_RISK_X_AXIS_URL_PARAM = "credit_x";
const CREDIT_RISK_COMPONENTS_URL_PARAM = "credit_components";
const CREDIT_RISK_MOVEMENTS_URL_PARAM = "credit_movements";
const CREDIT_RISK_PANEL_URL_PARAM = "credit_panel";
const CREDIT_RISK_PERIOD_URL_YTD = "ytd";
const CREDIT_RISK_PERIOD_URL_ANNUALIZED = "annualized";

const CREDIT_RISK_URL_TABS = new Set([
  "summary", "cost-of-risk", "geography", "npl-flows", "stage-transfers", "contributions",
  "stage-ratio", "coverage-ratio", "collateral-ratio"
]);
const CREDIT_RISK_PERIOD_URL_TABS = new Set(["cost-of-risk", "stage-transfers", "contributions"]);
export const CREDIT_RISK_DISABLED_TABS = new Set(["f2-vs-f12", "stage-reconciliation", "core-definition", "analysis"]);

export function readCreditRiskUrlState() {
  const params = readUrlStateParams();
  const tab = params.get(CREDIT_RISK_TAB_URL_PARAM);
  const view = params.get(CREDIT_RISK_VIEW_URL_PARAM);

  const periodMode = params.get(CREDIT_RISK_PERIOD_URL_PARAM);
  return {
    asset: params.get(CREDIT_RISK_ASSET_URL_PARAM) ?? "",
    balanceScope: params.get(CREDIT_RISK_BALANCE_SCOPE_URL_PARAM) ?? "",
    benchmarkMode: params.get(CREDIT_RISK_BENCHMARK_URL_PARAM) === "f02" ? "f02" : "",
    components: params.get(CREDIT_RISK_COMPONENTS_URL_PARAM) ?? "",
    counterparty: params.get(CREDIT_RISK_COUNTERPARTY_URL_PARAM) ?? "",
    detailTab: params.get(CREDIT_RISK_DETAIL_TAB_URL_PARAM) === "drivers" ? "drivers" : "",
    displayMode: params.get(CREDIT_RISK_DISPLAY_URL_PARAM) === "amount" ? "amount" : params.get(CREDIT_RISK_DISPLAY_URL_PARAM) === "ratio" ? "ratio" : "",
    focusSelectedYAxis: params.get(CREDIT_RISK_FOCUS_URL_PARAM) === "1",
    movementComponents: params.get(CREDIT_RISK_MOVEMENTS_URL_PARAM) ?? "",
    panel: normalizeContextPanel(params.get(CREDIT_RISK_PANEL_URL_PARAM)),
    referenceDate: params.get(CREDIT_RISK_DATE_URL_PARAM) ?? "",
    periodMode: periodMode === CREDIT_RISK_PERIOD_URL_QUARTERLY || periodMode === CREDIT_RISK_PERIOD_URL_YTD || periodMode === CREDIT_RISK_PERIOD_URL_ANNUALIZED
      ? periodMode
      : "",
    selection: params.get(CREDIT_RISK_CELL_URL_PARAM) ?? "",
    smoothingWindow: normalizeSmoothingWindow(params.get(CREDIT_RISK_SMOOTH_URL_PARAM)),
    stage: params.get(CREDIT_RISK_STAGE_URL_PARAM) ?? "",
    summaryBreakdown: view === "counterparty" || view === "stage" ? view : "",
    tab: tab && CREDIT_RISK_URL_TABS.has(tab) ? tab : "",
    xAxisCode: params.get(CREDIT_RISK_X_AXIS_URL_PARAM) ?? ""
  };
}

export function writeCreditRiskUrlState({
  activeTab, asset, balanceScope, benchmarkMode, components, counterparty, detailTab,
  displayMode, focusSelectedYAxis, movementComponents, panel, periodMode, referenceDate, selection, smoothingWindow,
  stage, summaryBreakdown, xAxisCode
}) {
  const url = createUrlState();

  if (!CREDIT_RISK_URL_TABS.has(activeTab)) {
    url.searchParams.delete(CREDIT_RISK_TAB_URL_PARAM);
    url.searchParams.delete(CREDIT_RISK_DATE_URL_PARAM);
    url.searchParams.delete(CREDIT_RISK_VIEW_URL_PARAM);
    url.searchParams.delete(CREDIT_RISK_CELL_URL_PARAM);
    url.searchParams.delete(CREDIT_RISK_PERIOD_URL_PARAM);
    for (const key of getCreditRiskExtendedUrlParams()) url.searchParams.delete(key);
    replaceCreditRiskUrlState(url);
    return;
  }

  url.searchParams.set(CREDIT_RISK_TAB_URL_PARAM, activeTab);
  setOptionalUrlParam(url, CREDIT_RISK_DATE_URL_PARAM, referenceDate);
  setOptionalUrlParam(url, CREDIT_RISK_CELL_URL_PARAM, selection);
  setOptionalUrlParam(url, CREDIT_RISK_BALANCE_SCOPE_URL_PARAM, balanceScope);
  setOptionalUrlParam(url, CREDIT_RISK_ASSET_URL_PARAM, asset);
  setOptionalUrlParam(url, CREDIT_RISK_COUNTERPARTY_URL_PARAM, counterparty);
  setOptionalUrlParam(url, CREDIT_RISK_STAGE_URL_PARAM, stage);
  setOptionalUrlParam(url, CREDIT_RISK_DISPLAY_URL_PARAM, displayMode);
  setOptionalUrlParam(url, CREDIT_RISK_SMOOTH_URL_PARAM, smoothingWindow);
  setOptionalUrlParam(url, CREDIT_RISK_FOCUS_URL_PARAM, focusSelectedYAxis ? "1" : "0");
  setOptionalUrlParam(url, CREDIT_RISK_DETAIL_TAB_URL_PARAM, detailTab);
  setOptionalUrlParam(url, CREDIT_RISK_BENCHMARK_URL_PARAM, benchmarkMode);
  setOptionalUrlParam(url, CREDIT_RISK_X_AXIS_URL_PARAM, xAxisCode);
  setOptionalUrlParam(url, CREDIT_RISK_COMPONENTS_URL_PARAM, components);
  setOptionalUrlParam(url, CREDIT_RISK_MOVEMENTS_URL_PARAM, movementComponents);
  setOptionalUrlParam(url, CREDIT_RISK_PANEL_URL_PARAM, normalizeContextPanel(panel));
  if (
    CREDIT_RISK_PERIOD_URL_TABS.has(activeTab)
    && (periodMode === CREDIT_RISK_PERIOD_URL_QUARTERLY || periodMode === CREDIT_RISK_PERIOD_URL_YTD || periodMode === CREDIT_RISK_PERIOD_URL_ANNUALIZED)
  ) {
    url.searchParams.set(CREDIT_RISK_PERIOD_URL_PARAM, periodMode);
  } else {
    url.searchParams.delete(CREDIT_RISK_PERIOD_URL_PARAM);
  }

  if (activeTab === "summary") {
    url.searchParams.set(CREDIT_RISK_VIEW_URL_PARAM, summaryBreakdown || "stage");
  } else {
    url.searchParams.delete(CREDIT_RISK_VIEW_URL_PARAM);
  }

  replaceCreditRiskUrlState(url);
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

function getCreditRiskExtendedUrlParams() {
  return [
    CREDIT_RISK_BALANCE_SCOPE_URL_PARAM, CREDIT_RISK_ASSET_URL_PARAM,
    CREDIT_RISK_COUNTERPARTY_URL_PARAM, CREDIT_RISK_STAGE_URL_PARAM,
    CREDIT_RISK_DISPLAY_URL_PARAM, CREDIT_RISK_SMOOTH_URL_PARAM,
    CREDIT_RISK_FOCUS_URL_PARAM, CREDIT_RISK_DETAIL_TAB_URL_PARAM,
    CREDIT_RISK_BENCHMARK_URL_PARAM, CREDIT_RISK_X_AXIS_URL_PARAM,
    CREDIT_RISK_COMPONENTS_URL_PARAM, CREDIT_RISK_MOVEMENTS_URL_PARAM,
    CREDIT_RISK_PANEL_URL_PARAM
  ];
}

function replaceCreditRiskUrlState(url) {
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
