import { createStyles } from '../../shared/theme';

export const dashboardStyles = createStyles(({ colors, text, spacing, radius, gutter }) => ({
  root: { flex: 1, backgroundColor: colors.surface.primary },
  content: { paddingVertical: spacing[6] },
  center: {
    flex: 1,
    backgroundColor: colors.surface.primary,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[8],
  },
  errorText: {
    color: colors.text.message.bad,
    fontSize: text.size[4],
    fontWeight: text.weight.bold,
    marginBottom: spacing[7],
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.button.primary,
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[5],
    borderRadius: radius.medium,
  },
  retryText: { color: colors.text.button.primary, fontWeight: text.weight.bold },
  gutter: { paddingHorizontal: gutter },
}));
