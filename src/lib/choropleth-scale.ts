export const ZERO_FILL = "#2c2c2e";

// Match the app theme's --primary hue
const RAMP_HUE = 264;
const RAMP_CHROMA = { min: 0.06, max: 0.24 };
const RAMP_LIGHTNESS = { min: 0.28, max: 0.72 };

export function fillForPositiveFraction(t: number) {
  const u = Math.min(1, Math.max(0, t));
  const c = RAMP_CHROMA.min + u * (RAMP_CHROMA.max - RAMP_CHROMA.min);
  const l = RAMP_LIGHTNESS.min + u * (RAMP_LIGHTNESS.max - RAMP_LIGHTNESS.min);
  return `oklch(${l.toFixed(3)} ${c.toFixed(3)} ${RAMP_HUE})`;
}

export function fillForCount(count: number, maxPositive: number) {
  if (count === 0) return ZERO_FILL;
  if (maxPositive <= 0) return ZERO_FILL;
  return fillForPositiveFraction(count / maxPositive);
}
