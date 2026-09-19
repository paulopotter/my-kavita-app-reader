import { createStyles } from '../../theme';
export const scrollToTopButtonStyles = createStyles(({ colors, radius }) => ({
    button: {
      position: 'absolute',
      bottom: 16,
      width: 44,
      height: 44,
      borderRadius: radius.full,
      backgroundColor: colors.button.primary,
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 4,
    },
}));

