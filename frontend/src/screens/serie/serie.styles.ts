import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#1A1A2E' },
  center: {
    flex: 1,
    backgroundColor: '#1A1A2E',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  message: { color: '#A0AEC0', fontSize: 16, marginTop: 12, textAlign: 'center' },
  errorText: { color: '#FC8181', fontSize: 16, fontWeight: '600', marginBottom: 8, textAlign: 'center' },
  errorDetail: { color: '#A0AEC0', fontSize: 13, marginBottom: 20, textAlign: 'center' },
  retryButton: { backgroundColor: '#E94560', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  retryText: { color: '#FFFFFF', fontWeight: '600' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  topBarButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starButton: { alignItems: 'center', justifyContent: 'center' },
  sortBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#0F3460',
  },
  chapterCount: { color: '#A0AEC0', fontSize: 12 },
  sortToggle: { paddingHorizontal: 4, paddingVertical: 4 },
  sortToggleText: { color: '#E94560', fontSize: 13, fontWeight: '600' },
});
