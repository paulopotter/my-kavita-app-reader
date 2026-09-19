import { StyleSheet } from 'react-native';
import { colors } from '../../../../shared/theme';

// The section card for one server (or metadata server): a header (name + ⋯), then masked
// credential rows, then the URL list with add / test buttons.
export const styles = StyleSheet.create({
  card: { borderWidth: 0.5, borderColor: colors.border.primary, borderRadius: 12, overflow: 'hidden', marginBottom: 10 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.surface.secondary,
  },
  headerName: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  name: { fontSize: 14, fontWeight: '500', color: colors.text.title.primary, flex: 1 },
  body: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 12, borderTopWidth: 0.5, borderTopColor: colors.border.primary },

  subLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 12,
    marginBottom: 8,
  },
  credRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.primary,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  credValue: { flex: 1, color: colors.text.input.primary, fontSize: 13, letterSpacing: 1 },

  addDashedBtn: {
    marginTop: 6,
    padding: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border.accent,
    borderRadius: 8,
    alignItems: 'center',
  },
  addDashedTxt: { color: colors.text.link.primary, fontWeight: '600', fontSize: 13 },

  actionRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  outlineBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: colors.border.accent },
  outlineTxt: { color: colors.text.link.primary, fontSize: 13, fontWeight: '600' },
  btnDisabled: { opacity: 0.45 },
  msgRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  msgOk: { color: colors.text.message.good, fontSize: 12 },
  msgError: { color: colors.text.message.bad, fontSize: 12 },
});
