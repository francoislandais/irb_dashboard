// A "/" in a raw description is this app's own hierarchy-level marker (see
// parseDescriptionHierarchy), but real EBA descriptions also contain a
// literal ">" mid-text (loss buckets "losses >= 10,000", maturity buckets
// "> 2 <= 3 (...) years"). parseDescriptionHierarchy rejoins segments with
// " > " into a single path string for splitHierarchyPath/
// buildExplorerXYHeaders to split apart again elsewhere - without escaping,
// a literal ">" inside a segment is indistinguishable from that join
// character and gets mistaken for a new level split, turning one leaf
// description into a fake parent/child pair. Escaping it to this
// private-use character before joining keeps every real ">" left in a
// joined path unambiguous; readers restore it once they have their own
// segments back out.
const HIERARCHY_JOIN_ESCAPE = "";

export function escapeHierarchySegment(segment) {
  return segment.replaceAll(">", HIERARCHY_JOIN_ESCAPE);
}

export function unescapeHierarchySegment(segment) {
  return segment.replaceAll(HIERARCHY_JOIN_ESCAPE, ">");
}
