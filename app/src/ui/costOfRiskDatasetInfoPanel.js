import {
  createCostOfRiskAuditInfoSection,
  createCostOfRiskAuditIntroHeader
} from "./costOfRiskAuditPanelNodes.js?v=20260806-cell-selection";

export function createCostOfRiskDatasetInfoPanel(state) {
  const activeDataset = state?.datasets?.find((dataset) => dataset.id === state.activeDatasetId) ?? null;
  const extractionDate = formatCostOfRiskExtractionDate(state?.extractionTimestamp);

  const intro = createCostOfRiskAuditIntroHeader({
    eyebrow: "Dataset metadata",
    lead: activeDataset
      ? "This panel summarises the dataset currently loaded in the application."
      : "No dataset is currently loaded.",
    title: "Dataset"
  });
  intro.append(createCostOfRiskAuditInfoSection("Loaded file", [
    activeDataset?.label || state?.fileName || "No dataset",
    `Source: ${formatCostOfRiskDatasetSource(activeDataset?.source || state?.source)}`,
    `Rows: ${Number(state?.rows?.length ?? 0).toLocaleString("fr-FR")}`,
    `Columns: ${Number(state?.columns?.length ?? 0).toLocaleString("fr-FR")}`
  ]));
  intro.append(createCostOfRiskAuditInfoSection("Extraction", [
    extractionDate
      ? `Extraction date: ${extractionDate}`
      : "Extraction date not available",
    state?.extractionTimestamp ? `Raw timestamp: ${state.extractionTimestamp}` : ""
  ]));

  const hint = document.createElement("p");
  hint.className = "cost-of-risk-audit-intro-hint";
  hint.textContent = "Use the Dataset dropdown in the header to switch to another loaded dataset or add a new one.";
  intro.append(hint);

  return intro;
}

function formatCostOfRiskDatasetSource(source) {
  if (source === "embedded") return "portable embedded dataset";
  if (source === "local") return "local file";
  if (source === "session") return "session file";
  return source || "not available";
}

function formatCostOfRiskExtractionDate(extractionTimestamp) {
  const value = String(extractionTimestamp ?? "").trim();
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    return new Intl.DateTimeFormat("fr-FR", { dateStyle: "short" }).format(date);
  }
  return value;
}
