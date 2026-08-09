import React from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { UiPreferences } from '../../../shared/bridge/config';

interface Props {
  prefs: UiPreferences;
  onChange: (update: Partial<UiPreferences>) => void;
}

export function PreferencesSection({ prefs, onChange }: Props) {
  return (
    <View>
      <View style={styles.row}>
        <Text style={styles.label}>Manter tela ligada durante leitura</Text>
        <Switch
          value={prefs.keepScreenOnDuringReading}
          onValueChange={v => onChange({ keepScreenOnDuringReading: v })}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  label: { flex: 1, fontSize: 15 },
});
