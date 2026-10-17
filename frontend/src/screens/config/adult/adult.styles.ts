import { createStyles } from '../../../shared/theme';

export const adultStyles = createStyles(({ colors, text, spacing, radius, border, gutter }) => ({
  container: { paddingHorizontal: gutter, paddingBottom: spacing[9] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[5],
  },
  label: { flex: 1, color: colors.text.label, fontSize: text.size[3], marginRight: spacing[5] },
  sectionLabel: {
    fontSize: text.size[2],
    fontWeight: text.weight.bold,
    color: colors.text.title.secondary,
    textTransform: 'uppercase',
    marginTop: spacing[7],
    marginBottom: spacing[3],
  },
  hint: { color: colors.text.secondary, fontSize: text.size[2], marginBottom: spacing[4] },
  message: { color: colors.text.secondary, fontSize: text.size[3], paddingVertical: spacing[5] },
  error: { color: colors.text.message.bad, fontSize: text.size[3], paddingVertical: spacing[5] },
  // The "input" the chosen categories live in: a bordered box that wraps its chips.
  selectedBox: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    minHeight: spacing[9] + spacing[6],
    padding: spacing[4],
    borderRadius: radius.medium,
    borderWidth: border.medium,
    borderColor: colors.border.primary,
    backgroundColor: colors.surface.secondary,
  },
  placeholder: { color: colors.text.secondary, fontSize: text.size[3], padding: spacing[3] },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  onlyButton: {
    marginTop: spacing[6],
    alignItems: 'center',
    paddingVertical: spacing[5],
    borderRadius: radius.medium,
    backgroundColor: colors.button.primary,
  },
  onlyButtonActive: { backgroundColor: colors.surface.tertiary, borderWidth: border.medium, borderColor: colors.button.primary },
  onlyButtonText: { color: colors.text.button.primary, fontWeight: text.weight.bold, fontSize: text.size[3] },
  onlyButtonTextActive: { color: colors.text.emphasis },
}));
