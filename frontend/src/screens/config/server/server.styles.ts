import { createStyles } from '../../../shared/theme';
// Lifted from ConfigScreen's server/auth/BFF styles. The row/form/modal dumb components carry
// their own; this file has what the server.screen container itself uses (the group section
// card, sub-labels, action buttons, status messages, the context-menu modal).
export const serverStyles = createStyles(({ colors, text, spacing, radius, border, alpha }) => ({
    // ── group section card ──
    groupCard: { borderWidth: border.small, borderColor: colors.border.primary, borderRadius: radius.large, overflow: 'hidden', marginBottom: spacing[4] },
    groupHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing[5],
      paddingVertical: spacing[5],
      backgroundColor: colors.surface.secondary,
    },
    groupHeaderName: { flexDirection: 'row', alignItems: 'center', gap: spacing[4], flex: 1 },
    groupName: { fontSize: text.size[3], fontWeight: text.weight.regular, color: colors.text.title.primary, flex: 1 },
    groupBody: { paddingHorizontal: spacing[5], paddingTop: spacing[4], paddingBottom: spacing[5], borderTopWidth: border.small, borderTopColor: colors.border.primary },

    dot: { width: 8, height: 8, borderRadius: radius.small, flexShrink: 0 },
    dotActive: { backgroundColor: colors.icon.status.good },
    dotInactive: { backgroundColor: colors.icon.status.off },
    dots: { color: colors.text.secondary, fontSize: text.size[6], paddingHorizontal: spacing[2] },

    subLabel: {
      fontSize: text.size[2],
      fontWeight: text.weight.bold,
      color: colors.text.secondary,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginTop: spacing[5],
      marginBottom: spacing[4],
    },
    credRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface.primary,
      borderRadius: radius.medium,
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[4],
    },
    credValue: { flex: 1, color: colors.text.input.primary, fontSize: text.size[3], letterSpacing: 1 },

    addDashedBtn: {
      marginTop: spacing[3],
      padding: spacing[5],
      borderWidth: border.medium,
      borderStyle: 'dashed',
      borderColor: colors.border.accent,
      borderRadius: radius.medium,
      alignItems: 'center',
    },
    addDashedTxt: { color: colors.text.link.primary, fontWeight: text.weight.bold, fontSize: text.size[3] },

    actionRow: { flexDirection: 'row', gap: spacing[4], marginTop: spacing[4] },
    outlineBtn: { paddingHorizontal: spacing[5], paddingVertical: spacing[4], borderRadius: radius.medium, borderWidth: border.medium, borderColor: colors.border.accent },
    outlineTxt: { color: colors.text.link.primary, fontSize: text.size[3], fontWeight: text.weight.bold },
    btnDisabled: { opacity: 0.45 },

    msgOk: { color: colors.text.message.good, fontSize: text.size[2], marginTop: spacing[3] },
    msgError: { color: colors.text.message.bad, fontSize: text.size[2], marginTop: spacing[3] },

    // context-menu modal
    menuOverlay: { flex: 1, backgroundColor: alpha(colors.surface.dim, 0.5), justifyContent: 'center', alignItems: 'center' },
    menuBox: { backgroundColor: colors.surface.secondary, borderRadius: radius.large, width: 200, overflow: 'hidden' },
    menuItem: { padding: spacing[6], alignItems: 'center' },
    menuItemTxt: { color: colors.text.emphasis, fontSize: text.size[3] },
    menuItemDanger: { color: colors.text.message.bad },
    menuDivider: { height: border.small, backgroundColor: colors.surface.tertiary },

    // onboarding CTA (setup mode only)
    goBtn: {
      marginTop: spacing[8],
      padding: spacing[5],
      borderRadius: radius.medium,
      backgroundColor: colors.button.primary,
      alignItems: 'center',
    },
    goTxt: { color: colors.text.button.primary, fontSize: text.size[3], fontWeight: text.weight.bold },
}));

