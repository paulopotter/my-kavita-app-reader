import { createStyles } from '../../../../shared/theme';
export const headerStyles = createStyles(({ colors, text }) => ({
    root: { padding: 16 },
    topRow: { flexDirection: 'row' },
    cover: { width: 100, aspectRatio: 2 / 3, borderRadius: 8, backgroundColor: colors.surface.tertiary },
    info: { flex: 1, marginLeft: 12, justifyContent: 'flex-start' },
    name: { color: colors.text.title.primary, fontSize: text.size[5], fontWeight: text.weight.bold },
    summary: { color: colors.text.primary, fontSize: text.size[3], marginTop: 12, lineHeight: 18 },
    summaryToggle: { color: colors.text.link.primary, fontSize: text.size[3], fontWeight: text.weight.bold, marginTop: 4 },
    summaryToggleHidden: { opacity: 0 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
    chip: { backgroundColor: colors.surface.secondary, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4 },
    chipText: { color: colors.text.primary, fontSize: text.size[2] },
    actionButton: {
      marginTop: 16,
      backgroundColor: colors.button.primary,
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 16,
      alignSelf: 'stretch',
      alignItems: 'center',
    },
    // flexShrink lets the ellipsis kick in instead of the text forcing the button wider.
    actionButtonText: { color: colors.text.button.primary, fontSize: text.size[3], fontWeight: text.weight.bold, flexShrink: 1 },
}));

