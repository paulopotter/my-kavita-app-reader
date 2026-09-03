import { StyleSheet } from 'react-native';
import { colors } from '../../../../../shared/theme';

// Verbatim from the styles SmokeTestSection borrowed off ConfigScreen (formCard/section/
// inputFull/outlineBtn/serverRow/dot/msg*).
export const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: 10, padding: 12, marginBottom: 4 },
  title: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.sectionLabel,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginTop: 20,
    marginBottom: 10,
  },
  inputLabel: { fontSize: 12, color: colors.muted, marginBottom: 4, marginTop: 10 },
  input: {
    backgroundColor: colors.deep,
    color: colors.textOnDark,
    borderRadius: 8,
    padding: 11,
    fontSize: 13,
    marginBottom: 4,
  },
  runBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: colors.accent },
  runTxt: { color: colors.accent, fontSize: 13, fontWeight: '600' },
  disabled: { opacity: 0.45 },

  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 6,
    gap: 8,
  },
  dot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  dotOk: { backgroundColor: colors.positive },
  dotFail: { backgroundColor: colors.mutedDim },
  label: { flex: 1, color: colors.textOnDark, fontSize: 13 },
  detailOk: { color: colors.msgOk, fontSize: 12, marginTop: 6 },
  detailFail: { color: colors.msgError, fontSize: 12, marginTop: 6 },
});
