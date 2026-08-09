import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { ServerConfig } from '../../../shared/bridge/config';
import { formToServer, serverToForm, ServerConfigForm } from '../ConfigTransform';

interface Props {
  initial?: ServerConfig;
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

export function ServerForm({ initial, onSave, onCancel }: Props) {
  const [form, setForm] = useState<ServerConfigForm>(
    initial ? serverToForm(initial) : defaultForm,
  );

  const set = (key: keyof ServerConfigForm) => (val: string) =>
    setForm(f => ({ ...f, [key]: val }));

  return (
    <View style={styles.container}>
      <Text style={styles.label}>URL do servidor</Text>
      <TextInput style={styles.input} value={form.url} onChangeText={set('url')} placeholder="http://192.168.1.100:5000" autoCapitalize="none" />

      <Text style={styles.label}>Timeout (ms)</Text>
      <TextInput style={styles.input} value={form.timeoutMs} onChangeText={set('timeoutMs')} keyboardType="numeric" />

      <Text style={styles.label}>Prioridade</Text>
      <TextInput style={styles.input} value={form.priority} onChangeText={set('priority')} keyboardType="numeric" />

      <Text style={styles.label}>Health check path</Text>
      <TextInput style={styles.input} value={form.healthCheckPath} onChangeText={set('healthCheckPath')} autoCapitalize="none" />

      <View style={styles.actions}>
        <TouchableOpacity style={styles.cancel} onPress={onCancel}>
          <Text>Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.save} onPress={() => onSave(formToServer(form))}>
          <Text style={styles.saveTxt}>Salvar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#f9f9f9', borderRadius: 8, marginVertical: 8 },
  label: { fontSize: 12, color: '#555', marginTop: 8 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 8, marginTop: 4 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12, gap: 8 },
  cancel: { padding: 8 },
  save: { backgroundColor: '#3b82f6', borderRadius: 6, paddingHorizontal: 16, paddingVertical: 8 },
  saveTxt: { color: '#fff', fontWeight: '600' },
});
