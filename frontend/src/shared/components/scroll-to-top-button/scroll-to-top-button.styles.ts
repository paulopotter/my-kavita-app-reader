import { StyleSheet } from 'react-native';
import { colors } from '../../theme';

export const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    bottom: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.button.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
});
