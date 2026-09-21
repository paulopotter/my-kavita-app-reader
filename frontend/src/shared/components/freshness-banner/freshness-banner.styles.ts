import { createStyles } from '../../theme';

export const freshnessBannerStyles = createStyles(({ colors, text, spacing, alpha }) => ({
  strip: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[5],
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Out of date, or still on its way — worth knowing, nothing broken.
  stale: { backgroundColor: alpha(colors.banner.warn, 0.16) },
  // Something is actually wrong and the user may need to act.
  offline: { backgroundColor: alpha(colors.banner.alert, 0.16) },
  bad: { backgroundColor: alpha(colors.banner.alert, 0.16) },
  confirmed: { backgroundColor: alpha(colors.banner.good, 0.16) },
  text: {
    fontSize: text.size[2],
    fontWeight: text.weight.bold,
    color: colors.text.primary,
  },
}));
