import { createStyles } from '../../theme';
export const scrollToTopButtonStyles = createStyles(({ colors }) => ({
    button: {
      position: 'absolute',
      bottom: 16,
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.button.primary,
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 4,
    },
}));

