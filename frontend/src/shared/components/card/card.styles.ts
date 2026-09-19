import { createStyles } from '../../theme';
export const cardStyles = createStyles(({ colors, text, line, spacing, radius, alpha }) => ({
    card: {
      flex: 1,
      margin: spacing[3],
      backgroundColor: colors.surface.secondary,
      borderRadius: radius.medium,
      overflow: 'hidden',
    },
    // Bookmark-style: flush to right edge, 6dp from top, rounded on the left only.
    starBookmark: {
      position: 'absolute',
      top: 6,
      right: 0,
      paddingLeft: spacing[3],
      paddingRight: spacing[2],
      paddingTop: spacing[2],
      paddingBottom: spacing[3],
      borderTopLeftRadius: 4,
      borderBottomLeftRadius: 4,
      backgroundColor: alpha(colors.surface.dim, 0.5),
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1,
    },
    cover: {
      width: '100%',
      aspectRatio: 2 / 3,
      backgroundColor: colors.surface.tertiary,
    },
    info: {
      padding: spacing[4],
    },
    // lineHeight × 2 reserves the title's own space for 2 lines always — a 1-line title still
    // takes up the same height as a 2-line one (numberOfLines={2} ellipsizes anything past that),
    // so every card's progress bar/badges/etc. start at the same y regardless of title length.
    name: {
      color: colors.text.emphasis,
      fontSize: text.size[2],
      lineHeight: line.height[3],
      height: line.height[3] * 2,
      fontWeight: text.weight.bold,
      marginBottom: spacing[3],
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
    progressLine: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing[2],
    },
    progressText: {
      color: colors.text.secondary,
      fontSize: text.size[1],
    },
    // Fixed height (one badge row's worth) reserved whether or not this card actually has a badge
    // to show — an entry with neither publicationLabel nor errorsLabel would otherwise render a
    // shorter card than one that has them, which is what looked "off" side by side in the grid.
    badges: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing[2],
      marginBottom: spacing[2],
      height: 18,
    },
    badge: {
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[1],
      borderRadius: radius.small,
    },
    badgeText: {
      color: colors.text.emphasis,
      fontSize: text.size[1],
      fontWeight: text.weight.bold,
    },
    badgePub: { backgroundColor: colors.badge.special },
    badgeError: { backgroundColor: colors.badge.error },
    // Fixed height reserved the same way as badges above — an entry with no BFF match (no
    // downloadedLabel) still takes up this line's space.
    chapters: {
      color: colors.text.secondary,
      fontSize: text.size[1],
      height: 13,
    },
}));

