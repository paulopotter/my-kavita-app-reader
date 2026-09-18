import { StyleSheet } from 'react-native';
import { colors } from '../../../../shared/theme';

export const styles = StyleSheet.create({
  strip: {
    paddingVertical: 4,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stale: { backgroundColor: colors.accentSofter },
  offline: { backgroundColor: colors.accentSoft },
  confirmed: { backgroundColor: colors.positiveSoft },
  text: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textBanner,
  },
});
