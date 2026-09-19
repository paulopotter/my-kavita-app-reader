import { createStyles } from '../../../../shared/theme';
// From ConfigScreen's serverRow/dot/serverUrl/linkedLabel/menuDots.
export const rowStyles = createStyles(({ colors, text }) => ({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface.secondary,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 6,
      gap: 8,
    },
    body: { flex: 1 },
    primary: { color: colors.text.emphasis, fontSize: text.size[3] },
    secondary: { color: colors.text.secondary, fontSize: text.size[2], marginTop: 2 },
    secondaryNone: { color: colors.text.tertiary, fontSize: text.size[2], marginTop: 2, fontStyle: 'italic' },
    trailing: { color: colors.text.tertiary, fontSize: text.size[2], fontWeight: text.weight.regular },
}));

