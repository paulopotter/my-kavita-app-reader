import { useCallback, useEffect, useState } from 'react';
import { useLanguage } from '../../shared/i18n';
import { DEFAULT_START_SCREEN, type StartScreen, StartScreenPrefs } from '../../shared/tools/startup';

// ── useConfigLanguage ────────────────────────────────────────────────────────
// The single "change the app language" action, shared by the Config menu and the onboarding
// (setup) screen. LanguageContext.setLanguage already writes the OS per-app locale (App.tsx),
// which IS the source of truth — there's no separate app-side preference to persist. This hook
// is just the shared entry point so both screens call the same thing.
export function useConfigLanguage() {
  const { language, setLanguage } = useLanguage();
  return { language, changeLanguage: setLanguage };
}

// ── useConfigMenu ────────────────────────────────────────────────────────────
// State owned by the Config menu screen itself: the debug-section unlock (revealed by tapping
// the version footer). Kept here so config.screen stays a thin router.
export function useConfigMenu() {
  const [debugUnlocked, setDebugUnlocked] = useState(false);
  const unlockDebug = useCallback(() => setDebugUnlocked(true), []);
  return { debugUnlocked, unlockDebug };
}

// ── useConfigStartScreen ─────────────────────────────────────────────────────
// Which tab the app opens on. Takes effect on the next launch (StartupProvider resolves it once
// per load), so there is nothing to refresh here — just read and write the preference.
export function useConfigStartScreen() {
  const [startScreen, setStartScreen] = useState<StartScreen>(DEFAULT_START_SCREEN);

  useEffect(() => {
    StartScreenPrefs.get().then(setStartScreen);
  }, []);

  const changeStartScreen = useCallback((value: StartScreen) => {
    setStartScreen(value);
    StartScreenPrefs.set(value);
  }, []);

  return { startScreen, changeStartScreen };
}
