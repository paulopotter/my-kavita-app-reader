import { StyleSheet } from 'react-native';
import { colors } from '../../shared/theme';

export const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface.primary },
  center: {
    flex: 1,
    backgroundColor: colors.surface.primary,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  message: { color: colors.text.secondary, fontSize: 16, marginTop: 12, textAlign: 'center' },
  errorText: { color: colors.text.message.bad, fontSize: 16, fontWeight: '600', marginBottom: 20, textAlign: 'center' },
  retryButton: { backgroundColor: colors.button.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  retryText: { color: colors.text.button.primary, fontWeight: '600' },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.primary,
  },
  countTxt: { color: colors.text.secondary, fontSize: 12, flex: 1 },
  sortBtn: { paddingHorizontal: 10, paddingVertical: 4 },
  sortBtnTxt: { color: colors.text.link.primary, fontSize: 13, fontWeight: '600' },
  viewToggleBtn: { marginLeft: 8, paddingHorizontal: 8, paddingVertical: 4 },

  content: { flex: 1 },
  gridList: { padding: 6 },
  listList: { paddingVertical: 4 },
  listListWithIndex: { paddingVertical: 4, paddingRight: 40 },
  cardPlaceholder: { flex: 1, margin: 6 },
});
