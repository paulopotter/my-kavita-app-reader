import { StyleSheet } from 'react-native';
import { alpha } from '../../../../shared/theme';
import type { ThemeColors } from '../../../../shared/theme';

export const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    // Thin, gold, translucent — anchored to the right edge, inset 10% top and bottom.
    track: {
      position: 'absolute',
      right: 4,
      top: '10%',
      bottom: '10%',
      width: 3,
      borderRadius: 2.5,
      backgroundColor: alpha(colors.progress.secondary, 0.15),
      overflow: 'visible',
    },
    fill: { width: 3, backgroundColor: colors.progress.reading.primary },
  });

