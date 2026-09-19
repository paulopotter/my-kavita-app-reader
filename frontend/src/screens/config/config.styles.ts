import { createStyles } from '../../shared/theme';
// Shared chrome for the Config screens — the menu rows, the sub-screen header with the back
// chevron, the scroll padding, the uppercase section label. Each sub-screen adds its own
// *.styles.ts for the bits only it uses.
export const configStyles = createStyles(({ colors, text }) => ({
    root: { flex: 1, backgroundColor: colors.surface.primary },

    pageTitle: { fontSize: text.size[7], fontWeight: text.weight.bold, color: colors.text.title.primary, padding: 20, paddingBottom: 8 },

    menuRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
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
      paddingHorizontal: 20,
      marginTop: 20,
      marginBottom: 10,
    },
    themeField: { paddingHorizontal: 20, marginBottom: 4 },

    divider: { height: 1, backgroundColor: colors.surface.tertiary, marginHorizontal: 20 },

    subHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingLeft: 8,
      paddingRight: 16,
      paddingTop: 8,
      paddingBottom: 8,
      gap: 8,
    },
    subTitle: { flex: 1, fontSize: text.size[6], fontWeight: text.weight.bold, color: colors.text.title.primary },

    scroll: { padding: 16, paddingBottom: 48 },
    section: {
      fontSize: text.size[2],
      fontWeight: text.weight.bold,
      color: colors.text.title.secondary,
      textTransform: 'uppercase',
      letterSpacing: 1.2,
      marginTop: 20,
      marginBottom: 10,
    },

    menuFooter: { position: 'absolute', bottom: 0, left: 0, right: 0 },
}));

