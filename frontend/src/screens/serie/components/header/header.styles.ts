import { StyleSheet } from 'react-native';
import { colors } from '../../../../shared/theme';

export const styles = StyleSheet.create({
  root: { padding: 16 },
  topRow: { flexDirection: 'row' },
  cover: { width: 100, aspectRatio: 2 / 3, borderRadius: 8, backgroundColor: colors.surface.tertiary },
  info: { flex: 1, marginLeft: 12, justifyContent: 'flex-start' },
  name: { color: colors.text.title.primary, fontSize: 18, fontWeight: '700' },
  summary: { color: colors.text.primary, fontSize: 13, marginTop: 12, lineHeight: 18 },
  summaryToggle: { color: colors.text.link.primary, fontSize: 13, fontWeight: '600', marginTop: 4 },
  summaryToggleHidden: { opacity: 0 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  chip: { backgroundColor: colors.surface.secondary, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4 },
  chipText: { color: colors.text.primary, fontSize: 11 },
  actionButton: {
    marginTop: 16,
    backgroundColor: colors.button.primary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  // flexShrink lets the ellipsis kick in instead of the text forcing the button wider.
  actionButtonText: { color: colors.text.button.primary, fontSize: 15, fontWeight: '600', flexShrink: 1 },
});
