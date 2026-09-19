import { createStyles } from '../../shared/theme';
export const libraryStyles = createStyles(({ colors, text, spacing, radius, border, gutter }) => ({
    root: { flex: 1, backgroundColor: colors.surface.primary },
    center: {
      flex: 1,
      backgroundColor: colors.surface.primary,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing[8],
    },
    message: { color: colors.text.secondary, fontSize: text.size[4], marginTop: spacing[5], textAlign: 'center' },
    errorText: { color: colors.text.message.bad, fontSize: text.size[4], fontWeight: text.weight.bold, marginBottom: spacing[7], textAlign: 'center' },
    retryButton: { backgroundColor: colors.button.primary, paddingHorizontal: spacing[8], paddingVertical: spacing[5], borderRadius: radius.medium },
    retryText: { color: colors.text.button.primary, fontWeight: text.weight.bold },

    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: gutter,
      paddingVertical: spacing[4],
      borderBottomWidth: border.small,
      borderBottomColor: colors.border.primary,
    },
    countTxt: { color: colors.text.secondary, fontSize: text.size[2], flex: 1 },
    sortBtn: { paddingHorizontal: spacing[4], paddingVertical: spacing[2] },
    sortBtnTxt: { color: colors.text.link.primary, fontSize: text.size[3], fontWeight: text.weight.bold },
    viewToggleBtn: { marginLeft: spacing[4], paddingHorizontal: spacing[4], paddingVertical: spacing[2] },

    content: { flex: 1 },
    gridList: { padding: gutter - spacing[3] },
    listList: { paddingHorizontal: gutter - spacing[3], paddingVertical: spacing[2] },
    // The alphabet bar sits over the list's right edge, so the content clears it instead of the
    // gutter there.
    listListWithIndex: { paddingLeft: gutter - spacing[3], paddingVertical: spacing[2], paddingRight: spacing[9] },
    cardPlaceholder: { flex: 1, margin: spacing[3] },
}));

