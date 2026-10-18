import { PreferencesManager } from '../../managers/preferences';

// BookPrefs — the book reader's text size, persisted via PreferencesManager (:preferences, Room).
// One entity key ('bookReader'), `variant` names which preference a value is. The key carries the
// domain's name on purpose: a preference's identity is only its key, and a bare one would collide
// with another tool's.

const DOMAIN = 'bookReaderPrefs';
const KEY = 'bookReader';
const FONT_SCALE_VARIANT = 'fontScale';

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

export const BookPrefs = {
  fontScale: {
    get(): Promise<number> {
      return PreferencesManager.get({ key: KEY, variant: FONT_SCALE_VARIANT })
        .then(entry => {
          const parsed = entry ? Number(entry.value) : NaN;
          return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_BOOK_FONT_SCALE;
        })
        .catch(() => DEFAULT_BOOK_FONT_SCALE);
    },
    set(value: number): Promise<void> {
      return PreferencesManager.put({ key: KEY, value: String(value), domain: DOMAIN, variant: FONT_SCALE_VARIANT })
        .then(() => undefined)
        .catch(() => undefined);
    },
    step: stepFontScale,
  },
};
