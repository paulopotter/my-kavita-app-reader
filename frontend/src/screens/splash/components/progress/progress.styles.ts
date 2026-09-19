import { createStyles } from '../../../../shared/theme';
export const progressStyles = createStyles(({ colors, text, spacing, radius, alpha }) => ({
    root: {
      width: '100%',
      alignItems: 'center',
      gap: spacing[4],
    },
    track: {
      width: '100%',
      height: 3,
      backgroundColor: alpha(colors.progress.secondary, 0.15),
      borderRadius: radius.full,
      overflow: 'hidden',
    },
    fill: {
      height: '100%',
      backgroundColor: colors.progress.primary,
      borderRadius: radius.full,
    },
    label: {
      color: alpha(colors.text.secondary, 0.6),
      fontSize: text.size[2],
      textAlign: 'center',
    },
}));

