import { StyleSheet } from 'react-native';
import { colors } from '../../../../shared/theme';

export const styles = StyleSheet.create({
  root: { gap: 12 },
  modeList: { gap: 8 },
  modeOption: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.white20,
  },
  modeOptionSelected: { borderColor: colors.accent, backgroundColor: colors.accentFaint },
  modeOptionText: { color: colors.white80, fontSize: 14 },
  modeOptionTextSelected: { color: colors.textOnDark, fontWeight: '600' },
  field: { gap: 4, marginTop: 8, marginBottom: 4 },
  fieldLabel: { color: colors.white72, fontSize: 12 },
  fieldHint: { color: colors.white45, fontSize: 11, fontStyle: 'italic' },
  input: {
    borderWidth: 1,
    borderColor: colors.white20,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: colors.textOnDark,
    fontSize: 14,
  },
});
