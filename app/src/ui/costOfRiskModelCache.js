const COST_OF_RISK_EMPTY_ROWS_CACHE_KEY = [];
const COST_OF_RISK_VIEW_MODEL_CACHE = new WeakMap();

export function getCostOfRiskCachedModel(state, cacheKey, buildModel) {
  const rowsKey = state.rows ?? COST_OF_RISK_EMPTY_ROWS_CACHE_KEY;
  if (!COST_OF_RISK_VIEW_MODEL_CACHE.has(rowsKey)) {
    COST_OF_RISK_VIEW_MODEL_CACHE.set(rowsKey, new Map());
  }

  const cache = COST_OF_RISK_VIEW_MODEL_CACHE.get(rowsKey);
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const model = buildModel();
  cache.set(cacheKey, model);
  return model;
}

export function createCostOfRiskModelCacheKey(state, modelName, ...parts) {
  return [
    modelName,
    state.selectedJst ?? "",
    (state.peerJstCodes ?? []).join(","),
    (state.jstOptions ?? []).join(","),
    ...parts.map(serializeCostOfRiskCachePart)
  ].join("\u001f");
}

function serializeCostOfRiskCachePart(value) {
  if (Array.isArray(value)) return `[${value.map(serializeCostOfRiskCachePart).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${key}:${serializeCostOfRiskCachePart(value[key])}`).join(",")}}`;
  }
  return String(value ?? "");
}
