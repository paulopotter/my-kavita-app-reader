import { createStyles } from '../../../theme';

// The row's height is the sum of what it holds, rounded up to an even number — not a box the
// content is squeezed into: 16 padding + 40 title (2 lines + margin) + 6 progress bar + 16 meta.
const ROW_HEIGHT = 78;
export const listStyles = createStyles(({ colors, text, line, spacing, radius }) => ({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      height: ROW_HEIGHT,
      backgroundColor: colors.surface.secondary,
      borderRadius: radius.medium,
      marginHorizontal: spacing[4],
      marginVertical: spacing[2],
      overflow: 'hidden',
    },
    thumb: { width: 52, height: ROW_HEIGHT, flexShrink: 0 },
    info: { flex: 1, paddingHorizontal: spacing[4], paddingVertical: spacing[4] },
    // Two lines always: reserved even for a one-line name, so the row's own height never depends
    // on how long the title happens to be.
    name: {
      color: colors.text.title.primary,
      fontSize: text.size[3],
      lineHeight: line.height[4],
      height: line.height[4] * 2,
      fontWeight: text.weight.bold,
      marginBottom: spacing[2],
    },
    progressBar: {
      height: 4,
      backgroundColor: colors.surface.tertiary,
      borderRadius: radius.full,
      overflow: 'hidden',
      marginBottom: spacing[1],
    },
    progressFill: {
      height: '100%',
      backgroundColor: colors.button.primary,
      borderRadius: radius.full,
    },
    metaLine: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    meta: { color: colors.text.secondary, fontSize: text.size[2], lineHeight: line.height[3] },
    chapters: { color: colors.text.secondary, fontSize: text.size[2] },
    starBtn: { paddingHorizontal: spacing[5] },
}));

