import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppVersions as Versions, OtaModule } from '../../native/OtaModule';
import { Strings } from '../i18n/strings';

interface Props {
  t: Strings;
}

export function AppVersions({ t }: Props) {
  const [versions, setVersions] = useState<Versions | null>(null);

  useEffect(() => {
    OtaModule.getVersions().then(setVersions).catch(() => {});
  }, []);

  if (!versions) return null;

  return (
    <View style={styles.row}>
      <VersionCol label={t.versionBackend} value={versions.backend} />
      <VersionCol label={t.versionApp}     value={versions.app}     />
      <VersionCol label={t.versionFrontend} value={versions.frontend} />
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
