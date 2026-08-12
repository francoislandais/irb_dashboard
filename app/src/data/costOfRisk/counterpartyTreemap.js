import {
  COST_OF_RISK_FILTER_ALL,
  COST_OF_RISK_TREEMAP_COUNTERPARTIES,
  COST_OF_RISK_TREEMAP_STAGE_OPTIONS
} from "./definitions.js";
import {
  buildCostOfRiskWaterfall
} from "./core.js";

export function buildCostOfRiskCounterpartyTreemapData(state, filters, referenceDate = "") {
  const baseFilters = {
    ...filters,
    counterparty: COST_OF_RISK_FILTER_ALL
  };
  const counterpartyOptions = filters.counterparty === COST_OF_RISK_FILTER_ALL
    ? COST_OF_RISK_TREEMAP_COUNTERPARTIES
    : COST_OF_RISK_TREEMAP_COUNTERPARTIES.filter((counterparty) => counterparty.value === filters.counterparty);
  const totalWaterfall = buildCostOfRiskWaterfall(state, baseFilters, referenceDate);
  const stageOptions = filters.stage === COST_OF_RISK_FILTER_ALL
    ? COST_OF_RISK_TREEMAP_STAGE_OPTIONS
    : COST_OF_RISK_TREEMAP_STAGE_OPTIONS.filter((stage) => stage.value === filters.stage);
  const stageWaterfalls = stageOptions.map((stage) => {
    const totalByCode = getCostOfRiskWaterfallPointMap(buildCostOfRiskWaterfall(state, {
      ...baseFilters,
      stage: stage.value
    }, referenceDate));
    const counterpartyWaterfalls = counterpartyOptions.map((counterparty) => ({
      counterparty,
      pointByCode: getCostOfRiskWaterfallPointMap(buildCostOfRiskWaterfall(state, {
        ...baseFilters,
        counterparty: counterparty.value,
        stage: stage.value
      }, referenceDate))
    }));

    return {
      counterpartyWaterfalls,
      label: stage.label,
      totalByCode
    };
  });

  return {
    points: (totalWaterfall.points ?? []).map((point) => {
      const counterpartyChildren = counterpartyOptions.map((counterparty) => {
        const stages = stageWaterfalls.map((stage) => {
          const stageWaterfall = stage.counterpartyWaterfalls.find((candidate) => candidate.counterparty.value === counterparty.value);

          return {
            counterpartyLabel: counterparty.label,
            counterpartyShortLabel: counterparty.shortLabel,
            key: `${counterparty.shortLabel}-${stage.label}`,
            label: stage.label,
            ratioBasisPoints: stageWaterfall?.pointByCode.get(point.code)?.ratioBasisPoints ?? 0,
            value: stageWaterfall?.pointByCode.get(point.code)?.value ?? 0
          };
        });

        return {
          key: counterparty.shortLabel,
          label: counterparty.label,
          shortLabel: counterparty.shortLabel,
          ratioBasisPoints: sumCostOfRiskTreemapChildren(stages),
          value: sumCostOfRiskTreemapChildren(stages, "value"),
          children: stages
        };
      });

      return {
        ...point,
        children: counterpartyChildren
      };
    }),
    referenceDate: totalWaterfall.referenceDate
  };
}

function getCostOfRiskWaterfallPointMap(waterfall) {
  return new Map((waterfall.points ?? []).map((point) => [point.code, point]));
}

function sumCostOfRiskTreemapChildren(children, field = "ratioBasisPoints") {
  return children.reduce((sum, child) => (
    sum + (Number.isFinite(child[field]) ? child[field] : 0)
  ), 0);
}
