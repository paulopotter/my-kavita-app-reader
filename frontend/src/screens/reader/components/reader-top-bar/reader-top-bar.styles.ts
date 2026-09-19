import { createStyles } from '../../../../shared/theme';
import { Platform, StatusBar } from 'react-native';

// Gap between the status bar and the series name — the header sits right under it (exact status
// bar distance, not a device-dependent guess).
export const STATUS_BAR_GAP = 6;
export const statusBarHeight = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 44;

export const readerTopBarStyles = createStyles(({ colors, text, spacing, alpha }) => ({
    root: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      flexDirection: 'row',
      alignItems: 'stretch',
      paddingBottom: spacing[4],
      paddingHorizontal: spacing[6],
      backgroundColor: alpha(colors.surface.dim, 0.5),
    },
    backButton: {
      justifyContent: 'center',
      marginRight: spacing[5],
    },
    titles: {
      flex: 1,
      justifyContent: 'space-between',
      paddingTop: spacing[2],
    },
    seriesName: { color: colors.text.secondary, fontSize: text.size[2] },
    chapterTitle: { color: colors.text.title.primary, fontSize: text.size[5], fontWeight: text.weight.bold, alignSelf: 'flex-start' },
}));

