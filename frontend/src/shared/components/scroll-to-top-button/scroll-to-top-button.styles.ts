import { StyleSheet } from 'react-native';
import { colors } from '../../theme';

export const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    bottom: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  icon: { color: colors.textOnDark, fontSize: 20, fontWeight: '700', lineHeight: 24 },
});
