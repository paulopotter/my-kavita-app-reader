import { useCallback, useState } from 'react';
import { ConfigRepository } from '../../shared/bridge/config';
import { useLanguage } from '../../shared/i18n/useStrings';

// ── useConfigLanguage ────────────────────────────────────────────────────────
// The single "change the app language" action, shared by the Config menu and the onboarding
// (setup) screen. It's the pair those two screens both had inlined and duplicated: flip the
// in-memory LanguageContext (re-renders the strings) AND persist it so it survives a restart.
// setup.hooks imports this — the rule lives here, not there.
export function useConfigLanguage() {
  const { language, setLanguage } = useLanguage();

  const changeLanguage = useCallback(
    (next: string) => {
      setLanguage(next);
      ConfigRepository.upsertUiPreferences({ language: next }).catch(() => {});
    },
    [setLanguage],
  );

  return { language, changeLanguage };
}

// ── useConfigMenu ────────────────────────────────────────────────────────────
// State owned by the Config menu screen itself: the debug-section unlock (revealed by tapping
// the version footer). Kept here so config.screen stays a thin router.
export function useConfigMenu() {
  const [debugUnlocked, setDebugUnlocked] = useState(false);
  const unlockDebug = useCallback(() => setDebugUnlocked(true), []);
  return { debugUnlocked, unlockDebug };
}
