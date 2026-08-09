import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  ok: boolean;
  label: string;
  detail?: string;
}

export function StatusBadge({ ok, label, detail }: Props) {
  return (
    <View style={[styles.badge, ok ? styles.ok : styles.err]}>
      <Text style={styles.icon}>{ok ? '✓' : '✗'}</Text>
      <View>
        <Text style={styles.label}>{label}</Text>
        {detail ? <Text style={styles.detail}>{detail}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8, borderRadius: 8, marginVertical: 4 },
  ok: { backgroundColor: '#dcfce7' },
  err: { backgroundColor: '#fee2e2' },
  icon: { fontSize: 16, fontWeight: '700' },
  label: { fontWeight: '600' },
  detail: { fontSize: 12, color: '#555' },
});
