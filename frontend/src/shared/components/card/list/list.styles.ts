import { StyleSheet } from 'react-native';
import type { ThemeColors } from '../../../theme';

export const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface.secondary,
      borderRadius: 8,
      marginHorizontal: 8,
      marginVertical: 4,
      overflow: 'hidden',
    },
    thumb: { width: 52, height: 74, flexShrink: 0 },
    info: { flex: 1, paddingHorizontal: 10, paddingVertical: 8 },
    name: { color: colors.text.title.primary, fontSize: 14, fontWeight: '600', marginBottom: 4 },
    progressBar: {
      height: 4,
      backgroundColor: colors.surface.tertiary,
      borderRadius: 2,
      overflow: 'hidden',
      marginBottom: 2,
    },
    progressFill: {
      height: '100%',
      backgroundColor: colors.button.primary,
      borderRadius: 2,
    },
    metaLine: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    meta: { color: colors.text.secondary, fontSize: 12, marginBottom: 2 },
    chapters: { color: colors.text.secondary, fontSize: 11 },
    starBtn: { paddingHorizontal: 12 },
  });

