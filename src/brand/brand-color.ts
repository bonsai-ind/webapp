export type BrandColorResult =
  | { ok: true }
  | { ok: false; reason: "invalid-color" | "too-close-to-alert" | "too-close-to-calm" };

// Hue of the alert-red status color (#E5484D ≈ 358°). Brand hues within ±this
// of red would be mistaken for an active cry, so they are forbidden.
const ALERT_HUE = 358;
const ALERT_BAND = 15;
// Hue of the calm-green status color (#15A05A ≈ 150°), the "all calm" signal.
const CALM_HUE = 150;
const CALM_BAND = 25;
// Below this saturation a color reads as gray, so its hue carries no status meaning.
const NEUTRAL_SAT = 0.15;

function hexToHsv(hex: string): { hue: number; saturation: number } {
  const m = hex.replace("#", "");
  const r = parseInt(m.slice(0, 2), 16) / 255;
  const g = parseInt(m.slice(2, 4), 16) / 255;
  const b = parseInt(m.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const saturation = max === 0 ? 0 : d / max;
  let hue: number;
  if (d === 0) hue = 0;
  else if (max === r) hue = (((g - b) / d) % 6) * 60;
  else if (max === g) hue = ((b - r) / d + 2) * 60;
  else hue = ((r - g) / d + 4) * 60;
  if (hue < 0) hue += 360;
  return { hue, saturation };
}

function hueDistance(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360;
  return Math.min(diff, 360 - diff);
}

const HEX_COLOR = /^#?[0-9a-fA-F]{6}$/;

export function validateBrandColor(hex: string): BrandColorResult {
  if (!HEX_COLOR.test(hex)) return { ok: false, reason: "invalid-color" };
  const { hue, saturation } = hexToHsv(hex);
  // A near-gray brand reads as neutral, not as any status color — hue is moot.
  if (saturation < NEUTRAL_SAT) return { ok: true };
  if (hueDistance(hue, ALERT_HUE) <= ALERT_BAND) {
    return { ok: false, reason: "too-close-to-alert" };
  }
  if (hueDistance(hue, CALM_HUE) <= CALM_BAND) {
    return { ok: false, reason: "too-close-to-calm" };
  }
  return { ok: true };
}
