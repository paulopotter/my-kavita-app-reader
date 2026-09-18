import { StyleSheet } from 'react-native';
import { colors } from '../../../../shared/theme';

export const styles = StyleSheet.create({
  // Thin, gold, translucent — anchored to the right edge, inset 10% top and bottom.
  track: {
    position: 'absolute',
    right: 4,
    top: '10%',
    bottom: '10%',
    width: 3,
    borderRadius: 1.5,
    backgroundColor: colors.white20,
    overflow: 'visible',
  },
  fill: { width: 3, backgroundColor: colors.progressAmber },
});
