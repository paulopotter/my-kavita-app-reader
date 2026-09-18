import { StyleSheet } from 'react-native';
import { colors } from '../../../../shared/theme';

export const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    bottom: 8,
    left: 16,
    right: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.accentStrong,
    alignItems: 'center',
  },
  text: { color: colors.textOnDark, fontSize: 13, fontWeight: '600' },
});
