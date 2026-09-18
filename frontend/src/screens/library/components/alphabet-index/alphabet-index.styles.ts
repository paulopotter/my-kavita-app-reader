import { StyleSheet } from 'react-native';
import { colors } from '../../../../shared/theme';

export const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 36,
    justifyContent: 'center',
    backgroundColor: colors.deepTranslucent,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  scroll: { flexGrow: 0 },
  content: { paddingVertical: 6 },
  item: {
    width: 36,
    alignItems: 'center',
    paddingVertical: 3,
  },
  letter: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '700',
  },
});
