import { createStyles } from '../../../../shared/theme';
export const chapterSortStyles = createStyles(({ colors, text, spacing, radius, border, alpha }) => ({
    root: { gap: spacing[5] },
    modeList: { gap: spacing[4] },
    modeOption: {
      paddingVertical: spacing[4],
      paddingHorizontal: spacing[5],
      borderRadius: radius.medium,
      borderWidth: border.medium,
      borderColor: alpha(colors.border.secondary, 0.2),
    },
    modeOptionSelected: { borderColor: colors.border.accent, backgroundColor: alpha(colors.button.selected, 0.16) },
    modeOptionText: { color: alpha(colors.text.button.secondary, 0.8), fontSize: text.size[3] },
    modeOptionTextSelected: { color: colors.text.emphasis, fontWeight: text.weight.bold },
    field: { gap: spacing[2], marginTop: spacing[4], marginBottom: spacing[2] },
    fieldLabel: { color: alpha(colors.text.button.secondary, 0.8), fontSize: text.size[2] },
    fieldHint: { color: alpha(colors.text.secondary, 0.45), fontSize: text.size[2], fontStyle: 'italic' },
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

