import { StyleSheet } from 'react-native';
import { alpha } from '../../../../shared/theme';
import type { ThemeColors } from '../../../../shared/theme';

export const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    strip: {
      paddingVertical: 4,
      paddingHorizontal: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stale: { backgroundColor: alpha(colors.banner.notice, 0.16) },
    offline: { backgroundColor: alpha(colors.banner.alert, 0.16) },
    confirmed: { backgroundColor: alpha(colors.banner.good, 0.16) },
    text: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.text.primary,
    },
  });

