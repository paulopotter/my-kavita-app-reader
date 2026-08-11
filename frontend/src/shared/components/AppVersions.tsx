import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { OtaModule, AppVersions as Versions } from '../../native/OtaModule';

export function AppVersions() {
  const [versions, setVersions] = useState<Versions | null>(null);

  useEffect(() => {
    OtaModule.getVersions().then(setVersions).catch(() => {});
  }, []);

  if (!versions) return null;

  return (
    <View style={styles.row}>
      <VersionCol label="backend"  value={versions.backend}  />
      <VersionCol label="app"      value={versions.app}      />
      <VersionCol label="frontend" value={versions.frontend} />
    </View>
  );
}

function VersionCol({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.col}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ffffff22',
  },
  col: {
    flex: 1,
    alignItems: 'center',
  },
  label: {
    fontSize: 9,
    color: '#44FFFFFF',
    textTransform: 'lowercase',
    marginBottom: 2,
  },
  value: {
    fontSize: 10,
    color: '#99FFFFFF',
  },
});
