import { createStyles } from '../../../../shared/theme';

export const bookReaderTopBarStyles = createStyles(({ colors, text, spacing }) => ({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[5],
    paddingHorizontal: spacing[6],
    backgroundColor: colors.surface.secondary,
  },
  backButton: { marginRight: spacing[5] },
  // The name takes the room it needs and no more, so the arrow sits right after it; the page indicator
  // stays at the far end.
  seriesLink: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  seriesName: { flexShrink: 1, color: colors.text.title.primary, fontSize: text.size[5], fontWeight: text.weight.bold },
  seriesPlain: { flex: 1 },
  pageIndicator: { marginLeft: spacing[4], color: colors.text.secondary, fontSize: text.size[2] },
}));
