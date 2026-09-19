import { createStyles } from '../../theme';
export const selectionBottomBarStyles = createStyles(({ colors, text }) => ({
    root: {
      flexDirection: 'row',
      backgroundColor: colors.surface.secondary,
      borderTopWidth: 1,
      borderTopColor: colors.border.primary,
      paddingVertical: 14,
      minHeight: 76,
    },
    button: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingHorizontal: 4,
    },
    buttonText: { color: colors.text.button.primary, fontSize: text.size[2], fontWeight: text.weight.bold, textAlign: 'center' },
}));

