import { createStyles } from '../../../shared/theme';
// The onboarding screen only needs a top bar for the language toggle; the body is the server
// screen. Everything else is borrowed from config.styles / server.styles.
export const setupStyles = createStyles(({ colors }) => ({
    langBar: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      paddingHorizontal: 8,
      paddingTop: 8,
      backgroundColor: colors.surface.primary,
    },
}));

