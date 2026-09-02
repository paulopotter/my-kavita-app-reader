import { StyleSheet } from 'react-native';
import { colors } from '../../theme';

export const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.versionDivider,
  },
  col: {
    flex: 1,
    alignItems: 'center',
  },
  label: {
    fontSize: 9,
    color: colors.versionLabel,
    textTransform: 'lowercase',
    marginBottom: 2,
  },
  value: {
    fontSize: 10,
    color: colors.versionValue,
  },
});
