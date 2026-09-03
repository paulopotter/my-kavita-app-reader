import { StyleSheet } from 'react-native';
import { colors } from '../../../../../shared/theme';

// From ConfigScreen's serverRow/dot/serverUrl/linkedLabel/menuDots.
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
  dot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  dotActive: { backgroundColor: colors.positive },
  dotInactive: { backgroundColor: colors.mutedDim },
  body: { flex: 1 },
  primary: { color: colors.textOnDark, fontSize: 13 },
  secondary: { color: colors.muted, fontSize: 11, marginTop: 2 },
  secondaryNone: { color: colors.mutedDim, fontSize: 11, marginTop: 2, fontStyle: 'italic' },
  dots: { color: colors.muted, fontSize: 20, paddingHorizontal: 4 },
});
