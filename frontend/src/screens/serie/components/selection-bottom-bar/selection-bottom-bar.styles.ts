import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    backgroundColor: '#16213E',
    borderTopWidth: 1,
    borderTopColor: '#0F3460',
    paddingVertical: 14,
    minHeight: 76,
  },
  button: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
  buttonText: { color: '#FFFFFF', fontSize: 11, fontWeight: '600', textAlign: 'center' },
});
