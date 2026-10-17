import { createStyles } from '../../../shared/theme';

export const adultStyles = createStyles(({ colors, text, spacing, gutter }) => ({
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
}));
