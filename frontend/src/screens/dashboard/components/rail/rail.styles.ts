import { createStyles } from '../../../../shared/theme';
import { RAIL_CARD_WIDTH } from '../rail-card/rail-card.styles';
import { RAIL_WIDE_CARD_WIDTH, RAIL_WIDE_COVER_HEIGHT } from '../rail-wide-card/rail-wide-card.styles';

export const railStyles = createStyles(({ colors, text, spacing, radius, gutter }) => ({
  section: { marginBottom: spacing[7] },
  title: {
    color: colors.text.title.primary,
    fontSize: text.size[5],
    fontWeight: text.weight.bold,
    paddingHorizontal: gutter,
    marginBottom: spacing[4],
  },
  list: { paddingHorizontal: gutter },
  // Grey blocks the size of a tile (cover, name, caption), so the rail keeps its height while loading.
  placeholderRow: { flexDirection: 'row', paddingHorizontal: gutter },
  // The wide card's place: as wide as it is, as tall as its cover plus its padding.
  placeholderWide: {
    width: RAIL_WIDE_CARD_WIDTH,
    height: RAIL_WIDE_COVER_HEIGHT + spacing[4] * 2,
    marginRight: spacing[5],
    borderRadius: radius.large,
    backgroundColor: colors.surface.tertiary,
  },
  placeholderTile: { width: RAIL_CARD_WIDTH, marginRight: spacing[5] },
  placeholderCover: {
    width: RAIL_CARD_WIDTH,
    height: RAIL_CARD_WIDTH * 1.5,
    borderRadius: radius.medium,
    backgroundColor: colors.surface.tertiary,
  },
  placeholderName: {
    width: RAIL_CARD_WIDTH * 0.8,
    height: text.size[2],
    borderRadius: radius.small,
    backgroundColor: colors.surface.tertiary,
    marginTop: spacing[3],
  },
  placeholderCaption: {
    width: RAIL_CARD_WIDTH * 0.5,
    height: text.size[2],
    borderRadius: radius.small,
    backgroundColor: colors.surface.tertiary,
    marginTop: spacing[1],
  },
}));
