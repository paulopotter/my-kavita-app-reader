import { createStyles } from '../../../../shared/theme';

// The tile's own width; the cover is 2:3, so its height is the sum of what it holds.
export const RAIL_CARD_WIDTH = 112;

export const railCardStyles = createStyles(({ colors, text, spacing, radius, blur }) => ({
  card: { width: RAIL_CARD_WIDTH, marginRight: spacing[5] },
  cover: {
    width: RAIL_CARD_WIDTH,
    height: RAIL_CARD_WIDTH * 1.5,
    borderRadius: radius.medium,
    backgroundColor: colors.surface.tertiary,
  },
  // A pill in the cover's top-left corner: the button fill with the label made for it, so it reads
  // on any cover.
  badge: {
    position: 'absolute',
    top: spacing[2],
    left: spacing[2],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radius.full,
    backgroundColor: colors.button.primary,
  },
  badgeText: { color: colors.text.button.primary, fontSize: text.size[1], fontWeight: text.weight.bold },
  name: {
    color: colors.text.emphasis,
    fontSize: text.size[2],
    fontWeight: text.weight.bold,
    marginTop: spacing[3],
  },
  // Text cannot be blurred directly: draw it as a soft shadow of itself instead.
  textBlurred: {
    color: 'transparent',
    textShadowColor: colors.text.secondary,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: blur.text,
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
