import React, { useEffect, useRef, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { AppVersions as Versions, OtaModule } from '../../../native';
import { Strings } from '../../i18n';
import { styles } from './app-versions.styles';

interface Props {
  t: Strings;
  onDebugUnlocked?: () => void;
}

const DEBUG_UNLOCK_TAPS = 5;

// The three-version footer (backend / app / frontend) shown on the RN splash and in Config.
// Reads the values from the native OtaModule itself — it's a self-contained shared widget, not a
// dumb component: nothing upstream has the version strings and there's no state worth lifting.
// Tapping the "app" column DEBUG_UNLOCK_TAPS times fires onDebugUnlocked (Config only).
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
