import { StyleSheet } from 'react-native';
import { colors } from '../../shared/theme';

export const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface.primary },
  center: { flex: 1, backgroundColor: colors.surface.primary, justifyContent: 'center', alignItems: 'center', padding: 24 },
  message: { color: colors.text.secondary, fontSize: 16, textAlign: 'center' },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.primary,
  },
  // Same lineHeight as selectionCount below (both fontSize 13) — topBar and selectionTopBar
  // share identical paddingVertical, so keeping every text inside them at the same lineHeight is
  // what keeps the header's own total height from shifting by a couple px when entering/exiting
  // selection mode.
  totalCount: { color: colors.text.secondary, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  markAllBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  markAllTxt: { color: colors.text.link.primary, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  selectionTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.primary,
    backgroundColor: colors.surface.tertiary,
  },
  selectionCount: { color: colors.text.title.primary, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  selectionCancelTxt: { color: colors.text.link.primary, fontSize: 13, lineHeight: 18, fontWeight: '600' },
});
