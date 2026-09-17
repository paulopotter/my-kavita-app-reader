import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  card: {
    backgroundColor: '#16213E',
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 24,
    width: '100%',
    gap: 16,
  },
  title: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  btn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10, minWidth: 80, alignItems: 'center' },
  btnPrimary: { backgroundColor: '#E94560' },
  btnSecondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  btnLabelPrimary: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  btnLabelSecondary: { color: 'rgba(255,255,255,0.80)', fontSize: 14, fontWeight: '600' },
});
