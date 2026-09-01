import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  // Final look: thin, gold, translucent.
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

  // Debug: high-contrast colors/width + numeric label + 10% ticks, to visually check the fill
  // tracks scrollFraction/chapterFraction 1:1. Toggled via DEBUG_MODE in the component.
  trackDebug: {
    position: 'absolute',
    right: 4,
    top: '10%',
    bottom: '10%',
    width: 13,
    borderRadius: 6.5,
    borderWidth: 2,
    borderColor: '#00BFFF',
    backgroundColor: '#000000',
    overflow: 'visible',
  },
  fillDebug: { width: 13, backgroundColor: '#FF00FF' },
  tickMark: {
    position: 'absolute',
    left: 0,
    width: 13,
    height: 1,
    backgroundColor: '#FFFFFF',
  },
  labelWrapper: {
    position: 'absolute',
    left: -120,
    alignItems: 'flex-end',
    width: 116,
    transform: [{ translateY: -8 }],
  },
  label: {
    color: '#00BFFF',
    fontSize: 11,
    fontWeight: 'bold',
    backgroundColor: '#000000',
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
});
