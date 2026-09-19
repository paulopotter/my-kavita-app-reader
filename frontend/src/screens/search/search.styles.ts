import { createStyles } from '../../shared/theme';
export const searchStyles = createStyles(({ colors, text, spacing, radius, gutter, alpha }) => ({
    root: { flex: 1, backgroundColor: colors.surface.primary },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing[8] },
    message: { color: alpha(colors.text.secondary, 0.6), fontSize: text.size[3], textAlign: 'center', marginTop: spacing[5] },
    errorText: { color: colors.text.link.primary, fontSize: text.size[3], textAlign: 'center' },
    retryButton: {
      marginTop: spacing[6],
      paddingHorizontal: spacing[7],
      paddingVertical: spacing[4],
      borderRadius: radius.medium,
      backgroundColor: colors.button.primary,
    },
    retryText: { color: colors.text.button.primary, fontSize: text.size[3], fontWeight: text.weight.bold },
    sectionTitle: {
      color: alpha(colors.text.secondary, 0.45),
      fontSize: text.size[2],
      fontWeight: text.weight.bold,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginHorizontal: gutter,
      marginTop: spacing[4],
      marginBottom: spacing[3],
    },
    resultCount: {
      color: alpha(colors.text.secondary, 0.45),
      fontSize: text.size[2],
      marginHorizontal: gutter,
      marginBottom: spacing[4],
    },
    list: { paddingHorizontal: gutter - spacing[3], paddingBottom: spacing[8] },
    historyRow: { flexDirection: 'row', alignItems: 'center' },
    historyCard: { flex: 1 },
    historyDelete: { paddingLeft: spacing[2], paddingRight: spacing[5], paddingVertical: spacing[5] },
}));

