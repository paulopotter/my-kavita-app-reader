import { createStyles } from '../../../../shared/theme';
export const chapterSortStyles = createStyles(({ colors, text, alpha }) => ({
    root: { gap: 12 },
    modeList: { gap: 8 },
    modeOption: {
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: alpha(colors.border.secondary, 0.2),
    },
    modeOptionSelected: { borderColor: colors.border.accent, backgroundColor: alpha(colors.button.selected, 0.16) },
    modeOptionText: { color: alpha(colors.text.button.secondary, 0.8), fontSize: text.size[3] },
    modeOptionTextSelected: { color: colors.text.emphasis, fontWeight: text.weight.bold },
    field: { gap: 4, marginTop: 8, marginBottom: 4 },
    fieldLabel: { color: alpha(colors.text.button.secondary, 0.8), fontSize: text.size[2] },
    fieldHint: { color: alpha(colors.text.secondary, 0.45), fontSize: text.size[2], fontStyle: 'italic' },
    input: {
      borderWidth: 1,
      borderColor: alpha(colors.border.secondary, 0.2),
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      color: colors.text.emphasis,
      fontSize: text.size[3],
    },
}));

