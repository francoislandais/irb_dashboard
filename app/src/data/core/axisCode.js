const CODE_WIDTH = 4;

// Z used to be exempt from padding (currency/country letters like "USD" or
// "FR" can't be padded anyway - the regex guard already leaves those
// untouched), but some templates' z_axis_rc_code is itself purely numeric
// (e.g. C_18.00's EBA currency numeric codes) and the source data pads it
// (e.g. "0006"). Without padding here too, the dictionary's own unpadded
// "6" would never match that - so numeric Z codes now pad exactly like X/Y.
export function normalizeAxisCode(code, axisOrCoordinate = "") {
  const value = String(code ?? "").trim();

  return /^\d+$/.test(value) ? value.padStart(CODE_WIDTH, "0") : value;
}
