import {
  COST_OF_RISK_FILTER_ALL,
  buildCostOfRiskRatioDenominatorDetail,
  buildCostOfRiskStageTransferFlowAudit,
  formatCostOfRiskAuditValue,
  formatReferenceQuarterLabel
} from "../data/costOfRisk.js?v=20260716-cost-risk-bs-only-view";
import { showAuditTrailDialog } from "./auditTrailDialog.js?v=20260710-audit-trail";
import { showContextMenu } from "./contextMenu.js?v=20260710-audit-trail";

export function showCostOfRiskStageTransferFlowAuditMenu({
  displayMode,
  event,
  filters,
  flowKey,
  referenceDate,
  state
}) {
  const audit = buildCostOfRiskStageTransferFlowAudit(state, filters, flowKey, referenceDate);
  if (!audit) return;

  showContextMenu([{
    action: () => showAuditTrailDialog(createCostOfRiskStageTransferFlowAuditTrail({
      audit,
      displayMode,
      filters,
      selectedUnit: state.selectedUnit,
      state
    })),
    label: "Where does it come from?"
  }], event);
}

function createCostOfRiskStageTransferFlowAuditTrail({
  audit,
  displayMode,
  filters,
  selectedUnit,
  state
}) {
  const view = buildCostOfRiskStageTransferFlowAuditTrailView(audit, selectedUnit);
  if (displayMode === "ratio" && audit.type !== "stagebox") {
    appendCostOfRiskRatioDenominatorSection(view, audit, state, filters, selectedUnit);
  }
  return view;
}

function getCostOfRiskStageTransferDenominatorFilters(filters) {
  return {
    ...filters,
    stage: COST_OF_RISK_FILTER_ALL
  };
}

// Appends a growth-rate denominator section and turns the headline value
// into the displayed growth-rate value. The audit trail must explain that
// division, not just the raw movement amount.
function appendCostOfRiskRatioDenominatorSection(view, audit, state, filters, selectedUnit) {
  const denominatorReferenceLabel = audit.previousReferenceLabel || "";
  const denominatorDetail = buildCostOfRiskRatioDenominatorDetail(state, getCostOfRiskStageTransferDenominatorFilters(filters), denominatorReferenceLabel, state.selectedJst);
  const denominatorDateLabel = denominatorReferenceLabel ? formatReferenceQuarterLabel(denominatorReferenceLabel) : "previous quarter";
  const formatAmount = (value) => formatCostOfRiskAuditValue(value, "amount", selectedUnit);
  const isRatioAvailable = denominatorDetail.status === "available" && Number.isFinite(denominatorDetail.value) && denominatorDetail.value !== 0;
  const ratioBasisPoints = isRatioAvailable ? (audit.value / denominatorDetail.value) * 10000 : null;
  const rawValueLabel = view.valueLabel;

  view.definition = `${view.definition} Shown in growth-rate mode as this amount divided by the previous-quarter F_18.00 gross carrying amount for the current Instruments / Counterparty filters, all stages combined (${denominatorDetail.label}).`;
  view.valueLabel = isRatioAvailable
    ? `${formatCostOfRiskAuditValue(ratioBasisPoints, "bp")} (${rawValueLabel} raw)`
    : `Growth rate unavailable (${rawValueLabel} raw)`;

  view.sections.push({
    columns: [
      { header: "Component", key: "label" },
      { align: "right", header: "Value", key: "value" }
    ],
    description: `Every F_18.00 cell matching the current Instruments / Counterparty filters, all stages combined, at ${denominatorDateLabel}.`,
    rows: denominatorDetail.components.map((component) => ({
      label: `${component.operator === "subtract" ? "− " : ""}${component.label}`,
      value: Number.isFinite(component.value) ? formatAmount(component.value) : "-"
    })),
    title: `Growth rate denominator - ${denominatorDetail.label} (F_18.00, ${denominatorDateLabel})`,
    totalRow: {
      label: isRatioAvailable ? "Total" : "Total (unavailable)",
      value: isRatioAvailable ? formatAmount(denominatorDetail.value) : "-"
    }
  });

  if (isRatioAvailable) {
    const ratioFormula = `${rawValueLabel} / ${formatAmount(denominatorDetail.value)} = ${formatCostOfRiskAuditValue(ratioBasisPoints, "bp")}`;
    view.formula = view.formula ? `${view.formula}\n${ratioFormula}` : ratioFormula;
  }
}

function buildCostOfRiskStageTransferFlowAuditTrailView(audit, selectedUnit) {
  const subtitle = `Reference date - ${formatReferenceQuarterLabel(audit.referenceLabel)}`;
  const previousLabel = audit.previousReferenceLabel ? formatReferenceQuarterLabel(audit.previousReferenceLabel) : "previous quarter";
  const currentLabel = formatReferenceQuarterLabel(audit.referenceLabel);
  const formatAmount = (value) => formatCostOfRiskAuditValue(value, "amount", selectedUnit);

  if (audit.type === "transfer") {
    return {
      definition: `Sum, over every matching F_12.02 y-axis point, of the quarter-on-quarter change in x=${audit.xCode} (${audit.xLabel}) - the gross carrying amount reported as transferred by this movement during the reference quarter.`,
      sections: [{
        columns: [
          { header: "Code", key: "code" },
          { header: "Description", key: "description" },
          { align: "right", header: `Cumulative @ ${previousLabel}`, key: "previous" },
          { align: "right", header: `Cumulative @ ${currentLabel}`, key: "current" },
          { align: "right", header: "Quarterly movement", key: "quarterly" }
        ],
        rows: audit.components.map((item) => ({
          code: item.code,
          current: formatAmount(item.currentCumulative),
          description: item.description,
          previous: formatAmount(item.previousCumulative),
          quarterly: formatAmount(item.quarterly)
        })),
        title: `F_12.02 - x=${audit.xCode} (${audit.xLabel}) - ${audit.assetLabel}`,
        totalRow: { description: "Total", quarterly: formatAmount(audit.value) }
      }],
      subtitle,
      title: `Stage ${audit.descriptor.from} → Stage ${audit.descriptor.to}`,
      valueLabel: formatAmount(audit.value)
    };
  }

  if (audit.type === "writeoff") {
    return {
      definition: `Sum of absolute quarter-on-quarter movements in F_12.01 x=0080/x=0120 (write-offs), over every matching y-axis point, for Stage ${audit.stage}.`,
      sections: [{
        columns: [
          { header: "x code", key: "xCode" },
          { header: "y code", key: "yCode" },
          { header: "Description", key: "description" },
          { align: "right", header: `Cumulative @ ${previousLabel}`, key: "previous" },
          { align: "right", header: `Cumulative @ ${currentLabel}`, key: "current" },
          { align: "right", header: "Quarterly movement", key: "quarterly" }
        ],
        rows: audit.components.map((item) => ({
          current: formatAmount(item.currentCumulative),
          description: item.description,
          previous: formatAmount(item.previousCumulative),
          quarterly: formatAmount(item.quarterly),
          xCode: `${item.xCode} (${item.xLabel})`,
          yCode: item.yCode
        })),
        title: `F_12.01 - write-off codes - Stage ${audit.stage}`,
        totalRow: { description: "Total write-off", quarterly: formatAmount(audit.value) }
      }],
      subtitle,
      title: `Write-Off - Stage ${audit.stage}`,
      valueLabel: formatAmount(audit.value)
    };
  }

  if (audit.type === "stagebox") {
    return {
      definition: `Gross carrying amount for ${audit.stageLabel}, using the same F_18.00 perimeter as the stage box displayed in the flow diagram.`,
      sections: [{
        columns: [
          { header: "Source", key: "source" },
          { header: "Component", key: "label" },
          { align: "right", header: `Balance @ ${currentLabel}`, key: "value" }
        ],
        rows: audit.components.map((component) => ({
          label: `${component.operator === "subtract" ? "− " : ""}${component.label}`,
          source: component.source,
          value: Number.isFinite(component.value) ? formatAmount(component.value) : "-"
        })),
        title: `${audit.stageLabel} exposure - ${audit.assetLabel}`,
        totalRow: {
          label: "Total",
          value: Number.isFinite(audit.value) ? formatAmount(audit.value) : "-"
        }
      }],
      subtitle,
      title: audit.stageLabel,
      valueLabel: formatAmount(audit.value)
    };
  }

  const exposureSection = {
    columns: [
      { header: "Code", key: "code" },
      { header: "Description", key: "description" },
      { align: "right", header: `Balance @ ${previousLabel}`, key: "previous" },
      { align: "right", header: `Balance @ ${currentLabel}`, key: "current" },
      { align: "right", header: "Delta", key: "delta" }
    ],
    description: "Total exposure balance for this stage, using the same F_18.00 perimeter as the ratio denominator.",
    rows: audit.exposureComponents.map((item) => ({
      code: item.code,
      current: formatAmount(item.currentValue),
      delta: formatAmount(item.delta),
      description: item.description,
      previous: formatAmount(item.previousValue)
    })),
    title: "Exposure variation (F_18.00)",
    totalRow: { description: "Total delta", delta: formatAmount(audit.exposureDelta) }
  };

  const transfersSection = {
    columns: [
      { header: "Code", key: "code" },
      { header: "Movement", key: "label" },
      { header: "Direction", key: "direction" },
      { align: "right", header: "Quarterly amount", key: "quarterly" },
      { align: "right", header: "Contribution to stage", key: "signed" }
    ],
    description: "Transfers already explained by the arrows leaving/entering this stage - subtracted so only the unexplained residual remains.",
    rows: audit.transferComponents.map((item) => ({
      code: item.code,
      direction: item.direction === "in" ? `From Stage ${item.from}` : `To Stage ${item.to}`,
      label: item.label,
      quarterly: formatAmount(item.quarterly),
      signed: formatAmount(item.signedContribution)
    })),
    title: "Net transfers (F_12.02)",
    totalRow: { direction: "Net transfers", signed: formatAmount(audit.netTransfers) }
  };

  const writeOffSection = {
    columns: [
      { header: "x code", key: "xCode" },
      { header: "y code", key: "yCode" },
      { header: "Description", key: "description" },
      { align: "right", header: "Quarterly movement", key: "quarterly" }
    ],
    description: "Write-offs already explained by the write-off arrow for this stage - added back since they reduce the balance without being a stage transfer.",
    rows: audit.writeOffComponents.map((item) => ({
      description: item.description,
      quarterly: formatAmount(item.quarterly),
      xCode: `${item.xCode} (${item.xLabel})`,
      yCode: item.yCode
    })),
    title: "Write-offs (F_12.01)",
    totalRow: { description: "Total write-off", quarterly: formatAmount(audit.writeOffMagnitude) }
  };

  return {
    definition: "The residual stage variation not already explained by inter-stage transfers or write-offs: (exposure delta) − (net transfers) + (write-offs).",
    formula: `${formatAmount(audit.exposureDelta)} − (${formatAmount(audit.netTransfers)}) + ${formatAmount(audit.writeOffMagnitude)} = ${formatAmount(audit.value)}`,
    sections: [exposureSection, transfersSection, writeOffSection],
    subtitle,
    title: `Other movements - Stage ${audit.stage}`,
    valueLabel: formatAmount(audit.value)
  };
}
