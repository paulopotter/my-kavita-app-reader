import { StyleSheet } from 'react-native';
import { colors } from '../../../../shared/theme';

export const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.card,
  },
  zebra: { backgroundColor: colors.background },
  read: { opacity: 0.5 },
  selected: { backgroundColor: colors.deep },
  checkbox: { width: 24, alignItems: 'center', justifyContent: 'center' },
  checkboxBox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.muted,
  },
  checkboxBoxChecked: {
    backgroundColor: colors.accent,
    borderColor: colors.textOnDark,
    borderWidth: 2,
  },
  title: { color: colors.textOnDark, fontSize: 14, marginLeft: 8, flex: 1 },
  titleRead: { color: colors.muted },
  titleSelected: { color: colors.textOnDark, fontWeight: '600' },
});
