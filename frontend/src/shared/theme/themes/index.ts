import type { ThemeColors } from '../colors.types';
import { defaultColors } from './default';

// The theme registry, and the one place that says which theme is active.
//
// Adding an identity is: create `themes/<name>/colors.tokens.ts` filling ThemeColors, export it
// from that folder's barrel, import it here and add it to `themes`. Nothing else in the app
// changes — every screen reads `colors`, never a theme by name.
//
// `activeTheme` is a constant for now. Plan 028 later replaces it with a value resolved at runtime
// (ThemeProvider + the user's stored preference); until then this is the single switch.
export const themes = {
  default: defaultColors,
} as const;

export type ThemeName = keyof typeof themes;

export const activeTheme: ThemeName = 'default';

export const colors: ThemeColors = themes[activeTheme];
