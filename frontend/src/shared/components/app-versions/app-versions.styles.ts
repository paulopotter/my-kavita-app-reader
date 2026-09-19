import { StyleSheet } from 'react-native';
import { createStyles } from '../../theme';
export const appVersionsStyles = createStyles(({ colors, text, alpha }) => ({
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
      fontSize: text.size[1],
      color: alpha(colors.text.ghost, 0.27),
      textTransform: 'lowercase',
      marginBottom: 2,
    },
    value: {
      fontSize: text.size[1],
      color: colors.text.secondary,
    },
}));

