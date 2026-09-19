// Applying opacity to a colour.
//
// Opacity is an axis of its own, separate from colour: a token carries a colour and never an
// alpha, because how transparent something should be depends on what is being drawn — a
// secondary button's outline, a scrim over a modal — not on which colour it happens to be.
//
// Tokens are written as `rgb(r, g, b)` so they stay valid colours on their own; this is the one
// place that reaches inside them to add a fourth channel.

import type { RgbColor } from './colors.types';

const RGB = /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/;

/**
 * The same colour at `opacity` (0–1).
 *
 * ```ts
 * backgroundColor: alpha(colors.surface.dim, 0.5)
 * ```
 *
 * `RgbColor` is the only accepted input, so the shape is guaranteed at compile time; a value that
 * somehow still fails to parse is returned untouched, since a wrong colour is a visible bug and a
 * crashed screen is worse.
 */
export function alpha(color: RgbColor, opacity: number): string {
  const clamped = Math.min(1, Math.max(0, opacity));

  const rgb = RGB.exec(color);
  if (rgb) {
    return `rgba(${rgb[1]}, ${rgb[2]}, ${rgb[3]}, ${clamped})`;
  }

  return color;
}
