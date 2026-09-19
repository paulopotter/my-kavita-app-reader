import { StyleSheet } from 'react-native';
import type { ThemeColors } from '../../../../shared/theme';

export const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    bar: {
      position: 'absolute',
      right: 0,
      top: 0,
      bottom: 0,
      width: 36,
      justifyContent: 'center',
      backgroundColor: colors.surface.secondary,
      borderTopLeftRadius: 8,
      borderBottomLeftRadius: 8,
    },
    scroll: { flexGrow: 0 },
    content: { paddingVertical: 6 },
    item: {
      width: 36,
      alignItems: 'center',
      paddingVertical: 4,
    },
    letter: {
      color: colors.text.link.primary,
      fontSize: 11,
      fontWeight: '700',
    },
  });

