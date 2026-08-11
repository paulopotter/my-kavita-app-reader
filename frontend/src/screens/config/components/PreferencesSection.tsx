import React from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { UiPreferences } from '../../../shared/bridge/config';
import { Strings } from '../../../shared/i18n/strings';

interface Props {
  prefs: UiPreferences;
  t: Strings;
  onChange: (update: Partial<UiPreferences>) => void;
}

export function PreferencesSection({ prefs, t, onChange }: Props) {
  return (
    <View>
      <View style={styles.row}>
        <Text style={styles.label}>{t.configKeepScreenOn}</Text>
        <Switch
          value={prefs.keepScreenOnDuringReading}
          onValueChange={v => onChange({ keepScreenOnDuringReading: v })}
          trackColor={{ false: '#4A5568', true: '#E94560' }}
          thumbColor="#FFFFFF"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  label: { flex: 1, fontSize: 15, color: '#FFFFFF', paddingRight: 12 },
});
