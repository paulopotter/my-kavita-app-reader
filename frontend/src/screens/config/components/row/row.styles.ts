import { StyleSheet } from 'react-native';
import { colors } from '../../../../shared/theme';

// From ConfigScreen's serverRow/dot/serverUrl/linkedLabel/menuDots.
export const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.secondary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 6,
    gap: 8,
  },
  body: { flex: 1 },
  primary: { color: colors.text.emphasis, fontSize: 13 },
  secondary: { color: colors.text.secondary, fontSize: 11, marginTop: 2 },
  secondaryNone: { color: colors.text.tertiary, fontSize: 11, marginTop: 2, fontStyle: 'italic' },
  trailing: { color: colors.text.tertiary, fontSize: 11, fontWeight: '500' },
});
