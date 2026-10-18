import { createStyles } from '../../../../shared/theme';

export const bookReaderTopBarStyles = createStyles(({ colors, text, spacing }) => ({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[6],
    backgroundColor: colors.surface.secondary,
  },
  backButton: { marginRight: spacing[5] },
  titles: { flex: 1 },
  titlesRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing[3] },
  seriesName: { flexShrink: 1, color: colors.text.secondary, fontSize: text.size[2] },
  pageIndicator: { color: colors.text.secondary, fontSize: text.size[2] },
  chapterTitle: { color: colors.text.title.primary, fontSize: text.size[5], fontWeight: text.weight.bold },
}));
