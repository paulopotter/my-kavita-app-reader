import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16213E',
    borderRadius: 8,
    marginHorizontal: 8,
    marginVertical: 3,
    overflow: 'hidden',
  },
  thumb: { width: 52, height: 74, flexShrink: 0 },
  info: { flex: 1, paddingHorizontal: 10, paddingVertical: 8 },
  name: { color: '#FFFFFF', fontSize: 14, fontWeight: '600', marginBottom: 3 },
  progressBar: {
    height: 4,
    backgroundColor: '#0F3460',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#E94560',
    borderRadius: 2,
  },
  metaLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  meta: { color: '#A0AEC0', fontSize: 12, marginBottom: 2 },
  chapters: { color: '#718096', fontSize: 11 },
  starBtn: { paddingHorizontal: 12 },
});
