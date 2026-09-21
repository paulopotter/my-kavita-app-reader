import { createStyles } from '../../../../shared/theme';

export const freshnessBannerStyles = createStyles(({ colors, text, spacing, alpha }) => ({
  strip: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[5],
    alignItems: 'center',
    justifyContent: 'center',
  },
  stale: { backgroundColor: alpha(colors.banner.notice, 0.16) },
  offline: { backgroundColor: alpha(colors.banner.alert, 0.16) },
  confirmed: { backgroundColor: alpha(colors.banner.good, 0.16) },
  text: {
    fontSize: text.size[2],
    fontWeight: text.weight.bold,
    color: colors.text.primary,
  },
}));
