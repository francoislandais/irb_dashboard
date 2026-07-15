export function normalizeCostOfRiskCoreSelection(options, selectedCodes) {
  const availableCodes = new Set((options ?? []).map((option) => option.code));
  let normalizedCodes = new Set(
    [...selectedCodes].filter((code) => availableCodes.has(code))
  );

  if (normalizedCodes.size === 0 && availableCodes.size > 0) {
    normalizedCodes = new Set(availableCodes);
  }
  return normalizedCodes;
}

export function getActiveCostOfRiskCoreXCodes(options, selectedCodes) {
  const optionCodes = (options ?? []).map((option) => option.code);
  return optionCodes.filter((code) => selectedCodes.has(code));
}

export function updateCostOfRiskCoreSelection(selectedCodes, code, isSelected) {
  if (!code) return selectedCodes;

  const nextCodes = new Set(selectedCodes);
  if (isSelected) {
    nextCodes.add(code);
    return nextCodes;
  }

  if (nextCodes.size <= 1) return selectedCodes;
  nextCodes.delete(code);
  return nextCodes;
}
