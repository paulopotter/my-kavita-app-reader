import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import { Strings } from '../../../../shared/i18n';
import { makeStyles } from './reader-offline-banner.styles';
import { useTheme } from '../../../../shared/theme';

interface Props {
  visible: boolean;
  t: Strings;
}

// Dumb: shows the offline label when visible.
export function ReaderOfflineBanner({ visible, t }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  if (!visible) {return null;}
  return (
    <View style={styles.root}>
      <Text style={styles.text}>{t.readerOffline}</Text>
    </View>
  );
}
