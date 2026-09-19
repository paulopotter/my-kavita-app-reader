import { StyleSheet } from 'react-native';
import type { ThemeColors } from '../../theme';

export const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    button: {
      position: 'absolute',
      bottom: 16,
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.button.primary,
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 4,
    },
  });

