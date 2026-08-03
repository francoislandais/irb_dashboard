const COST_OF_RISK_FILTER_PREVIEW_KEY_SEPARATOR = "\u001f";

export function createCostOfRiskFilterPreviewCacheKey(...parts) {
  return JSON.stringify(parts);
}

export function createCostOfRiskFilterPreviewRenderer({
  delay = 35,
  getPreviewValue,
  maxCacheSize = 500
} = {}) {
  let cache = new Map();
  let queue = [];
  let queueScheduled = false;
  let renderToken = 0;
  let snapshot = null;

  function resetQueue() {
    queue = [];
    queueScheduled = false;
    renderToken += 1;
    return renderToken;
  }

  function captureSnapshot(root) {
    const nextSnapshot = new Map();
    root
      ?.querySelectorAll("[data-cost-of-risk-preview-kind][data-cost-of-risk-preview-value]")
      .forEach((node) => {
        if (node.getAttribute("aria-busy") === "true") return;
        nextSnapshot.set(
          createSnapshotKey(
            node.dataset.costOfRiskPreviewKind,
            node.dataset.costOfRiskPreviewValue
          ),
          node.textContent ?? ""
        );
      });
    snapshot = nextSnapshot.size > 0 ? nextSnapshot : null;
  }

  function consumeSnapshotValue(preview) {
    if (!snapshot || !preview) return null;
    const key = createSnapshotKey(preview.kind, preview.value);
    return snapshot.has(key) ? snapshot.get(key) : null;
  }

  function clearSnapshot() {
    snapshot = null;
  }

  function markValueNode(node, preview) {
    node.dataset.costOfRiskPreviewKind = preview.kind;
    node.dataset.costOfRiskPreviewValue = String(preview.value ?? "");
  }

  function scheduleValue(node, preview) {
    node.textContent = "";
    node.setAttribute("aria-busy", "true");
    markValueNode(node, preview);
    queue.push({ node, ...preview });
    scheduleQueue();
  }

  function getCachedValue(key, factory) {
    if (cache.has(key)) return cache.get(key);
    const value = factory();
    if (cache.size > maxCacheSize) cache.clear();
    cache.set(key, value);
    return value;
  }

  function scheduleQueue() {
    if (queueScheduled) return;
    queueScheduled = true;
    const runNext = () => {
      queueScheduled = false;
      const item = queue.shift();
      if (!item) return;
      if (item.token === renderToken && item.node.isConnected) {
        item.node.textContent = getPreviewValue?.(item.kind, item.value) ?? "";
        item.node.removeAttribute("aria-busy");
      }
      if (queue.length > 0) scheduleQueue();
    };
    window.setTimeout(runNext, delay);
  }

  return {
    captureSnapshot,
    clearSnapshot,
    consumeSnapshotValue,
    getCachedValue,
    markValueNode,
    resetQueue,
    scheduleValue
  };
}

function createSnapshotKey(kind, value) {
  return [kind, value].map((part) => String(part ?? "")).join(COST_OF_RISK_FILTER_PREVIEW_KEY_SEPARATOR);
}
