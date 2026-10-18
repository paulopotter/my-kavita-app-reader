import { PreferencesManager } from '../../managers/preferences';
import { DEFAULT_READING_THEME, isReadingThemeName } from '../../theme/reading-themes';
import type { ReadingThemeName } from '../../theme/reading-themes';

// BookPrefs — the book reader's preferences, persisted via PreferencesManager (:preferences, Room).
// One entity key ('bookReader'), `variant` names which preference a value is. The key carries the
// domain's name on purpose: a preference's identity is only its key, and a bare one would collide
// with another tool's. Values are stored as strings; every read validates what it gets back and
// falls back to the default, so a hand-edited or future value can never break the reader.

const DOMAIN = 'bookReaderPrefs';
const KEY = 'bookReader';

// ── text size ──────────────────────────────────────────────────────────

// The steps the reader's smaller/larger buttons walk through. 1 is the default.
export const BOOK_FONT_SCALES = [0.85, 1, 1.15, 1.3, 1.5, 1.75] as const;
export const DEFAULT_BOOK_FONT_SCALE = 1;

// The step next to `current` in `direction`, clamped to the ends. A value that is not one of the
// steps (hand-edited, or from a future version) snaps to the nearest step first.
function stepFontScale(current: number, direction: 'smaller' | 'larger'): number {
  let nearest = 0;
  BOOK_FONT_SCALES.forEach((scale, index) => {
    if (Math.abs(scale - current) < Math.abs(BOOK_FONT_SCALES[nearest] - current)) {nearest = index;}
  });
  const next = nearest + (direction === 'larger' ? 1 : -1);
  return BOOK_FONT_SCALES[Math.min(BOOK_FONT_SCALES.length - 1, Math.max(0, next))];
}

// ── the rest of the appearance ──────────────────────────────────────────

export const BOOK_FONT_FAMILIES = ['serif', 'sans', 'mono'] as const;
export type BookFontFamily = (typeof BOOK_FONT_FAMILIES)[number];

export const BOOK_LINE_SPACINGS = [1.4, 1.6, 1.8, 2] as const;
export type BookLineSpacing = (typeof BOOK_LINE_SPACINGS)[number];

export const BOOK_MARGINS = ['narrow', 'medium', 'wide'] as const;
export type BookMargin = (typeof BOOK_MARGINS)[number];

export const BOOK_READING_MODES = ['infinite', 'paged'] as const;
export type BookReadingMode = (typeof BOOK_READING_MODES)[number];

export interface BookAppearance {
  theme: ReadingThemeName;
  fontScale: number;
  fontFamily: BookFontFamily;
  lineSpacing: BookLineSpacing;
  margin: BookMargin;
  // Justified text makes uneven word gaps ("rivers"), so it is off unless the reader asks.
  justify: boolean;
}

export const DEFAULT_BOOK_APPEARANCE: BookAppearance = {
  theme: DEFAULT_READING_THEME,
  fontScale: DEFAULT_BOOK_FONT_SCALE,
  fontFamily: 'serif',
  lineSpacing: 1.6,
  margin: 'medium',
  justify: false,
};

// Infinite is the default: a web novel reads as one stream, the paged mode is the opt-in.
export const DEFAULT_BOOK_READING_MODE: BookReadingMode = 'infinite';

// How each preference is parsed back from its stored string; undefined means "not valid".
const parsers: { [K in keyof BookAppearance]: (raw: string) => BookAppearance[K] | undefined } = {
  theme: raw => (isReadingThemeName(raw) ? raw : undefined),
  fontScale: raw => {
    const value = Number(raw);
    return Number.isFinite(value) && value > 0 ? value : undefined;
  },
  fontFamily: raw => (BOOK_FONT_FAMILIES as readonly string[]).includes(raw) ? (raw as BookFontFamily) : undefined,
  lineSpacing: raw => {
    const value = Number(raw);
    return (BOOK_LINE_SPACINGS as readonly number[]).includes(value) ? (value as BookLineSpacing) : undefined;
  },
  margin: raw => ((BOOK_MARGINS as readonly string[]).includes(raw) ? (raw as BookMargin) : undefined),
  justify: raw => (raw === 'true' ? true : raw === 'false' ? false : undefined),
};

function readVariant(variant: string): Promise<string | undefined> {
  return PreferencesManager.get({ key: KEY, variant })
    .then(entry => entry?.value)
    .catch(() => undefined);
}

function writeVariant(variant: string, value: string): Promise<void> {
  return PreferencesManager.put({ key: KEY, value, domain: DOMAIN, variant })
    .then(() => undefined)
    .catch(() => undefined);
}

async function readAppearanceKey<K extends keyof BookAppearance>(key: K): Promise<BookAppearance[K]> {
  const raw = await readVariant(key);
  const parsed = raw == null ? undefined : parsers[key](raw);
  return parsed === undefined ? DEFAULT_BOOK_APPEARANCE[key] : (parsed as BookAppearance[K]);
}

export const BookPrefs = {
  fontScale: {
    get: () => readAppearanceKey('fontScale'),
    set: (value: number) => writeVariant('fontScale', String(value)),
    step: stepFontScale,
  },

  appearance: {
    async get(): Promise<BookAppearance> {
      const [theme, fontScale, fontFamily, lineSpacing, margin, justify] = await Promise.all([
        readAppearanceKey('theme'),
        readAppearanceKey('fontScale'),
        readAppearanceKey('fontFamily'),
        readAppearanceKey('lineSpacing'),
        readAppearanceKey('margin'),
        readAppearanceKey('justify'),
      ]);
      return { theme, fontScale, fontFamily, lineSpacing, margin, justify };
    },
    set<K extends keyof BookAppearance>({ key, value }: { key: K; value: BookAppearance[K] }): Promise<void> {
      return writeVariant(key, String(value));
    },
  },

  mode: {
    get(): Promise<BookReadingMode> {
      return readVariant('mode').then(raw =>
        (BOOK_READING_MODES as readonly string[]).includes(raw ?? '') ? (raw as BookReadingMode) : DEFAULT_BOOK_READING_MODE,
      );
    },
    set: (value: BookReadingMode) => writeVariant('mode', value),
  },
};
