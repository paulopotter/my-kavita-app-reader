import { StyleSheet } from 'react-native';
import { alpha } from '../../../../shared/theme';
import type { ThemeColors } from '../../../../shared/theme';

export const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    root: {
      position: 'absolute',
      bottom: 8,
      left: 16,
      right: 16,
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 8,
      backgroundColor: alpha(colors.banner.alert, 0.9),
      alignItems: 'center',
    },
    text: { color: colors.text.emphasis, fontSize: 13, fontWeight: '600' },
  });

