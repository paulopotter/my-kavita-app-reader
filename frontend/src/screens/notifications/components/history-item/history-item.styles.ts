import { createStyles } from '../../../../shared/theme';
export const historyItemStyles = createStyles(({ colors, text, spacing, radius, border, gutter }) => ({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: gutter,
      paddingVertical: spacing[5],
      borderBottomWidth: border.small,
      borderBottomColor: colors.border.primary,
    },
    rowSelected: { backgroundColor: colors.surface.tertiary },
    // Fixed-size slot for the leading indicator (unread dot or selection checkbox) — same
    // footprint either way, so switching selection mode never shifts the row's own content
    // horizontally (previously the 8px dot vs. 20px checkbox changed the row's layout width).
    indicator: { width: 20, height: 20, marginRight: spacing[5], flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
    dot: { width: 8, height: 8, borderRadius: radius.small },
    // Reserved even before coverUrl resolves (see HistoryItem's own doc) — the placeholder fills
    // this same box, so a cover arriving later never shifts the row's layout.
    thumb: { width: 36, height: 51, borderRadius: radius.small, marginRight: spacing[5], flexShrink: 0 },
    thumbPlaceholder: { backgroundColor: colors.surface.tertiary },
    body: { flex: 1 },
    seriesName: { color: colors.text.title.primary, fontSize: text.size[3], fontWeight: text.weight.bold },
    seriesNameRead: { color: colors.text.secondary, fontWeight: text.weight.regular },
    bodyText: { color: colors.text.secondary, fontSize: text.size[3], marginTop: spacing[1] },
    timestamp: { color: colors.text.secondary, fontSize: text.size[2], marginTop: spacing[2] },
    // Reserved even in selection mode (opacity 0, not removed — see HistoryItem's own doc) so the
    // row's available text width never changes when entering/exiting selection mode.
    trailingActions: { flexDirection: 'row' },
    trailingActionsHidden: { opacity: 0 },
    iconBtn: { paddingHorizontal: spacing[4], paddingVertical: spacing[2], marginLeft: spacing[2] },
}));

