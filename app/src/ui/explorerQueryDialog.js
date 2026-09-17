let activeDialog = null;

export function showExplorerQueryDialog(buildQuery) {
  hideExplorerQueryDialog();
  activeDialog = createDialog(buildQuery);
  document.body.append(activeDialog);
}

export function hideExplorerQueryDialog() {
  activeDialog?.remove();
  activeDialog = null;
}

function createDialog(buildQuery) {
  const overlay = document.createElement("div");
  overlay.className = "audit-trail-overlay dataset-dialog-overlay";
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) hideExplorerQueryDialog();
  });

  const dialog = document.createElement("section");
  dialog.className = "audit-trail-dialog dataset-dialog";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-label", "Hive query for this selection");

  const header = document.createElement("header");
  header.className = "audit-trail-header";
  const headerText = document.createElement("div");
  const eyebrow = document.createElement("span");
  eyebrow.className = "audit-trail-eyebrow";
  eyebrow.textContent = "Requête Hive";
  const title = document.createElement("strong");
  title.textContent = "Requête générée";
  headerText.append(eyebrow, title);

  const closeButton = document.createElement("button");
  closeButton.className = "dataset-dialog-close";
  closeButton.type = "button";
  closeButton.setAttribute("aria-label", "Close");
  closeButton.textContent = "×";
  closeButton.addEventListener("click", hideExplorerQueryDialog);
  header.append(headerText);

  const body = document.createElement("div");
  body.className = "audit-trail-body dataset-dialog-body";

  const dateFilterLabel = document.createElement("label");
  dateFilterLabel.className = "explorer-query-dialog-option";
  const dateFilterCheckbox = document.createElement("input");
  dateFilterCheckbox.type = "checkbox";
  dateFilterCheckbox.checked = true;
  dateFilterLabel.append(dateFilterCheckbox, document.createTextNode(" Filtrer sur les dates de référence sélectionnées"));

  const pre = document.createElement("pre");
  pre.className = "dataset-dialog-query explorer-query-dialog-sql";

  const copyButton = document.createElement("button");
  copyButton.type = "button";
  copyButton.className = "explorer-query-copy-icon";
  const copyIcon = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></svg>';
  const setCopyStatus = (label, icon = copyIcon) => {
    copyButton.innerHTML = icon;
    copyButton.title = label;
    copyButton.setAttribute("aria-label", label);
  };
  setCopyStatus("Copier la requête dans le presse-papiers");
  header.append(closeButton);
  const queryArea = document.createElement("div");
  queryArea.className = "explorer-query-code-area";
  queryArea.append(pre, copyButton);

  const renderQuery = () => {
    const sql = buildQuery({ includeDateFilter: dateFilterCheckbox.checked });
    pre.textContent = sql || "Aucun point de données n'a encore été ajouté à cette requête.";
    copyButton.disabled = !sql;
  };

  dateFilterCheckbox.addEventListener("change", renderQuery);
  copyButton.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(pre.textContent);
      setCopyStatus("Requête copiée", '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>');
    } catch {
      setCopyStatus("Copie indisponible", "!");
    }
    window.setTimeout(() => setCopyStatus("Copier la requête dans le presse-papiers"), 1600);
  });

  renderQuery();

  body.append(dateFilterLabel, queryArea);
  dialog.append(header, body);
  overlay.append(dialog);
  return overlay;
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") hideExplorerQueryDialog();
});
