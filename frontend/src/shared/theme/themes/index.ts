import type { ThemeColors } from '../colors.types';
import { crimsonColors } from './crimson';
import { tealColors } from './teal';

// The theme registry, and the one place that says which theme is active.
//
// Adding an identity is: create `themes/<name>/colors.tokens.ts` filling ThemeColors, export it
// from that folder's barrel, import it here and add it to `themes`. Nothing else in the app
// changes — every screen reads `colors`, never a theme by name.
//
// `activeTheme` is a constant for now. Plan 028 later replaces it with a value resolved at runtime
// (ThemeProvider + the user's stored preference); until then this is the single switch.
export const themes = {
  teal: tealColors,
  crimson: crimsonColors,
} as const;

export type ThemeName = keyof typeof themes;

// The identity used when the user has not chosen one, and the fallback when a stored choice no
// longer exists. No theme is called "default": which one holds the role is this line, and a
// picker marks it with a translated suffix rather than the name carrying it.
export const defaultThemeName: ThemeName = 'teal';

// The palette resolved at import time. Screens that have migrated read the live one from
// useTheme(); this is what the not-yet-migrated `styles` exports are built from.
export const activeTheme: ThemeName = defaultThemeName;

export const colors: ThemeColors = themes[activeTheme];
