import { StyleSheet } from 'react-native';
import { colors, alpha } from '../../../../shared/theme';

// Add / edit server modal. Sits over the screen (Modal transparent). Provider select + name +
// the provider's dynamic credential fields.
export const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: alpha(colors.surface.dim, 0.5), justifyContent: 'center', alignItems: 'center', padding: 16 },
  card: { width: '100%', maxWidth: 340, backgroundColor: colors.surface.secondary, borderRadius: 12, padding: 18 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  title: { fontSize: 16, fontWeight: '600', color: colors.text.title.primary },

  label: { fontSize: 12, color: colors.text.secondary, marginBottom: 4, marginTop: 10 },
  required: { color: colors.text.link.primary },
  input: {
    backgroundColor: colors.surface.tertiary,
    color: colors.text.emphasis,
    borderRadius: 8,
    padding: 11,
    fontSize: 13,
  },
  inputDisabled: { opacity: 0.55 },
  submitErrorRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  submitErrorTxt: { color: colors.text.message.bad, fontSize: 11 },

  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 18 },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: colors.border.disabled,
  },
  cancelTxt: { color: colors.text.secondary, fontSize: 13, fontWeight: '600' },
  saveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: colors.button.primary,
  },
  saveBtnDisabled: { opacity: 0.45 },
  saveTxt: { color: colors.text.button.primary, fontSize: 13, fontWeight: '700' },
});
