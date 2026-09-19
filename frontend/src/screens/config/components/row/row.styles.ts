import { createStyles } from '../../../../shared/theme';
// From ConfigScreen's serverRow/dot/serverUrl/linkedLabel/menuDots.
export const rowStyles = createStyles(({ colors, text, spacing, radius }) => ({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface.secondary,
      borderRadius: radius.medium,
      paddingHorizontal: spacing[5],
      paddingVertical: spacing[4],
      marginBottom: spacing[3],
      gap: spacing[4],
    },
    body: { flex: 1 },
    secondaryRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
    primary: { color: colors.text.emphasis, fontSize: text.size[3] },
    secondary: { color: colors.text.secondary, fontSize: text.size[2], marginTop: spacing[1], flex: 1 },
    secondaryNone: { color: colors.text.tertiary, fontSize: text.size[2], marginTop: spacing[1], fontStyle: 'italic', flex: 1 },
    trailing: { color: colors.text.tertiary, fontSize: text.size[2], fontWeight: text.weight.regular },
}));

