import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { PreferencesManager } from '../managers/preferences';
import type { ThemeColors } from './colors.types';
import { themes, defaultThemeName, type ThemeName } from './themes';

// Which colour identity the app is wearing, and how to change it.
//
// The palette is the only thing that varies at runtime: typography, spacing and radius are
// constants and are imported directly, not read from here.
//
// Reads/writes through PreferencesManager (:preferences, Room-backed) — a preference is a source
// of truth, so there is no cache-first dance here, just a read at boot and a write on change.

const THEME_KEY = 'theme';
const THEME_DOMAIN = 'ui';

export interface ThemeState {
  /** The active palette. */
  colors: ThemeColors;
  /** Which identity is active. */
  themeName: ThemeName;
  /** Every identity the user can pick, for a picker to list. */
  available: ThemeName[];
  /** Switch identity and remember the choice. */
  setTheme: (name: ThemeName) => void;
  /** False until the stored choice has been read, so a screen can avoid a flash of the default. */
  ready: boolean;
}

const ThemeContext = createContext<ThemeState>({
  colors: themes[defaultThemeName],
  themeName: defaultThemeName,
  available: Object.keys(themes) as ThemeName[],
  setTheme: () => {},
  ready: false,
});

function isThemeName(value: string): value is ThemeName {
  return Object.prototype.hasOwnProperty.call(themes, value);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeName, setThemeName] = useState<ThemeName>(defaultThemeName);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    PreferencesManager.get({ key: THEME_KEY })
      .then(entry => {
        // A stored name that no longer exists (a theme was removed between releases) falls back to
        // the default rather than leaving the app unpainted.
        if (!cancelled && entry?.value && isThemeName(entry.value)) {
          setThemeName(entry.value);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) {setReady(true);}
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setTheme = useCallback((name: ThemeName) => {
    // Paint first, persist after: the switch should feel instant, and a failed write only costs
    // the choice being forgotten on the next boot.
    setThemeName(name);
    PreferencesManager.put({ key: THEME_KEY, value: name, domain: THEME_DOMAIN }).catch(() => {});
  }, []);

  const value = useMemo<ThemeState>(
    () => ({
      colors: themes[themeName],
      themeName,
      available: Object.keys(themes) as ThemeName[],
      setTheme,
      ready,
    }),
    [themeName, setTheme, ready],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * The active theme.
 *
 * ```ts
 * const { colors } = useTheme();
 * const styles = useMemo(() => makeStyles(colors), [colors]);
 * ```
 */
export function useTheme(): ThemeState {
  return useContext(ThemeContext);
}
