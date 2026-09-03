import { StyleSheet } from 'react-native';
import { colors } from '../../../../../shared/theme';

// From ConfigScreen's formCard/addRow/input*/addBtn*/cancelBtn/errorTxt/editLabel/linkChip*.
export const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: 10, padding: 12, marginBottom: 4 },
  editLabel: { fontSize: 11, color: colors.accent, marginBottom: 6 },
  inputLabel: { fontSize: 12, color: colors.muted, marginBottom: 4, marginTop: 10 },

  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: { flex: 1, backgroundColor: colors.deep, color: colors.textOnDark, borderRadius: 8, padding: 11, fontSize: 13 },
  inputFull: {
    backgroundColor: colors.deep,
    color: colors.textOnDark,
    borderRadius: 8,
    padding: 11,
    fontSize: 13,
    marginBottom: 4,
  },
  inputError: { borderWidth: 1, borderColor: colors.accent },
  errorTxt: { color: colors.accent, fontSize: 11, marginTop: 4 },

  okBtn: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: colors.deep,
    borderWidth: 1,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  okBtnPrimary: { backgroundColor: colors.accent, borderColor: colors.accent },
  okTxt: { color: colors.accent, fontSize: 20, fontWeight: '700', lineHeight: 24 },
  okTxtWhite: { color: colors.textOnDark, fontSize: 18, fontWeight: '700' },
  cancelBtn: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: colors.deep,
    borderWidth: 1,
    borderColor: colors.mutedDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelTxt: { color: colors.muted, fontSize: 16, fontWeight: '700' },
  btnDisabled: { opacity: 0.45 },

  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 12 },

  linkOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  linkChip: { backgroundColor: colors.deep, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6, maxWidth: 180 },
  linkChipActive: { backgroundColor: colors.accent },
  linkChipTxt: { color: colors.muted, fontSize: 12 },
  linkChipTxtActive: { color: colors.textOnDark },
});
