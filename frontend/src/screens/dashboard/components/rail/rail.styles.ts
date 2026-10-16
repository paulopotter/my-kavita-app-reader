import { createStyles } from '../../../../shared/theme';

export const railStyles = createStyles(({ colors, text, spacing, gutter }) => ({
  section: { marginBottom: spacing[7] },
  title: {
    color: colors.text.title.primary,
    fontSize: text.size[5],
    fontWeight: text.weight.bold,
    paddingHorizontal: gutter,
    marginBottom: spacing[4],
  },
  list: { paddingHorizontal: gutter },
  empty: { color: colors.text.secondary, fontSize: text.size[3], paddingHorizontal: gutter },
}));
