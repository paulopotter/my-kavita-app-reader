import type { HexColor } from './colors.types';

// Reading themes — the colours of a BOOK page. They are deliberately NOT part of the app's identity
// themes (themes/*): what a page needs is legibility over long sessions, and a reader may well want
// a warm sepia page inside a teal app. The same reasoning already sets `colors.surface.reading`
// apart from the rest of the palette, and these follow it: one fixed set, the same in every identity.
//
// 'app' is the one name without a palette here: it means "paint the page with the active app theme",
// which only the caller can do (it knows the active theme).
//
// Every palette holds the project's legibility bar — body text and links at 7:1 or better (WCAG AAA)
// against the page — which reading-themes.tests.ts enforces. Dark pages use an off-white text on a
// near-black page rather than pure white on pure black, which glares ("halation") over long reading.
export const READING_THEME_NAMES = ['app', 'paper', 'sepia', 'gray', 'green', 'dark', 'night', 'black', 'contrast'] as const;

export type ReadingThemeName = (typeof READING_THEME_NAMES)[number];
export type FixedReadingThemeName = Exclude<ReadingThemeName, 'app'>;

export interface ReadingPalette {
  /** The page. */
  background: HexColor;
  /** Body text. */
  text: HexColor;
  /** Links inside the text. */
  link: HexColor;
}

export const DEFAULT_READING_THEME: ReadingThemeName = 'app';

export const readingPalettes: Record<FixedReadingThemeName, ReadingPalette> = {
  paper: { background: '#FAF8F2', text: '#1C1C1C', link: '#0B4FA8' },
  sepia: { background: '#F3EAD3', text: '#2E2417', link: '#6E3600' },
  gray: { background: '#E4E4E4', text: '#161616', link: '#0A3F8F' },
  green: { background: '#D5E8D4', text: '#14261A', link: '#074A22' },
  dark: { background: '#1A1A1A', text: '#E6E6E6', link: '#8CB4FF' },
  night: { background: '#14171C', text: '#DADFE6', link: '#8CB4FF' },
  black: { background: '#000000', text: '#D6D6D6', link: '#8CB4FF' },
  contrast: { background: '#000000', text: '#FFFFFF', link: '#FFE600' },
};

export function isReadingThemeName(value: unknown): value is ReadingThemeName {
  return typeof value === 'string' && (READING_THEME_NAMES as readonly string[]).includes(value);
}
