import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#1A1A2E' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  message: { color: 'rgba(255,255,255,0.55)', fontSize: 14, textAlign: 'center', marginTop: 12 },
  errorText: { color: '#E94560', fontSize: 14, textAlign: 'center' },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#E94560',
  },
  retryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  sectionTitle: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 6,
  },
  resultCount: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  list: { paddingBottom: 24 },
  historyRow: { flexDirection: 'row', alignItems: 'center' },
  historyCard: { flex: 1 },
  historyDelete: { paddingHorizontal: 16, paddingVertical: 12 },
});
