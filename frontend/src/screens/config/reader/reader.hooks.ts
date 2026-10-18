import { useCallback, useEffect, useState } from 'react';
import { BookPrefs, DEFAULT_BOOK_APPEARANCE, DEFAULT_BOOK_READING_MODE } from '../../../shared/tools/books';
import type { BookAppearance, BookReadingMode } from '../../../shared/tools/books';
import { ReaderPrefs, type ProgressBarPosition } from '../../../shared/tools/reader';

// The reading-preferences sub-screen's state: the two boolean toggles (keep-screen-on,
// immersive mode) plus the progress-indicator's corner position, all persisted via ReaderPrefs
// (:preferences, Room — Task 039, replacing the old ui_preferences columns). The exposed shape
// is unchanged from the ConfigRepository era — reader.screen.tsx and its test don't need to know
// the backing store moved. The progress-colour override lives in ThemeProvider instead (it also
// repaints colors.progress.reading.* globally, not just this one screen's own state).

export interface ReaderPrefsState {
  keepScreenOnDuringReading: boolean;
  immersiveModeDuringReading: boolean;
  // undefined = today's fixed placement (right edge) — no corner chosen yet.
  progressBarPosition: ProgressBarPosition | undefined;
}

export function useReaderPrefs() {
  const [prefs, setPrefs] = useState<ReaderPrefsState | null>(null);

  useEffect(() => {
    Promise.all([ReaderPrefs.getKeepScreenOn(), ReaderPrefs.getImmersiveMode(), ReaderPrefs.getProgressBarPosition()])
      .then(([keepScreenOnDuringReading, immersiveModeDuringReading, progressBarPosition]) =>
        setPrefs({ keepScreenOnDuringReading, immersiveModeDuringReading, progressBarPosition }),
      )
      .catch(() => {});
  }, []);

  const update = useCallback((patch: Partial<ReaderPrefsState>) => {
    setPrefs(prev => (prev ? { ...prev, ...patch } : prev));
    if (patch.keepScreenOnDuringReading !== undefined) {
      ReaderPrefs.setKeepScreenOn(patch.keepScreenOnDuringReading).catch(() => {});
    }
    if (patch.immersiveModeDuringReading !== undefined) {
      ReaderPrefs.setImmersiveMode(patch.immersiveModeDuringReading).catch(() => {});
    }
    if ('progressBarPosition' in patch) {
      ReaderPrefs.setProgressBarPosition(patch.progressBarPosition).catch(() => {});
    }
  }, []);

  return { prefs, update };
}

// The novel reader's look and mode, edited here and read by the reader the next time it opens
// (both go through BookPrefs). Starts at the defaults and swaps in the saved values when they arrive.
export function useBookReadingPrefs() {
  const [appearance, setAppearance] = useState<BookAppearance>(DEFAULT_BOOK_APPEARANCE);
  const [mode, setMode] = useState<BookReadingMode>(DEFAULT_BOOK_READING_MODE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Promise.all([BookPrefs.appearance.get(), BookPrefs.mode.get()])
      .then(([savedAppearance, savedMode]) => {
        setAppearance(savedAppearance);
        setMode(savedMode);
        setReady(true);
      })
      .catch(() => setReady(true));
  }, []);

  const changeAppearance = useCallback(<K extends keyof BookAppearance>(key: K, value: BookAppearance[K]) => {
    setAppearance(previous => ({ ...previous, [key]: value }));
    BookPrefs.appearance.set({ key, value }).catch(() => {});
  }, []);

  const changeMode = useCallback((next: BookReadingMode) => {
    setMode(next);
    BookPrefs.mode.set(next).catch(() => {});
  }, []);

  return { appearance, mode, ready, changeAppearance, changeMode };
}
