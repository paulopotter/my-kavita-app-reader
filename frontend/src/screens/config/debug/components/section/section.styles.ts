import { createStyles } from '../../../../../shared/theme';
// Verbatim from the styles SmokeTestSection borrowed off ConfigScreen (formCard/section/
// inputFull/outlineBtn/serverRow/dot/msg*).
export const sectionStyles = createStyles(({ colors, text, spacing, radius, border }) => ({
    card: { backgroundColor: colors.surface.secondary, borderRadius: radius.medium, padding: spacing[5], marginBottom: spacing[2] },
    title: {
      fontSize: text.size[2],
      fontWeight: text.weight.bold,
      color: colors.text.title.secondary,
      textTransform: 'uppercase',
      letterSpacing: 1.2,
      marginTop: spacing[7],
      marginBottom: spacing[4],
    },
    inputLabel: { fontSize: text.size[2], color: colors.text.secondary, marginBottom: spacing[2], marginTop: spacing[4] },
    input: {
      backgroundColor: colors.surface.tertiary,
      color: colors.text.emphasis,
      borderRadius: radius.medium,
      padding: spacing[5],
      fontSize: text.size[3],
      marginBottom: spacing[2],
    },
    runBtn: { paddingHorizontal: spacing[5], paddingVertical: spacing[4], borderRadius: radius.medium, borderWidth: border.medium, borderColor: colors.border.accent },
    runTxt: { color: colors.text.link.primary, fontSize: text.size[3], fontWeight: text.weight.bold },
    disabled: { opacity: 0.45 },

    resultRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface.secondary,
      borderRadius: radius.medium,
      paddingHorizontal: spacing[5],
      paddingVertical: spacing[4],
      marginBottom: spacing[3],
      gap: spacing[4],
    },
    label: { flex: 1, color: colors.text.label, fontSize: text.size[3] },
    detailOk: { color: colors.text.message.good, fontSize: text.size[2], marginTop: spacing[3] },
    detailFail: { color: colors.text.message.bad, fontSize: text.size[2], marginTop: spacing[3] },
}));

