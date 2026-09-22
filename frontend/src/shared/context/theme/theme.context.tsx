import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { PreferencesManager } from '../../managers/preferences';
import type { ThemeColors } from '../../theme/colors.types';
import { text, type TextTokens } from '../../theme/typography';
import { themes, defaultThemeName, type ThemeName } from '../../theme/themes';
import { ReaderPrefs } from '../../tools/reader';

// Every design token a screen paints with, and which colour identity is active.
//
// Type is constant today while the palette varies, but both arrive through the same hook: a screen
// asks the context for tokens and never imports them directly, so letting the user size text later
// is a change here rather than in every style file.

const THEME_KEY = 'theme';
const THEME_DOMAIN = 'ui';

export interface ThemeState {
  /** The active palette — colors.progress.reading.* already reflects progressColorOverride
   *  below, so nothing else in the app needs to know the override exists. */
  colors: ThemeColors;
  /** Sizes, weights and family. Constant — switching identity does not change them. */
  text: TextTokens;
  /** Which identity is active. */
  themeName: ThemeName;
  /** Every identity the user can pick, for a picker to list. */
  available: ThemeName[];
  /** Switch identity and remember the choice. */
  setTheme: (name: ThemeName) => void;
  /** The theme whose accent the reading-progress indicator borrows instead of the active
   *  theme's own — undefined means "use the active theme's own colour" (ReaderPrefs'
   *  progressColorOverride, mirrored here so the reader's settings modal can read/change it
   *  through the same context every screen already reads its colours from). */
  progressColorOverride: ThemeName | undefined;
  /** Set or clear (undefined) the progress-colour override and remember the choice. */
  setProgressColorOverride: (name: ThemeName | undefined) => void;
  /** False until the stored choice has been read, so a screen can avoid a flash of the default. */
  ready: boolean;
}

const ThemeContext = createContext<ThemeState>({
  colors: themes[defaultThemeName],
  text,
  themeName: defaultThemeName,
  available: Object.keys(themes) as ThemeName[],
  setTheme: () => {},
  progressColorOverride: undefined,
  setProgressColorOverride: () => {},
  ready: false,
});

function isThemeName(value: string): value is ThemeName {
  return Object.prototype.hasOwnProperty.call(themes, value);
}

// Applies the progress-colour override (another theme's own accent) on top of the active
// palette, touching only progress.reading.* — every other token stays the active theme's own.
// undefined override returns the palette unchanged.
function withProgressColorOverride(palette: ThemeColors, override: ThemeName | undefined): ThemeColors {
  if (!override) {return palette;}
  const source = themes[override];
  return {
    ...palette,
    progress: {
      ...palette.progress,
      reading: source.progress.reading,
    },
  };
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeName, setThemeName] = useState<ThemeName>(defaultThemeName);
  const [progressColorOverride, setProgressColorOverrideState] = useState<ThemeName | undefined>(undefined);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      PreferencesManager.get({ key: THEME_KEY }),
      ReaderPrefs.getProgressColorOverride(),
    ])
      .then(([entry, storedOverride]) => {
        if (cancelled) {return;}
        // A stored name that no longer exists falls back to the default rather than leaving the
        // app unpainted.
        if (entry?.value && isThemeName(entry.value)) {
          setThemeName(entry.value);
        }
        if (storedOverride && isThemeName(storedOverride)) {
          setProgressColorOverrideState(storedOverride);
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

  const setProgressColorOverride = useCallback((name: ThemeName | undefined) => {
    setProgressColorOverrideState(name);
    ReaderPrefs.setProgressColorOverride(name).catch(() => {});
  }, []);

  const value = useMemo<ThemeState>(
    () => ({
      colors: withProgressColorOverride(themes[themeName], progressColorOverride),
      text,
      themeName,
      available: Object.keys(themes) as ThemeName[],
      setTheme,
      progressColorOverride,
      setProgressColorOverride,
      ready,
    }),
    [themeName, setTheme, progressColorOverride, setProgressColorOverride, ready],
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
