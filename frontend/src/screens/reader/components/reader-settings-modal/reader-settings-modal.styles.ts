import { createStyles } from '../../../../shared/theme';

export const readerSettingsModalStyles = createStyles(({ colors, text, spacing, radius, border, alpha }) => ({
    backdrop: {
      flex: 1,
      backgroundColor: alpha(colors.surface.dim, 0.72),
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: spacing[8],
    },
    card: {
      backgroundColor: colors.surface.secondary,
      borderRadius: radius.large,
      paddingVertical: spacing[7],
      paddingHorizontal: spacing[7],
      width: '100%',
      gap: spacing[2],
    },
    title: { color: colors.text.title.primary, fontSize: text.size[5], fontWeight: text.weight.bold, marginBottom: spacing[4] },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing[5],
    },
    divider: { height: border.small, backgroundColor: colors.border.primary },
    label: { flex: 1, color: colors.text.label, fontSize: text.size[3], marginRight: spacing[5] },
    closeBtn: { alignSelf: 'flex-end', paddingVertical: spacing[3], paddingHorizontal: spacing[5], marginTop: spacing[3] },
    closeBtnText: { color: colors.text.link.primary, fontSize: text.size[3], fontWeight: text.weight.bold },
}));
