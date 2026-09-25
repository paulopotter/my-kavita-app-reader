import { createStyles } from '../../../../shared/theme';

export const libraryFilterMenuStyles = createStyles(({ colors, text, spacing, radius, border, icon }) => ({
    // A top sheet spanning the screen's own width, dropping from just below the header (where the
    // filter icon lives) — sized to its content's height, not a fixed popover anchored under the
    // button. Sidesteps needing the button's exact on-screen position altogether (see
    // library.screen.tsx's openFilterMenu for the device bug that motivated this).
    backdrop: { flex: 1, justifyContent: 'flex-start' },
    // Clears library.screen.tsx's topBar without measuring it: the same tokens that build that
    // bar's height (its own vertical padding around the filter icon, plus its bottom border).
    card: {
      backgroundColor: colors.surface.secondary,
      marginTop: spacing[4] * 2 + icon.size[5] + border.small,
      borderBottomLeftRadius: radius.large,
      borderBottomRightRadius: radius.large,
      paddingVertical: spacing[5],
      paddingHorizontal: spacing[6],
    },
    title: { color: colors.text.title.primary, fontSize: text.size[3], fontWeight: text.weight.bold, paddingBottom: spacing[4] },
    item: { flexDirection: 'row', alignItems: 'center', gap: spacing[4], paddingVertical: spacing[4] },
    checkbox: {
      width: 20,
      height: 20,
      borderRadius: radius.small,
      borderWidth: border.medium,
      borderColor: colors.border.checkbox.off,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxChecked: { backgroundColor: colors.button.selected, borderColor: colors.border.checkbox.on },
    itemText: { color: colors.text.emphasis, fontSize: text.size[3], flex: 1 },
    divider: { height: border.small, backgroundColor: colors.border.primary, marginVertical: spacing[4] },
    clearBtn: { paddingVertical: spacing[3] },
    clearBtnText: { color: colors.text.link.primary, fontSize: text.size[3], fontWeight: text.weight.bold },
    clearBtnDisabled: { opacity: 0.4 },
}));
