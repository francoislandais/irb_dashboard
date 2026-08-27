const COST_OF_RISK_EMPTY_ROWS_CACHE_KEY = [];
const COST_OF_RISK_VIEW_MODEL_CACHE = new WeakMap();
const COST_OF_RISK_MAPPING_IDS = new WeakMap();
let nextCostOfRiskMappingId = 1;

export function getCostOfRiskCachedModel(state, cacheKey, buildModel) {
  // Portable files load their embedded CSV and the internal dimension mapping
  // concurrently. A model built before the mapping is ready is only a
  // transient loading result and must never survive in the cache.
  if (!state.dimensionMapping?.list) return buildModel();

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
    getCostOfRiskMappingId(state.dimensionMapping),
    state.selectedJst ?? "",
    (state.peerJstCodes ?? []).join(","),
    (state.jstOptions ?? []).join(","),
    ...parts.map(serializeCostOfRiskCachePart)
  ].join("\u001f");
}

function getCostOfRiskMappingId(mapping) {
  if (!mapping || (typeof mapping !== "object" && typeof mapping !== "function")) return "mapping-loading";
  if (!COST_OF_RISK_MAPPING_IDS.has(mapping)) {
    COST_OF_RISK_MAPPING_IDS.set(mapping, nextCostOfRiskMappingId++);
  }
  return COST_OF_RISK_MAPPING_IDS.get(mapping);
}

function serializeCostOfRiskCachePart(value) {
  if (Array.isArray(value)) return `[${value.map(serializeCostOfRiskCachePart).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${key}:${serializeCostOfRiskCachePart(value[key])}`).join(",")}}`;
  }
  return String(value ?? "");
}
