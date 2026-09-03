import { StyleSheet } from 'react-native';
import { colors } from '../../../shared/theme';

// Verbatim from ConfigScreen's prefContainer/prefRow/prefLabel.
export const styles = StyleSheet.create({
  container: { padding: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  label: { flex: 1, color: colors.textOnDark, fontSize: 15, marginRight: 12 },
});
