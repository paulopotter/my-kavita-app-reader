import { StyleSheet } from 'react-native';
import { createStyles } from '../../../../shared/theme';
// Verbatim from ConfigScreen's langSwitchRow/langOption/langTrack/langThumb block.
export const languageToggleStyles = createStyles(({ colors, text, alpha }) => ({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      gap: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: alpha(colors.border.secondary, 0.13),
    },
    option: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
    optionActive: { backgroundColor: colors.button.selected },
    optionTxt: { color: colors.text.secondary, fontSize: text.size[3], fontWeight: text.weight.bold },
    optionTxtActive: { color: colors.text.emphasis },
    track: {
      width: 40,
      height: 22,
      borderRadius: 12,
      backgroundColor: colors.surface.tertiary,
      borderWidth: 1,
      borderColor: colors.border.disabled,
      justifyContent: 'center',
      paddingHorizontal: 2,
    },
    thumb: { width: 16, height: 16, borderRadius: 8, backgroundColor: colors.button.primary, alignSelf: 'flex-start' },
    thumbRight: { alignSelf: 'flex-end' },
}));

