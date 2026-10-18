import { createStyles } from '../../theme';

export const bookAppearanceFieldsStyles = createStyles(({ colors, text, spacing, radius, border, alpha }) => ({
  fields: { gap: spacing[7] },
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
}));
