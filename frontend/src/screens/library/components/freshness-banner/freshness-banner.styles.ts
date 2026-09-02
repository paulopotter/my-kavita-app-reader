import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  strip: {
    paddingVertical: 4,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stale: { backgroundColor: 'rgba(233,69,96,0.16)' },
  offline: { backgroundColor: 'rgba(233,69,96,0.24)' },
  confirmed: { backgroundColor: 'rgba(46,160,67,0.20)' },
  text: {
    fontSize: 11,
    fontWeight: '600',
    color: '#B8C1D9',
  },
});
