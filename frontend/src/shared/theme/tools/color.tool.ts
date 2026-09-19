import type { HexColor, RgbColor } from '../colors.types';

const RGB = /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/;

// Opacity is an axis of its own: how transparent something is depends on what is being drawn, not
// on its colour. So tokens stay opaque `rgb()` and the call site adds the fourth channel here.
function alpha(color: RgbColor, opacity: number): string {
  const clamped = Math.min(1, Math.max(0, opacity));
  const rgb = RGB.exec(color);
  if (!rgb) {
    // Unparseable input is returned untouched — a wrong colour is visible, a crashed screen worse.
    return color;
  }
  return `rgba(${rgb[1]}, ${rgb[2]}, ${rgb[3]}, ${clamped})`;
}

// Native Android parses hex, not `rgb(...)`: a token handed over raw throws inside
// parseColor and falls back to white or transparent, which reads as "the theme did not apply".
function hex(color: RgbColor): HexColor {
  const rgb = RGB.exec(color);
  if (!rgb) {
    // Same reasoning as alpha's: a wrong colour is visible, a crash is worse.
    return '#000000';
  }
  const channel = (value: string): string =>
    Math.min(255, Math.max(0, Number(value))).toString(16).padStart(2, '0').toUpperCase();
  return `#${channel(rgb[1])}${channel(rgb[2])}${channel(rgb[3])}`;
}

export const ColorTool = {
  add: {
    alpha,
  },
  to: {
    hex,
  },
};
