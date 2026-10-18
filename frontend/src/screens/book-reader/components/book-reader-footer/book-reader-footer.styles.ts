import { createStyles } from '../../../../shared/theme';

export const bookReaderFooterStyles = createStyles(({ colors, spacing }) => ({
  root: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[6],
    backgroundColor: colors.surface.secondary,
  },
  group: { flexDirection: 'row', alignItems: 'center', gap: spacing[6] },
}));
