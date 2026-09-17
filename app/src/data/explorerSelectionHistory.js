const FIELDS = ["templateId", "x", "y", "z"];

export function sameExplorerSelection(left, right) {
  return Boolean(left && right && FIELDS.every((field) => left[field] === right[field]));
}

export function createExplorerSelectionHistory(saved = null) {
  const valid = saved && Array.isArray(saved.entries)
    && saved.entries.every((entry) => entry && FIELDS.every((field) => typeof entry[field] === "string") && entry.templateId)
    && Number.isInteger(saved.index) && saved.index >= -1 && saved.index < saved.entries.length;
  let entries = valid ? saved.entries.map((entry) => Object.fromEntries(FIELDS.map((field) => [field, entry[field]]))) : [];
  let index = valid ? saved.index : -1;
  return {
    get current() { return entries[index] ?? null; },
    get canBack() { return index > 0; },
    get canForward() { return index >= 0 && index < entries.length - 1; },
    record(selection) {
      if (sameExplorerSelection(entries[index], selection)) return false;
      entries = entries.slice(0, index + 1);
      entries.push(Object.fromEntries(FIELDS.map((field) => [field, selection[field]])));
      index = entries.length - 1;
      return true;
    },
    peek(direction) { return entries[index + direction] ?? null; },
    move(direction) {
      if (![1, -1].includes(direction) || !entries[index + direction]) return null;
      index += direction;
      return entries[index];
    },
    serialize() { return { entries: entries.map((entry) => ({ ...entry })), index }; }
  };
}
