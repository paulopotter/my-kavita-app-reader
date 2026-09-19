import { createStyles } from '../../../../../shared/theme';
export const groupModalStyles = createStyles(({ colors, text, alpha }) => ({
    scrim: { flex: 1, backgroundColor: alpha(colors.surface.dim, 0.5), justifyContent: 'center', alignItems: 'center', padding: 16 },
    card: { width: '100%', maxWidth: 340, backgroundColor: colors.surface.secondary, borderRadius: 12, padding: 18 },

    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    title: { fontSize: text.size[4], fontWeight: text.weight.bold, color: colors.text.title.primary },

    label: { fontSize: text.size[2], color: colors.text.secondary, marginBottom: 4, marginTop: 10 },
    input: { backgroundColor: colors.surface.tertiary, color: colors.text.input.primary, borderRadius: 8, padding: 12, fontSize: text.size[3] },
    submitErrorRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
    submitErrorTxt: { color: colors.text.message.bad, fontSize: text.size[2] },

    actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 18 },
    cancelBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, borderWidth: 0.5, borderColor: colors.border.disabled },
    cancelTxt: { color: colors.text.secondary, fontSize: text.size[3], fontWeight: text.weight.bold },
    saveBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, backgroundColor: colors.button.primary },
    saveBtnDisabled: { opacity: 0.45 },
    saveTxt: { color: colors.text.button.primary, fontSize: text.size[3], fontWeight: text.weight.bold },
}));

