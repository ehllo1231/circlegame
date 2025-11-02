export function clamp01(value) {
  if (!Number.isFinite(value)) return 0;
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

export function hexToRgba(hex, alpha = 1) {
  const clampedAlpha = clamp01(typeof alpha === 'number' ? alpha : 1);
  if (typeof hex !== 'string') return `rgba(255,255,255,${clampedAlpha})`;
  let raw = hex.trim().replace('#', '');
  if (raw.length === 3) raw = raw.split('').map((c) => c + c).join('');
  if (raw.length !== 6) return `rgba(255,255,255,${clampedAlpha})`;
  const value = Number.parseInt(raw, 16);
  if (!Number.isFinite(value)) return `rgba(255,255,255,${clampedAlpha})`;
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r},${g},${b},${clampedAlpha})`;
}

function parseHex(hex) {
  if (typeof hex !== 'string') return null;
  let raw = hex.trim().replace('#', '');
  if (raw.length === 3) raw = raw.split('').map((c) => c + c).join('');
  if (raw.length !== 6) return null;
  const value = Number.parseInt(raw, 16);
  if (!Number.isFinite(value)) return null;
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function toHexComponent(component) {
  return Math.round(Math.max(0, Math.min(255, component))).toString(16).padStart(2, '0');
}

export function blendHexColors(fromColor, toColor, t) {
  const from = parseHex(fromColor) ?? { r: 0, g: 0, b: 0 };
  const to = parseHex(toColor) ?? { r: 0, g: 0, b: 0 };
  const ratio = clamp01(t);
  const r = from.r + (to.r - from.r) * ratio;
  const g = from.g + (to.g - from.g) * ratio;
  const b = from.b + (to.b - from.b) * ratio;
  return `#${toHexComponent(r)}${toHexComponent(g)}${toHexComponent(b)}`;
}
