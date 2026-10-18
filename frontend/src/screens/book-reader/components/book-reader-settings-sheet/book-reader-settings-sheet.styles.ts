import { createStyles } from '../../../../shared/theme';

export const bookReaderSettingsSheetStyles = createStyles(({ colors, text, spacing, radius, alpha }) => ({
  backdrop: { flex: 1, backgroundColor: alpha(colors.surface.dim, 0.72), justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '85%',
    backgroundColor: colors.surface.secondary,
    borderTopLeftRadius: radius.large,
    borderTopRightRadius: radius.large,
    paddingTop: spacing[7],
    paddingHorizontal: spacing[7],
  },
  title: { color: colors.text.title.primary, fontSize: text.size[5], fontWeight: text.weight.bold, marginBottom: spacing[5] },
  content: { paddingBottom: spacing[6] },
  closeButton: { alignSelf: 'flex-end', paddingVertical: spacing[5], paddingHorizontal: spacing[5] },
  closeText: { color: colors.text.link.primary, fontSize: text.size[3], fontWeight: text.weight.bold },
}));
