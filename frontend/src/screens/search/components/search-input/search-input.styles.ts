import { StyleSheet } from 'react-native';
import type { ThemeColors } from '../../../../shared/theme';

export const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    root: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginHorizontal: 16,
      marginTop: 12,
      marginBottom: 8,
      paddingHorizontal: 12,
      height: 44,
      borderRadius: 10,
      backgroundColor: colors.surface.secondary,
      borderWidth: 1,
      borderColor: colors.border.primary,
    },
    input: {
      flex: 1,
      color: colors.text.emphasis,
      fontSize: 15,
      padding: 0,
    },
  });

