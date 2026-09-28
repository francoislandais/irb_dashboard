import { escapeHierarchySegment } from "./hierarchyPath.js?v=20260921-hierarchy-gt-escape";

// Resolve explicit parent-code links once per selected taxonomy. The lookup
// and path construction are linear in the number of dimension entries; the
// cached resolver avoids rebuilding an ancestor chain for every data point.
export function createCoordinateHierarchyResolver(points, { legacySlashPaths = false } = {}) {
  const byKey = new Map();
  const cache = new Map();
  for (const point of points) byKey.set(keyFor(point), point);

  function resolve(point, visiting = new Set()) {
    const key = keyFor(point);
    if (cache.has(key)) return cache.get(key);
    if (visiting.has(key)) return rootHierarchy(point, legacySlashPaths);

    const nextVisiting = new Set(visiting);
    nextVisiting.add(key);
    const parentCode = String(point.parentCoordinateCode ?? "").trim();
    const parent = parentCode
      ? byKey.get(keyFor({ ...point, code: parentCode }))
      : null;

    let result;
    if (parent) {
      const parentHierarchy = resolve(parent, nextVisiting);
      const label = childLabel(point.description, parent.description);
      const escapedLabel = escapeHierarchySegment(label);
      result = {
        label,
        level: parentHierarchy.level + 1,
        parentPath: parentHierarchy.path,
        path: parentHierarchy.path ? `${parentHierarchy.path} > ${escapedLabel}` : escapedLabel
      };
    } else {
      result = rootHierarchy(point, legacySlashPaths);
    }

    cache.set(key, result);
    return result;
  }

  return { resolve };
}

function keyFor(point) {
  return `${point.tableId}\u001f${point.coordinate}\u001f${point.code}`;
}

function childLabel(description, parentDescription) {
  const value = String(description ?? "");
  const parent = String(parentDescription ?? "");
  if (parent && value.startsWith(`${parent}/`)) return value.slice(parent.length + 1).trim();
  return value;
}

function rootHierarchy(point, legacySlashPaths) {
  const description = String(point.description ?? "");
  if (!legacySlashPaths) {
    const path = escapeHierarchySegment(description);
    return { label: description, level: 0, parentPath: "", path };
  }

  const parts = description.split("/").map((part) => part.trim()).filter(Boolean);
  const escapedParts = parts.map(escapeHierarchySegment);
  return {
    label: parts.at(-1) ?? description,
    level: Math.max(0, parts.length - 1),
    parentPath: escapedParts.slice(0, -1).join(" > "),
    path: escapedParts.join(" > ")
  };
}
