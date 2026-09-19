import { createStyles } from '../../../../shared/theme';
// A tap-to-open single-choice select. The trigger shows the current value; the sheet lists every
// option one per row. Used where a chip row would get unreadable (e.g. many URLs).
export const selectStyles = createStyles(({ colors, text, spacing, radius, alpha, border }) => ({
    trigger: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surface.tertiary,
      borderRadius: radius.medium,
      paddingHorizontal: spacing[5],
      paddingVertical: spacing[5],
    },
    triggerTxt: { color: colors.text.input.primary, fontSize: text.size[3], flex: 1 },
    triggerPlaceholder: { color: colors.text.tertiary },
    triggerDisabled: { opacity: 0.6 },
    caret: { marginLeft: spacing[4] },

    scrim: { flex: 1, backgroundColor: alpha(colors.surface.dim, 0.5), justifyContent: 'center', alignItems: 'center', padding: spacing[8] },
    sheet: { width: '100%', maxWidth: 320, backgroundColor: colors.surface.secondary, borderRadius: radius.large, overflow: 'hidden' },
    option: { paddingHorizontal: spacing[6], paddingVertical: spacing[5] },
    optionActive: { backgroundColor: colors.surface.tertiary },
    optionTxt: { color: colors.text.emphasis, fontSize: text.size[3] },
    optionTxtActive: { color: colors.text.link.primary, fontWeight: text.weight.bold },
    divider: { height: border.small, backgroundColor: colors.surface.tertiary },
}));

