import React from 'react';
import { Text, View } from 'react-native';
import { Strings } from '../../../../shared/i18n';
import { readerOfflineBannerStyles } from './reader-offline-banner.styles';
import { useStyles } from '../../../../shared/context';

interface Props {
  visible: boolean;
  t: Strings;
}

// Dumb: shows the offline label when visible.
export function ReaderOfflineBanner({ visible, t }: Props) {
  const styles = useStyles(readerOfflineBannerStyles);
  if (!visible) {return null;}
  return (
    <View style={styles.root}>
      <Text style={styles.text}>{t.readerOffline}</Text>
    </View>
  );
}
