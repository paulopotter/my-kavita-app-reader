import { StyleSheet } from 'react-native';
import { colors } from '../../theme';

export const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlayHeavy,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 24,
    width: '100%',
    gap: 16,
  },
  title: { color: colors.textOnDark, fontSize: 17, fontWeight: '700' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  btn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10, minWidth: 80, alignItems: 'center' },
  btnPrimary: { backgroundColor: colors.accent },
  btnSecondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.white20 },
  btnLabelPrimary: { color: colors.textOnDark, fontSize: 14, fontWeight: '600' },
  btnLabelSecondary: { color: colors.white80, fontSize: 14, fontWeight: '600' },
});
