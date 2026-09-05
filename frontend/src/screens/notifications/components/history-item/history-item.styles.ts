import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#0F3460',
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 12, flexShrink: 0 },
  dotUnread: { backgroundColor: '#E94560' },
  dotRead: { backgroundColor: 'transparent' },
  body: { flex: 1 },
  seriesName: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  seriesNameRead: { color: '#A0AEC0', fontWeight: '400' },
  bodyText: { color: '#A0AEC0', fontSize: 13, marginTop: 2 },
  timestamp: { color: '#718096', fontSize: 11, marginTop: 4 },
  deleteBtn: { paddingHorizontal: 8, paddingVertical: 4, marginLeft: 8 },
  deleteTxt: { color: '#718096', fontSize: 18 },
});
