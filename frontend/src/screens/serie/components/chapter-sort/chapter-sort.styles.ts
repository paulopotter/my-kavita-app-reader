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
    borderColor: 'rgba(255,255,255,0.2)',
  },
  modeOptionSelected: { borderColor: colors.accent, backgroundColor: 'rgba(233,69,96,0.12)' },
  modeOptionText: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  modeOptionTextSelected: { color: colors.textOnDark, fontWeight: '600' },
  field: { gap: 4, marginTop: 8, marginBottom: 4 },
  fieldLabel: { color: 'rgba(255,255,255,0.72)', fontSize: 12 },
  fieldHint: { color: 'rgba(255,255,255,0.45)', fontSize: 11, fontStyle: 'italic' },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: colors.textOnDark,
    fontSize: 14,
  },
});
