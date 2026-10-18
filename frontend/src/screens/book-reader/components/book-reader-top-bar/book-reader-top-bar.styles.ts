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
  seriesName: { flex: 1, color: colors.text.title.primary, fontSize: text.size[5], fontWeight: text.weight.bold },
  pageIndicator: { marginLeft: spacing[4], color: colors.text.secondary, fontSize: text.size[2] },
}));
