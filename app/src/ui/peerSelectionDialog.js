let activeOverlay = null;
let activeActions = null;

export function showPeerSelectionDialog(state, actions) {
  hidePeerSelectionDialog();
  activeActions = actions;
  const overlay = document.createElement("div");
  overlay.className = "peer-dialog-overlay";
  overlay.addEventListener("pointerdown", (event) => {
    if (event.target === overlay) hidePeerSelectionDialog();
  });
  const dialog = document.createElement("section");
  dialog.className = "peer-dialog";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-labelledby", "peer-dialog-title");
  const header = document.createElement("header");
  header.className = "peer-dialog-header";
  const heading = document.createElement("div");
  const eyebrow = document.createElement("span");
  eyebrow.className = "peer-dialog-eyebrow";
  eyebrow.textContent = "Benchmark population";
  const title = document.createElement("h2");
  title.id = "peer-dialog-title";
  title.textContent = "Peers";
  const lead = document.createElement("p");
  lead.dataset.peerDialogLead = "";
  heading.append(eyebrow, title, lead);
  const close = document.createElement("button");
  close.className = "peer-dialog-close";
  close.type = "button";
  close.setAttribute("aria-label", "Close peer selection");
  close.textContent = "×";
  close.addEventListener("click", hidePeerSelectionDialog);
  header.append(heading, close);

  const body = document.createElement("div");
  body.className = "peer-dialog-body";
  const displaySection = document.createElement("section");
  displaySection.className = "peer-dialog-section";
  const displayTitle = document.createElement("h3");
  displayTitle.textContent = "Benchmark display";
  const displayHelp = document.createElement("p");
  displayHelp.textContent = "Choose whether institutions are identified or represented by an anonymized distribution.";
  const displayOptions = document.createElement("div");
  displayOptions.className = "peer-dialog-display-options";
  displayOptions.append(
    createDisplayOption("Explicit peers", "Individual peer curves remain identified.", "explicit"),
    createDisplayOption("Anonymized peers", "Peer names are replaced by percentile bands.", "anonymised")
  );
  displaySection.append(displayTitle, displayHelp, displayOptions);

  const populationSection = document.createElement("section");
  populationSection.className = "peer-dialog-section peer-dialog-population";
  const populationHeader = document.createElement("div");
  populationHeader.className = "peer-dialog-population-header";
  const populationText = document.createElement("div");
  const populationTitle = document.createElement("h3");
  populationTitle.textContent = "Included institutions";
  const populationHelp = document.createElement("p");
  populationHelp.textContent = "Select the institutions used to build benchmark curves and percentile distributions.";
  populationText.append(populationTitle, populationHelp);
  const actionsWrap = document.createElement("div");
  actionsWrap.className = "peer-dialog-actions";
  actionsWrap.append(
    createActionButton("Select all", () => activeActions?.updatePeerJstCodes?.(getDialogPeerCodes())),
    createActionButton("Deselect all", () => activeActions?.updatePeerJstCodes?.([]))
  );
  populationHeader.append(populationText, actionsWrap);
  const list = document.createElement("div");
  list.className = "peer-dialog-list";
  list.dataset.peerDialogList = "";
  populationSection.append(populationHeader, list);
  body.append(displaySection, populationSection);
  dialog.append(header, body);
  overlay.append(dialog);
  document.body.append(overlay);
  activeOverlay = overlay;
  updatePeerSelectionDialog(state);
  close.focus();
}

export function updatePeerSelectionDialog(state) {
  if (!activeOverlay) return;
  const jstOptions = state?.jstOptions ?? [];
  const selectedPeers = new Set(state?.peerJstCodes ?? jstOptions);
  const lead = activeOverlay.querySelector("[data-peer-dialog-lead]");
  if (lead) lead.textContent = `${selectedPeers.size} of ${jstOptions.length} institutions selected.`;
  activeOverlay.querySelectorAll("[data-peer-display-mode]").forEach((button) => {
    const activeMode = state?.peerDisplayMode === "anonymised" ? "anonymised" : "explicit";
    const isActive = button.dataset.peerDisplayMode === activeMode;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-checked", String(isActive));
  });
  const list = activeOverlay.querySelector("[data-peer-dialog-list]");
  if (!list) return;
  const currentCodes = [...list.querySelectorAll("input")].map((input) => input.value);
  if (currentCodes.join("\n") !== jstOptions.join("\n")) list.replaceChildren(...jstOptions.map(createPeerRow));
  list.querySelectorAll("input").forEach((input) => { input.checked = selectedPeers.has(input.value); });
}

export function hidePeerSelectionDialog() {
  activeOverlay?.remove();
  activeOverlay = null;
  activeActions = null;
}

function createDisplayOption(titleText, descriptionText, mode) {
  const button = document.createElement("button");
  button.className = "peer-dialog-display-option";
  button.type = "button";
  button.dataset.peerDisplayMode = mode;
  button.setAttribute("role", "radio");
  const title = document.createElement("span");
  title.textContent = titleText;
  const description = document.createElement("small");
  description.textContent = descriptionText;
  button.append(title, description);
  button.addEventListener("click", () => activeActions?.updatePeerDisplayMode?.(mode));
  return button;
}

function createPeerRow(jstCode) {
  const row = document.createElement("label");
  row.className = "peer-dialog-peer";
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.value = jstCode;
  checkbox.addEventListener("change", () => activeActions?.updatePeerJstCodes?.(
    [...activeOverlay.querySelectorAll(".peer-dialog-peer input:checked")].map((input) => input.value)
  ));
  const label = document.createElement("span");
  label.textContent = jstCode;
  row.append(checkbox, label);
  return row;
}

function createActionButton(label, onClick) {
  const button = document.createElement("button");
  button.className = "peer-dialog-action";
  button.type = "button";
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
}

function getDialogPeerCodes() {
  return [...(activeOverlay?.querySelectorAll(".peer-dialog-peer input") ?? [])].map((input) => input.value);
}
