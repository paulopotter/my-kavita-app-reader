import { createStyles } from '../../../../../shared/theme';

export const chipStyles = createStyles(({ colors, text, spacing, radius, border }) => ({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
    borderRadius: radius.full,
    borderWidth: border.medium,
    borderColor: colors.border.primary,
    backgroundColor: colors.surface.secondary,
    marginRight: spacing[3],
    marginBottom: spacing[3],
  },
  chipSelected: { borderColor: colors.button.primary, backgroundColor: colors.surface.tertiary },
  label: { color: colors.text.label, fontSize: text.size[3] },
  remove: { marginLeft: spacing[3] },
}));
