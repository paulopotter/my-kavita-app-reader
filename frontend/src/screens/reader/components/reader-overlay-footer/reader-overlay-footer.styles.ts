import { createStyles } from '../../../../shared/theme';

export const styles = createStyles(({ colors, text, spacing, alpha }) => ({
    root: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      paddingVertical: spacing[4],
      backgroundColor: alpha(colors.surface.dim, 0.78),
    },
    button: { alignItems: 'center', gap: spacing[2] },
    // Same white as the chapter title in the top bar (colors.text.title.primary) — the previous
    // colors.text.secondary read as too dim/dark against the footer's dark scrim.
    buttonLabel: { color: colors.text.title.primary, fontSize: text.size[1] },
}));
