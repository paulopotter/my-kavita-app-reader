// Type tokens. A sibling of the palette, not part of it: switching theme changes no size, no
// weight and no family.
//
// Sizes are a ratio against BASE, so moving the base rescales the whole hierarchy at once. BASE is
// 16 because it is where the usual ratios land on whole pixels; the body step lands on 14, which
// is Android's own default.

const BASE = 16;

/** One step of the scale: its ratio against the base, resolved to whole pixels. */
const step = (ratio: number): number => Math.round(BASE * ratio);

// How far the device's font-size setting may enlarge text. RN applies that scale itself; nothing
// here multiplies by it again.
export const MAX_FONT_SCALE = 2.0;

export const text = {
  // Numbered, not named: the same step serves a metadata line on one screen and body copy on
  // another.
  size: {
    1: step(0.625),
    2: step(0.75),
    3: step(0.875),
    4: step(1),
    5: step(1.125),
    6: step(1.25),
    7: step(1.375),

    // Headings are the one place with a real hierarchy, mapped to h4…h1. Text that merely looks
    // big is not a title and belongs on a high general step.
    title: {
      large: step(1),
      'x-large': step(1.125),
      'xx-large': step(1.25),
      'xxx-large': step(1.375),
    },
  },

  // Two, because the app only ever meant two things. Roboto ships no semibold anyway — a 600
  // resolves to bold on Android.
  weight: {
    regular: '400',
    bold: '700',
  },

  // `undefined` is how RN says "the system font", which is also what keeps glyph coverage for
  // every language. Bundling a real font later is one value in one file.
  family: {
    primary: undefined,
  },
} as const;

export type TextTokens = typeof text;
