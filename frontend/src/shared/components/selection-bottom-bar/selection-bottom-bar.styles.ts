import { createStyles } from '../../theme';
export const selectionBottomBarStyles = createStyles(({ colors, text, spacing, border }) => ({
    root: {
      flexDirection: 'row',
      backgroundColor: colors.surface.secondary,
      borderTopWidth: border.medium,
      borderTopColor: colors.border.primary,
      paddingVertical: spacing[5],
      minHeight: 76,
    },
    button: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing[3],
      paddingHorizontal: spacing[2],
    },
    buttonText: { color: colors.text.button.primary, fontSize: text.size[2], fontWeight: text.weight.bold, textAlign: 'center' },
}));

