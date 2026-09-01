import { Dimensions, ViewStyle } from 'react-native';

// flex:1 alone isn't enough for custom native Views with no JS children — Yoga can't infer an
// intrinsic size and may collapse the view to 0x0. Explicit width/height removes the ambiguity.
const windowSize = Dimensions.get('window');

export const styles: { root: ViewStyle; sized: ViewStyle } = {
  root: { flex: 1 },
  sized: { width: windowSize.width, height: windowSize.height },
};
