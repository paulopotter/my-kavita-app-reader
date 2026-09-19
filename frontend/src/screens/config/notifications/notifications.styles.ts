import { createStyles } from '../../../shared/theme';
export const notificationsStyles = createStyles(({ colors, text, alpha }) => ({
    container: { padding: 16 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 16,
    },
    rowDisabled: { opacity: 0.45 },
    label: { flex: 1, color: colors.text.label, fontSize: text.size[3], marginRight: 12 },
    // The "Grupos" section title + the foreground service's live status pill, on the same line.
    sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    statusPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14 },
    statusPillOn: { backgroundColor: colors.icon.status.good },
    statusPillOff: { backgroundColor: colors.icon.status.off },
    statusPillTxt: { color: colors.text.emphasis, fontSize: text.size[2], fontWeight: text.weight.bold },

    // Same row shape as the toggles above (label left, control right) — the stepper sits where the
    // Switch would, value centered between its two buttons.
    retentionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 16,
    },
    retentionLabel: { color: colors.text.label, fontSize: text.size[3], marginRight: 12 },
    retentionStepper: { flexDirection: 'row', alignItems: 'center' },
    stepperBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    retentionValue: { color: colors.text.input.primary, fontSize: text.size[3], minWidth: 64, textAlign: 'center' },

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

    // context-menu modal
    menuOverlay: { flex: 1, backgroundColor: alpha(colors.surface.dim, 0.5), justifyContent: 'center', alignItems: 'center' },
    menuBox: { backgroundColor: colors.surface.secondary, borderRadius: 12, width: 200, overflow: 'hidden' },
    menuItem: { padding: 16, alignItems: 'center' },
    menuItemTxt: { color: colors.text.emphasis, fontSize: text.size[3] },
    menuItemDanger: { color: colors.text.message.bad },
    menuDivider: { height: 1, backgroundColor: colors.surface.tertiary },
}));

