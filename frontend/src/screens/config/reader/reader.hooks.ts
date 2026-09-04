import { useCallback, useEffect, useState } from 'react';
import { ReaderPrefs } from '../../../shared/tools/reader';

// The reading-preferences sub-screen's state: the two boolean toggles (keep-screen-on,
// immersive mode), persisted via ReaderPrefs (:preferences, Room — Task 039, replacing the
// old ui_preferences columns). The exposed shape is unchanged from the ConfigRepository era —
// reader.screen.tsx and its test don't need to know the backing store moved.

export interface ReaderPrefsState {
  keepScreenOnDuringReading: boolean;
  immersiveModeDuringReading: boolean;
}

export function useReaderPrefs() {
  const [prefs, setPrefs] = useState<ReaderPrefsState | null>(null);

  useEffect(() => {
    Promise.all([ReaderPrefs.getKeepScreenOn(), ReaderPrefs.getImmersiveMode()])
      .then(([keepScreenOnDuringReading, immersiveModeDuringReading]) =>
        setPrefs({ keepScreenOnDuringReading, immersiveModeDuringReading }),
      )
      .catch(() => {});
  }, []);

  const update = useCallback((patch: Partial<ReaderPrefsState>) => {
    setPrefs(prev => (prev ? { ...prev, ...patch } : prev));
    if (patch.keepScreenOnDuringReading !== undefined) {
      ReaderPrefs.setKeepScreenOn(patch.keepScreenOnDuringReading).catch(() => {});
    }
    if (patch.immersiveModeDuringReading !== undefined) {
      ReaderPrefs.setImmersiveMode(patch.immersiveModeDuringReading).catch(() => {});
    }
  }, []);

  return { prefs, update };
}
