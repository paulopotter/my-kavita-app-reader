import { StyleSheet } from 'react-native';
import { colors } from '../../../../../shared/theme';

// A tap-to-open single-choice select. The trigger shows the current value; the sheet lists every
// option one per row. Used where a chip row would get unreadable (e.g. many URLs).
export const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.deep,
    borderRadius: 8,
    paddingHorizontal: 11,
    paddingVertical: 11,
  },
  triggerTxt: { color: colors.textOnDark, fontSize: 13, flex: 1 },
  triggerPlaceholder: { color: '#4A5568' },
  caret: { color: colors.muted, fontSize: 12, marginLeft: 8 },

  scrim: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', alignItems: 'center', padding: 24 },
  sheet: { width: '100%', maxWidth: 320, backgroundColor: colors.card, borderRadius: 12, overflow: 'hidden' },
  option: { paddingHorizontal: 16, paddingVertical: 14 },
  optionActive: { backgroundColor: colors.deep },
  optionTxt: { color: colors.textOnDark, fontSize: 14 },
  optionTxtActive: { color: colors.accent, fontWeight: '600' },
  divider: { height: 0.5, backgroundColor: colors.deep },
});
