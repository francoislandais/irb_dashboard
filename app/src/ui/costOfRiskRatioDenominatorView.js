import { buildCostOfRiskRatioDenominatorDetail } from "../data/costOfRisk.js?v=20260717-allowances-group-tab";

let lastCostOfRiskRatioDenominatorRenderKey = "";

export function renderCostOfRiskRatioDenominatorControls({
  activeTab,
  displayMode,
  filters,
  infoElement,
  referenceDate,
  state,
  tooltipElement
}) {
  const isRatioMode = displayMode === "ratio";
  if (infoElement) infoElement.hidden = !isRatioMode;
  if (!isRatioMode || !tooltipElement) return;

  const renderKey = serializeCostOfRiskRatioDenominatorPart({
    activeTab,
    displayMode,
    filters,
    referenceDate,
    rowsLength: state.rows?.length ?? 0,
    selectedJst: state.selectedJst
  });
  if (renderKey === lastCostOfRiskRatioDenominatorRenderKey) return;
  lastCostOfRiskRatioDenominatorRenderKey = renderKey;

  if (activeTab === "contributions") {
    tooltipElement.textContent = "Rate denominator: previous-quarter FINREP F 18.00 gross carrying amount for the current Instruments / Counterparty / Stage filters.";
    return;
  }

  const detail = buildCostOfRiskRatioDenominatorDetail(state, filters, referenceDate, state.selectedJst);
  tooltipElement.textContent = `Growth rate denominator: previous-quarter ${detail.label}, as reported in FINREP F 18.00.`;
}

function serializeCostOfRiskRatioDenominatorPart(value) {
  if (Array.isArray(value)) return `[${value.map(serializeCostOfRiskRatioDenominatorPart).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${key}:${serializeCostOfRiskRatioDenominatorPart(value[key])}`).join(",")}}`;
  }
  return String(value);
}
