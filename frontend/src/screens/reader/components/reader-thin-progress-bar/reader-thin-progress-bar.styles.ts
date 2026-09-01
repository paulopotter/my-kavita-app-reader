import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  // Thin, gold, translucent — anchored to the right edge, inset 10% top and bottom.
  track: {
    position: 'absolute',
    right: 4,
    top: '10%',
    bottom: '10%',
    width: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'visible',
  },
  fill: { width: 3, backgroundColor: '#FFC107' },
});
