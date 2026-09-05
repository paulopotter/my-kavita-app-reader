import { StyleSheet } from 'react-native';
import { colors } from '../../../../../shared/theme';

// Same shape as config/server's own Row — duplicated rather than imported since a screen never
// imports from another screen (only from shared/).
export const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 6,
    gap: 8,
  },
  body: { flex: 1 },
  primary: { color: colors.textOnDark, fontSize: 13 },
  trailing: { color: colors.mutedDim, fontSize: 11, fontWeight: '500' },
  dots: { color: colors.muted, fontSize: 20, paddingHorizontal: 4 },
});
