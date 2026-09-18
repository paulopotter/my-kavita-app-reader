import { StyleSheet } from 'react-native';
import { colors } from '../../../theme';

export const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 8,
    marginHorizontal: 8,
    marginVertical: 3,
    overflow: 'hidden',
  },
  thumb: { width: 52, height: 74, flexShrink: 0 },
  info: { flex: 1, paddingHorizontal: 10, paddingVertical: 8 },
  name: { color: colors.textOnDark, fontSize: 14, fontWeight: '600', marginBottom: 3 },
  progressBar: {
    height: 4,
    backgroundColor: colors.deep,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 2,
  },
  metaLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  meta: { color: colors.muted, fontSize: 12, marginBottom: 2 },
  chapters: { color: colors.mutedAlt, fontSize: 11 },
  starBtn: { paddingHorizontal: 12 },
});
