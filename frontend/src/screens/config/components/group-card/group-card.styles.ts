import { createStyles } from '../../../../shared/theme';
// The section card for one server (or metadata server): a header (name + ⋯), then masked
// credential rows, then the URL list with add / test buttons.
export const groupCardStyles = createStyles(({ colors, text, spacing, radius, border }) => ({
    card: { borderWidth: border.small, borderColor: colors.border.primary, borderRadius: radius.large, overflow: 'hidden', marginBottom: spacing[4] },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing[5],
      paddingVertical: spacing[5],
      backgroundColor: colors.surface.secondary,
    },
    headerName: { flexDirection: 'row', alignItems: 'center', gap: spacing[4], flex: 1 },
    name: { fontSize: text.size[3], fontWeight: text.weight.regular, color: colors.text.title.primary, flex: 1 },
    body: { paddingHorizontal: spacing[5], paddingTop: spacing[4], paddingBottom: spacing[5], borderTopWidth: border.small, borderTopColor: colors.border.primary },

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
    msgRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginTop: spacing[3] },
    msgOk: { color: colors.text.message.good, fontSize: text.size[2] },
    msgError: { color: colors.text.message.bad, fontSize: text.size[2] },
}));

