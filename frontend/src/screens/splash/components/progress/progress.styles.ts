import { createStyles } from '../../../../shared/theme';
export const progressStyles = createStyles(({ colors, text, alpha }) => ({
    root: {
      width: '100%',
      alignItems: 'center',
      gap: 8,
    },
    track: {
      width: '100%',
      height: 3,
      backgroundColor: alpha(colors.progress.secondary, 0.15),
      borderRadius: 2,
      overflow: 'hidden',
    },
    fill: {
      height: '100%',
      backgroundColor: colors.progress.primary,
      borderRadius: 2,
    },
    label: {
      color: alpha(colors.text.secondary, 0.6),
      fontSize: text.size[2],
      textAlign: 'center',
    },
}));

