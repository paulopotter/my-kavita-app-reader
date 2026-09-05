import { StyleSheet } from 'react-native';
import { colors } from '../../../../../shared/theme';

// The section card for one notification group: a header (name + ⋯), then its URL list with the
// add-URL button. No credentials/health-check/connection-test — ntfy groups don't have any.
export const styles = StyleSheet.create({
  card: { borderWidth: 0.5, borderColor: colors.deep, borderRadius: 12, overflow: 'hidden', marginBottom: 10 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.card,
  },
  name: { fontSize: 14, fontWeight: '500', color: colors.textOnDark, flex: 1 },
  body: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 12, borderTopWidth: 0.5, borderTopColor: colors.deep },
  dots: { color: colors.muted, fontSize: 20, paddingHorizontal: 4 },
  subLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  addDashedBtn: {
    marginTop: 6,
    padding: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.accent,
    borderRadius: 8,
    alignItems: 'center',
  },
  addDashedTxt: { color: colors.accent, fontWeight: '600', fontSize: 13 },
});
