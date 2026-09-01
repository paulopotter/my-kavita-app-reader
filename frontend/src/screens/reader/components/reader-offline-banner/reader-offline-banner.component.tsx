import React from 'react';
import { Text, View } from 'react-native';
import { Strings } from '../../../../shared/i18n/strings';
import { styles } from './reader-offline-banner.styles';

interface Props {
  visible: boolean;
  t: Strings;
}

// Dumb: shows the offline label when visible.
export function ReaderOfflineBanner({ visible, t }: Props) {
  if (!visible) {return null;}
  return (
    <View style={styles.root}>
      <Text style={styles.text}>{t.readerOffline}</Text>
    </View>
  );
}
