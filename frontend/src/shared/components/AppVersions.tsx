import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppVersions as Versions, OtaModule } from '../../native/OtaModule';
import { Strings } from '../i18n/strings';

interface Props {
  t: Strings;
  onDebugUnlocked?: () => void;
}

const DEBUG_UNLOCK_TAPS = 5;

export function AppVersions({ t, onDebugUnlocked }: Props) {
  const [versions, setVersions] = useState<Versions | null>(null);
  const tapCount = useRef(0);

  useEffect(() => {
    OtaModule.getVersions().then(setVersions).catch(() => {});
  }, []);

  if (!versions) { return null; }

  const handleAppVersionTap = () => {
    tapCount.current += 1;
    if (tapCount.current >= DEBUG_UNLOCK_TAPS) {
      tapCount.current = 0;
      if (onDebugUnlocked) { onDebugUnlocked(); }
    }
  };

  return (
    <View style={styles.row}>
      <VersionCol label={t.versionBackend} value={versions.backend} />
      <TouchableOpacity onPress={handleAppVersionTap} activeOpacity={onDebugUnlocked ? 0.5 : 1}>
        <VersionCol label={t.versionApp} value={versions.app} />
      </TouchableOpacity>
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
