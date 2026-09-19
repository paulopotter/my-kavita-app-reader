import { createStyles } from '../../../../shared/theme';
export const readerOfflineBannerStyles = createStyles(({ colors, text, alpha }) => ({
    root: {
      position: 'absolute',
      bottom: 8,
      left: 16,
      right: 16,
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 8,
      backgroundColor: alpha(colors.banner.alert, 0.9),
      alignItems: 'center',
    },
    text: { color: colors.text.emphasis, fontSize: text.size[3], fontWeight: text.weight.bold },
}));

