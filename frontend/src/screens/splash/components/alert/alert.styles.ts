import { StyleSheet } from 'react-native';
import { alpha } from '../../../../shared/theme';
import type { ThemeColors } from '../../../../shared/theme';

export const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: alpha(colors.surface.dim, 0.72),
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 28,
    },
    card: {
      backgroundColor: colors.surface.secondary,
      borderRadius: 16,
      paddingVertical: 24,
      paddingHorizontal: 24,
      width: '100%',
      gap: 12,
      shadowColor: colors.surface.dim,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.45,
      shadowRadius: 16,
      elevation: 12,
    },
    title: {
      color: colors.text.emphasis,
      fontSize: 17,
      fontWeight: '700',
      letterSpacing: 0.1,
    },
    message: {
      color: alpha(colors.text.button.secondary, 0.8),
      fontSize: 14,
      lineHeight: 21,
    },
    actions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      flexWrap: 'wrap',
      gap: 10,
      marginTop: 4,
    },
    btn: {
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 10,
      minWidth: 80,
      alignItems: 'center',
    },
    btnPressed: { opacity: 0.75 },
    btnPrimary: { backgroundColor: colors.button.primary },
    btnDestructive: { backgroundColor: colors.button.destructive },
    btnSecondary: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: alpha(colors.border.secondary, 0.2),
    },
    btnLabel: { fontSize: 14, fontWeight: '600' },
    btnLabelPrimary: { color: colors.text.button.primary },
    btnLabelDestructive: { color: colors.text.button.destructive },
    btnLabelSecondary: { color: alpha(colors.text.button.secondary, 0.8) },
  });

