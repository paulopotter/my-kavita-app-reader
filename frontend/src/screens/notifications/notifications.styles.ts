import { StyleSheet } from 'react-native';
import { createStyles } from '../../shared/theme';
export const notificationsStyles = createStyles(({ colors, text }) => ({
    root: { flex: 1, backgroundColor: colors.surface.primary },
    center: { flex: 1, backgroundColor: colors.surface.primary, justifyContent: 'center', alignItems: 'center', padding: 24 },
    message: { color: colors.text.secondary, fontSize: text.size[4], textAlign: 'center' },

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
    totalCount: { color: colors.text.secondary, fontSize: text.size[3], lineHeight: 18, fontWeight: text.weight.bold },
    markAllBtn: { paddingHorizontal: 8, paddingVertical: 4 },
    markAllTxt: { color: colors.text.link.primary, fontSize: text.size[3], lineHeight: 18, fontWeight: text.weight.bold },
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
    selectionCount: { color: colors.text.title.primary, fontSize: text.size[3], lineHeight: 18, fontWeight: text.weight.bold },
    selectionCancelTxt: { color: colors.text.link.primary, fontSize: text.size[3], lineHeight: 18, fontWeight: text.weight.bold },
}));

