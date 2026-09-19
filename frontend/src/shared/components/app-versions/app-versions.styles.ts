import { createStyles } from '../../theme';
export const appVersionsStyles = createStyles(({ colors, text, spacing, border, alpha }) => ({
    row: {
      flexDirection: 'row',
      paddingHorizontal: spacing[6],
      paddingVertical: spacing[5],
      borderTopWidth: border.small,
      borderTopColor: alpha(colors.border.secondary, 0.13),
    },
    col: {
      flex: 1,
      alignItems: 'center',
    },
    label: {
      fontSize: text.size[1],
      color: alpha(colors.text.ghost, 0.27),
      textTransform: 'lowercase',
      marginBottom: spacing[1],
    },
    value: {
      fontSize: text.size[1],
      color: colors.text.secondary,
    },
}));

