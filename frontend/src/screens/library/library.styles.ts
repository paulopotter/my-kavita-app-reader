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
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#0F3460',
  },
  countTxt: { color: '#718096', fontSize: 12, flex: 1 },
  sortBtn: { paddingHorizontal: 10, paddingVertical: 4 },
  sortBtnTxt: { color: '#E94560', fontSize: 13, fontWeight: '600' },
  viewToggleBtn: { marginLeft: 8, paddingHorizontal: 8, paddingVertical: 4 },
  viewToggleIcon: { color: '#A0AEC0', fontSize: 18 },

  content: { flex: 1 },
  gridList: { padding: 6 },
  listList: { paddingVertical: 4 },
  listListWithIndex: { paddingVertical: 4, paddingRight: 40 },
  cardPlaceholder: { flex: 1, margin: 6 },
});
