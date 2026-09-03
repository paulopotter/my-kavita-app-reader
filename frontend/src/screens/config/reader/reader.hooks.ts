import { useCallback, useEffect, useState } from 'react';
import { ConfigRepository, type UiPreferences } from '../../../shared/bridge';

// The reading-preferences sub-screen's state: the two boolean toggles (keep-screen-on,
// immersive mode) backed by ConfigRepository's UiPreferences. Contract unchanged from the old
// useConfig — this is just the slice that belongs to this screen, on its own.
export function useReaderPrefs() {
  const [prefs, setPrefs] = useState<UiPreferences | null>(null);

  useEffect(() => {
    ConfigRepository.getUiPreferences()
      .then(setPrefs)
      .catch(() => {});
  }, []);

  const update = useCallback((patch: Partial<UiPreferences>) => {
    setPrefs(prev => (prev ? { ...prev, ...patch } : prev));
    ConfigRepository.upsertUiPreferences(patch).catch(() => {});
  }, []);

  return { prefs, update };
}
