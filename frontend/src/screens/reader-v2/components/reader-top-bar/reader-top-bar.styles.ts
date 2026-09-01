import { Platform, StatusBar, StyleSheet } from 'react-native';

// Gap between the status bar and the series name — the header sits right under it (exact status
// bar distance, not a device-dependent guess).
export const STATUS_BAR_GAP = 6;
export const statusBarHeight = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 44;

export const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingBottom: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  backButton: {
    justifyContent: 'center',
    marginRight: 12,
  },
  backArrow: { color: '#FFFFFF', fontSize: 32, lineHeight: 32 },
  titles: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  seriesName: { color: '#A0AEC0', fontSize: 11 },
  chapterTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '600', alignSelf: 'flex-start' },
});
