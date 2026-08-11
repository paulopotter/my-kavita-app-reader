import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ServerConfig } from '../../../shared/bridge/config';
import { Strings } from '../../../shared/i18n/strings';

interface Props {
  servers: ServerConfig[];
  t: Strings;
  onDelete: (id: string) => void;
  onEdit: (server: ServerConfig) => void;
}

export function ServerList({ servers, t, onDelete, onEdit }: Props) {
  if (servers.length === 0) {
    return <Text style={styles.empty}>{t.serverListEmpty}</Text>;
  }
  return (
    <View>
      {servers.map(s => (
        <View key={s.id} style={styles.row}>
          <View style={styles.info}>
            <Text style={styles.url}>{s.url}</Text>
            <Text style={styles.meta}>{t.serverListPriority} {s.priority} · {s.timeoutMs}ms</Text>
          </View>
          <TouchableOpacity onPress={() => onEdit(s)} style={styles.btn}>
            <Text style={styles.btnTxt}>{t.serverListEdit}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onDelete(s.id)} style={[styles.btn, styles.del]}>
            <Text style={styles.delTxt}>{t.serverListDelete}</Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { color: '#A0AEC0', fontStyle: 'italic', marginVertical: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#ffffff22',
  },
  info: { flex: 1 },
  url: { fontWeight: '600', color: '#FFFFFF', fontSize: 13 },
  meta: { fontSize: 11, color: '#A0AEC0', marginTop: 2 },
  btn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginLeft: 6,
    borderRadius: 6,
    backgroundColor: '#16213E',
  },
  btnTxt: { color: '#A0AEC0', fontSize: 12 },
  del: { backgroundColor: '#2D1B1B' },
  delTxt: { color: '#FC8181', fontSize: 12 },
});
