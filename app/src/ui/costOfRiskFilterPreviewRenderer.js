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
  let magnitudeEntries = [];
  let maxMagnitude = 0;
  let magnitudeFlushScheduled = false;

  function resetQueue() {
    queue = [];
    queueScheduled = false;
    renderToken += 1;
    magnitudeEntries = [];
    maxMagnitude = 0;
    magnitudeFlushScheduled = false;
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

  function scheduleValue(node, preview, barNode = null) {
    node.textContent = "";
    node.setAttribute("aria-busy", "true");
    markValueNode(node, preview);
    queue.push({ barNode, node, ...preview });
    scheduleQueue();
  }

  // Lightweight "data bar" behind each previewed value, sized relative to the
  // largest magnitude among the rows sharing the same token. Values may still
  // be computed asynchronously, but bar widths are applied in one batch so the
  // panel does not animate line by line.
  function recordMagnitude(token, barNode, text) {
    if (!barNode || token !== renderToken) return;
    const magnitude = parseCostOfRiskPreviewMagnitude(text) ?? 0;
    const entry = magnitudeEntries.find((candidate) => candidate.barNode === barNode);
    if (entry) {
      entry.magnitude = magnitude;
    } else {
      magnitudeEntries.push({ barNode, magnitude });
    }
    if (magnitude > maxMagnitude) maxMagnitude = magnitude;
    scheduleMagnitudeFlush(token);
  }

  function applyMagnitudeWidths(token) {
    if (token !== renderToken || maxMagnitude <= 0) return;
    magnitudeEntries.forEach((candidate) => {
      candidate.barNode.style.width = `${Math.min(32, (candidate.magnitude / maxMagnitude) * 32)}%`;
    });
  }

  function scheduleMagnitudeFlush(token) {
    if (magnitudeFlushScheduled) return;
    magnitudeFlushScheduled = true;
    window.setTimeout(() => {
      magnitudeFlushScheduled = false;
      if (token !== renderToken) return;
      if (queueScheduled || queue.length > 0) {
        scheduleMagnitudeFlush(token);
        return;
      }
      applyMagnitudeWidths(token);
    }, 0);
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
        const value = getPreviewValue?.(item.kind, item.value) ?? "";
        item.node.textContent = value;
        item.node.removeAttribute("aria-busy");
        recordMagnitude(item.token, item.barNode, value);
      }
      if (queue.length > 0) scheduleQueue();
      else applyMagnitudeWidths(renderToken);
    };
    window.setTimeout(runNext, delay);
  }

  return {
    captureSnapshot,
    clearSnapshot,
    consumeSnapshotValue,
    getCachedValue,
    markValueNode,
    recordMagnitude,
    resetQueue,
    scheduleValue
  };
}

// French-locale formatted numbers ("1 234,5 bp", "-45,2 M€"...) use a
// regular, non-breaking or narrow non-breaking space as thousands
// separator and a comma as decimal separator; strip all three and read the
// leading signed number as the bar's magnitude.
function parseCostOfRiskPreviewMagnitude(text) {
  const match = String(text ?? "").match(/-?[\d\s\u00a0\u202f]+(?:[.,]\d+)?/);
  if (!match) return null;
  const normalized = match[0].replace(/[\s\u00a0\u202f]/g, "").replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? Math.abs(parsed) : null;
}

function createSnapshotKey(kind, value) {
  return [kind, value].map((part) => String(part ?? "")).join(COST_OF_RISK_FILTER_PREVIEW_KEY_SEPARATOR);
}
