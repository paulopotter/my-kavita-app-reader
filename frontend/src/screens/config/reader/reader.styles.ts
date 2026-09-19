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
    label: { flex: 1, color: colors.text.label, fontSize: text.size[3], marginRight: spacing[5] },
}));

