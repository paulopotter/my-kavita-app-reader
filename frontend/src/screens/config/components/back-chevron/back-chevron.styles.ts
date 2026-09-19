import { createStyles } from '../../../../shared/theme';

// Lucide's chevron-left is the path `m15 18-6-6 6-6` in a 24 viewBox: the stroke spans x=9..15,
// so 9 of the 24 units are empty on each side — 10.5 once rendered at 28. Discounting that slack
// is what puts the stroke itself on the gutter, and what keeps the title from sitting a further
// padding's width away from it.
//
// TODO: this belongs with `icon.size` once that scale exists — it is a property of the glyph, not
// a spacing choice, so every icon button will want it rather than redeclaring it here.
const GLYPH_SIZE = 28;
const GLYPH_SLACK = Math.round(9 * (GLYPH_SIZE / 24));

export const backChevronStyles = createStyles(({ spacing }) => ({
  // The header already insets by the gutter, so the touch target grows OUTWARD on both sides.
  // Left: the margin cancels the padding AND the glyph's slack, putting the stroke on the gutter.
  // Right: it cancels only the slack, so what is left between stroke and title is one spacing
  // step. Vertical padding is left off — the header centres its children, and any would fight it.
  hitArea: {
    paddingHorizontal: spacing[5],
    marginLeft: -(spacing[5] + GLYPH_SLACK),
    marginRight: -GLYPH_SLACK,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
