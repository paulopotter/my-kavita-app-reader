import { createStyles } from '../../../../shared/theme';

export const readerThinProgressBarStyles = createStyles(({ colors, radius, alpha }) => ({
    // Vertical (left/right): thin column inset 10% top/bottom, filling top-to-bottom.
    trackVertical: {
      position: 'absolute',
      top: '10%',
      bottom: '10%',
      width: 3,
      borderRadius: radius.full,
      backgroundColor: alpha(colors.progress.secondary, 0.15),
      overflow: 'visible',
    },
    trackRight: { right: 4 },
    trackLeft: { left: 4 },
    fillVertical: { width: 3, backgroundColor: colors.progress.reading.primary },

    // Horizontal (top/bottom): thin row inset 10% left/right, filling left-to-right — same
    // spacing/thickness as the vertical track, rotated onto the other axis.
    trackHorizontal: {
      position: 'absolute',
      left: '10%',
      right: '10%',
      height: 3,
      borderRadius: radius.full,
      backgroundColor: alpha(colors.progress.secondary, 0.15),
      overflow: 'visible',
    },
    trackTop: { top: 4 },
    trackBottom: { bottom: 4 },
    fillHorizontal: { height: 3, backgroundColor: colors.progress.reading.primary },
}));
