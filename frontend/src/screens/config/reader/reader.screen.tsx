import React from 'react';
import { Switch, Text, View } from 'react-native';
import { colors } from '../../../shared/theme';
import { useStrings } from '../../../shared/i18n/i18n.hooks';
import { styles as chrome } from '../config.styles';
import { useReaderPrefs } from './reader.hooks';
import { styles } from './reader.styles';

// Reading preferences: keep-screen-on + immersive mode while reading. Same folder name as the
// real reader screen (screens/reader/) on purpose — this is that screen's config, scoped inside
// screens/config/.
export function ReaderPrefsScreen({ onBack }: { onBack: () => void }) {
  const t = useStrings();
  const { prefs, update } = useReaderPrefs();

  return (
    <View style={chrome.root}>
      <View style={chrome.subHeader}>
        <Text onPress={onBack} style={chrome.backChevron} suppressHighlighting>
          ‹
        </Text>
        <Text style={chrome.subTitle}>{t.configMenuReading}</Text>
      </View>

      <View style={styles.container}>
        <View style={styles.row}>
          <Text style={styles.label}>{t.configKeepScreenOn}</Text>
          {prefs && (
            <Switch
              value={prefs.keepScreenOnDuringReading}
              onValueChange={v => update({ keepScreenOnDuringReading: v })}
              thumbColor={prefs.keepScreenOnDuringReading ? colors.accent : colors.muted}
              trackColor={{ false: colors.deep, true: '#7F1D1D' }}
            />
          )}
        </View>
        <View style={chrome.divider} />
        <View style={styles.row}>
          <Text style={styles.label}>{t.configImmersiveMode}</Text>
          {prefs && (
            <Switch
              value={prefs.immersiveModeDuringReading}
              onValueChange={v => update({ immersiveModeDuringReading: v })}
              thumbColor={prefs.immersiveModeDuringReading ? colors.accent : colors.muted}
              trackColor={{ false: colors.deep, true: '#7F1D1D' }}
            />
          )}
        </View>
        <View style={chrome.divider} />
      </View>
    </View>
  );
}
