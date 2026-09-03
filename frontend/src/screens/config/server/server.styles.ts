import { StyleSheet } from 'react-native';
import { colors } from '../../../shared/theme';

// Lifted from ConfigScreen's server/auth/BFF styles. The row/form dumb components carry their
// own; this file has what the server.screen container itself uses (sections, action buttons,
// status messages, the context-menu modal).
export const styles = StyleSheet.create({
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

  actionRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  outlineBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: colors.accent },
  outlineTxt: { color: colors.accent, fontSize: 13, fontWeight: '600' },
  btnDisabled: { opacity: 0.45 },

  msgOk: { color: colors.msgOk, fontSize: 12, marginTop: 6 },
  msgError: { color: colors.msgError, fontSize: 12, marginTop: 6 },

  // context-menu modal
  menuOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', alignItems: 'center' },
  menuBox: { backgroundColor: colors.card, borderRadius: 12, width: 200, overflow: 'hidden' },
  menuItem: { padding: 16, alignItems: 'center' },
  menuItemTxt: { color: colors.textOnDark, fontSize: 15 },
  menuItemDanger: { color: colors.msgError },
  menuDivider: { height: 1, backgroundColor: colors.deep },

  // onboarding CTA (setup mode only)
  goBtn: {
    marginTop: 24,
    padding: 14,
    borderRadius: 10,
    backgroundColor: colors.accent,
    alignItems: 'center',
  },
  goTxt: { color: colors.textOnDark, fontSize: 15, fontWeight: '700' },
});
