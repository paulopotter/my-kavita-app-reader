import { StyleSheet } from 'react-native';
import { createStyles, themes, defaultThemeName } from '../../shared/theme';
// Re-exported for the screen (which sets the RN root/container bg). Deliberately the DEFAULT
// theme's surface, not the active one: it has to match @color/splash_background, which is compiled
// into the APK and painted before any code runs, so it cannot follow the user's choice. Making it
// follow the theme would reintroduce the colour jump this value exists to avoid — see plan 028
// Task 010, which decides what the app's identity colour is.
export const BG = themes[defaultThemeName].surface.primary;

// The native Android-12 splash draws the icon on a 240dp canvas; a legacy (opaque PNG) icon
// shows at roughly 192dp. Match that here so the logo doesn't visibly resize during the handoff
// (it read smaller before — the old RN splash used 180).
const LOGO_SIZE = 192;

export const splashStyles = createStyles(({ colors, text }) => ({
    container: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.surface.primary,
      justifyContent: 'space-between',
      alignItems: 'center',
      zIndex: 9999,
    },
    logoArea: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    logo: {
      width: LOGO_SIZE,
      height: LOGO_SIZE,
    },
    footer: {
      width: '100%',
      paddingHorizontal: 32,
      paddingBottom: 32,
      alignItems: 'center',
      gap: 12,
    },
    updateButton: {
      marginTop: 4,
      paddingHorizontal: 20,
      paddingVertical: 10,
      backgroundColor: colors.button.primary,
      borderRadius: 8,
    },
    updateButtonText: {
      color: colors.text.emphasis,
      fontWeight: text.weight.bold,
      fontSize: text.size[3],
    },
}));

