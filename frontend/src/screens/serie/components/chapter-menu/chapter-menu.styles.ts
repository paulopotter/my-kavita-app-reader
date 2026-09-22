import { createStyles } from '../../../../shared/theme';
export const chapterMenuStyles = createStyles(({ colors, text, spacing, radius, border, gutter, alpha }) => ({
    backdrop: { flex: 1 },
    // top/right are overridden inline per-instance, anchored to the ⋮ button's own measured
    // position (see chapter-menu.component.tsx) — these are only the pre-measurement fallback,
    // never seen in practice since the anchor is computed before the menu opens.
    card: {
      position: 'absolute',
      top: gutter,
      right: gutter,
      backgroundColor: colors.surface.secondary,
      borderRadius: radius.medium,
      borderWidth: border.small,
      borderColor: alpha(colors.border.secondary, 0.2),
      paddingVertical: spacing[3],
    },
    item: { flexDirection: 'row', alignItems: 'center', gap: spacing[4], paddingVertical: spacing[4], paddingHorizontal: spacing[6] },
    itemText: { color: colors.text.emphasis, fontSize: text.size[3] },
}));
