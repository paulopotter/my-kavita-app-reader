import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { PreferencesManager } from '../../managers/preferences';
import type { ThemeColors } from '../../theme/colors.types';
import { text, type TextTokens } from '../../theme/typography';
import { themes, defaultThemeName, type ThemeName } from '../../theme/themes';

// Every design token a screen paints with, and which colour identity is active.
//
// Type is constant today while the palette varies, but both arrive through the same hook: a screen
// asks the context for tokens and never imports them directly, so letting the user size text later
// is a change here rather than in every style file.

const THEME_KEY = 'theme';
const THEME_DOMAIN = 'ui';

export interface ThemeState {
  /** The active palette. */
  colors: ThemeColors;
  /** Sizes, weights and family. Constant — switching identity does not change them. */
  text: TextTokens;
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
  text,
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
        // A stored name that no longer exists falls back to the default rather than leaving the
        // app unpainted.
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
    // Paint first, persist after: a failed write only costs the choice being forgotten next boot.
    setThemeName(name);
    PreferencesManager.put({ key: THEME_KEY, value: name, domain: THEME_DOMAIN }).catch(() => {});
  }, []);

  const value = useMemo<ThemeState>(
    () => ({
      colors: themes[themeName],
      text,
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
 * The active theme's tokens.
 *
 * ```ts
 * const { colors, text } = useTheme();
 * const styles = useMemo(() => makeStyles({ colors, text }), [colors, text]);
 * ```
 */
export function useTheme(): ThemeState {
  return useContext(ThemeContext);
}
