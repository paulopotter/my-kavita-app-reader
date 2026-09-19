import { StyleSheet } from 'react-native';
import { alpha } from '../../../../shared/theme';
import type { ThemeColors } from '../../../../shared/theme';

// Add / edit a single URL of a server. URL + priority + a "test connection" button that only
// checks that URL is reachable (never changes which URL is active).
export const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    scrim: { flex: 1, backgroundColor: alpha(colors.surface.dim, 0.5), justifyContent: 'center', alignItems: 'center', padding: 16 },
    card: { width: '100%', maxWidth: 340, backgroundColor: colors.surface.secondary, borderRadius: 12, padding: 18 },

    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    title: { fontSize: 16, fontWeight: '600', color: colors.text.title.primary },

    label: { fontSize: 12, color: colors.text.secondary, marginBottom: 4, marginTop: 10 },
    input: { backgroundColor: colors.surface.tertiary, color: colors.text.input.primary, borderRadius: 8, padding: 12, fontSize: 13 },
    inputError: { borderWidth: 1, borderColor: colors.border.input.error },
    errorTxt: { color: colors.text.message.bad, fontSize: 11, marginTop: 6 },
    submitErrorRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
    submitErrorTxt: { color: colors.text.message.bad, fontSize: 11 },

    assocToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
    checkbox: {
      width: 18,
      height: 18,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: colors.border.checkbox.off,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxOn: { backgroundColor: colors.button.selected, borderColor: colors.border.accent },
    assocLabel: { color: colors.text.label, fontSize: 13 },

    testRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
    testBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 0.5, borderColor: colors.border.accent },
    testBtnBusy: { opacity: 0.7 },
    testTxt: { color: colors.text.link.primary, fontSize: 13, fontWeight: '600' },
    testStatus: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    testMuted: { color: colors.text.secondary, fontSize: 13 },
    testOk: { color: colors.text.message.good, fontSize: 13 },
    testFail: { color: colors.text.message.bad, fontSize: 13 },

    actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 18 },
    cancelBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, borderWidth: 0.5, borderColor: colors.border.disabled },
    cancelTxt: { color: colors.text.secondary, fontSize: 13, fontWeight: '600' },
    saveBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, backgroundColor: colors.button.primary },
    saveBtnDisabled: { opacity: 0.45 },
    saveTxt: { color: colors.text.button.primary, fontSize: 13, fontWeight: '700' },
  });

