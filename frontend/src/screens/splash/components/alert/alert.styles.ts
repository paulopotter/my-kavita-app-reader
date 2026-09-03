import { StyleSheet } from 'react-native';
import { colors } from '../../../../shared/theme';

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
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 12,
  },
  title: {
    color: colors.textOnDark,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  message: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 14,
    lineHeight: 21,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  btn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    minWidth: 80,
    alignItems: 'center',
  },
  btnPressed: { opacity: 0.75 },
  btnPrimary: { backgroundColor: colors.accent },
  btnDestructive: { backgroundColor: colors.danger },
  btnSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  btnLabel: { fontSize: 14, fontWeight: '600' },
  btnLabelPrimary: { color: colors.textOnDark },
  btnLabelDestructive: { color: colors.textOnDark },
  btnLabelSecondary: { color: 'rgba(255,255,255,0.80)' },
});
