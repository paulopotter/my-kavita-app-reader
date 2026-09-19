import { createStyles } from '../../shared/theme';
export const notificationsStyles = createStyles(({ colors, text, line, spacing, border, gutter }) => ({
    root: { flex: 1, backgroundColor: colors.surface.primary },
    center: { flex: 1, backgroundColor: colors.surface.primary, justifyContent: 'center', alignItems: 'center', padding: spacing[8] },
    message: { color: colors.text.secondary, fontSize: text.size[4], textAlign: 'center' },

    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: gutter,
      paddingVertical: spacing[5],
      borderBottomWidth: border.small,
      borderBottomColor: colors.border.primary,
    },
    // Every text in both bars shares one line height: the bars have identical paddingVertical, so
    // this is what keeps the header's total height from shifting when entering/exiting selection
    // mode.
    totalCount: { color: colors.text.secondary, fontSize: text.size[3], lineHeight: line.height[4], fontWeight: text.weight.bold },
    markAllBtn: { paddingHorizontal: spacing[4], paddingVertical: spacing[2] },
    markAllTxt: { color: colors.text.link.primary, fontSize: text.size[3], lineHeight: line.height[4], fontWeight: text.weight.bold },
    selectionTopBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: gutter,
      paddingVertical: spacing[5],
      borderBottomWidth: border.small,
      borderBottomColor: colors.border.primary,
      backgroundColor: colors.surface.tertiary,
    },
    selectionCount: { color: colors.text.title.primary, fontSize: text.size[3], lineHeight: line.height[4], fontWeight: text.weight.bold },
    selectionCancelTxt: { color: colors.text.link.primary, fontSize: text.size[3], lineHeight: line.height[4], fontWeight: text.weight.bold },
}));

