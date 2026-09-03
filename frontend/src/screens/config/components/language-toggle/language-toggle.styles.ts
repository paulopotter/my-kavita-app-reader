import { StyleSheet } from 'react-native';
import { colors } from '../../../../shared/theme';

// Verbatim from ConfigScreen's langSwitchRow/langOption/langTrack/langThumb block.
export const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.versionDivider,
  },
  option: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  optionActive: { backgroundColor: colors.accent },
  optionTxt: { color: colors.muted, fontSize: 13, fontWeight: '600' },
  optionTxtActive: { color: colors.textOnDark },
  track: {
    width: 40,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.deep,
    borderWidth: 1,
    borderColor: colors.mutedDim,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  thumb: { width: 16, height: 16, borderRadius: 8, backgroundColor: colors.accent, alignSelf: 'flex-start' },
  thumbRight: { alignSelf: 'flex-end' },
});
