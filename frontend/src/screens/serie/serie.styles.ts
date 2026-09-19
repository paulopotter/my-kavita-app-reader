import { createStyles } from '../../shared/theme';

export const serieStyles = createStyles(({ colors, text, line, spacing, radius, border, gutter, alpha }) => ({
    root: { flex: 1, backgroundColor: colors.surface.primary },
    center: {
      flex: 1,
      backgroundColor: colors.surface.primary,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing[8],
    },
    message: { color: colors.text.secondary, fontSize: text.size[4], marginTop: spacing[5], textAlign: 'center' },
    errorText: { color: colors.text.message.bad, fontSize: text.size[4], fontWeight: text.weight.bold, marginBottom: spacing[7], textAlign: 'center' },
    retryButton: { backgroundColor: colors.button.primary, paddingHorizontal: spacing[8], paddingVertical: spacing[5], borderRadius: radius.medium },
    retryText: { color: colors.text.button.primary, fontWeight: text.weight.bold },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: gutter,
      paddingVertical: spacing[4],
    },
    starButton: { alignItems: 'center', justifyContent: 'center' },
    sortBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: gutter,
      paddingVertical: spacing[4],
      borderBottomWidth: border.small,
      borderBottomColor: colors.border.primary,
    },
    chapterCount: { color: colors.text.secondary, fontSize: text.size[2] },
    sortToggle: { paddingHorizontal: spacing[2], paddingVertical: spacing[2] },
    sortToggleText: { color: colors.text.link.primary, fontSize: text.size[3], fontWeight: text.weight.bold },

    // ── sort config modal (was chapter-sort-config-modal.styles.ts — folded into the screen) ──
    sortModalBackdrop: {
      flex: 1,
      backgroundColor: alpha(colors.surface.dim, 0.72),
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: spacing[8],
    },
    sortModalCard: {
      backgroundColor: colors.surface.secondary,
      borderRadius: radius.large,
      paddingVertical: spacing[8],
      paddingHorizontal: spacing[8],
      width: '100%',
      gap: spacing[5],
    },
    sortModalTitle: { color: colors.text.title.primary, fontSize: text.size[5], fontWeight: text.weight.bold },
    sortModalOverrideNote: { color: alpha(colors.text.secondary, 0.6), fontSize: text.size[2], lineHeight: line.height[3] },
    sortModalResetBtn: { alignSelf: 'flex-start', paddingVertical: spacing[2] },
    sortModalResetText: { color: colors.text.link.primary, fontSize: text.size[3], fontWeight: text.weight.bold },
    sortModalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing[4], marginTop: spacing[2] },
    sortModalBtn: { paddingHorizontal: spacing[6], paddingVertical: spacing[4], borderRadius: radius.medium, minWidth: 80, alignItems: 'center' },
    sortModalBtnPrimary: { backgroundColor: colors.button.primary },
    sortModalBtnSecondary: { backgroundColor: 'transparent', borderWidth: border.medium, borderColor: alpha(colors.border.secondary, 0.2) },
    sortModalBtnLabelPrimary: { color: colors.text.button.primary, fontSize: text.size[3], fontWeight: text.weight.bold },
    sortModalBtnLabelSecondary: { color: alpha(colors.text.button.secondary, 0.8), fontSize: text.size[3], fontWeight: text.weight.bold },
}));

