import { StyleSheet } from 'react-native';
import { colors, alpha } from '../../../../shared/theme';

export const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    bottom: 8,
    left: 16,
    right: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: alpha(colors.banner.alert, 0.9),
    alignItems: 'center',
  },
  text: { color: colors.text.emphasis, fontSize: 13, fontWeight: '600' },
});
