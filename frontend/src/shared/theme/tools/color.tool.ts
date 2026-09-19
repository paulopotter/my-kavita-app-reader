import type { RgbColor } from '../colors.types';

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

export const ColorTool = {
  add: {
    alpha,
  },
};
