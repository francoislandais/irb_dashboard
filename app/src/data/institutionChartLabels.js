import { getInstitutionDisplayInfo } from "./institutionDictionary.js?v=20260925-institution-dictionary";

export function getInstitutionChartLabels(series, dictionary) {
  const names = new Map(series.map(({ jstCode }) => [
    jstCode, getInstitutionDisplayInfo(dictionary, jstCode)?.institutionName?.trim() || ""
  ]));
  const counts = new Map();
  names.forEach((name) => {
    if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
  });
  return new Map([...names].map(([id, name]) => {
    const label = name && counts.get(name) > 1 ? `${name} (${id})` : name || id;
    return [id, label];
  }));
}
