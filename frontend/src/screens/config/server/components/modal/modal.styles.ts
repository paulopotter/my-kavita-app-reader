import { StyleSheet } from 'react-native';
import { colors } from '../../../../../shared/theme';

// Add / edit server modal. Sits over the screen (Modal transparent). Provider select + name +
// the provider's dynamic credential fields.
export const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', alignItems: 'center', padding: 16 },
  card: { width: '100%', maxWidth: 340, backgroundColor: colors.card, borderRadius: 12, padding: 18 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  title: { fontSize: 16, fontWeight: '600', color: colors.textOnDark },
  close: { color: colors.muted, fontSize: 18, paddingHorizontal: 4 },

  label: { fontSize: 12, color: colors.muted, marginBottom: 4, marginTop: 10 },
  required: { color: colors.accent },
  input: {
    backgroundColor: colors.deep,
    color: colors.textOnDark,
    borderRadius: 8,
    padding: 11,
    fontSize: 13,
  },
  inputDisabled: { opacity: 0.55 },
  errorTxt: { color: colors.msgError, fontSize: 11, marginTop: 6 },

  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 18 },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: colors.mutedDim,
  },
  cancelTxt: { color: colors.muted, fontSize: 13, fontWeight: '600' },
  saveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: colors.accent,
  },
  saveBtnDisabled: { opacity: 0.45 },
  saveTxt: { color: colors.textOnDark, fontSize: 13, fontWeight: '700' },
});
