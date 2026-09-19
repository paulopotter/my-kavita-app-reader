import React, { useMemo } from 'react';
import { Switch, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../../shared/theme';
import { useStrings } from '../../../shared/i18n';
import { BackChevron } from '../components';
import { makeStyles as makeChrome } from '../config.styles';
import { useReaderPrefs } from './reader.hooks';
import { makeStyles } from './reader.styles';

// Reading preferences: keep-screen-on + immersive mode while reading. Same folder name as the
// real reader screen (screens/reader/) on purpose — this is that screen's config, scoped inside
// screens/config/.
export function ReaderPrefsScreen({ onBack }: { onBack: () => void }) {
  const { colors } = useTheme();
  const chrome = useMemo(() => makeChrome(colors), [colors]);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const t = useStrings();
  const { prefs, update } = useReaderPrefs();

  return (
    <View style={chrome.root}>
      <View style={chrome.subHeader}>
        <BackChevron onPress={onBack} />
        <Text style={chrome.subTitle}>{t.configMenuReading}</Text>
      </View>

      <View style={styles.container}>
        {prefs && (
          <>
            {/* Tapping anywhere on the row toggles it, not just the Switch thumb. */}
            <TouchableOpacity
              style={styles.row}
              activeOpacity={0.7}
              onPress={() => update({ keepScreenOnDuringReading: !prefs.keepScreenOnDuringReading })}>
              <Text style={styles.label}>{t.configKeepScreenOn}</Text>
              <Switch
                value={prefs.keepScreenOnDuringReading}
                onValueChange={v => update({ keepScreenOnDuringReading: v })}
                thumbColor={prefs.keepScreenOnDuringReading ? colors.button.switch.thumb.on : colors.button.switch.thumb.off}
                trackColor={{ false: colors.button.switch.track.off, true: colors.button.switch.track.on }}
              />
            </TouchableOpacity>
            <View style={chrome.divider} />
            <TouchableOpacity
              style={styles.row}
              activeOpacity={0.7}
              onPress={() => update({ immersiveModeDuringReading: !prefs.immersiveModeDuringReading })}>
              <Text style={styles.label}>{t.configImmersiveMode}</Text>
              <Switch
                value={prefs.immersiveModeDuringReading}
                onValueChange={v => update({ immersiveModeDuringReading: v })}
                thumbColor={prefs.immersiveModeDuringReading ? colors.button.switch.thumb.on : colors.button.switch.thumb.off}
                trackColor={{ false: colors.button.switch.track.off, true: colors.button.switch.track.on }}
              />
            </TouchableOpacity>
            <View style={chrome.divider} />
          </>
        )}
      </View>
    </View>
  );
}
