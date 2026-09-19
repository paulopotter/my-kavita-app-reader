import { StyleSheet } from 'react-native';
import { colors } from '../../../../shared/theme';

export const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.surface.secondary,
  },
  zebra: { backgroundColor: colors.surface.primary },
  read: { opacity: 0.5 },
  selected: { backgroundColor: colors.surface.tertiary },
  checkbox: { width: 24, alignItems: 'center', justifyContent: 'center' },
  checkboxBox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border.checkbox.off,
  },
  checkboxBoxChecked: {
    backgroundColor: colors.button.selected,
    borderColor: colors.border.checkbox.on,
  },
  title: { color: colors.text.title.primary, fontSize: 14, marginLeft: 8, flex: 1 },
  titleRead: { color: colors.text.secondary },
  titleSelected: { color: colors.text.title.primary, fontWeight: '600' },
});
