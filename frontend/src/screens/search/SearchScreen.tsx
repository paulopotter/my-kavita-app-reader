import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export function SearchScreen() {
  return (
    <View style={styles.root}>
      <Text style={styles.label}>Busca</Text>
      <Text style={styles.sub}>Em breve (Plano 009)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#1A1A2E', justifyContent: 'center', alignItems: 'center' },
  label: { color: '#fff', fontSize: 20, fontWeight: '600' },
  sub: { color: 'rgba(255,255,255,0.4)', marginTop: 8, fontSize: 13 },
});
