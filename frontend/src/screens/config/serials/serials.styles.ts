import { createStyles } from '../../../shared/theme';

export const serialsStyles = createStyles(({ colors, text, line, spacing, radius, border }) => ({
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[4], paddingVertical: spacing[5] },
  // flexShrink so a long label gives way to the toggle instead of squeezing it.
  sourceLabel: { fontSize: text.size[3], color: colors.text.label, flexShrink: 1 },
  toggle: {
    flexDirection: 'row',
    borderRadius: radius.medium,
    borderWidth: border.small,
    borderColor: colors.border.primary,
    overflow: 'hidden',
    marginLeft: 'auto',
  },
  toggleSide: { paddingHorizontal: spacing[4], paddingVertical: spacing[3] },
  toggleSideActive: { backgroundColor: colors.button.selected },
  toggleText: { fontSize: text.size[2], color: colors.text.secondary },
  toggleTextActive: { color: colors.text.button.primary, fontWeight: text.weight.bold },
  field: { marginBottom: spacing[6] },
  fieldLabel: { fontSize: text.size[3], color: colors.text.label, marginBottom: spacing[3] },
  hint: {
    color: colors.text.secondary,
    fontSize: text.size[2],
    lineHeight: line.height[4],
    marginBottom: spacing[5],
  },
}));
