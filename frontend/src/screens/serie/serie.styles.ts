import { StyleSheet } from 'react-native';
import { alpha } from '../../shared/theme';
import type { ThemeColors } from '../../shared/theme';

export const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
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
      borderBottomColor: colors.border.primary,
    },
    chapterCount: { color: colors.text.secondary, fontSize: 12 },
    sortToggle: { paddingHorizontal: 4, paddingVertical: 4 },
    sortToggleText: { color: colors.text.link.primary, fontSize: 13, fontWeight: '600' },

    // ── sort config modal (was chapter-sort-config-modal.styles.ts — folded into the screen) ──
    sortModalBackdrop: {
      flex: 1,
      backgroundColor: alpha(colors.surface.dim, 0.72),
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 28,
    },
    sortModalCard: {
      backgroundColor: colors.surface.secondary,
      borderRadius: 16,
      paddingVertical: 24,
      paddingHorizontal: 24,
      width: '100%',
      gap: 12,
    },
    sortModalTitle: { color: colors.text.title.primary, fontSize: 17, fontWeight: '700' },
    sortModalOverrideNote: { color: alpha(colors.text.secondary, 0.6), fontSize: 12, lineHeight: 16 },
    sortModalResetBtn: { alignSelf: 'flex-start', paddingVertical: 4 },
    sortModalResetText: { color: colors.text.link.primary, fontSize: 13, fontWeight: '600' },
    sortModalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 4 },
    sortModalBtn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10, minWidth: 80, alignItems: 'center' },
    sortModalBtnPrimary: { backgroundColor: colors.button.primary },
    sortModalBtnSecondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: alpha(colors.border.secondary, 0.2) },
    sortModalBtnLabelPrimary: { color: colors.text.button.primary, fontSize: 14, fontWeight: '600' },
    sortModalBtnLabelSecondary: { color: alpha(colors.text.button.secondary, 0.8), fontSize: 14, fontWeight: '600' },
  });

