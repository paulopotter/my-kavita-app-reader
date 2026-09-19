import { createStyles } from '../../../../shared/theme';
// The section card for one server (or metadata server): a header (name + ⋯), then masked
// credential rows, then the URL list with add / test buttons.
export const groupCardStyles = createStyles(({ colors, text }) => ({
    card: { borderWidth: 0.5, borderColor: colors.border.primary, borderRadius: 12, overflow: 'hidden', marginBottom: 10 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingVertical: 12,
      backgroundColor: colors.surface.secondary,
    },
    headerName: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
    name: { fontSize: text.size[3], fontWeight: text.weight.regular, color: colors.text.title.primary, flex: 1 },
    body: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 12, borderTopWidth: 0.5, borderTopColor: colors.border.primary },

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
    msgRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
    msgOk: { color: colors.text.message.good, fontSize: text.size[2] },
    msgError: { color: colors.text.message.bad, fontSize: text.size[2] },
}));

