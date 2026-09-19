import { createStyles } from '../../../../shared/theme';
// Add / edit server modal. Sits over the screen (Modal transparent). Provider select + name +
// the provider's dynamic credential fields.
export const modalStyles = createStyles(({ colors, text, spacing, radius, border, alpha }) => ({
    scrim: { flex: 1, backgroundColor: alpha(colors.surface.dim, 0.5), justifyContent: 'center', alignItems: 'center', padding: spacing[6] },
    card: { width: '100%', maxWidth: 340, backgroundColor: colors.surface.secondary, borderRadius: radius.large, padding: spacing[6] },

    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[6] },
    title: { fontSize: text.size[4], fontWeight: text.weight.bold, color: colors.text.title.primary },

    label: { fontSize: text.size[2], color: colors.text.secondary, marginBottom: spacing[2], marginTop: spacing[4] },
    required: { color: colors.text.link.primary },
    input: {
      backgroundColor: colors.surface.tertiary,
      color: colors.text.emphasis,
      borderRadius: radius.medium,
      padding: spacing[5],
      fontSize: text.size[3],
    },
    inputDisabled: { opacity: 0.55 },
    submitErrorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginTop: spacing[3] },
    submitErrorTxt: { color: colors.text.message.bad, fontSize: text.size[2] },

    actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing[4], marginTop: spacing[6] },
    cancelBtn: {
      paddingHorizontal: spacing[6],
      paddingVertical: spacing[4],
      borderRadius: radius.medium,
      borderWidth: border.small,
      borderColor: colors.border.disabled,
    },
    cancelTxt: { color: colors.text.secondary, fontSize: text.size[3], fontWeight: text.weight.bold },
    saveBtn: {
      paddingHorizontal: spacing[6],
      paddingVertical: spacing[4],
      borderRadius: radius.medium,
      backgroundColor: colors.button.primary,
    },
    saveBtnDisabled: { opacity: 0.45 },
    saveTxt: { color: colors.text.button.primary, fontSize: text.size[3], fontWeight: text.weight.bold },
}));

