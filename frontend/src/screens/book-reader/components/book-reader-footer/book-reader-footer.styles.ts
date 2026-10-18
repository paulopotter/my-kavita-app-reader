import { createStyles } from '../../../../shared/theme';

export const bookReaderFooterStyles = createStyles(({ colors, spacing }) => ({
  root: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing[7],
    paddingHorizontal: spacing[8],
    backgroundColor: colors.surface.secondary,
  },
  // Chapter navigation hugs the edges (previous on the left, next on the right) while the text
  // size controls sit alone in the middle.
  side: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing[7] },
  sideEnd: { justifyContent: 'flex-end' },
  center: { flexDirection: 'row', alignItems: 'center', gap: spacing[9] },
}));
