import { StyleSheet } from 'react-native';
import { colors } from '../../../shared/theme';

export const styles = StyleSheet.create({
  container: { padding: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  rowDisabled: { opacity: 0.45 },
  label: { flex: 1, color: colors.textOnDark, fontSize: 15, marginRight: 12 },
  // The "Grupos" section title + the foreground service's live status pill, on the same line.
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14 },
  statusPillOn: { backgroundColor: colors.positive },
  statusPillOff: { backgroundColor: colors.mutedDim },
  statusPillTxt: { color: colors.textOnDark, fontSize: 12, fontWeight: '700' },

  // Same row shape as the toggles above (label left, control right) — the stepper sits where the
  // Switch would, value centered between its two buttons.
  retentionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  retentionLabel: { color: colors.textOnDark, fontSize: 15, marginRight: 12 },
  retentionStepper: { flexDirection: 'row', alignItems: 'center' },
  stepperBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retentionValue: { color: colors.textOnDark, fontSize: 15, minWidth: 64, textAlign: 'center' },

  addDashedBtn: {
    marginTop: 6,
    padding: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.accent,
    borderRadius: 8,
    alignItems: 'center',
  },
  addDashedTxt: { color: colors.accent, fontWeight: '600', fontSize: 13 },

  // context-menu modal
  menuOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', alignItems: 'center' },
  menuBox: { backgroundColor: colors.card, borderRadius: 12, width: 200, overflow: 'hidden' },
  menuItem: { padding: 16, alignItems: 'center' },
  menuItemTxt: { color: colors.textOnDark, fontSize: 15 },
  menuItemDanger: { color: colors.msgError },
  menuDivider: { height: 1, backgroundColor: colors.deep },
});
