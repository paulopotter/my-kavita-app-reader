import { createStyles } from '../../../shared/theme';
// Verbatim from ConfigScreen's prefContainer/prefRow/prefLabel.
export const readerStyles = createStyles(({ colors, text }) => ({
    container: { padding: 16 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 16,
    },
    label: { flex: 1, color: colors.text.label, fontSize: text.size[3], marginRight: 12 },
}));

