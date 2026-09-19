import { StyleSheet } from 'react-native';
import { alpha } from '../../theme';
import type { ThemeColors } from '../../theme';

export const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: alpha(colors.border.secondary, 0.13),
    },
    col: {
      flex: 1,
      alignItems: 'center',
    },
    label: {
      fontSize: 9,
      color: alpha(colors.text.ghost, 0.27),
      textTransform: 'lowercase',
      marginBottom: 2,
    },
    value: {
      fontSize: 10,
      color: colors.text.secondary,
    },
  });

