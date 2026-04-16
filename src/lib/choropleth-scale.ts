export const ZERO_FILL = "#2c2c2e";

const RAMP_HUE = 166;
const RAMP_SAT = { min: 30, max: 56 };
const RAMP_LUM = { min: 18, max: 48 };

export function fillForPositiveFraction(t: number) {
  const u = Math.min(1, Math.max(0, t));
  const s = RAMP_SAT.min + u * (RAMP_SAT.max - RAMP_SAT.min);
  const l = RAMP_LUM.min + u * (RAMP_LUM.max - RAMP_LUM.min);
  return `hsl(${RAMP_HUE} ${Math.round(s)}% ${Math.round(l)}%)`;
}

export function fillForCount(count: number, maxPositive: number) {
  if (count === 0) return ZERO_FILL;
  if (maxPositive <= 0) return ZERO_FILL;
  return fillForPositiveFraction(count / maxPositive);
}
