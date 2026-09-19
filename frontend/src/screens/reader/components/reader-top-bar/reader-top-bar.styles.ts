import { Platform, StatusBar, StyleSheet } from 'react-native';
import { alpha } from '../../../../shared/theme';
import type { ThemeColors } from '../../../../shared/theme';

// Gap between the status bar and the series name — the header sits right under it (exact status
// bar distance, not a device-dependent guess).
export const STATUS_BAR_GAP = 6;
export const statusBarHeight = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 44;

export const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    root: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      flexDirection: 'row',
      alignItems: 'stretch',
      paddingBottom: 8,
      paddingHorizontal: 16,
      backgroundColor: alpha(colors.surface.dim, 0.5),
    },
    backButton: {
      justifyContent: 'center',
      marginRight: 12,
    },
    titles: {
      flex: 1,
      justifyContent: 'space-between',
      paddingTop: 4,
    },
    seriesName: { color: colors.text.secondary, fontSize: 11 },
    chapterTitle: { color: colors.text.title.primary, fontSize: 17, fontWeight: '600', alignSelf: 'flex-start' },
  });

