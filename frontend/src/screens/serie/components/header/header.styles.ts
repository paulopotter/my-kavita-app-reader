import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  root: { padding: 16 },
  topRow: { flexDirection: 'row' },
  cover: { width: 100, aspectRatio: 2 / 3, borderRadius: 8, backgroundColor: '#0F3460' },
  info: { flex: 1, marginLeft: 12, justifyContent: 'flex-start' },
  name: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  summary: { color: '#CBD5E0', fontSize: 13, marginTop: 12, lineHeight: 18 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  chip: { backgroundColor: '#16213E', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4 },
  chipText: { color: '#CBD5E0', fontSize: 11 },
  actionButton: {
    marginTop: 16,
    backgroundColor: '#E94560',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  // flexShrink lets the ellipsis kick in instead of the text forcing the button wider.
  actionButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600', flexShrink: 1 },
});
