import { StyleSheet } from 'react-native';
import { colors, alpha } from '../../theme';

export const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: alpha(colors.surface.dim, 0.72),
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  card: {
    backgroundColor: colors.surface.secondary,
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 24,
    width: '100%',
    gap: 16,
  },
  title: { color: colors.text.title.primary, fontSize: 17, fontWeight: '700' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  btn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10, minWidth: 80, alignItems: 'center' },
  btnPrimary: { backgroundColor: colors.button.primary },
  btnSecondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: alpha(colors.border.secondary, 0.2) },
  btnLabelPrimary: { color: colors.text.button.primary, fontSize: 14, fontWeight: '600' },
  btnLabelSecondary: { color: alpha(colors.text.button.secondary, 0.8), fontSize: 14, fontWeight: '600' },
});
