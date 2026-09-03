import { StyleSheet } from 'react-native';
import { colors } from '../../../../../shared/theme';

// Add / edit a single URL of a server. URL + priority + a "test connection" button that only
// checks that URL is reachable (never changes which URL is active).
export const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', alignItems: 'center', padding: 16 },
  card: { width: '100%', maxWidth: 340, backgroundColor: colors.card, borderRadius: 12, padding: 18 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  title: { fontSize: 16, fontWeight: '600', color: colors.textOnDark },
  close: { color: colors.muted, fontSize: 18, paddingHorizontal: 4 },

  label: { fontSize: 12, color: colors.muted, marginBottom: 4, marginTop: 10 },
  input: { backgroundColor: colors.deep, color: colors.textOnDark, borderRadius: 8, padding: 11, fontSize: 13 },
  inputError: { borderWidth: 1, borderColor: colors.accent },
  errorTxt: { color: colors.msgError, fontSize: 11, marginTop: 6 },

  assocToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.mutedDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  checkboxMark: { color: colors.textOnDark, fontSize: 12, fontWeight: '700' },
  assocLabel: { color: colors.textOnDark, fontSize: 13 },

  testRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  testBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 0.5, borderColor: colors.accent },
  testBtnBusy: { opacity: 0.7 },
  testTxt: { color: colors.accent, fontSize: 13, fontWeight: '600' },
  testStatus: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  testMuted: { color: colors.muted, fontSize: 13 },
  testOk: { color: colors.msgOk, fontSize: 13 },
  testFail: { color: colors.msgError, fontSize: 13 },

  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 18 },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 8, borderWidth: 0.5, borderColor: colors.mutedDim },
  cancelTxt: { color: colors.muted, fontSize: 13, fontWeight: '600' },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 8, backgroundColor: colors.accent },
  saveBtnDisabled: { opacity: 0.45 },
  saveTxt: { color: colors.textOnDark, fontSize: 13, fontWeight: '700' },
});
