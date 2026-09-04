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
};
