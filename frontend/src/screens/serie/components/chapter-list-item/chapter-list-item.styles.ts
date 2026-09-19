import { createStyles } from '../../../../shared/theme';
export const chapterListItemStyles = createStyles(({ colors, text }) => ({
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
    title: { color: colors.text.title.primary, fontSize: text.size[3], marginLeft: 8, flex: 1 },
    titleRead: { color: colors.text.secondary },
    titleSelected: { color: colors.text.title.primary, fontWeight: text.weight.bold },
}));

