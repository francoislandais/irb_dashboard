const IRB_DEFAULT_TAB = "output-floor";

const elements = {
  tabs: [...document.querySelectorAll("[data-irb-tab]")],
  panels: [...document.querySelectorAll("[data-irb-panel]")]
};

let activeIrbTab = IRB_DEFAULT_TAB;

export function wireIrbUi() {
  elements.tabs.forEach((button) => {
    button.addEventListener("click", () => {
      activeIrbTab = button.dataset.irbTab || IRB_DEFAULT_TAB;
      renderIrbTabs();
    });
  });
  renderIrbTabs();
}

export function renderIrb() {
  renderIrbTabs();
}

function renderIrbTabs() {
  elements.tabs.forEach((button) => {
    const isActive = button.dataset.irbTab === activeIrbTab;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });

  elements.panels.forEach((panel) => {
    const isActive = panel.dataset.irbPanel === activeIrbTab;
    panel.classList.toggle("is-active", isActive);
    panel.hidden = !isActive;
  });
}
