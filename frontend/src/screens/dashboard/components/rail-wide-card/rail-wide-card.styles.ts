import { createStyles } from '../../../../shared/theme';

// The card's own measurements: the cover is 2:3, and the card is as tall as the cover plus its padding.
export const RAIL_WIDE_CARD_WIDTH = 300;
export const RAIL_WIDE_COVER_WIDTH = 80;
export const RAIL_WIDE_COVER_HEIGHT = 120;

export const railWideCardStyles = createStyles(({ colors, text, spacing, radius }) => ({
  card: {
    width: RAIL_WIDE_CARD_WIDTH,
    flexDirection: 'row',
    marginRight: spacing[5],
    padding: spacing[4],
    borderRadius: radius.large,
    backgroundColor: colors.surface.secondary,
  },
  cover: {
    width: RAIL_WIDE_COVER_WIDTH,
    height: RAIL_WIDE_COVER_HEIGHT,
    borderRadius: radius.medium,
    backgroundColor: colors.surface.tertiary,
  },
  body: { flex: 1, marginLeft: spacing[5], justifyContent: 'space-between' },
  name: { color: colors.text.emphasis, fontSize: text.size[4], fontWeight: text.weight.bold },
  // Text cannot be blurred directly: draw it as a soft shadow of itself instead.
  textBlurred: {
    color: 'transparent',
    textShadowColor: colors.text.secondary,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: spacing[3],
  },
  captionRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing[3] },
  caption: { color: colors.text.secondary, fontSize: text.size[3] },
  // The button fill with the label made for it, so it reads on any card.
  badge: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radius.full,
    backgroundColor: colors.button.primary,
  },
  badgeText: { color: colors.text.button.primary, fontSize: text.size[1], fontWeight: text.weight.bold },
  footer: { flexDirection: 'row', alignItems: 'center', gap: spacing[4] },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: colors.surface.tertiary,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  progressFill: { height: 4, backgroundColor: colors.button.primary },
  progressLabel: { color: colors.text.secondary, fontSize: text.size[2] },
}));
