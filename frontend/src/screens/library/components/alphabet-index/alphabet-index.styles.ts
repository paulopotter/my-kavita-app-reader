import { createStyles } from '../../../../shared/theme';
export const alphabetIndexStyles = createStyles(({ colors, text, spacing }) => ({
    bar: {
      position: 'absolute',
      right: 0,
      top: 0,
      bottom: 0,
      width: 36,
      justifyContent: 'center',
      backgroundColor: colors.surface.secondary,
      borderTopLeftRadius: 8,
      borderBottomLeftRadius: 8,
    },
    scroll: { flexGrow: 0 },
    content: { paddingVertical: spacing[3] },
    item: {
      width: 36,
      alignItems: 'center',
      paddingVertical: spacing[2],
    },
    letter: {
      color: colors.text.link.primary,
      fontSize: text.size[2],
      fontWeight: text.weight.bold,
    },
}));

