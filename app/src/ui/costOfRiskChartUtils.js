export const COST_OF_RISK_CHART_TITLE_POSITION = {
  margin: 10,
  x: 0,
  y: 5
};

// Shared by every Cost of Risk temporal chart so quarterly reference dates
// read "Q12026" on the x-axis instead of a raw date.
export function formatCostOfRiskQuarterAxisLabel(timestamp) {
  const date = new Date(timestamp);
  const quarter = Math.floor(date.getMonth() / 3) + 1;
  return `Q${quarter}${date.getFullYear()}`;
}

// Reference dates are real calendar quarter-ends (31/03, 30/06, ...), which
// are not evenly spaced in milliseconds. Highcharts' automatic datetime tick
// picker can land ticks off the actual data points, so charts pass their own
// reference dates here to keep labels aligned to real observations.
export function getCostOfRiskAxisTickPositions(points) {
  return [...new Set(
    (points ?? [])
      .filter((point) => point.date instanceof Date)
      .map((point) => point.date.getTime())
  )].sort((left, right) => left - right);
}

export function getCostOfRiskFocusedYAxisBounds(series, selectedSeriesName, options = {}) {
  const selectedSeries = (series ?? []).find((serie) => serie.name === selectedSeriesName);
  const selectedValues = extractCostOfRiskFiniteYValues(selectedSeries ? [selectedSeries] : []);
  const values = selectedValues.length > 0
    ? selectedValues
    : extractCostOfRiskFiniteYValues(series);

  if (values.length === 0) return { max: undefined, min: undefined };

  const paddingRatio = selectedValues.length > 0
    ? options.selectedPaddingRatio ?? 0.12
    : options.fallbackPaddingRatio ?? 0.015;
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue;
  const minimumPadding = options.minimumPadding ?? 0.5;
  const padding = range > 0
    ? range * paddingRatio
    : Math.max(Math.abs(maxValue) * paddingRatio, minimumPadding);

  return {
    max: maxValue + padding,
    min: minValue - padding
  };
}

function extractCostOfRiskFiniteYValues(series) {
  return (series ?? [])
    .flatMap((serie) => (serie?.data ?? []).map((point) => point?.y))
    .filter((value) => Number.isFinite(value));
}

export function createCostOfRiskHighchartsTitle(text, position = COST_OF_RISK_CHART_TITLE_POSITION) {
  return {
    align: "left",
    margin: position.margin,
    text: text || "",
    x: position.x,
    y: position.y,
    style: {
      color: "#26332d",
      fontSize: "13px",
      fontWeight: "400"
    }
  };
}

let costOfRiskSmoothingPanelOpen = false;

export function renderCostOfRiskSmoothingBadge(chart, smoothingWindow, onClearSmoothing, onChangeSmoothing) {
  clearCostOfRiskSmoothingBadge(chart);
  const windowSize = Number(smoothingWindow);
  const host = chart?.renderTo;
  if (!host || !Number.isFinite(windowSize)) return;

  const primaryDark = getComputedStyle(document.documentElement)
    .getPropertyValue("--primary-dark")
    .trim() || "#0c4c42";
  const titleBox = chart.title?.getBBox?.();
  const titleX = chart.title?.alignAttr?.x ?? chart.plotLeft ?? 12;
  const titleY = chart.title?.alignAttr?.y ?? 8;
  const titleWidth = Number.isFinite(titleBox?.width) ? titleBox.width : 0;
  const badgeX = Math.min(chart.chartWidth - 124, titleX + titleWidth + 30);
  const badgeY = Math.max(8, titleY - 4);
  const isSmoothed = windowSize > 1;

  host.style.position = host.style.position || "relative";
  const badge = document.createElement("div");
  badge.className = "cost-of-risk-chart-smoothing-badge";
  badge.classList.toggle("is-smoothed", isSmoothed);
  badge.style.left = `${badgeX}px`;
  badge.style.top = `${badgeY}px`;
  if (isSmoothed) badge.style.setProperty("--smoothing-badge-fill", primaryDark);

  const toggle = document.createElement("button");
  toggle.className = "cost-of-risk-chart-smoothing-badge-toggle";
  toggle.type = "button";
  toggle.textContent = isSmoothed ? `Smoothed ${windowSize}Q` : "raw figures";
  toggle.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    renderCostOfRiskSmoothingSlider(chart, {
      badgeX,
      badgeY,
      onChangeSmoothing,
      windowSize
    });
  });

  badge.append(toggle);
  if (isSmoothed) {
    const clearButton = document.createElement("button");
    clearButton.className = "cost-of-risk-chart-smoothing-badge-clear";
    clearButton.type = "button";
    clearButton.setAttribute("aria-label", "Clear smoothing");
    clearButton.textContent = "×";
    clearButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      clearCostOfRiskSmoothingSlider(chart);
      if (typeof onClearSmoothing === "function") onClearSmoothing();
    });
    badge.append(clearButton);
  }

  ["click", "pointerdown", "mousedown", "touchstart"].forEach((eventName) => {
    badge.addEventListener(eventName, (event) => event.stopPropagation());
  });
  host.append(badge);

  chart.customCostOfRiskSmoothingBadge = [badge];
  if (costOfRiskSmoothingPanelOpen) {
    renderCostOfRiskSmoothingSlider(chart, {
      badgeX,
      badgeY,
      onChangeSmoothing,
      windowSize
    });
  }
}

export function clearCostOfRiskSmoothingBadge(chart) {
  chart?.customCostOfRiskSmoothingBadge?.forEach((element) => {
    if (typeof element?.destroy === "function") {
      element.destroy();
      return;
    }
    element?.remove?.();
  });
  if (chart) chart.customCostOfRiskSmoothingBadge = [];
  clearCostOfRiskSmoothingSlider(chart, { keepOpen: true });
}

export function renderCostOfRiskYAxisFocusBadge(chart, isFocused, onToggleFocus) {
  clearCostOfRiskYAxisFocusBadge(chart);
  const host = chart?.renderTo;
  if (!host || typeof onToggleFocus !== "function") return;

  const primaryDark = getComputedStyle(document.documentElement)
    .getPropertyValue("--primary-dark")
    .trim() || "#0c4c42";
  const badgeX = Math.max(8, chart.chartWidth - 232);
  const titleY = chart.title?.alignAttr?.y ?? 8;
  const badgeY = Math.max(8, titleY - 4);

  host.style.position = host.style.position || "relative";
  const badge = document.createElement("button");
  badge.className = "cost-of-risk-chart-y-focus-badge";
  badge.classList.toggle("is-focused", Boolean(isFocused));
  badge.type = "button";
  badge.textContent = "focus JST axis";
  badge.style.left = `${badgeX}px`;
  badge.style.top = `${badgeY}px`;
  if (isFocused) badge.style.setProperty("--y-focus-badge-fill", primaryDark);
  badge.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    onToggleFocus();
  });
  ["pointerdown", "mousedown", "touchstart"].forEach((eventName) => {
    badge.addEventListener(eventName, (event) => event.stopPropagation());
  });
  host.append(badge);
  chart.customCostOfRiskYAxisFocusBadge = [badge];
}

export function clearCostOfRiskYAxisFocusBadge(chart) {
  chart?.customCostOfRiskYAxisFocusBadge?.forEach((element) => element?.remove?.());
  if (chart) chart.customCostOfRiskYAxisFocusBadge = [];
}

function renderCostOfRiskSmoothingSlider(chart, {
  badgeX,
  badgeY,
  onChangeSmoothing,
  windowSize
}) {
  const host = chart?.renderTo;
  if (!host || typeof onChangeSmoothing !== "function") return;
  clearCostOfRiskSmoothingSlider(chart, { keepOpen: true });
  costOfRiskSmoothingPanelOpen = true;

  host.style.position = host.style.position || "relative";
  const panel = document.createElement("div");
  panel.className = "cost-of-risk-chart-smoothing-panel";
  panel.style.left = `${Math.max(8, Math.min(chart.chartWidth - 148, badgeX + 116))}px`;
  panel.style.top = `${badgeY}px`;

  const slider = document.createElement("input");
  slider.type = "range";
  slider.min = "1";
  slider.max = "4";
  slider.step = "1";
  slider.value = String(Math.max(1, Math.min(4, windowSize || 1)));
  slider.setAttribute("aria-label", "Smoothing window");
  const stopPanelEvent = (event) => event.stopPropagation();
  slider.addEventListener("click", stopPanelEvent);
  slider.addEventListener("mousedown", stopPanelEvent);
  slider.addEventListener("touchstart", stopPanelEvent);
  slider.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const rect = slider.getBoundingClientRect();
    let lastValue = Number(slider.value);
    const applyPointerValue = (clientX) => {
      const ratio = rect.width > 0 ? (clientX - rect.left) / rect.width : 0;
      const nextValue = Math.max(1, Math.min(4, Math.round(1 + ratio * 3)));
      slider.value = String(nextValue);
      if (nextValue === lastValue) return;
      lastValue = nextValue;
      onChangeSmoothing(nextValue);
    };
    const handlePointerMove = (moveEvent) => {
      moveEvent.preventDefault();
      applyPointerValue(moveEvent.clientX);
    };
    const handlePointerUp = (upEvent) => {
      upEvent.preventDefault();
      applyPointerValue(upEvent.clientX);
      document.removeEventListener("pointermove", handlePointerMove, true);
      document.removeEventListener("pointerup", handlePointerUp, true);
      document.removeEventListener("pointercancel", handlePointerUp, true);
    };
    document.addEventListener("pointermove", handlePointerMove, true);
    document.addEventListener("pointerup", handlePointerUp, true);
    document.addEventListener("pointercancel", handlePointerUp, true);
    applyPointerValue(event.clientX);
  });
  const applySmoothing = (event) => {
    const nextValue = Number(event.target.value);
    onChangeSmoothing(nextValue);
  };
  slider.addEventListener("change", applySmoothing);

  ["click", "pointerdown", "mousedown", "touchstart"].forEach((eventName) => {
    panel.addEventListener(eventName, stopPanelEvent);
  });
  panel.append(slider);
  host.append(panel);

  const handleOutsidePointerDown = (event) => {
    if (panel.contains(event.target)) return;
    clearCostOfRiskSmoothingSlider(chart);
  };
  window.setTimeout(() => document.addEventListener("pointerdown", handleOutsidePointerDown, true), 0);
  chart.customCostOfRiskSmoothingSlider = {
    destroy() {
      document.removeEventListener("pointerdown", handleOutsidePointerDown, true);
      panel.remove();
    }
  };
}

function clearCostOfRiskSmoothingSlider(chart, { keepOpen = false } = {}) {
  chart?.customCostOfRiskSmoothingSlider?.destroy?.();
  if (chart) chart.customCostOfRiskSmoothingSlider = null;
  if (!keepOpen) costOfRiskSmoothingPanelOpen = false;
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
