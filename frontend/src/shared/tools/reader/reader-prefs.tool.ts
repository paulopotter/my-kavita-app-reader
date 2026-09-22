import { PreferencesManager } from '../../managers/preferences';

// ReaderPrefs — the reader's two on/off preferences (keep the screen awake, immersive fullscreen)
// persisted via PreferencesManager (:preferences, Room). Lives in shared/tools (not in a screen)
// because two screens consume it: the Config "Reading" sub-screen writes it, and the Reader
// screen reads it — the same cross-screen shape as ChaptersTool.sort.
//
// Task 039: replaces the ui_preferences columns keepScreenOnDuringReading /
// immersiveModeDuringReading. No migration from the legacy ConfigRepository.getUiPreferences() —
// the values start fresh at the defaults below (the user's saved choice is lost once, the same
// call library.prefs.ts made for the Library layout).
//
// One entity key ('reader'); `variant` names which toggle a value is. Values are 'true'/'false'
// strings — the string-store convention LibraryPrefs uses (no JSON needed for a bare boolean).

const DOMAIN = 'readerPrefs';
const KEY = 'reader';

export const DEFAULT_KEEP_SCREEN_ON = true;
export const DEFAULT_IMMERSIVE_MODE = false;

// Reading-progress indicator position — which screen edge it's anchored to. 'right' is today's
// placement (vertical, filling top-to-bottom); 'left' mirrors it. 'top'/'bottom' anchor a
// HORIZONTAL bar instead, filling left-to-right — useful once a horizontal reading mode exists,
// and already requested by users who prefer it even while reading vertically. undefined (no
// stored value) keeps today's fixed placement (right edge, vertical).
export type ProgressBarPosition = 'left' | 'right' | 'top' | 'bottom';

function readBool(variant: string, fallback: boolean): Promise<boolean> {
  return PreferencesManager.get({ key: KEY, variant })
    .then(entry => (entry ? entry.value === 'true' : fallback))
    .catch(() => fallback);
}

function writeBool(variant: string, value: boolean): Promise<void> {
  return PreferencesManager.put({ key: KEY, value: String(value), domain: DOMAIN, variant })
    .then(() => undefined)
    .catch(() => undefined);
}

function readString(variant: string): Promise<string | undefined> {
  return PreferencesManager.get({ key: KEY, variant })
    .then(entry => entry?.value || undefined)
    .catch(() => undefined);
}

// Writing undefined clears the override (falls back to the active theme's own colour) — Room has
// no concept of "delete on put", so an empty value here is treated as absent on read instead.
function writeString(variant: string, value: string | undefined): Promise<void> {
  return PreferencesManager.put({ key: KEY, value: value ?? '', domain: DOMAIN, variant })
    .then(() => undefined)
    .catch(() => undefined);
}

export const ReaderPrefs = {
  getKeepScreenOn(): Promise<boolean> {
    return readBool('keepScreenOn', DEFAULT_KEEP_SCREEN_ON);
  },
  setKeepScreenOn(value: boolean): Promise<void> {
    return writeBool('keepScreenOn', value);
  },
  getImmersiveMode(): Promise<boolean> {
    return readBool('immersiveMode', DEFAULT_IMMERSIVE_MODE);
  },
  setImmersiveMode(value: boolean): Promise<void> {
    return writeBool('immersiveMode', value);
  },
  // The theme identity (ThemeName, e.g. 'crimson') whose accent colour the reading-progress
  // indicator should use instead of the active theme's own — undefined means "use whatever the
  // active theme already provides" (colors.progress.reading.primary as each theme defines it).
  // Stored as a plain theme name string, not a raw colour, so it always resolves through the
  // real theme registry even if that theme's palette changes later.
  getProgressColorOverride(): Promise<string | undefined> {
    return readString('progressColorOverride');
  },
  setProgressColorOverride(themeName: string | undefined): Promise<void> {
    return writeString('progressColorOverride', themeName);
  },
  getProgressBarPosition(): Promise<ProgressBarPosition | undefined> {
    return readString('progressBarPosition') as Promise<ProgressBarPosition | undefined>;
  },
  setProgressBarPosition(position: ProgressBarPosition | undefined): Promise<void> {
    return writeString('progressBarPosition', position);
  },
};
