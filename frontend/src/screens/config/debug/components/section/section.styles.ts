import { createStyles } from '../../../../../shared/theme';
// Verbatim from the styles SmokeTestSection borrowed off ConfigScreen (formCard/section/
// inputFull/outlineBtn/serverRow/dot/msg*).
export const sectionStyles = createStyles(({ colors, text }) => ({
    card: { backgroundColor: colors.surface.secondary, borderRadius: 10, padding: 12, marginBottom: 4 },
    title: {
      fontSize: text.size[2],
      fontWeight: text.weight.bold,
      color: colors.text.title.secondary,
      textTransform: 'uppercase',
      letterSpacing: 1.2,
      marginTop: 20,
      marginBottom: 10,
    },
    inputLabel: { fontSize: text.size[2], color: colors.text.secondary, marginBottom: 4, marginTop: 10 },
    input: {
      backgroundColor: colors.surface.tertiary,
      color: colors.text.emphasis,
      borderRadius: 8,
      padding: 12,
      fontSize: text.size[3],
      marginBottom: 4,
    },
    runBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: colors.border.accent },
    runTxt: { color: colors.text.link.primary, fontSize: text.size[3], fontWeight: text.weight.bold },
    disabled: { opacity: 0.45 },

    resultRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface.secondary,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 6,
      gap: 8,
    },
    label: { flex: 1, color: colors.text.label, fontSize: text.size[3] },
    detailOk: { color: colors.text.message.good, fontSize: text.size[2], marginTop: 6 },
    detailFail: { color: colors.text.message.bad, fontSize: text.size[2], marginTop: 6 },
}));

