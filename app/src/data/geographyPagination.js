// Group headings stay visible without fetching their descendants. Only the
// countries in expanded groups count toward the page size.
export function buildGeographyPagePlan(groups, expandedGroupLabels, requestedPageIndex, pageSize) {
  const expandedCodes = groups.flatMap(({ label, countries }) =>
    expandedGroupLabels.has(label) ? countries.map((country) => country.code) : []);
  const pageCount = Math.max(1, Math.ceil(expandedCodes.length / pageSize));
  const pageIndex = Math.min(Math.max(0, requestedPageIndex), pageCount - 1);
  const pageCodes = expandedCodes.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);
  const pageCodeSet = new Set(pageCodes);
  const pageGroupLabels = groups
    .filter(({ label, countries }) => expandedGroupLabels.has(label)
      ? countries.some((country) => pageCodeSet.has(country.code))
      : pageIndex === 0)
    .map(({ label }) => label);

  return { expandedCodes, pageCodes, pageCount, pageGroupLabels, pageIndex };
}
