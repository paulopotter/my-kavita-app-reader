import { createStyles } from '../../shared/theme';
// Shared chrome for the Config screens — the menu rows, the sub-screen header with the back
// chevron, the scroll padding, the uppercase section label. Each sub-screen adds its own
// *.styles.ts for the bits only it uses.
export const configStyles = createStyles(({ colors, text, spacing, gutter, border }) => ({
    root: { flex: 1, backgroundColor: colors.surface.primary },

    pageTitle: {
      fontSize: text.size[7],
      fontWeight: text.weight.bold,
      color: colors.text.title.primary,
      paddingHorizontal: gutter,
      paddingTop: gutter,
      paddingBottom: spacing[4],
    },

    menuRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: gutter,
      paddingVertical: spacing[6],
    },
    menuRowLabel: { fontSize: text.size[4], color: colors.text.label },
    // The theme picker: a section label with the select at full width under it, same shape as a
    // form field elsewhere in config. `section` carries no padding of its own — every other screen
    // renders it inside a padded scroll container — so the label repeats menuRow's inset here.
    themeLabel: {
      fontSize: text.size[2],
      fontWeight: text.weight.bold,
      color: colors.text.title.secondary,
      textTransform: 'uppercase',
      letterSpacing: 1.2,
      paddingHorizontal: gutter,
      marginTop: spacing[7],
      marginBottom: spacing[4],
    },
    themeField: { paddingHorizontal: gutter, marginBottom: spacing[2] },

    divider: { height: border.small, backgroundColor: colors.surface.tertiary },
    // The menu draws straight on the root, so it insets the divider itself; every other screen
    // renders it inside a container that already carries the gutter.
    dividerInset: { marginHorizontal: gutter },

    subHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: gutter,
      paddingTop: gutter,
      paddingBottom: spacing[4],
      gap: spacing[5],
    },
    subTitle: { flex: 1, fontSize: text.size[6], fontWeight: text.weight.bold, color: colors.text.title.primary },

    scroll: { padding: gutter, paddingBottom: spacing[9] },
    section: {
      fontSize: text.size[2],
      fontWeight: text.weight.bold,
      color: colors.text.title.secondary,
      textTransform: 'uppercase',
      letterSpacing: 1.2,
      marginTop: spacing[7],
      marginBottom: spacing[4],
    },

    menuFooter: { position: 'absolute', bottom: 0, left: 0, right: 0 },
}));

