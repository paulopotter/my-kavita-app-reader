import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  centered: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: { color: '#A0AEC0', fontSize: 14, marginTop: 12 },
  errorText: { color: '#FFFFFF', fontSize: 16, textAlign: 'center', marginBottom: 16 },
  button: {
    backgroundColor: '#2D3748',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 6,
    marginBottom: 8,
  },
  buttonSecondary: { paddingVertical: 10, paddingHorizontal: 24 },
  buttonText: { color: '#FFFFFF', fontSize: 14 },
  // Switched into a chapter whose pages aren't in yet (fast arrow tap outran the fetch): a spinner
  // over the reading area while loadEntry fills it — the top bar already shows the new chapter, so
  // this only covers the page canvas.
  pageLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
