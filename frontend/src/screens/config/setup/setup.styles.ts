import { createStyles } from '../../../shared/theme';
// The onboarding screen only needs a top bar for the language toggle; the body is the server
// screen. Everything else is borrowed from config.styles / server.styles.
export const setupStyles = createStyles(({ colors, spacing }) => ({
    langBar: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      paddingHorizontal: spacing[4],
      paddingTop: spacing[4],
      backgroundColor: colors.surface.primary,
    },
}));

