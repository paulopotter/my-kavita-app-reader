import { StyleSheet } from 'react-native';
import { createStyles } from '../../shared/theme';
export const readerStyles = createStyles(({ colors, text }) => ({
    root: { flex: 1, backgroundColor: colors.surface.reading.background },
    centered: {
      flex: 1,
      backgroundColor: colors.surface.reading.background,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    loadingText: { color: colors.text.secondary, fontSize: text.size[3], marginTop: 12 },
    errorText: { color: colors.text.emphasis, fontSize: text.size[4], textAlign: 'center', marginBottom: 16 },
    button: {
      backgroundColor: colors.button.secondary,
      paddingVertical: 10,
      paddingHorizontal: 24,
      borderRadius: 6,
      marginBottom: 8,
    },
    buttonSecondary: { paddingVertical: 10, paddingHorizontal: 24 },
    buttonText: { color: colors.text.button.primary, fontSize: text.size[3] },
    // Switched into a chapter whose pages aren't in yet (fast arrow tap outran the fetch): a spinner
    // over the reading area while loadEntry fills it — the top bar already shows the new chapter, so
    // this only covers the page canvas.
    pageLoadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.surface.reading.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
}));

