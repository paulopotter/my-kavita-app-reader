import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ServerConfig } from '../../../shared/bridge/config';

interface Props {
  servers: ServerConfig[];
  onDelete: (id: string) => void;
  onEdit: (server: ServerConfig) => void;
}

export function ServerList({ servers, onDelete, onEdit }: Props) {
  if (servers.length === 0) {
    return <Text style={styles.empty}>Nenhum servidor configurado</Text>;
  }
  return (
    <View>
      {servers.map(s => (
        <View key={s.id} style={styles.row}>
          <View style={styles.info}>
            <Text style={styles.url}>{s.url}</Text>
            <Text style={styles.meta}>Prioridade {s.priority} · {s.timeoutMs}ms</Text>
          </View>
          <TouchableOpacity onPress={() => onEdit(s)} style={styles.btn}>
            <Text>Editar</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onDelete(s.id)} style={[styles.btn, styles.del]}>
            <Text style={styles.delTxt}>Excluir</Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { color: '#888', fontStyle: 'italic', marginVertical: 8 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderColor: '#eee' },
  info: { flex: 1 },
  url: { fontWeight: '600' },
  meta: { fontSize: 12, color: '#666' },
  btn: { paddingHorizontal: 8, paddingVertical: 4, marginLeft: 4, borderRadius: 4, backgroundColor: '#eee' },
  del: { backgroundColor: '#fee' },
  delTxt: { color: '#c00' },
});
