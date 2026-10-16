import { createStyles } from '../../../../shared/theme';

export const statsStripStyles = createStyles(({ colors, text, spacing, radius, gutter }) => ({
  row: {
    flexDirection: 'row',
    marginHorizontal: gutter,
    marginBottom: spacing[7],
    padding: spacing[5],
    borderRadius: radius.medium,
    backgroundColor: colors.surface.secondary,
  },
  stat: { flex: 1, alignItems: 'center' },
  value: { color: colors.text.emphasis, fontSize: text.size[5], fontWeight: text.weight.bold },
  label: { color: colors.text.secondary, fontSize: text.size[2], marginTop: spacing[1] },
}));
