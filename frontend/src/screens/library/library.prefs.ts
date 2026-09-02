import { PreferencesManager } from '../../shared/managers/preferences';
import type { LibraryMode, LibrarySortMode, LibraryViewMode } from './library.types';

// Layout preferences for the Library / Following tabs, persisted via PreferencesManager
// (:preferences, Room). The Library tab and the Following tab keep independent values — the
// `prefsKey` is the entity id, `variant` names which of the two prefs a value is.
//
// No migration from the legacy ConfigRepository.getUiPreferences()'s libraryViewMode/
// librarySortMode/followingViewMode/followingSortMode: these start fresh at the defaults below
// (the user's saved layout choice is lost once). The legacy columns are left orphaned in
// ui_preferences — a separate cleanup.

const DOMAIN = 'libraryLayout';

export const DEFAULT_VIEW_MODE: LibraryViewMode = 'GRID';
export const DEFAULT_SORT_MODE: LibrarySortMode = 'RECENTLY_UPDATED';

function readOr<T extends string>(prefsKey: LibraryMode, variant: string, fallback: T): Promise<T> {
  return PreferencesManager.get({ key: prefsKey, variant })
    .then(entry => (entry ? (entry.value as T) : fallback))
    .catch(() => fallback);
}

function write(prefsKey: LibraryMode, variant: string, value: string): Promise<void> {
  return PreferencesManager.put({ key: prefsKey, value, domain: DOMAIN, variant })
    .then(() => undefined)
    .catch(() => undefined);
}

export const LibraryPrefs = {
  getViewMode(prefsKey: LibraryMode): Promise<LibraryViewMode> {
    return readOr(prefsKey, 'viewMode', DEFAULT_VIEW_MODE);
  },
  setViewMode(prefsKey: LibraryMode, mode: LibraryViewMode): Promise<void> {
    return write(prefsKey, 'viewMode', mode);
  },
  getSortMode(prefsKey: LibraryMode): Promise<LibrarySortMode> {
    return readOr(prefsKey, 'sortMode', DEFAULT_SORT_MODE);
  },
  setSortMode(prefsKey: LibraryMode, mode: LibrarySortMode): Promise<void> {
    return write(prefsKey, 'sortMode', mode);
  },
};
