import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Strings } from '../../../shared/i18n/strings';
import { maskApiKey } from '../ConfigTransform';

interface Props {
  currentApiKey?: string;
  t: Strings;
  onSave: (apiKey: string) => void;
}

export function ApiKeyForm({ currentApiKey, t, onSave }: Props) {
  const [value, setValue] = useState('');
  const [editing, setEditing] = useState(!currentApiKey);

  if (!editing && currentApiKey) {
    return (
      <View style={styles.row}>
        <Text style={styles.masked}>{maskApiKey(currentApiKey)}</Text>
        <TouchableOpacity onPress={() => setEditing(true)} style={styles.btn}>
          <Text style={styles.btnTxt}>{t.apiKeyChange}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={setValue}
        placeholder={t.apiKeyPlaceholder}
        placeholderTextColor="#4A5568"
        autoCapitalize="none"
        secureTextEntry
      />
      <View style={styles.actions}>
        {currentApiKey && (
          <TouchableOpacity onPress={() => setEditing(false)} style={styles.cancel}>
            <Text style={styles.cancelTxt}>{t.apiKeyCancel}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.save, !value.trim() && styles.disabled]}
          onPress={() => { onSave(value); setValue(''); setEditing(false); }}
          disabled={!value.trim()}
        >
          <Text style={styles.saveTxt}>{t.apiKeySave}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  masked: { flex: 1, fontFamily: 'monospace', letterSpacing: 2, color: '#A0AEC0', fontSize: 13 },
  btn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#16213E',
  },
  btnTxt: { color: '#E94560', fontWeight: '600', fontSize: 13 },
  input: {
    backgroundColor: '#16213E',
    color: '#FFFFFF',
    borderRadius: 6,
    padding: 10,
    marginTop: 4,
    fontSize: 13,
  },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8, gap: 8 },
  cancel: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#4A5568',
  },
  cancelTxt: { color: '#A0AEC0' },
  save: { backgroundColor: '#E94560', borderRadius: 6, paddingHorizontal: 16, paddingVertical: 8 },
  disabled: { backgroundColor: '#6B2335' },
  saveTxt: { color: '#fff', fontWeight: '600' },
});
