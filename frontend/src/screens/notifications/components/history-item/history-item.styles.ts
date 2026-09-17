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
  rowSelected: { backgroundColor: '#0F3460' },
  // Fixed-size slot for the leading indicator (unread dot or selection checkbox) — same
  // footprint either way, so switching selection mode never shifts the row's own content
  // horizontally (previously the 8px dot vs. 20px checkbox changed the row's layout width).
  indicator: { width: 20, height: 20, marginRight: 12, flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotUnread: { backgroundColor: '#E94560' },
  dotRead: { backgroundColor: 'transparent' },
  // Reserved even before coverUrl resolves (see HistoryItem's own doc) — the placeholder fills
  // this same box, so a cover arriving later never shifts the row's layout.
  thumb: { width: 36, height: 51, borderRadius: 4, marginRight: 12, flexShrink: 0 },
  thumbPlaceholder: { backgroundColor: '#0F3460' },
  body: { flex: 1 },
  seriesName: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  seriesNameRead: { color: '#A0AEC0', fontWeight: '400' },
  bodyText: { color: '#A0AEC0', fontSize: 13, marginTop: 2 },
  timestamp: { color: '#718096', fontSize: 11, marginTop: 4 },
  // Reserved even in selection mode (opacity 0, not removed — see HistoryItem's own doc) so the
  // row's available text width never changes when entering/exiting selection mode.
  trailingActions: { flexDirection: 'row' },
  trailingActionsHidden: { opacity: 0 },
  iconBtn: { paddingHorizontal: 8, paddingVertical: 4, marginLeft: 4 },
});
