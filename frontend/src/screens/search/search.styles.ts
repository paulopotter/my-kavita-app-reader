import { StyleSheet } from 'react-native';
import { colors } from '../../shared/theme';

export const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  message: { color: colors.white55, fontSize: 14, textAlign: 'center', marginTop: 12 },
  errorText: { color: colors.accent, fontSize: 14, textAlign: 'center' },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.accent,
  },
  retryText: { color: colors.textOnDark, fontSize: 14, fontWeight: '600' },
  sectionTitle: {
    color: colors.white45,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 6,
  },
  resultCount: {
    color: colors.white45,
    fontSize: 12,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  list: { paddingBottom: 24 },
  historyRow: { flexDirection: 'row', alignItems: 'center' },
  historyCard: { flex: 1 },
  historyDelete: { paddingHorizontal: 16, paddingVertical: 12 },
});
