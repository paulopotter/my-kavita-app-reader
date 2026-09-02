import { StyleSheet } from 'react-native';
import { colors } from '../../../../shared/theme';

export const styles = StyleSheet.create({
  root: {
    width: '100%',
    alignItems: 'center',
    gap: 8,
  },
  track: {
    width: '100%',
    height: 3,
    backgroundColor: colors.progressTrack,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 2,
  },
  label: {
    color: colors.progressLabel,
    fontSize: 11,
    textAlign: 'center',
  },
});
