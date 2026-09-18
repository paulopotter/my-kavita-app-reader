import { StyleSheet } from 'react-native';
import { colors } from '../../theme';

export const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.deep,
    paddingVertical: 14,
    minHeight: 76,
  },
  button: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
  buttonText: { color: colors.textOnDark, fontSize: 11, fontWeight: '600', textAlign: 'center' },
});
