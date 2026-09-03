import { StyleSheet } from 'react-native';
import { colors } from '../../shared/theme';

// Shared chrome for the Config screens — the menu rows, the sub-screen header with the back
// chevron, the scroll padding, the uppercase section label. Each sub-screen adds its own
// *.styles.ts for the bits only it uses.
export const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },

  pageTitle: { fontSize: 22, fontWeight: '700', color: colors.textOnDark, padding: 20, paddingBottom: 8 },

  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  menuRowLabel: { fontSize: 16, color: colors.textOnDark },
  menuRowArrow: { fontSize: 22, color: colors.muted },
  divider: { height: 1, backgroundColor: colors.deep, marginHorizontal: 20 },

  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 4,
    paddingRight: 16,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 4,
  },
  backBtnArea: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  backChevron: { color: colors.accent, fontSize: 32, fontWeight: '300', lineHeight: 40 },
  subTitle: { flex: 1, fontSize: 20, fontWeight: '700', color: colors.textOnDark },

  scroll: { padding: 16, paddingBottom: 48 },
  section: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.sectionLabel,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginTop: 20,
    marginBottom: 10,
  },

  menuFooter: { position: 'absolute', bottom: 0, left: 0, right: 0 },
});
