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
  header.append(headerText, closeButton);

  const body = document.createElement("div");
  body.className = "audit-trail-body dataset-dialog-body";

  const dateFilterLabel = document.createElement("label");
  dateFilterLabel.className = "explorer-query-dialog-option";
  const dateFilterCheckbox = document.createElement("input");
  dateFilterCheckbox.type = "checkbox";
  dateFilterCheckbox.checked = true;
  dateFilterLabel.append(dateFilterCheckbox, document.createTextNode(" Filtrer sur la date de référence sélectionnée"));

  const pre = document.createElement("pre");
  pre.className = "dataset-dialog-query explorer-query-dialog-sql";

  const copyButton = document.createElement("button");
  copyButton.type = "button";
  copyButton.className = "topbar-button";
  copyButton.textContent = "Copier la requête";

  const renderQuery = () => {
    const sql = buildQuery({ includeDateFilter: dateFilterCheckbox.checked });
    pre.textContent = sql || "Aucun point de données n'a encore été ajouté à cette requête.";
    copyButton.disabled = !sql;
  };

  dateFilterCheckbox.addEventListener("change", renderQuery);
  copyButton.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(pre.textContent);
      copyButton.textContent = "Requête copiée";
    } catch {
      copyButton.textContent = "Copie indisponible";
    }
    window.setTimeout(() => { copyButton.textContent = "Copier la requête"; }, 1200);
  });

  renderQuery();

  body.append(dateFilterLabel, pre, copyButton);
  dialog.append(header, body);
  overlay.append(dialog);
  return overlay;
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") hideExplorerQueryDialog();
});
