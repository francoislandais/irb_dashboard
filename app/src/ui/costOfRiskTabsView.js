export function renderCostOfRiskTabsView({
  activeTab,
  panels,
  tabButtons
}) {
  tabButtons.forEach((button) => {
    const isActive = button.dataset.costOfRiskTab === activeTab;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });

  panels.forEach((panel) => {
    const isActive = panel.dataset.costOfRiskPanel === activeTab;
    panel.classList.toggle("is-active", isActive);
    panel.hidden = !isActive;
  });
}

export function renderCostOfRiskTabEmptyView({
  activeTab,
  message,
  panels,
  resolveMessage
}) {
  const panel = getActiveCostOfRiskPanel(panels, activeTab);
  if (!panel) return;

  panel.classList.add("is-empty");
  panel.querySelectorAll(".cost-of-risk-tab-empty").forEach((node) => node.remove());
  const empty = document.createElement("div");
  empty.className = "cost-of-risk-tab-empty";
  empty.textContent = resolveMessage(message);
  panel.prepend(empty);
}

export function clearCostOfRiskEmptyPanelsView(panels) {
  panels.forEach((panel) => {
    panel.classList.remove("is-empty");
    panel.querySelectorAll(".cost-of-risk-tab-empty").forEach((node) => node.remove());
  });
}

function getActiveCostOfRiskPanel(panels, activeTab) {
  return panels.find((panel) => panel.dataset.costOfRiskPanel === activeTab) ?? null;
}
