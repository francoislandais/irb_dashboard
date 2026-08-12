import { getRequiredAxisColumnIndexes as getRequiredIndexes } from "../core/axisColumns.js";
import { getReferenceColumns } from "../core/referenceColumns.js";
import {
  COST_OF_RISK_DENOMINATOR_CASH_Y_CODE,
  COST_OF_RISK_STAGE_BOX_TABLE_ID,
  COST_OF_RISK_STAGE_TRANSFER_FLOW_MOVEMENTS,
  COST_OF_RISK_STAGE_TRANSFER_MOVEMENTS,
  COST_OF_RISK_STAGE_TRANSFER_STAGE_LABELS,
  COST_OF_RISK_STAGE_TRANSFER_TABLE_ID,
  COST_OF_RISK_TABLE_ID,
  COST_OF_RISK_WRITE_OFF_X_CODES
} from "./definitions.js";
import {
  COST_OF_RISK_PERIOD_MODE_QUARTERLY,
  addSeriesValues,
  buildCostOfRiskRatioDenominatorDetail,
  computeCostOfRiskStageExposureLevels,
  computeCostOfRiskTransferFlowPeriodSeries,
  createEmptySeries,
  formatReferenceQuarterLabel,
  getCostOfRiskBalanceSheetAllowanceDescriptors,
  getCostOfRiskDenominatorComposition,
  getCostOfRiskMovementDenominator,
  getCostOfRiskPeerJstCodes,
  getCostOfRiskRatioDenominatorLabel,
  getCostOfRiskRatioDenominatorReferenceIndex,
  getCostOfRiskRatioDenominatorSeries,
  getCostOfRiskReferenceIndex,
  getCostOfRiskStageScopedFilters,
  getCostOfRiskStageTransferDenominatorFilters,
  getCostOfRiskStageTransferXAxisLabelMap,
  getCostOfRiskStageTransferYSelection,
  getCostOfRiskXAxisLabelMap,
  getMappingDescription,
  getPointSeriesValues,
  isCostOfRiskAggregationPoint,
  matchesCostOfRiskFilterDescriptor,
  normalizeCostOfRiskFilters,
  normalizeCostOfRiskPeriodMode,
  resolveCostOfRiskDenominatorCellSeries,
  resolveCostOfRiskPeriodSeries
} from "./core.js";

export function buildCostOfRiskStageTransferWaterfall(
  state,
  stage = "3",
  referenceDate = "",
  filters = {},
  periodMode = COST_OF_RISK_PERIOD_MODE_QUARTERLY
) {
  const indexes = getRequiredIndexes(state.columns);
  const referenceColumns = getReferenceColumns(state.columns);
  const selectedStage = COST_OF_RISK_STAGE_TRANSFER_MOVEMENTS[stage] ? stage : "3";
  const xLabels = getCostOfRiskStageTransferXAxisLabelMap(state);
  const ySelection = getCostOfRiskStageTransferYSelection(state, filters);
  const referenceIndex = getCostOfRiskReferenceIndex(referenceColumns, referenceDate);
  const selectedReference = referenceColumns[referenceIndex] ?? null;

  if (!indexes || !state.selectedJst || !selectedReference) {
    return {
      assetLabel: ySelection.label,
      points: [],
      referenceDate: "",
      stage: selectedStage,
      status: "No F_12.02 stage transfer data is available."
    };
  }

  if (ySelection.codes.length === 0) {
    return {
      assetLabel: ySelection.label,
      points: [],
      referenceDate: selectedReference.label,
      stage: selectedStage,
      status: "No matching F_12.02 Y-axis point is available for the selected filters."
    };
  }

  return {
    assetLabel: ySelection.label,
    globalVariation: buildCostOfRiskStageGlobalVariation(state, indexes, referenceColumns, filters, selectedStage, referenceIndex),
    points: COST_OF_RISK_STAGE_TRANSFER_MOVEMENTS[selectedStage].map((movement) => {
      const rawValue = ySelection.codes.reduce((total, yCode) => {
        const series = getPointSeriesValues(state, indexes, referenceColumns, COST_OF_RISK_STAGE_TRANSFER_TABLE_ID, {
          xCode: movement.code,
          yCode,
          zCode: ""
        }, state.selectedJst);
        const periodSeries = resolveCostOfRiskPeriodSeries(referenceColumns, series, periodMode);
        return total + (periodSeries[referenceIndex] ?? 0);
      }, 0);

      return {
        code: movement.code,
        label: xLabels.get(movement.code) ?? movement.code,
        rawValue,
        sign: movement.sign,
        value: rawValue * movement.sign
      };
    }),
    referenceDate: selectedReference.label,
    stage: selectedStage,
    status: ""
  };
}

export function buildCostOfRiskStageTransferFlowDiagram(
  state,
  referenceDate = "",
  filters = {},
  periodMode = COST_OF_RISK_PERIOD_MODE_QUARTERLY
) {
  const indexes = getRequiredIndexes(state.columns);
  const referenceColumns = getReferenceColumns(state.columns);
  const xLabels = getCostOfRiskStageTransferXAxisLabelMap(state);
  const ySelection = getCostOfRiskStageTransferYSelection(state, filters);
  const referenceIndex = getCostOfRiskReferenceIndex(referenceColumns, referenceDate);
  const selectedReference = referenceColumns[referenceIndex] ?? null;

  if (!indexes || !state.selectedJst || !selectedReference) {
    return {
      assetLabel: ySelection.label,
      flows: [],
      ratioDenominator: null,
      referenceDate: "",
      residuals: [],
      stageBalances: [],
      status: "No F_12.02 stage transfer data is available.",
      writeOffs: []
    };
  }

  if (ySelection.codes.length === 0) {
    return {
      assetLabel: ySelection.label,
      flows: [],
      ratioDenominator: null,
      referenceDate: selectedReference.label,
      residuals: [],
      stageBalances: [],
      status: "No matching F_12.02 Y-axis point is available for the selected filters.",
      writeOffs: []
    };
  }

  const flowValues = new Map(COST_OF_RISK_STAGE_TRANSFER_FLOW_MOVEMENTS.map((movement) => {
    const value = ySelection.codes.reduce((total, yCode) => {
      const series = getPointSeriesValues(state, indexes, referenceColumns, COST_OF_RISK_STAGE_TRANSFER_TABLE_ID, {
        xCode: movement.code,
        yCode,
        zCode: ""
      }, state.selectedJst);
      const periodSeries = resolveCostOfRiskPeriodSeries(referenceColumns, series, periodMode);
      return total + (periodSeries[referenceIndex] ?? 0);
    }, 0);

    return [movement.code, value];
  }));

  const stageVariations = ["1", "2", "3"].map((stage) => (
    buildCostOfRiskStageGlobalVariation(state, indexes, referenceColumns, filters, stage, referenceIndex)
  ));
  const ratioDenominatorSeries = getCostOfRiskRatioDenominatorSeries(
    state,
    indexes,
    referenceColumns,
    state.selectedJst,
    getCostOfRiskStageTransferDenominatorFilters(filters)
  );
  const ratioDenominator = getCostOfRiskMovementDenominator(ratioDenominatorSeries, referenceColumns, referenceIndex, periodMode);
  const stageBalanceRatioDenominator = ratioDenominatorSeries[referenceIndex] ?? null;

  const netTransfersByStage = new Map([["1", 0], ["2", 0], ["3", 0]]);
  COST_OF_RISK_STAGE_TRANSFER_FLOW_MOVEMENTS.forEach((movement) => {
    const value = flowValues.get(movement.code) ?? 0;
    netTransfersByStage.set(movement.from, (netTransfersByStage.get(movement.from) ?? 0) - value);
    netTransfersByStage.set(movement.to, (netTransfersByStage.get(movement.to) ?? 0) + value);
  });

  const writeOffsByStage = buildCostOfRiskWriteOffByStage(state, indexes, referenceColumns, filters, referenceIndex, periodMode);
  const writeOffMagnitudeByStage = new Map(writeOffsByStage.map((item) => [item.stage, item.magnitude]));

  return {
    assetLabel: ySelection.label,
    flows: COST_OF_RISK_STAGE_TRANSFER_FLOW_MOVEMENTS.map((movement) => ({
      ...movement,
      label: xLabels.get(movement.code) ?? movement.code,
      value: flowValues.get(movement.code) ?? null
    })),
    ratioDenominator,
    referenceDate: selectedReference.label,
    residuals: stageVariations.map((variation, index) => {
      const stage = String(index + 1);
      const delta = variation.value;
      const netTransfers = netTransfersByStage.get(stage) ?? 0;
      const writeOffMagnitude = writeOffMagnitudeByStage.get(stage) ?? 0;
      const rawResidual = Number.isFinite(delta) ? delta - netTransfers : null;
      return {
        delta,
        label: `Other Stage ${stage} movements`,
        netTransfers,
        stage,
        value: Number.isFinite(rawResidual) ? rawResidual + writeOffMagnitude : null
      };
    }),
    stageBalances: stageVariations.map((variation, index) => ({
      label: COST_OF_RISK_STAGE_TRANSFER_STAGE_LABELS[String(index + 1)] ?? `Stage ${index + 1}`,
      ratioDenominator: stageBalanceRatioDenominator,
      stage: String(index + 1),
      value: variation.currentValue ?? null
    })),
    status: "",
    writeOffs: writeOffsByStage.map(({ magnitude, stage }) => ({
      label: `Write-Off Stage ${stage}`,
      stage,
      value: magnitude > 0 ? -magnitude : 0
    }))
  };
}

// Given the same flowKey used to select an arrow in the stage transfer flow
// diagram, reconstructs every raw data point (code, description,
// previous/current cumulative value, quarterly movement) that contributed to
// the displayed value, for the currently selected reference date. Feeds the
// stage transfer panel audit trail below.
function buildCostOfRiskStageTransferFlowAudit(
  state,
  filters = {},
  flowKey,
  referenceDate = "",
  periodMode = COST_OF_RISK_PERIOD_MODE_QUARTERLY
) {
  const indexes = getRequiredIndexes(state.columns);
  const referenceColumns = getReferenceColumns(state.columns);
  const descriptor = parseCostOfRiskFlowKey(flowKey);
  const referenceIndex = getCostOfRiskReferenceIndex(referenceColumns, referenceDate);
  const selectedReference = referenceColumns[referenceIndex] ?? null;
  const previousReference = referenceColumns[referenceIndex - 1] ?? null;

  if (!indexes || !descriptor || !state.selectedJst || !selectedReference) return null;

  if (descriptor.type === "transfer") {
    return buildCostOfRiskTransferFlowAudit(state, indexes, referenceColumns, filters, descriptor, referenceIndex, selectedReference, previousReference, periodMode);
  }
  if (descriptor.type === "net") {
    return buildCostOfRiskNetTransferFlowAudit(state, indexes, referenceColumns, filters, descriptor, referenceIndex, selectedReference, previousReference, periodMode);
  }
  if (descriptor.type === "stagebox") {
    return buildCostOfRiskStageBoxFlowAudit(state, indexes, referenceColumns, filters, descriptor, referenceIndex, selectedReference);
  }
  if (descriptor.type === "writeoff") {
    return buildCostOfRiskWriteOffFlowAudit(state, indexes, referenceColumns, filters, descriptor, referenceIndex, selectedReference, previousReference, periodMode);
  }
  return buildCostOfRiskOtherMovementsFlowAudit(state, indexes, referenceColumns, filters, descriptor, referenceIndex, selectedReference, previousReference, periodMode);
}

export function buildCostOfRiskStageTransferPanelAudit(
  state,
  filters = {},
  flowKey,
  referenceDate = "",
  periodMode = COST_OF_RISK_PERIOD_MODE_QUARTERLY
) {
  const audit = buildCostOfRiskStageTransferFlowAudit(state, filters, flowKey, referenceDate, periodMode);
  if (!audit) return { dates: [], rows: [], title: "Stage Transfer" };

  const referenceColumns = getReferenceColumns(state.columns);
  const selectedValue = Number.isFinite(audit.value) ? audit.value : null;
  let relativeValue = null;
  const selectedRows = buildCostOfRiskStageTransferSelectedScopeRows(audit);
  const selectedScopeRows = selectedRows.length > 0
    ? selectedRows
    : [{
      label: "No lower-level component available",
      section: "Selected scope",
      source: getCostOfRiskStageTransferAuditSource(audit),
      type: "amount",
      values: [selectedValue]
    }];
  const rows = [
    {
      label: "Displayed value",
      section: "Selected scope",
      source: getCostOfRiskStageTransferAuditSource(audit),
      type: "amount",
      values: [selectedValue]
    },
    ...selectedScopeRows
  ];

  if (audit.type !== "stagebox") {
    const referenceIndex = getCostOfRiskReferenceIndex(referenceColumns, audit.referenceLabel);
    const denominatorReferenceIndex = getCostOfRiskRatioDenominatorReferenceIndex(referenceColumns, referenceIndex, periodMode);
    const denominatorReferenceLabel = denominatorReferenceIndex >= 0
      ? referenceColumns[denominatorReferenceIndex]?.label ?? ""
      : audit.previousReferenceLabel;
    const denominatorPeriodLabel = getCostOfRiskRatioDenominatorLabel(periodMode);
    const denominatorDetail = buildCostOfRiskRatioDenominatorDetail(
      state,
      getCostOfRiskStageTransferDenominatorFilters(filters),
      denominatorReferenceLabel,
      state.selectedJst
    );
    const denominatorValue = denominatorDetail.status === "available" ? denominatorDetail.value : null;
    relativeValue = Number.isFinite(selectedValue) && Number.isFinite(denominatorValue) && denominatorValue !== 0
      ? (selectedValue / denominatorValue) * 10000
      : null;

    rows.push(
      {
        label: "Denominator total",
        section: "Denominator",
        source: `${denominatorDetail.label} / ${denominatorPeriodLabel} (${formatReferenceQuarterLabel(denominatorReferenceLabel)})`,
        type: "amount",
        values: [denominatorValue]
      },
      ...denominatorDetail.components.map((component) => ({
        label: `${component.operator === "subtract" ? "− " : ""}${component.label}`,
        section: "Denominator",
        source: component.source ?? denominatorDetail.sourceTable,
        type: "amount",
        values: [Number.isFinite(component.value) ? component.value : null]
      })),
      {
        denominatorValues: [denominatorValue],
        label: "Relative transfer",
        numeratorValues: [selectedValue],
        section: "Calculation",
        source: `Displayed value / ${denominatorPeriodLabel} denominator`,
        type: "bp",
        values: [relativeValue]
      }
    );
  }

  return {
    dates: [{ date: null, label: audit.referenceLabel }],
    hero: {
      amount: {
        type: "amount",
        value: Number.isFinite(selectedValue) ? Math.abs(selectedValue) : null
      },
      ratio: {
        type: "bp",
        value: Number.isFinite(relativeValue) ? Math.abs(relativeValue) : null
      }
    },
    rows,
    title: getCostOfRiskStageTransferAuditTitle(audit)
  };
}

export function buildCostOfRiskStageTransferRelativeDenominatorDetail(
  state,
  filters = {},
  referenceDate = "",
  periodMode = COST_OF_RISK_PERIOD_MODE_QUARTERLY
) {
  const indexes = getRequiredIndexes(state.columns);
  const referenceColumns = getReferenceColumns(state.columns);
  const normalizedPeriodMode = normalizeCostOfRiskPeriodMode(periodMode);
  const denominatorFilters = getCostOfRiskStageTransferDenominatorFilters(filters);
  const referenceIndex = getCostOfRiskReferenceIndex(referenceColumns, referenceDate);
  const targetReference = referenceColumns[referenceIndex] ?? null;
  const denominatorReferenceIndex = getCostOfRiskRatioDenominatorReferenceIndex(
    referenceColumns,
    referenceIndex,
    normalizedPeriodMode
  );
  const denominatorReference = denominatorReferenceIndex >= 0
    ? referenceColumns[denominatorReferenceIndex] ?? null
    : null;

  if (!indexes || !state.selectedJst || !targetReference || !denominatorReference) {
    return {
      components: [],
      denominatorLabel: getCostOfRiskDenominatorComposition(state, denominatorFilters).label,
      periodMode: normalizedPeriodMode,
      referenceDate: targetReference?.label ?? "",
      ruleLabel: getCostOfRiskRatioDenominatorLabel(normalizedPeriodMode),
      sourceTable: "F_18.00",
      status: "unavailable",
      value: null,
      valueReferenceDate: denominatorReference?.label ?? ""
    };
  }

  const detail = buildCostOfRiskRatioDenominatorDetail(
    state,
    denominatorFilters,
    denominatorReference.label,
    state.selectedJst
  );

  return {
    components: detail.components,
    denominatorLabel: detail.label,
    periodMode: normalizedPeriodMode,
    referenceDate: targetReference.label,
    ruleLabel: getCostOfRiskRatioDenominatorLabel(normalizedPeriodMode),
    sourceTable: detail.sourceTable,
    status: detail.status,
    value: detail.value,
    valueReferenceDate: denominatorReference.label
  };
}

function buildCostOfRiskStageTransferSelectedScopeRows(audit) {
  if (audit.type === "transfer") {
    return audit.components.map((component) => ({
      label: formatCostOfRiskStageTransferAuditComponentLabel(component.description),
      section: "Selected scope",
      source: `${audit.tableId} / x ${audit.xCode} / y ${component.code}`,
      type: "amount",
      values: [component.quarterly]
    }));
  }

  if (audit.type === "net") {
    return audit.components.map((component) => ({
      label: `${component.sign < 0 ? "− " : ""}${component.label} / ${formatCostOfRiskStageTransferAuditComponentLabel(component.description)}`,
      section: "Selected scope",
      source: `${audit.tableId} / x ${component.xCode} / y ${component.yCode}`,
      type: "amount",
      values: [Number.isFinite(component.quarterly) ? component.sign * component.quarterly : null]
    }));
  }

  if (audit.type === "stagebox") {
    return audit.components.map((component) => ({
      label: `${component.operator === "subtract" ? "− " : ""}${formatCostOfRiskStageTransferAuditComponentLabel(component.label)}`,
      section: "Selected scope",
      source: component.source,
      type: "amount",
      values: [Number.isFinite(component.value) ? (component.operator === "subtract" ? -component.value : component.value) : null]
    }));
  }

  if (audit.type === "writeoff") {
    return audit.components.map((component) => ({
      label: `${component.xLabel} / ${component.description}`,
      section: "Selected scope",
      source: `${audit.tableId} / x ${component.xCode} / y ${component.yCode}`,
      type: "amount",
      values: [Number.isFinite(component.quarterly) ? -Math.abs(component.quarterly) : null]
    }));
  }

  return [
    {
      label: "Exposure variation",
      section: "Selected scope",
      source: "F_18.00 / current stage exposure delta",
      type: "amount",
      values: [audit.exposureDelta]
    },
    {
      label: "Less net transfers",
      section: "Selected scope",
      source: "F_12.02 / net transfers in and out of the stage",
      type: "amount",
      values: [Number.isFinite(audit.netTransfers) ? -audit.netTransfers : null]
    },
    {
      label: "Add write-offs",
      section: "Selected scope",
      source: "F_12.01 / write-off movements",
      type: "amount",
      values: [audit.writeOffMagnitude]
    }
  ];
}

function getCostOfRiskStageTransferAuditSource(audit) {
  if (audit.type === "transfer") return `${audit.tableId} / x ${audit.xCode} / selected Y scope`;
  if (audit.type === "net") return `${audit.tableId} / net Stage ${audit.from} to Stage ${audit.to}`;
  if (audit.type === "stagebox") return `${audit.tableId} / ${audit.stageLabel}`;
  if (audit.type === "writeoff") return `${audit.tableId} / write-off codes / Stage ${audit.stage}`;
  return `F_18.00 and F_12.02 / Stage ${audit.stage}`;
}

function formatCostOfRiskStageTransferAuditComponentLabel(label) {
  return String(label ?? "")
    .replace(/^Total debt instruments\s*\/\s*/i, "")
    .replace(/^Debt instruments other than held for trading\s*\/\s*/i, "")
    .replace(/^Financial assets at amortised cost\s*\/\s*/i, "")
    .replace(/^Financial assets at fair value through other comprehensive income\s*\/\s*/i, "")
    .replace(/^Non-trading non-derivative financial assets measured at fair value through profit or loss\s*\/\s*/i, "");
}

function getCostOfRiskStageTransferAuditTitle(audit) {
  if (audit.type === "transfer") return `${audit.xCode} - ${audit.xLabel}`;
  if (audit.type === "net") return `Net Stage ${audit.from} → Stage ${audit.to}`;
  if (audit.type === "stagebox") return audit.stageLabel;
  if (audit.type === "writeoff") return `Write-off - Stage ${audit.stage}`;
  return `Other movements - Stage ${audit.stage}`;
}

function buildCostOfRiskTransferFlowAudit(state, indexes, referenceColumns, filters, descriptor, referenceIndex, selectedReference, previousReference, periodMode = COST_OF_RISK_PERIOD_MODE_QUARTERLY) {
  const ySelection = getCostOfRiskStageTransferYSelection(state, filters);
  const xLabels = getCostOfRiskStageTransferXAxisLabelMap(state);

  const components = ySelection.codes.map((yCode) => {
    const raw = getPointSeriesValues(state, indexes, referenceColumns, COST_OF_RISK_STAGE_TRANSFER_TABLE_ID, {
      xCode: descriptor.code,
      yCode,
      zCode: ""
    }, state.selectedJst);
    const currentCumulative = raw[referenceIndex] ?? null;
    const previousCumulative = raw[referenceIndex - 1] ?? null;
    const quarterly = resolveCostOfRiskPeriodSeries(referenceColumns, raw, periodMode)[referenceIndex] ?? null;

    return {
      code: yCode,
      currentCumulative,
      description: getMappingDescription(state, COST_OF_RISK_STAGE_TRANSFER_TABLE_ID, "y_axis_rc_code", yCode),
      previousCumulative,
      quarterly
    };
  });

  return {
    assetLabel: ySelection.label,
    components,
    descriptor,
    previousReferenceLabel: previousReference?.label ?? "",
    referenceLabel: selectedReference.label,
    tableId: COST_OF_RISK_STAGE_TRANSFER_TABLE_ID,
    type: "transfer",
    value: components.reduce((total, item) => total + (item.quarterly ?? 0), 0),
    xCode: descriptor.code,
    xLabel: xLabels.get(descriptor.code) ?? descriptor.code
  };
}

function buildCostOfRiskNetTransferFlowAudit(state, indexes, referenceColumns, filters, descriptor, referenceIndex, selectedReference, previousReference, periodMode = COST_OF_RISK_PERIOD_MODE_QUARTERLY) {
  const ySelection = getCostOfRiskStageTransferYSelection(state, filters);
  const xLabels = getCostOfRiskStageTransferXAxisLabelMap(state);
  const movements = [
    { ...descriptor.forwardMovement, sign: 1 },
    { ...descriptor.reverseMovement, sign: -1 }
  ];

  const components = movements.flatMap((movement) => (
    ySelection.codes.map((yCode) => {
      const raw = getPointSeriesValues(state, indexes, referenceColumns, COST_OF_RISK_STAGE_TRANSFER_TABLE_ID, {
        xCode: movement.code,
        yCode,
        zCode: ""
      }, state.selectedJst);
      const quarterly = resolveCostOfRiskPeriodSeries(referenceColumns, raw, periodMode)[referenceIndex] ?? null;

      return {
        description: getMappingDescription(state, COST_OF_RISK_STAGE_TRANSFER_TABLE_ID, "y_axis_rc_code", yCode),
        label: xLabels.get(movement.code) ?? `Stage ${movement.from} to Stage ${movement.to}`,
        quarterly,
        sign: movement.sign,
        xCode: movement.code,
        yCode
      };
    })
  ));

  return {
    assetLabel: ySelection.label,
    components,
    descriptor,
    from: descriptor.from,
    previousReferenceLabel: previousReference?.label ?? "",
    referenceLabel: selectedReference.label,
    tableId: COST_OF_RISK_STAGE_TRANSFER_TABLE_ID,
    to: descriptor.to,
    type: "net",
    value: components.reduce((total, item) => total + (item.sign * (item.quarterly ?? 0)), 0)
  };
}

function buildCostOfRiskWriteOffFlowAudit(state, indexes, referenceColumns, filters, descriptor, referenceIndex, selectedReference, previousReference, periodMode = COST_OF_RISK_PERIOD_MODE_QUARTERLY) {
  const { points } = getCostOfRiskWriteOffPointsByStage(state, filters).find((item) => item.stage === descriptor.stage) ?? { points: [] };
  const xLabels = getCostOfRiskXAxisLabelMap(state);

  const components = COST_OF_RISK_WRITE_OFF_X_CODES.flatMap((xCode) => (
    points.map((yCode) => {
      const raw = getPointSeriesValues(state, indexes, referenceColumns, COST_OF_RISK_TABLE_ID, {
        xCode,
        yCode,
        zCode: ""
      }, state.selectedJst);
      const currentCumulative = raw[referenceIndex] ?? null;
      const previousCumulative = raw[referenceIndex - 1] ?? null;
      const quarterly = resolveCostOfRiskPeriodSeries(referenceColumns, raw, periodMode)[referenceIndex] ?? null;

      return {
        currentCumulative,
        description: getMappingDescription(state, COST_OF_RISK_TABLE_ID, "y_axis_rc_code", yCode),
        previousCumulative,
        quarterly,
        xCode,
        xLabel: xLabels.get(xCode) ?? xCode,
        yCode
      };
    })
  ));

  const magnitude = components.reduce((total, item) => total + Math.abs(item.quarterly ?? 0), 0);

  return {
    components,
    descriptor,
    previousReferenceLabel: previousReference?.label ?? "",
    referenceLabel: selectedReference.label,
    stage: descriptor.stage,
    tableId: COST_OF_RISK_TABLE_ID,
    type: "writeoff",
    value: magnitude > 0 ? -magnitude : 0
  };
}

function buildCostOfRiskOtherMovementsFlowAudit(state, indexes, referenceColumns, filters, descriptor, referenceIndex, selectedReference, previousReference, periodMode = COST_OF_RISK_PERIOD_MODE_QUARTERLY) {
  const exposureComponents = buildCostOfRiskStageExposureComponents(state, indexes, referenceColumns, filters, descriptor.stage, referenceIndex);
  const exposureDelta = exposureComponents.reduce((total, item) => total + (item.delta ?? 0), 0);

  const ySelection = getCostOfRiskStageTransferYSelection(state, filters);
  const xLabels = getCostOfRiskStageTransferXAxisLabelMap(state);
  const transferComponents = COST_OF_RISK_STAGE_TRANSFER_FLOW_MOVEMENTS
    .filter((movement) => movement.from === descriptor.stage || movement.to === descriptor.stage)
    .map((movement) => {
      const raw = createEmptySeries(referenceColumns.length);
      ySelection.codes.forEach((yCode) => {
        addSeriesValues(raw, getPointSeriesValues(state, indexes, referenceColumns, COST_OF_RISK_STAGE_TRANSFER_TABLE_ID, {
          xCode: movement.code,
          yCode,
          zCode: ""
        }, state.selectedJst));
      });
      const quarterly = resolveCostOfRiskPeriodSeries(referenceColumns, raw, periodMode)[referenceIndex] ?? 0;
      const direction = movement.from === descriptor.stage ? "out" : "in";

      return {
        code: movement.code,
        direction,
        from: movement.from,
        label: xLabels.get(movement.code) ?? movement.code,
        quarterly,
        signedContribution: direction === "out" ? -quarterly : quarterly,
        to: movement.to
      };
    });
  const netTransfers = transferComponents.reduce((total, item) => total + item.signedContribution, 0);

  const writeOffAudit = buildCostOfRiskWriteOffFlowAudit(state, indexes, referenceColumns, filters, { stage: descriptor.stage, type: "writeoff" }, referenceIndex, selectedReference, previousReference, periodMode);
  const writeOffMagnitude = Math.abs(writeOffAudit.value ?? 0);

  return {
    descriptor,
    exposureComponents,
    exposureDelta,
    netTransfers,
    previousReferenceLabel: previousReference?.label ?? "",
    referenceLabel: selectedReference.label,
    stage: descriptor.stage,
    transferComponents,
    type: "other",
    value: Number.isFinite(exposureDelta) ? exposureDelta - netTransfers + writeOffMagnitude : null,
    writeOffComponents: writeOffAudit.components,
    writeOffMagnitude
  };
}

function buildCostOfRiskStageBoxFlowAudit(state, indexes, referenceColumns, filters, descriptor, referenceIndex, selectedReference) {
  const stageFilters = getCostOfRiskStageScopedFilters(filters, descriptor.stage);
  const composition = getCostOfRiskDenominatorComposition(state, stageFilters);
  const components = [
    ...composition.xCodes.flatMap((xCode) => composition.yCodes.map((yCode) => {
      const value = resolveCostOfRiskDenominatorCellSeries(state, indexes, referenceColumns, state.selectedJst, xCode, yCode)[referenceIndex] ?? null;
      return {
        label: `${getMappingDescription(state, COST_OF_RISK_STAGE_BOX_TABLE_ID, "y_axis_rc_code", yCode)} (x=${xCode})`,
        operator: "add",
        source: `${COST_OF_RISK_STAGE_BOX_TABLE_ID} / x ${xCode} / y ${yCode}`,
        value
      };
    })),
    ...(composition.excludeCash ? composition.xCodes.map((xCode) => {
      const value = resolveCostOfRiskDenominatorCellSeries(state, indexes, referenceColumns, state.selectedJst, xCode, COST_OF_RISK_DENOMINATOR_CASH_Y_CODE)[referenceIndex] ?? null;
      return {
        label: `Cash balances at central banks and other demand deposits (x=${xCode})`,
        operator: "subtract",
        source: `${COST_OF_RISK_STAGE_BOX_TABLE_ID} / x ${xCode} / y ${COST_OF_RISK_DENOMINATOR_CASH_Y_CODE}`,
        value
      };
    }) : [])
  ];
  const hasAddComponent = components.some((component) => component.operator === "add" && Number.isFinite(component.value));
  const value = hasAddComponent
    ? components.reduce((total, component) => {
      if (!Number.isFinite(component.value)) return total;
      return total + (component.operator === "subtract" ? -component.value : component.value);
    }, 0)
    : null;

  return {
    assetLabel: composition.label,
    components,
    descriptor,
    referenceLabel: selectedReference.label,
    stage: descriptor.stage,
    stageLabel: COST_OF_RISK_STAGE_TRANSFER_STAGE_LABELS[descriptor.stage] ?? `Stage ${descriptor.stage}`,
    tableId: COST_OF_RISK_STAGE_BOX_TABLE_ID,
    type: "stagebox",
    value
  };
}

export function buildCostOfRiskStageTransferFlowTimeSeries(
  state,
  filters,
  flowKey,
  periodMode = COST_OF_RISK_PERIOD_MODE_QUARTERLY
) {
  const indexes = getRequiredIndexes(state.columns);
  const referenceColumns = getReferenceColumns(state.columns);
  const descriptor = parseCostOfRiskFlowKey(flowKey);

  if (!indexes || !descriptor || referenceColumns.length === 0) {
    return { benchmarkSeries: [], label: "", status: "No F_12.02 stage transfer data is available." };
  }

  const ySelection = getCostOfRiskStageTransferYSelection(state, filters);

  return {
    benchmarkSeries: getCostOfRiskPeerJstCodes(state).map((jstCode) => ({
      jstCode,
      points: buildCostOfRiskFlowPointsForJst(state, indexes, referenceColumns, descriptor, ySelection, filters, jstCode, periodMode)
    })),
    label: getCostOfRiskFlowLabel(descriptor),
    status: ""
  };
}

function buildCostOfRiskFlowPointsForJst(state, indexes, referenceColumns, descriptor, ySelection, filters, jstCode, periodMode = COST_OF_RISK_PERIOD_MODE_QUARTERLY) {
  const rawValues = getCostOfRiskFlowRawPeriodValues(state, indexes, referenceColumns, descriptor, ySelection, filters, jstCode, periodMode);
  const denominatorSeries = getCostOfRiskRatioDenominatorSeries(
    state,
    indexes,
    referenceColumns,
    jstCode,
    getCostOfRiskStageTransferDenominatorFilters(filters)
  );

  return referenceColumns.map((column, index) => {
    const value = rawValues[index] ?? null;
    const denominator = getCostOfRiskMovementDenominator(denominatorSeries, referenceColumns, index, periodMode);
    return {
      date: column.date,
      denominator,
      label: column.label,
      ratioBasisPoints: Number.isFinite(value) && Number.isFinite(denominator) && denominator !== 0
        ? (value / denominator) * 10000
        : null,
      value
    };
  });
}

function getCostOfRiskFlowRawPeriodValues(state, indexes, referenceColumns, descriptor, ySelection, filters, jstCode, periodMode = COST_OF_RISK_PERIOD_MODE_QUARTERLY) {
  if (descriptor.type === "transfer") {
    return computeCostOfRiskTransferFlowPeriodSeries(state, indexes, referenceColumns, ySelection, descriptor.code, jstCode, periodMode);
  }

  if (descriptor.type === "net") {
    const forwardSeries = computeCostOfRiskTransferFlowPeriodSeries(
      state,
      indexes,
      referenceColumns,
      ySelection,
      descriptor.forwardMovement.code,
      jstCode,
      periodMode
    );
    const reverseSeries = computeCostOfRiskTransferFlowPeriodSeries(
      state,
      indexes,
      referenceColumns,
      ySelection,
      descriptor.reverseMovement.code,
      jstCode,
      periodMode
    );
    return referenceColumns.map((column, index) => {
      const forwardValue = forwardSeries[index] ?? 0;
      const reverseValue = reverseSeries[index] ?? 0;
      return forwardValue - reverseValue;
    });
  }

  if (descriptor.type === "writeoff") {
    const magnitudes = computeCostOfRiskWriteOffPeriodSeriesForStage(state, indexes, referenceColumns, filters, descriptor.stage, jstCode, periodMode);
    return magnitudes.map((magnitude) => (magnitude > 0 ? -magnitude : 0));
  }

  const exposureLevels = computeCostOfRiskStageExposureLevels(state, indexes, referenceColumns, filters, descriptor.stage, jstCode);
  const writeOffMagnitudes = computeCostOfRiskWriteOffPeriodSeriesForStage(state, indexes, referenceColumns, filters, descriptor.stage, jstCode, periodMode);
  const movementQuarterlyByCode = new Map(COST_OF_RISK_STAGE_TRANSFER_FLOW_MOVEMENTS.map((movement) => [
    movement.code,
    computeCostOfRiskTransferFlowPeriodSeries(state, indexes, referenceColumns, ySelection, movement.code, jstCode, periodMode)
  ]));

  return referenceColumns.map((column, index) => {
    if (index === 0) return null;
    const currentValue = exposureLevels[index];
    const previousValue = exposureLevels[index - 1];
    if (!Number.isFinite(currentValue) || !Number.isFinite(previousValue)) return null;

    const delta = currentValue - previousValue;
    let netTransfers = 0;
    COST_OF_RISK_STAGE_TRANSFER_FLOW_MOVEMENTS.forEach((movement) => {
      const value = movementQuarterlyByCode.get(movement.code)?.[index] ?? 0;
      if (movement.from === descriptor.stage) netTransfers -= value;
      if (movement.to === descriptor.stage) netTransfers += value;
    });
    const writeOffMagnitude = writeOffMagnitudes[index] ?? 0;
    return delta - netTransfers + writeOffMagnitude;
  });
}

function computeCostOfRiskWriteOffPeriodSeriesForStage(state, indexes, referenceColumns, filters, stage, jstCode, periodMode = COST_OF_RISK_PERIOD_MODE_QUARTERLY) {
  const { points } = getCostOfRiskWriteOffPointsByStage(state, filters).find((item) => item.stage === stage) ?? { points: [] };
  if (!indexes || points.length === 0) return referenceColumns.map(() => 0);

  const total = createEmptySeries(referenceColumns.length);
  COST_OF_RISK_WRITE_OFF_X_CODES.forEach((xCode) => {
    const series = createEmptySeries(referenceColumns.length);
    points.forEach((yCode) => {
      addSeriesValues(series, getPointSeriesValues(state, indexes, referenceColumns, COST_OF_RISK_TABLE_ID, {
        xCode,
        yCode,
        zCode: ""
      }, jstCode));
    });
    const periodSeries = resolveCostOfRiskPeriodSeries(referenceColumns, series, periodMode);
    periodSeries.forEach((value, index) => { total[index] += Math.abs(value); });
  });
  return total;
}

function computeCostOfRiskWriteOffQuarterlySeriesForStage(state, indexes, referenceColumns, filters, stage, jstCode) {
  return computeCostOfRiskWriteOffPeriodSeriesForStage(
    state,
    indexes,
    referenceColumns,
    filters,
    stage,
    jstCode,
    COST_OF_RISK_PERIOD_MODE_QUARTERLY
  );
}

function parseCostOfRiskFlowKey(flowKey) {
  const [type, value] = String(flowKey ?? "").split(":");
  if (type === "transfer") {
    const movement = COST_OF_RISK_STAGE_TRANSFER_FLOW_MOVEMENTS.find((item) => `${item.from}-${item.to}` === value);
    return movement ? { code: movement.code, from: movement.from, to: movement.to, type: "transfer" } : null;
  }
  if (type === "net") {
    const [from, to] = String(value ?? "").split("-");
    const forwardMovement = COST_OF_RISK_STAGE_TRANSFER_FLOW_MOVEMENTS.find((item) => item.from === from && item.to === to);
    const reverseMovement = COST_OF_RISK_STAGE_TRANSFER_FLOW_MOVEMENTS.find((item) => item.from === to && item.to === from);
    return forwardMovement && reverseMovement
      ? { forwardMovement, from, reverseMovement, to, type: "net" }
      : null;
  }
  if (type === "stagebox" && ["1", "2", "3"].includes(value)) {
    return { stage: value, type };
  }
  if ((type === "writeoff" || type === "other") && ["1", "2", "3"].includes(value)) {
    return { stage: value, type };
  }
  return null;
}

function getCostOfRiskFlowLabel(descriptor) {
  if (descriptor.type === "transfer") return `Stage ${descriptor.from} → Stage ${descriptor.to}`;
  if (descriptor.type === "net") return `Net Stage ${descriptor.from} → Stage ${descriptor.to}`;
  if (descriptor.type === "writeoff") return `Write-Off - Stage ${descriptor.stage}`;
  return `Other movements - Stage ${descriptor.stage}`;
}

function buildCostOfRiskStageExposureComponents(state, indexes, referenceColumns, filters, stage, referenceIndex) {
  const stageFilters = getCostOfRiskStageScopedFilters(filters, stage);
  const composition = getCostOfRiskDenominatorComposition(state, stageFilters);
  const previousIndex = referenceIndex - 1;

  if (!indexes || previousIndex < 0 || composition.xCodes.length === 0 || composition.yCodes.length === 0) return [];

  const components = [
    ...composition.xCodes.flatMap((xCode) => composition.yCodes.map((yCode) => ({
      label: `${getMappingDescription(state, COST_OF_RISK_STAGE_BOX_TABLE_ID, "y_axis_rc_code", yCode)} (x=${xCode})`,
      operator: "add",
      series: resolveCostOfRiskDenominatorCellSeries(state, indexes, referenceColumns, state.selectedJst, xCode, yCode),
      source: `${COST_OF_RISK_STAGE_BOX_TABLE_ID} / x ${xCode} / y ${yCode}`
    }))),
    ...(composition.excludeCash ? composition.xCodes.map((xCode) => ({
      label: `Cash balances at central banks and other demand deposits (x=${xCode})`,
      operator: "subtract",
      series: resolveCostOfRiskDenominatorCellSeries(state, indexes, referenceColumns, state.selectedJst, xCode, COST_OF_RISK_DENOMINATOR_CASH_Y_CODE),
      source: `${COST_OF_RISK_STAGE_BOX_TABLE_ID} / x ${xCode} / y ${COST_OF_RISK_DENOMINATOR_CASH_Y_CODE}`
    })) : [])
  ];

  return components.map((component) => {
    const sign = component.operator === "subtract" ? -1 : 1;
    const currentRaw = component.series[referenceIndex] ?? null;
    const previousRaw = component.series[previousIndex] ?? null;
    const currentValue = Number.isFinite(currentRaw) ? sign * currentRaw : null;
    const previousValue = Number.isFinite(previousRaw) ? sign * previousRaw : null;

    return {
      code: component.source,
      currentValue,
      delta: Number.isFinite(currentValue) && Number.isFinite(previousValue) ? currentValue - previousValue : null,
      description: `${component.operator === "subtract" ? "− " : ""}${component.label}`,
      previousValue
    };
  });
}

function getCostOfRiskWriteOffPointsByStage(state, filters = {}) {
  const descriptors = getCostOfRiskBalanceSheetAllowanceDescriptors(state);
  const normalizedFilters = normalizeCostOfRiskFilters(filters);

  return ["1", "2", "3"].map((stage) => {
    const stageFilters = { ...normalizedFilters, stage: COST_OF_RISK_STAGE_TRANSFER_STAGE_LABELS[stage] };
    const points = descriptors
      .filter((descriptor) => matchesCostOfRiskFilterDescriptor(descriptor, stageFilters))
      .filter((descriptor) => isCostOfRiskAggregationPoint(descriptor, stageFilters))
      .map((descriptor) => descriptor.code);

    return { points, stage };
  });
}

function buildCostOfRiskWriteOffByStage(state, indexes, referenceColumns, filters, referenceIndex, periodMode = COST_OF_RISK_PERIOD_MODE_QUARTERLY) {
  return getCostOfRiskWriteOffPointsByStage(state, filters).map(({ points, stage }) => {
    if (!indexes || points.length === 0) {
      return { magnitude: 0, stage };
    }

    const magnitude = COST_OF_RISK_WRITE_OFF_X_CODES.reduce((total, xCode) => {
      const series = createEmptySeries(referenceColumns.length);
      points.forEach((yCode) => {
        addSeriesValues(series, getPointSeriesValues(state, indexes, referenceColumns, COST_OF_RISK_TABLE_ID, {
          xCode,
          yCode,
          zCode: ""
        }, state.selectedJst));
      });
      const periodValue = resolveCostOfRiskPeriodSeries(referenceColumns, series, periodMode)[referenceIndex] ?? 0;
      return total + Math.abs(periodValue);
    }, 0);

    return { magnitude, stage };
  });
}

function buildCostOfRiskStageGlobalVariation(state, indexes, referenceColumns, filters, stage, referenceIndex) {
  const stageLabel = COST_OF_RISK_STAGE_TRANSFER_STAGE_LABELS[stage] ?? "Stage 3";
  if (!indexes || referenceIndex <= 0) {
    return {
      label: `${stageLabel} delta`,
      value: null
    };
  }

  const values = computeCostOfRiskStageExposureLevels(state, indexes, referenceColumns, filters, stage, state.selectedJst);
  const currentValue = values[referenceIndex];
  const previousValue = values[referenceIndex - 1];

  return {
    currentValue,
    label: `${stageLabel} delta`,
    previousValue,
    value: Number.isFinite(currentValue) && Number.isFinite(previousValue)
      ? currentValue - previousValue
      : null
  };
}
