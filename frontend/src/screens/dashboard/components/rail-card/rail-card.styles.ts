import { createStyles } from '../../../../shared/theme';

// The tile's own width; the cover is 2:3, so its height is the sum of what it holds.
export const RAIL_CARD_WIDTH = 112;

export const railCardStyles = createStyles(({ colors, text, spacing, radius }) => ({
  card: { width: RAIL_CARD_WIDTH, marginRight: spacing[5] },
  cover: {
    width: RAIL_CARD_WIDTH,
    height: RAIL_CARD_WIDTH * 1.5,
    borderRadius: radius.medium,
    backgroundColor: colors.surface.tertiary,
  },
  name: {
    color: colors.text.emphasis,
    fontSize: text.size[2],
    fontWeight: text.weight.bold,
    marginTop: spacing[3],
  },
  caption: { color: colors.text.secondary, fontSize: text.size[2], marginTop: spacing[1] },
  progressBar: {
    height: 4,
    backgroundColor: colors.surface.tertiary,
    borderRadius: radius.full,
    overflow: 'hidden',
    marginTop: spacing[2],
  },
  progressFill: { height: 4, backgroundColor: colors.button.primary },
}));
