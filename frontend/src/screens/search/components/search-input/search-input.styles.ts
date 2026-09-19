import { createStyles } from '../../../../shared/theme';
export const searchInputStyles = createStyles(({ colors, text }) => ({
    root: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginHorizontal: 16,
      marginTop: 12,
      marginBottom: 8,
      paddingHorizontal: 12,
      height: 44,
      borderRadius: 10,
      backgroundColor: colors.surface.secondary,
      borderWidth: 1,
      borderColor: colors.border.primary,
    },
    input: {
      flex: 1,
      color: colors.text.emphasis,
      fontSize: text.size[3],
      padding: 0,
    },
}));

