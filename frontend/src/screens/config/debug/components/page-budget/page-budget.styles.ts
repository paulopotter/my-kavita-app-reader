import { createStyles } from '../../../../../shared/theme';

export const pageBudgetStyles = createStyles(({ colors, text, spacing, radius, border }) => ({
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
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3] },
  option: { paddingHorizontal: spacing[5], paddingVertical: spacing[4], borderRadius: radius.medium, borderWidth: border.medium, borderColor: colors.border.accent },
  optionSelected: { backgroundColor: colors.button.primary },
  optionText: { color: colors.text.link.primary, fontSize: text.size[3], fontWeight: text.weight.bold },
  optionTextSelected: { color: colors.text.button.primary },
}));
