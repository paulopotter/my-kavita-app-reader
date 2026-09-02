import type { LibraryEntry } from './library.tool';

export type { LibraryEntry };

export type LibraryViewMode = 'GRID' | 'LIST';
export type LibrarySortMode = 'RECENTLY_UPDATED' | 'ALPHABETICAL';

// Which tab the shared LibraryScreen is rendering, from the route param `mode`. Also scopes the
// persisted view/sort preferences and the navigation origin — the Library tab and the Following
// tab keep independent layout choices.
export type LibraryMode = 'library' | 'following';

export interface UseLibraryOptions {
  // Following passes `s => s.isFollowed`; the Library tab passes nothing. Applied reactively via
  // useMemo over the unfiltered list, so an item entering/leaving the followed set appears or
  // disappears without a refetch (mistakes.md #14).
  filter?: (entry: LibraryEntry) => boolean;
  // Scopes LibraryPrefs (view/sort) storage. Same values as LibraryMode.
  prefsKey?: LibraryMode;
}
