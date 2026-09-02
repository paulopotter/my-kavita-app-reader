import { StyleSheet } from 'react-native';
import { colors } from '../../shared/theme';

// Re-exported for the screen (which sets the RN root/container bg). Same value as the native
// @color/splash_background, so the system-splash → RN-splash handoff has no colour jump. When the
// app gains theming this is the token the RN splash resolves at runtime; the native side stays
// static (it runs before any code — see Task 038 notes on the colour model).
export const BG = colors.background;

// The native Android-12 splash draws the icon on a 240dp canvas; a legacy (opaque PNG) icon
// shows at roughly 192dp. Match that here so the logo doesn't visibly resize during the handoff
// (it read smaller before — the old RN splash used 180).
const LOGO_SIZE = 192;

export const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background,
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
    backgroundColor: colors.accent,
    borderRadius: 8,
  },
  updateButtonText: {
    color: colors.textOnDark,
    fontWeight: '600',
    fontSize: 14,
  },
});
