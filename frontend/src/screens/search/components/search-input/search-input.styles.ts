import { createStyles } from '../../../../shared/theme';
export const searchInputStyles = createStyles(({ colors, text, spacing, radius, border }) => ({
    root: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[4],
      marginHorizontal: spacing[6],
      marginTop: spacing[5],
      marginBottom: spacing[4],
      paddingHorizontal: spacing[5],
      height: 44,
      borderRadius: radius.medium,
      backgroundColor: colors.surface.secondary,
      borderWidth: border.medium,
      borderColor: colors.border.primary,
    },
    input: {
      flex: 1,
      color: colors.text.emphasis,
      fontSize: text.size[3],
      padding: 0,
    },
}));

