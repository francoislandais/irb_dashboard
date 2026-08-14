import { getReferenceColumns } from "../data/core/referenceColumns.js";

let activeDatasetDialog = null;

export function showDatasetDialog(state) {
  hideDatasetDialog();
  activeDatasetDialog = createDatasetDialog(state);
  document.body.append(activeDatasetDialog);
}

export function hideDatasetDialog() {
  activeDatasetDialog?.remove();
  activeDatasetDialog = null;
}

export function buildDatasetUpdateQuery(state) {
  const references = getReferenceColumns(state?.columns ?? []);
  const tableIds = getDatasetTableIds(state?.dataIndexes);
  const jstCodes = [...new Set(state?.jstOptions ?? [])].sort((left, right) => left.localeCompare(right));
  if (references.length === 0 || tableIds.length === 0 || jstCodes.length === 0) return "";

  const requestedReferences = [...references.map((reference) => reference.date), getNextQuarterEnd(references.at(-1).date)];
  const referenceExpressions = requestedReferences.map((date) => {
    const isoDate = formatIsoDate(date);
    return `    MAX(CASE WHEN reference_period = '${isoDate}' THEN value_decimal END) AS ref_${isoDate.replaceAll("-", "_")}`;
  }).join(",\n");
  const jstList = jstCodes.map((code) => `        '${escapeSqlLiteral(code)}'`).join(",\n");
  const tableList = tableIds.map((tableId) => `          '${escapeSqlLiteral(tableId)}'`).join(",\n");
  const firstReference = formatIsoDate(references[0].date);

  return `SELECT
    table_id,
    jst_code,
    x_axis_rc_code,
    y_axis_rc_code,
    z_axis_rc_code,
${referenceExpressions}
FROM (
    SELECT
        regexp_replace(table_id, '\\\\.[A-Za-z]+$', '') AS table_id,
        jst_code,
        x_axis_rc_code,
        y_axis_rc_code,
        z_axis_rc_code,
        reference_period,
        value_decimal
    FROM crp_agora.agora_its_bft_current
    WHERE jst_code IN (
${jstList}
    )
      AND is_group_head = 'Y'
      AND is_highest_cons = 'Y'
      AND reference_period >= '${firstReference}'
      AND regexp_replace(table_id, '\\\\.[A-Za-z]+$', '') IN (
${tableList}
      )
) t
GROUP BY
    table_id,
    jst_code,
    x_axis_rc_code,
    y_axis_rc_code,
    z_axis_rc_code
ORDER BY
    table_id,
    jst_code,
    x_axis_rc_code,
    y_axis_rc_code,
    z_axis_rc_code;`;
}

function createDatasetDialog(state) {
  const overlay = document.createElement("div");
  overlay.className = "audit-trail-overlay dataset-dialog-overlay";
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) hideDatasetDialog();
  });

  const dialog = document.createElement("section");
  dialog.className = "audit-trail-dialog dataset-dialog";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-label", "Dataset information");

  const activeDataset = state?.datasets?.find((dataset) => dataset.id === state.activeDatasetId) ?? null;
  const references = getReferenceColumns(state?.columns ?? []);
  const tableIds = getDatasetTableIds(state?.dataIndexes);
  const query = buildDatasetUpdateQuery(state);

  const header = document.createElement("header");
  header.className = "audit-trail-header";
  const headerText = document.createElement("div");
  const eyebrow = document.createElement("span");
  eyebrow.className = "audit-trail-eyebrow";
  eyebrow.textContent = "Dataset metadata";
  const title = document.createElement("strong");
  title.textContent = activeDataset?.label || state?.fileName || "Dataset";
  const subtitle = document.createElement("span");
  subtitle.className = "audit-trail-subtitle";
  subtitle.textContent = activeDataset ? formatDatasetSource(activeDataset.source) : "No dataset loaded";
  headerText.append(eyebrow, title, subtitle);

  const headerActions = document.createElement("div");
  headerActions.className = "dataset-dialog-header-actions";
  const showQueryButton = document.createElement("button");
  showQueryButton.type = "button";
  showQueryButton.className = "topbar-button dataset-dialog-query-button";
  showQueryButton.textContent = "Voir la requête";
  showQueryButton.disabled = !query;
  const copyButton = document.createElement("button");
  copyButton.type = "button";
  copyButton.className = "topbar-button";
  copyButton.textContent = "Copier la requête";
  copyButton.disabled = !query;
  const closeButton = document.createElement("button");
  closeButton.className = "dataset-dialog-close";
  closeButton.type = "button";
  closeButton.setAttribute("aria-label", "Close");
  closeButton.textContent = "×";
  closeButton.addEventListener("click", hideDatasetDialog);
  headerActions.append(showQueryButton, copyButton, closeButton);
  header.append(headerText, headerActions);

  const body = document.createElement("div");
  body.className = "audit-trail-body dataset-dialog-body";
  body.append(createDatasetSummary(state, references, tableIds));

  const queryPanel = document.createElement("section");
  queryPanel.className = "dataset-dialog-query-panel";
  queryPanel.hidden = true;
  const queryHeader = document.createElement("div");
  queryHeader.className = "dataset-dialog-query-header";
  const queryTitle = document.createElement("strong");
  queryTitle.textContent = "Requête Hive de mise à jour";
  const pre = document.createElement("pre");
  pre.className = "dataset-dialog-query";
  pre.textContent = query;
  copyButton.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(query);
      copyButton.textContent = "Requête copiée";
    } catch {
      copyButton.textContent = "Copie indisponible";
    }
    window.setTimeout(() => { copyButton.textContent = "Copier la requête"; }, 1200);
  });
  queryHeader.append(queryTitle);
  queryPanel.append(queryHeader, pre);
  body.append(queryPanel);

  showQueryButton.addEventListener("click", () => {
    queryPanel.hidden = !queryPanel.hidden;
    showQueryButton.textContent = queryPanel.hidden ? "Voir la requête" : "Masquer la requête";
    if (!queryPanel.hidden) queryPanel.scrollIntoView({ block: "nearest" });
  });

  dialog.append(header, body);
  overlay.append(dialog);
  return overlay;
}

function createDatasetSummary(state, references, tableIds) {
  const summary = document.createElement("div");
  summary.className = "dataset-dialog-summary";
  const activeDataset = state?.datasets?.find((dataset) => dataset.id === state.activeDatasetId) ?? null;
  const nextReference = references.length > 0 ? getNextQuarterEnd(references.at(-1).date) : null;
  [
    ["Fichier", activeDataset?.label || state?.fileName || "Aucun dataset"],
    ["Dimensions", `${Number(state?.rows?.length ?? 0).toLocaleString("fr-FR")} lignes · ${Number(state?.columns?.length ?? 0).toLocaleString("fr-FR")} colonnes`],
    ["Établissements", `${Number(state?.jstOptions?.length ?? 0).toLocaleString("fr-FR")} JST`],
    ["Templates", `${tableIds.length.toLocaleString("fr-FR")} templates`],
    ["Période", references.length > 0 ? `${references[0].label} → ${references.at(-1).label}` : "Non disponible"],
    ["Prochaine échéance demandée", nextReference ? formatDisplayDate(nextReference) : "Non disponible"],
    ["Extraction", formatExtractionTimestamp(state?.extractionTimestamp)]
  ].forEach(([label, value]) => {
    const item = document.createElement("div");
    item.className = "dataset-dialog-summary-item";
    const itemLabel = document.createElement("span");
    itemLabel.textContent = label;
    const itemValue = document.createElement("strong");
    itemValue.textContent = value;
    item.append(itemLabel, itemValue);
    summary.append(item);
  });

  const templateList = document.createElement("div");
  templateList.className = "dataset-dialog-template-list";
  templateList.textContent = tableIds.join(", ") || "Aucun template";
  summary.append(templateList);
  return summary;
}

function getDatasetTableIds(dataIndexes) {
  const tableIds = new Set();
  dataIndexes?.tableIdsByJst?.forEach((ids) => ids?.forEach((tableId) => tableIds.add(tableId)));
  return [...tableIds].sort((left, right) => left.localeCompare(right, "fr", { numeric: true }));
}

function getNextQuarterEnd(date) {
  const nextQuarterMonthIndex = date.getMonth() + 3;
  const year = date.getFullYear() + Math.floor(nextQuarterMonthIndex / 12);
  const month = nextQuarterMonthIndex % 12;
  return new Date(year, month + 1, 0);
}

function formatIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(date) {
  return new Intl.DateTimeFormat("fr-FR").format(date);
}

function formatExtractionTimestamp(value) {
  if (!value) return "Non disponible";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(date);
}

function formatDatasetSource(source) {
  if (source === "embedded") return "Dataset portable embarqué";
  if (source === "local") return "Fichier local";
  if (source === "session") return "Fichier de session";
  return source || "Source non disponible";
}

function escapeSqlLiteral(value) {
  return String(value).replaceAll("'", "''");
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") hideDatasetDialog();
});
