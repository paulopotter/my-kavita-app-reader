import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ServerConfig } from '../../../shared/bridge/config';
import { Strings } from '../../../shared/i18n/strings';
import { ServerConfigForm, formToServer, serverToForm } from '../ConfigTransform';

interface Props {
  initial?: ServerConfig;
  t: Strings;
  onSave: (server: ServerConfig) => void;
  onCancel: () => void;
}

const defaultForm: ServerConfigForm = {
  id: `server-${Date.now()}`,
  url: '',
  timeoutMs: '5000',
  priority: '0',
  healthCheckPath: '/api/health',
};

export function ServerForm({ initial, t, onSave, onCancel }: Props) {
  const [form, setForm] = useState<ServerConfigForm>(
    initial ? serverToForm(initial) : defaultForm,
  );

  const set = (key: keyof ServerConfigForm) => (val: string) =>
    setForm(f => ({ ...f, [key]: val }));

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{t.serverFormUrlLabel}</Text>
      <TextInput
        style={styles.input}
        value={form.url}
        onChangeText={set('url')}
        placeholder={t.serverFormUrlPlaceholder}
        placeholderTextColor="#4A5568"
        autoCapitalize="none"
        autoCorrect={false}
      />

      <View style={styles.actions}>
        <TouchableOpacity style={styles.cancel} onPress={onCancel}>
          <Text style={styles.cancelTxt}>{t.serverFormCancel}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.save} onPress={() => onSave(formToServer(form))}>
          <Text style={styles.saveTxt}>{t.serverFormSave}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#16213E', borderRadius: 8, marginVertical: 8 },
  label: { fontSize: 12, color: '#A0AEC0', marginTop: 10 },
  input: {
    backgroundColor: '#0F3460',
    color: '#FFFFFF',
    borderRadius: 6,
    padding: 10,
    marginTop: 4,
    fontSize: 13,
  },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16, gap: 8 },
  cancel: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#4A5568',
  },
  cancelTxt: { color: '#A0AEC0' },
  save: { backgroundColor: '#E94560', borderRadius: 6, paddingHorizontal: 16, paddingVertical: 8 },
  saveTxt: { color: '#fff', fontWeight: '600' },
});
