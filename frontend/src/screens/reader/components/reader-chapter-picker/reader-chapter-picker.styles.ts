import { createStyles, line as lineTokens, spacing as spacingTokens } from '../../../../shared/theme';

// A row's total height, as the sum of what it holds: its vertical padding twice plus one line of
// title — same formula as the series screen's CHAPTER_ROW_HEIGHT, for the same reason (FlatList's
// getItemLayout can then place every row without measuring any of them).
export const CHAPTER_PICKER_ROW_HEIGHT = spacingTokens[5] * 2 + lineTokens.height[3];

export const readerChapterPickerStyles = createStyles(({ colors, text, line, spacing, radius, border, alpha }) => ({
    backdrop: {
      flex: 1,
      backgroundColor: alpha(colors.surface.dim, 0.72),
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.surface.secondary,
      borderTopLeftRadius: radius.large,
      borderTopRightRadius: radius.large,
      paddingTop: spacing[6],
      // Leaves roughly a third of the screen visible above the sheet, same idea as any bottom
      // sheet on this app — never truly literal since it's a fraction of the viewport, not a
      // component's own measurement.
      maxHeight: '70%',
    },
    title: {
      color: colors.text.title.primary,
      fontSize: text.size[5],
      fontWeight: text.weight.bold,
      paddingHorizontal: spacing[7],
      paddingBottom: spacing[5],
      borderBottomWidth: border.small,
      borderBottomColor: colors.border.primary,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing[7],
      paddingVertical: spacing[5],
    },
    rowFocused: { backgroundColor: alpha(colors.button.selected, 0.16) },
    rowTitle: { color: colors.text.emphasis, fontSize: text.size[3], lineHeight: line.height[3], flex: 1 },
    rowTitleRead: { color: alpha(colors.text.secondary, 0.6) },
    rowTitleFocused: { color: colors.text.emphasis, fontWeight: text.weight.bold },
    separator: { height: border.small, backgroundColor: colors.border.primary },
    emptyText: { color: colors.text.secondary, fontSize: text.size[3], textAlign: 'center', paddingVertical: spacing[8] },
}));
