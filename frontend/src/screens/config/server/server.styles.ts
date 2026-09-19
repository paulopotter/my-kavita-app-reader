import { createStyles } from '../../../shared/theme';
// Lifted from ConfigScreen's server/auth/BFF styles. The row/form/modal dumb components carry
// their own; this file has what the server.screen container itself uses (the group section
// card, sub-labels, action buttons, status messages, the context-menu modal).
export const serverStyles = createStyles(({ colors, text, alpha }) => ({
    // ── group section card ──
    groupCard: { borderWidth: 0.5, borderColor: colors.border.primary, borderRadius: 12, overflow: 'hidden', marginBottom: 10 },
    groupHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingVertical: 12,
      backgroundColor: colors.surface.secondary,
    },
    groupHeaderName: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
    groupName: { fontSize: text.size[3], fontWeight: text.weight.regular, color: colors.text.title.primary, flex: 1 },
    groupBody: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 12, borderTopWidth: 0.5, borderTopColor: colors.border.primary },

    dot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
    dotActive: { backgroundColor: colors.icon.status.good },
    dotInactive: { backgroundColor: colors.icon.status.off },
    dots: { color: colors.text.secondary, fontSize: text.size[6], paddingHorizontal: 4 },

    subLabel: {
      fontSize: text.size[2],
      fontWeight: text.weight.bold,
      color: colors.text.secondary,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginTop: 12,
      marginBottom: 8,
    },
    credRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface.primary,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 10,
    },
    credValue: { flex: 1, color: colors.text.input.primary, fontSize: text.size[3], letterSpacing: 1 },

    addDashedBtn: {
      marginTop: 6,
      padding: 12,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: colors.border.accent,
      borderRadius: 8,
      alignItems: 'center',
    },
    addDashedTxt: { color: colors.text.link.primary, fontWeight: text.weight.bold, fontSize: text.size[3] },

    actionRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
    outlineBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: colors.border.accent },
    outlineTxt: { color: colors.text.link.primary, fontSize: text.size[3], fontWeight: text.weight.bold },
    btnDisabled: { opacity: 0.45 },

    msgOk: { color: colors.text.message.good, fontSize: text.size[2], marginTop: 6 },
    msgError: { color: colors.text.message.bad, fontSize: text.size[2], marginTop: 6 },

    // context-menu modal
    menuOverlay: { flex: 1, backgroundColor: alpha(colors.surface.dim, 0.5), justifyContent: 'center', alignItems: 'center' },
    menuBox: { backgroundColor: colors.surface.secondary, borderRadius: 12, width: 200, overflow: 'hidden' },
    menuItem: { padding: 16, alignItems: 'center' },
    menuItemTxt: { color: colors.text.emphasis, fontSize: text.size[3] },
    menuItemDanger: { color: colors.text.message.bad },
    menuDivider: { height: 1, backgroundColor: colors.surface.tertiary },

    // onboarding CTA (setup mode only)
    goBtn: {
      marginTop: 24,
      padding: 14,
      borderRadius: 10,
      backgroundColor: colors.button.primary,
      alignItems: 'center',
    },
    goTxt: { color: colors.text.button.primary, fontSize: text.size[3], fontWeight: text.weight.bold },
}));

