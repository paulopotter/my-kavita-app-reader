import { StyleSheet } from 'react-native';
import { alpha } from '../../../../shared/theme';
import type { ThemeColors } from '../../../../shared/theme';

export const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: alpha(colors.surface.dim, 0.72),
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 28,
    },
    card: {
      backgroundColor: colors.surface.secondary,
      borderRadius: 16,
      paddingVertical: 24,
      paddingHorizontal: 24,
      width: '100%',
      gap: 16,
      maxHeight: '80%',
    },
    title: { color: colors.text.title.primary, fontSize: 17, fontWeight: '700' },
    header: { flexDirection: 'row', gap: 12 },
    cover: { width: 64, height: 91, borderRadius: 6, flexShrink: 0 },
    headerInfo: { flex: 1, justifyContent: 'center', gap: 4 },
    seriesName: { color: colors.text.title.primary, fontSize: 15, fontWeight: '600' },
    bodyText: { color: colors.text.secondary, fontSize: 13 },
    timestamp: { color: colors.text.secondary, fontSize: 12 },
    chaptersSection: { gap: 6 },
    chaptersTitle: { color: alpha(colors.text.secondary, 0.6), fontSize: 12, fontWeight: '600' },
    chaptersList: { maxHeight: 140 },
    chapterRow: { color: colors.text.primary, fontSize: 13, paddingVertical: 4 },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    actionBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
    actionBtnSecondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: alpha(colors.border.secondary, 0.2) },
    actionBtnDanger: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border.accent },
    actionLabelSecondary: { color: alpha(colors.text.button.secondary, 0.8), fontSize: 13, fontWeight: '600' },
    actionLabelDanger: { color: colors.text.link.primary, fontSize: 13, fontWeight: '600' },
    closeBtn: { alignSelf: 'center', paddingVertical: 8 },
    closeLabel: { color: alpha(colors.text.secondary, 0.6), fontSize: 13, fontWeight: '600' },
  });

