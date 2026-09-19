import { createStyles } from '../../../../shared/theme';
// Verbatim from ConfigScreen's langSwitchRow/langOption/langTrack/langThumb block.
export const languageToggleStyles = createStyles(({ colors, text, spacing, radius, border, alpha }) => ({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing[5],
      gap: spacing[4],
      borderTopWidth: border.small,
      borderTopColor: alpha(colors.border.secondary, 0.13),
    },
    option: { paddingHorizontal: spacing[4], paddingVertical: spacing[3], borderRadius: radius.full },
    optionActive: { backgroundColor: colors.button.selected },
    optionTxt: { color: colors.text.secondary, fontSize: text.size[3], fontWeight: text.weight.bold },
    optionTxtActive: { color: colors.text.emphasis },
    track: {
      width: 40,
      height: 22,
      borderRadius: radius.large,
      backgroundColor: colors.surface.tertiary,
      borderWidth: border.medium,
      borderColor: colors.border.disabled,
      justifyContent: 'center',
      paddingHorizontal: spacing[1],
    },
    thumb: { width: 16, height: 16, borderRadius: radius.medium, backgroundColor: colors.button.primary, alignSelf: 'flex-start' },
    thumbRight: { alignSelf: 'flex-end' },
}));

