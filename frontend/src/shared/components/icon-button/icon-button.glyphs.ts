// How much of its 24-unit box each glyph leaves empty on the left and right, measured from the
// path Lucide ships. A chevron is a narrow V and leaves 9 of 24; a circle almost fills its box.
// Expressed as a fraction so it holds at any rendered size.
//
// Measured with an SVG path walk over lucide-react-native's own icon sources; every one of them
// is symmetric, which is what makes a single number per glyph enough.
export const GLYPH_INSET = {
  /** `m15 18-6-6 6-6` — spans x 9..15. */
  chevron: 9 / 24,
  /** `M18 6 6 18` + `m6 6 12 12` — spans x 6..18. */
  cross: 6 / 24,
  /** spans x 5..19. */
  arrow: 5 / 24,
  /** `Check` and `CornerDownRight` alike — span x 4..20. */
  tick: 4 / 24,
  /** A filled circle — spans x 2..22, near enough to its box to need no correction. */
  circle: 2 / 24,
} as const;

export type GlyphName = keyof typeof GLYPH_INSET;
