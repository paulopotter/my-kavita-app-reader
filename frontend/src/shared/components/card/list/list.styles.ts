import { createStyles } from '../../../theme';
export const listStyles = createStyles(({ colors, text }) => ({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface.secondary,
      borderRadius: 8,
      marginHorizontal: 8,
      marginVertical: 4,
      overflow: 'hidden',
    },
    thumb: { width: 52, height: 74, flexShrink: 0 },
    info: { flex: 1, paddingHorizontal: 10, paddingVertical: 8 },
    name: { color: colors.text.title.primary, fontSize: text.size[3], fontWeight: text.weight.bold, marginBottom: 4 },
    progressBar: {
      height: 4,
      backgroundColor: colors.surface.tertiary,
      borderRadius: 2,
      overflow: 'hidden',
      marginBottom: 2,
    },
    progressFill: {
      height: '100%',
      backgroundColor: colors.button.primary,
      borderRadius: 2,
    },
    metaLine: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    meta: { color: colors.text.secondary, fontSize: text.size[2], marginBottom: 2 },
    chapters: { color: colors.text.secondary, fontSize: text.size[2] },
    starBtn: { paddingHorizontal: 12 },
}));

