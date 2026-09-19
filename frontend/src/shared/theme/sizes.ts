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

// Icon sizes. Numbered like spacing — a step carries no role of its own — with one named
// exception: `dot` is never an icon, it is a filled circle standing in for a status light, and it
// does not belong on a scale of glyphs.
//
// The scale keeps its 2px progression even where a step is unused, so a size added later lands on
// a rung that already exists instead of wedging a number between two of them.
export const icon = {
  size: {
    dot: 8,
    1: 12,
    2: 14,
    3: 16,
    4: 18,
    5: 20,
    6: 22,
    7: 24,
    8: 26,
    9: 28,
  },

  // A glyph is drawn inside its box, not edge to edge: how much of the box stays empty is a
  // property of the drawing. Lucide's chevron is a narrow V — `m15 18-6-6 6-6` spans x=9..15 of a
  // 24 viewBox, leaving 9 units on each side — while a Search or a filled Circle fills nearly all
  // of it. Discounting that empty margin is what lines the STROKE up with the gutter; without it
  // the box lands on the gutter and the glyph reads as pushed further in.
  //
  // Expressed as a fraction of the rendered size, so it holds at any step: slack(28) = 10.5.
  slack: {
    /** A chevron or an arrow: a thin stroke with wide margins. */
    wide: (size: number): number => Math.round(size * (9 / 24)),
    /** A glyph that fills its box — a filled circle, a solid star. Nothing to discount. */
    none: (): number => 0,
  },
} as const;

export type Icon = typeof icon;
export type Gutter = typeof gutter;
export type Spacing = typeof spacing;
export type Radius = typeof radius;
export type Border = typeof border;
