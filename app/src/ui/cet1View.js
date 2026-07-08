import { formatPercentValue } from "../data/core/formatting.js";
import { formatBasisPointChange, formatCet1Amount, getCet1RatioSnapshot } from "../data/cet1.js";

const elements = {
  cet1Dashboard: document.querySelector("#cet1-dashboard"),
  cet1DenominatorContext: document.querySelector("#cet1-denominator-context"),
  cet1DenominatorValue: document.querySelector("#cet1-denominator-value"),
  cet1Empty: document.querySelector("#cet1-empty"),
  cet1NumeratorContext: document.querySelector("#cet1-numerator-context"),
  cet1NumeratorValue: document.querySelector("#cet1-numerator-value"),
  cet1RatioChange: document.querySelector("#cet1-ratio-change"),
  cet1RatioChangeContext: document.querySelector("#cet1-ratio-change-context"),
  cet1RatioContext: document.querySelector("#cet1-ratio-context"),
  cet1RatioValue: document.querySelector("#cet1-ratio-value")
};

export function renderCet1(state) {
  const snapshot = getCet1RatioSnapshot(state);
  if (!elements.cet1Empty || !elements.cet1Dashboard) return;

  if (snapshot.status) {
    elements.cet1Empty.hidden = false;
    elements.cet1Empty.textContent = snapshot.status;
    elements.cet1Dashboard.hidden = true;
    return;
  }

  elements.cet1Empty.hidden = true;
  elements.cet1Dashboard.hidden = false;
  elements.cet1RatioValue.textContent = formatPercentValue(snapshot.ratio.currentValue);
  elements.cet1RatioContext.textContent = `${snapshot.jstCode} - ${snapshot.currentDateLabel}`;
  elements.cet1RatioChange.textContent = formatBasisPointChange(snapshot.ratio.changeBasisPoints);
  elements.cet1RatioChangeContext.textContent = `vs ${snapshot.previousDateLabel}`;
  elements.cet1NumeratorValue.textContent = formatCet1Amount(snapshot.numerator.currentValue, state.selectedUnit);
  elements.cet1NumeratorContext.textContent = `C_01.00 - ${snapshot.currentDateLabel}`;
  elements.cet1DenominatorValue.textContent = formatCet1Amount(snapshot.denominator.currentValue, state.selectedUnit);
  elements.cet1DenominatorContext.textContent = `C_02.00 - ${snapshot.currentDateLabel}`;
}
