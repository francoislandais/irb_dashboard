import {
  createCostOfRiskAuditInfoSection,
  createCostOfRiskAuditIntroHeader
} from "./costOfRiskAuditPanelNodes.js?v=20260803-refactor-cleanup";

export function createCostOfRiskPeerSelectionPanel(
  state,
  {
    updatePeerDisplayMode = () => {},
    updatePeerJstCodes = () => {}
  } = {}
) {
  const jstOptions = state?.jstOptions ?? [];
  const selectedPeers = new Set((state?.peerJstCodes ?? jstOptions) ?? []);
  const selectedCount = jstOptions.filter((jstCode) => selectedPeers.has(jstCode)).length;

  const intro = createCostOfRiskAuditIntroHeader({
    articleClassName: "cost-of-risk-audit-intro cost-of-risk-peer-selection-panel",
    eyebrow: "Benchmark peers",
    lead: jstOptions.length > 0
      ? `${selectedCount} of ${jstOptions.length} JST selected for benchmark views. Changes are applied immediately.`
      : "Load a dataset to choose the JST included in benchmark views.",
    title: "Peers"
  });

  if (jstOptions.length > 0) {
    intro.append(createCostOfRiskPeerDisplayControl(state, updatePeerDisplayMode));

    const actions = document.createElement("div");
    actions.className = "cost-of-risk-peer-selection-actions";
    actions.append(
      createCostOfRiskPeerSelectionButton("Select all", () => updatePeerJstCodes(jstOptions)),
      createCostOfRiskPeerSelectionButton("Deselect all", () => updatePeerJstCodes([]))
    );

    const list = document.createElement("div");
    list.className = "cost-of-risk-peer-selection-list";
    jstOptions.forEach((jstCode) => {
      const row = document.createElement("label");
      row.className = "cost-of-risk-peer-selection-row";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = jstCode;
      checkbox.checked = selectedPeers.has(jstCode);
      checkbox.addEventListener("change", (event) => {
        const nextPeers = new Set(selectedPeers);
        if (event.target.checked) {
          nextPeers.add(jstCode);
        } else {
          nextPeers.delete(jstCode);
        }
        updatePeerJstCodes([...nextPeers]);
      });

      const label = document.createElement("span");
      label.textContent = jstCode;
      row.append(checkbox, label);
      list.append(row);
    });

    intro.append(actions, list);
  }

  intro.append(createCostOfRiskAuditInfoSection("How it is used", [
    "The selected JST always remains visible in benchmark charts.",
    "The peers selected here define the comparison population for explicit peer curves and anonymized percentile distributions.",
    "Leaving no peer selected means the benchmark population is empty until peers are selected again."
  ]));

  const hint = document.createElement("p");
  hint.className = "cost-of-risk-audit-intro-hint";
  hint.textContent = "Use Select all or individual checkboxes to adjust the peer set; charts refresh as soon as the selection changes.";
  intro.append(hint);

  return intro;
}

function createCostOfRiskPeerDisplayControl(state, updatePeerDisplayMode) {
  const activeMode = state?.peerDisplayMode === "anonymised" ? "anonymised" : "explicit";
  const block = document.createElement("section");
  block.className = "cost-of-risk-peer-display-panel";

  const label = document.createElement("div");
  label.className = "cost-of-risk-peer-display-label";
  label.textContent = "Display";

  const group = document.createElement("div");
  group.className = "cost-of-risk-peer-display-group";
  group.setAttribute("role", "radiogroup");
  group.setAttribute("aria-label", "Peer display mode");
  group.append(
    createCostOfRiskPeerDisplayOption("Explicit", "explicit", activeMode, updatePeerDisplayMode),
    createCostOfRiskPeerDisplayOption("Anonymized", "anonymised", activeMode, updatePeerDisplayMode)
  );

  block.append(label, group);
  return block;
}

function createCostOfRiskPeerDisplayOption(label, mode, activeMode, updatePeerDisplayMode) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "cost-of-risk-peer-display-option";
  button.classList.toggle("is-active", mode === activeMode);
  button.dataset.peerDisplayMode = mode;
  button.setAttribute("role", "radio");
  button.setAttribute("aria-checked", String(mode === activeMode));
  button.textContent = label;
  button.addEventListener("click", () => updatePeerDisplayMode(mode));
  return button;
}

function createCostOfRiskPeerSelectionButton(label, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "cost-of-risk-peer-selection-button";
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
}
