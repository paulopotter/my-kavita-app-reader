import { createStyles } from '../../../../shared/theme';
// Add / edit a single URL of a server. URL + priority + a "test connection" button that only
// checks that URL is reachable (never changes which URL is active).
export const urlModalStyles = createStyles(({ colors, text, spacing, radius, border, alpha }) => ({
    scrim: { flex: 1, backgroundColor: alpha(colors.surface.dim, 0.5), justifyContent: 'center', alignItems: 'center', padding: spacing[6] },
    card: { width: '100%', maxWidth: 340, backgroundColor: colors.surface.secondary, borderRadius: radius.large, padding: spacing[6] },

    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[6] },
    title: { fontSize: text.size[4], fontWeight: text.weight.bold, color: colors.text.title.primary },

    label: { fontSize: text.size[2], color: colors.text.secondary, marginBottom: spacing[2], marginTop: spacing[4] },
    input: { backgroundColor: colors.surface.tertiary, color: colors.text.input.primary, borderRadius: radius.medium, padding: spacing[5], fontSize: text.size[3] },
    inputError: { borderWidth: border.medium, borderColor: colors.border.input.error },
    errorTxt: { color: colors.text.message.bad, fontSize: text.size[2], marginTop: spacing[3] },
    submitErrorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginTop: spacing[3] },
    submitErrorTxt: { color: colors.text.message.bad, fontSize: text.size[2] },

    assocToggle: { flexDirection: 'row', alignItems: 'center', gap: spacing[4], marginTop: spacing[5] },
    checkbox: {
      width: 18,
      height: 18,
      borderRadius: radius.small,
      borderWidth: border.medium,
      borderColor: colors.border.checkbox.off,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxOn: { backgroundColor: colors.button.selected, borderColor: colors.border.accent },
    assocLabel: { color: colors.text.label, fontSize: text.size[3] },

    testRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[4], marginTop: spacing[5] },
    testBtn: { paddingHorizontal: spacing[5], paddingVertical: spacing[4], borderRadius: radius.medium, borderWidth: border.small, borderColor: colors.border.accent },
    testBtnBusy: { opacity: 0.7 },
    testTxt: { color: colors.text.link.primary, fontSize: text.size[3], fontWeight: text.weight.bold },
    testStatus: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
    testMuted: { color: colors.text.secondary, fontSize: text.size[3] },
    testOk: { color: colors.text.message.good, fontSize: text.size[3] },
    testFail: { color: colors.text.message.bad, fontSize: text.size[3] },

    actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing[4], marginTop: spacing[6] },
    cancelBtn: { paddingHorizontal: spacing[6], paddingVertical: spacing[4], borderRadius: radius.medium, borderWidth: border.small, borderColor: colors.border.disabled },
    cancelTxt: { color: colors.text.secondary, fontSize: text.size[3], fontWeight: text.weight.bold },
    saveBtn: { paddingHorizontal: spacing[6], paddingVertical: spacing[4], borderRadius: radius.medium, backgroundColor: colors.button.primary },
    saveBtnDisabled: { opacity: 0.45 },
    saveTxt: { color: colors.text.button.primary, fontSize: text.size[3], fontWeight: text.weight.bold },
}));

