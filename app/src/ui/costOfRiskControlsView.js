import {
  COST_OF_RISK_X_AXIS_CODE,
  formatCostOfRiskSmoothingLabel
} from "../data/costOfRisk.js?v=20260716-cost-risk-audit-intro-panel-view";

const lastCostOfRiskFilterSelectRenderKeys = new WeakMap();
let lastCostOfRiskSmoothingRenderKey = "";
let lastCostOfRiskXAxisRenderKey = "";

export function renderCostOfRiskFilterSelect(select, options, selectedValue) {
  if (!select) return;

  const renderKey = `${selectedValue}\u001f${serializeCostOfRiskControlPart((options ?? []).map((option) => ({
    groupLabel: option.groupLabel ?? "",
    label: option.label,
    value: option.value
  })))}`;
  if (lastCostOfRiskFilterSelectRenderKeys.get(select) === renderKey) {
    if (select.value !== selectedValue) select.value = selectedValue;
    const shouldDisable = options.length <= 1;
    if (select.disabled !== shouldDisable) select.disabled = shouldDisable;
    return;
  }
  lastCostOfRiskFilterSelectRenderKeys.set(select, renderKey);
  select.replaceChildren();
  const groups = new Map();
  options.forEach((option) => {
    const optionElement = new Option(option.label, option.value, false, option.value === selectedValue);
    if (!option.groupLabel) {
      select.append(optionElement);
      return;
    }
    if (!groups.has(option.groupLabel)) {
      const group = document.createElement("optgroup");
      group.label = option.groupLabel;
      groups.set(option.groupLabel, group);
      select.append(group);
    }
    groups.get(option.groupLabel).append(optionElement);
  });
  select.disabled = options.length <= 1;
}

export function renderCostOfRiskXAxisOptions(select, options, selectedCode) {
  if (!select) return;

  const renderKey = `${selectedCode}\u001f${serializeCostOfRiskControlPart((options ?? []).map((option) => ({
    code: option.code,
    label: option.label
  })))}`;
  if (renderKey === lastCostOfRiskXAxisRenderKey) {
    if (select.value !== selectedCode) select.value = selectedCode;
    const shouldDisable = options.length === 0;
    if (select.disabled !== shouldDisable) select.disabled = shouldDisable;
    return;
  }
  lastCostOfRiskXAxisRenderKey = renderKey;
  select.replaceChildren();
  if (options.length === 0) {
    select.append(new Option(COST_OF_RISK_X_AXIS_CODE, COST_OF_RISK_X_AXIS_CODE));
    select.disabled = true;
    return;
  }

  options.forEach((option) => {
    select.append(new Option(option.label, option.code, false, option.code === selectedCode));
  });
  select.disabled = false;
}

export function renderCostOfRiskSmoothingControl({
  output,
  slider,
  windowSize
}) {
  const renderKey = String(windowSize);
  if (renderKey === lastCostOfRiskSmoothingRenderKey) return;
  lastCostOfRiskSmoothingRenderKey = renderKey;
  if (slider) {
    slider.value = String(windowSize);
  }
  if (output) {
    output.value = formatCostOfRiskSmoothingLabel(windowSize);
    output.textContent = formatCostOfRiskSmoothingLabel(windowSize);
  }
}

function serializeCostOfRiskControlPart(value) {
  if (Array.isArray(value)) return `[${value.map(serializeCostOfRiskControlPart).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${key}:${serializeCostOfRiskControlPart(value[key])}`).join(",")}}`;
  }
  return String(value);
}
