const CODE_WIDTH = 4;

export function normalizeAxisCode(code, axisOrCoordinate = "") {
  const value = String(code ?? "").trim();
  const isZAxis = axisOrCoordinate === "z" || axisOrCoordinate === "z_axis_rc_code";

  if (isZAxis) {
    return value;
  }

  return /^\d+$/.test(value) ? value.padStart(CODE_WIDTH, "0") : value;
}
