import { StyleSheet } from 'react-native';

export const ARROW_BUTTON_SIZE = 32;
export const DOT_SIZE = 6;
// Minimum gap between dots = half the dot size. The dots container always spans arrow to arrow
// (flex:1); dots distribute via space-evenly. Many pages -> content grows, ScrollView-style
// overflow keeps the minimum gap instead of squeezing dots below legible.
export const DOT_GAP = DOT_SIZE / 2;

export const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    right: 8,
    top: 92,
    bottom: '8%',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  arrowButton: {
    width: ARROW_BUTTON_SIZE,
    height: ARROW_BUTTON_SIZE,
    borderRadius: ARROW_BUTTON_SIZE / 2,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dots: {
    flex: 1,
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingVertical: DOT_GAP,
    marginVertical: 4,
    width: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.75)',
  },
  dotTouchable: { alignItems: 'center', justifyContent: 'center' },
  dot: { width: DOT_SIZE, height: DOT_SIZE, borderRadius: DOT_SIZE / 2, backgroundColor: '#A0AEC0' },
  // Read page: same gold as the thin progress bar (#FFC107) at reduced opacity, to differ from
  // the active page without competing with its highlight.
  dotRead: { backgroundColor: 'rgba(255, 193, 7, 0.5)' },
  dotActive: { backgroundColor: '#E94560', width: 8, height: 8, borderRadius: 4 },
});
