import { createStyles } from '../../../../../shared/theme';

export const diagnosticsLogStyles = createStyles(({ colors, text, spacing, radius, border }) => ({
  card: { backgroundColor: colors.surface.secondary, borderRadius: radius.medium, padding: spacing[5], marginBottom: spacing[2] },
  title: {
    fontSize: text.size[2],
    fontWeight: text.weight.bold,
    color: colors.text.title.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: spacing[4],
  },
  hint: { fontSize: text.size[2], color: colors.text.secondary, marginBottom: spacing[4] },
  label: { fontSize: text.size[2], color: colors.text.secondary, marginTop: spacing[3], marginBottom: spacing[2] },
  value: { fontSize: text.size[3], color: colors.text.emphasis },
  command: {
    backgroundColor: colors.surface.tertiary,
    color: colors.text.emphasis,
    borderRadius: radius.medium,
    padding: spacing[5],
    fontSize: text.size[2],
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3], marginTop: spacing[5] },
  button: { paddingHorizontal: spacing[5], paddingVertical: spacing[4], borderRadius: radius.medium, borderWidth: border.medium, borderColor: colors.border.accent },
  buttonText: { color: colors.text.link.primary, fontSize: text.size[3], fontWeight: text.weight.bold },
  disabled: { opacity: 0.45 },
}));
