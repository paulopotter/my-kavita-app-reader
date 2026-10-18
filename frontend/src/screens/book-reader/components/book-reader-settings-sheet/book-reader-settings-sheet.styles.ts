import { createStyles } from '../../../../shared/theme';

export const bookReaderSettingsSheetStyles = createStyles(({ colors, text, spacing, radius, border, alpha }) => ({
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
  content: { gap: spacing[7], paddingBottom: spacing[6] },
  section: { gap: spacing[4] },
  sectionLabel: { color: colors.text.label, fontSize: text.size[3] },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[4] },

  // A theme is shown as the page it paints: its own background, "Aa" in its own text colour.
  swatch: {
    width: '30%',
    borderRadius: radius.medium,
    borderWidth: border.medium,
    borderColor: alpha(colors.border.secondary, 0.2),
    paddingVertical: spacing[5],
    alignItems: 'center',
    gap: spacing[3],
  },
  swatchSelected: { borderColor: colors.button.selected },
  swatchSample: { fontSize: text.size[6], fontWeight: text.weight.bold },
  swatchLabel: { fontSize: text.size[2] },

  // An option is a chip: raised surface with emphasised text, or — when chosen — the theme's own
  // button fill with the label that is made for it.
  chip: {
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[6],
    borderRadius: radius.medium,
    backgroundColor: colors.surface.tertiary,
  },
  chipSelected: { backgroundColor: colors.button.primary },
  chipText: { color: colors.text.emphasis, fontSize: text.size[3] },
  chipTextSelected: { color: colors.text.button.primary, fontWeight: text.weight.bold },

  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  switchLabel: { flex: 1, color: colors.text.label, fontSize: text.size[3], marginRight: spacing[5] },
  closeButton: { alignSelf: 'flex-end', paddingVertical: spacing[5], paddingHorizontal: spacing[5] },
  closeText: { color: colors.text.link.primary, fontSize: text.size[3], fontWeight: text.weight.bold },
}));
