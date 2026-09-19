import { StyleSheet } from 'react-native';

// Spacing, radius and border width. Siblings of the palette, like type: switching theme changes
// none of them.
//
// Ratios against a base of 8 — the step the app's spacing already followed — so moving the base
// rescales every gap at once. Unlike type, nothing here answers to the device's font scale:
// doubling every padding would push content off the screen, which is why Android keeps `sp` for
// text and `dp` for layout.

const BASE = 8;

const step = (ratio: number): number => Math.round(BASE * ratio);

// Padding, margin and gap alike — the scale serves all three, so it is named after none of them,
// and numbered because a step carries no role of its own.
export const spacing = {
  1: step(0.25),
  2: step(0.5),
  3: step(0.75),
  4: step(1),
  5: step(1.5),
  6: step(2),
  7: step(2.5),
  8: step(3),
  9: step(4),
} as const;

export const radius = {
  small: step(0.5),
  medium: step(1),
  large: step(1.5),
  // Not a step but an instruction: round it away entirely. Any value past half the element's
  // height does it, so this is a constant rather than a ratio.
  full: 999,
} as const;

// The app's breathing room: no screen draws content closer than this to its edges. It is a
// chosen step rather than a scale of its own, so a screen that needs more space asks for it with
// a spacing step on top, and the Reader — which draws edge to edge — opts out entirely.
export const gutter = spacing[6];

export const border = {
  // The thinnest line the screen can draw. A literal 0.5 misses that on some densities, which is
  // what `hairlineWidth` exists to get right.
  small: StyleSheet.hairlineWidth,
  medium: 1,
} as const;

export type Gutter = typeof gutter;
export type Spacing = typeof spacing;
export type Radius = typeof radius;
export type Border = typeof border;
