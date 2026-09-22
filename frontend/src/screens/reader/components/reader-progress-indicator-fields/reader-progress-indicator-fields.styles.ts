import { createStyles } from '../../../../shared/theme';

export const readerProgressIndicatorFieldsStyles = createStyles(({ colors, text, spacing, radius, border, alpha }) => ({
    sectionLabel: { color: colors.text.label, fontSize: text.size[3], paddingBottom: spacing[3] },
    section: { gap: spacing[4] },

    // ── progress-colour rows (dot + theme name, one per row) — same shape as the theme Select's
    // own option rows in screens/config/components/select ──
    colorList: { borderRadius: radius.medium, overflow: 'hidden', backgroundColor: colors.surface.tertiary },
    colorRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing[6], paddingVertical: spacing[5] },
    colorRowActive: { backgroundColor: alpha(colors.button.selected, 0.16) },
    colorDivider: { height: border.small, backgroundColor: colors.surface.primary },
    // The dot's own size — a fixed, even measurement (not a scale step), matched to one line of
    // option text.
    colorDot: { width: 18, height: 18, borderRadius: radius.full, marginRight: spacing[5] },
    colorRowText: { color: colors.text.emphasis, fontSize: text.size[3], flex: 1 },
    colorRowTextActive: { color: colors.text.link.primary, fontWeight: text.weight.bold },

    // ── progress-position grid (left/right/top/bottom) ──
    positionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[4] },
    positionOption: {
      flexBasis: '47%',
      paddingVertical: spacing[4],
      paddingHorizontal: spacing[5],
      borderRadius: radius.medium,
      borderWidth: border.medium,
      borderColor: alpha(colors.border.secondary, 0.2),
      alignItems: 'center',
    },
    // Selected = the theme's own button colour, filled — same "this is the active choice" language
    // buttons use elsewhere, rather than a border-only highlight.
    positionOptionSelected: { borderColor: colors.button.selected, backgroundColor: colors.button.selected },
    positionOptionText: { color: alpha(colors.text.button.secondary, 0.8), fontSize: text.size[2] },
    positionOptionTextSelected: { color: colors.text.button.primary, fontWeight: text.weight.bold },
}));
