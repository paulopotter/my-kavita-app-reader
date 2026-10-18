import { createStyles } from '../../../shared/theme';
// Verbatim from ConfigScreen's prefContainer/prefRow/prefLabel.
export const readerStyles = createStyles(({ colors, text, spacing, gutter }) => ({
    container: { paddingHorizontal: gutter },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing[6],
    },
    block: { paddingTop: spacing[7], paddingBottom: spacing[9], gap: spacing[6] },
    blockTitle: { color: colors.text.title.primary, fontSize: text.size[5], fontWeight: text.weight.bold },
    label: { flex: 1, color: colors.text.label, fontSize: text.size[3], marginRight: spacing[5] },
}));

