import { createStyles } from '../../../../shared/theme';
export const chapterRangeStyles = createStyles(({ colors, text, spacing, radius, border, alpha }) => ({
    root: { gap: spacing[5] },
    row: { flexDirection: 'row', gap: spacing[5] },
    field: { flex: 1, gap: spacing[2] },
    fieldLabel: { color: alpha(colors.text.button.secondary, 0.8), fontSize: text.size[2] },
    input: {
      borderWidth: border.medium,
      borderColor: alpha(colors.border.secondary, 0.2),
      borderRadius: radius.medium,
      paddingHorizontal: spacing[5],
      paddingVertical: spacing[4],
      color: colors.text.emphasis,
      fontSize: text.size[3],
    },
}));
