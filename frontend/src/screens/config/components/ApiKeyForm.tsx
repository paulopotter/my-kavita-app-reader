import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { maskApiKey } from '../ConfigTransform';

interface Props {
  currentApiKey?: string;
  onSave: (apiKey: string) => void;
}

export function ApiKeyForm({ currentApiKey, onSave }: Props) {
  const [value, setValue] = useState('');
  const [editing, setEditing] = useState(!currentApiKey);

  if (!editing && currentApiKey) {
    return (
      <View style={styles.row}>
        <Text style={styles.masked}>{maskApiKey(currentApiKey)}</Text>
        <TouchableOpacity onPress={() => setEditing(true)} style={styles.btn}>
          <Text>Alterar</Text>
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
        placeholder="Cole aqui a API key do Kavita"
        autoCapitalize="none"
        secureTextEntry
      />
      <View style={styles.actions}>
        {currentApiKey && (
          <TouchableOpacity onPress={() => setEditing(false)} style={styles.cancel}>
            <Text>Cancelar</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.save, !value.trim() && styles.disabled]}
          onPress={() => { onSave(value); setValue(''); setEditing(false); }}
          disabled={!value.trim()}
        >
          <Text style={styles.saveTxt}>Salvar API Key</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  masked: { flex: 1, fontFamily: 'monospace', letterSpacing: 2, color: '#555' },
  btn: { padding: 8 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 8, marginTop: 4 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8, gap: 8 },
  cancel: { padding: 8 },
  save: { backgroundColor: '#3b82f6', borderRadius: 6, paddingHorizontal: 16, paddingVertical: 8 },
  disabled: { backgroundColor: '#93c5fd' },
  saveTxt: { color: '#fff', fontWeight: '600' },
});
