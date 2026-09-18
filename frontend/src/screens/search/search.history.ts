import { PreferencesManager } from '../../shared/managers/preferences';
import type { SearchHistoryItem } from './search.types';

// Persistence for the search history, on :preferences (Room) rather than :cache — a history is a
// user's own record, not a copy of server data: it has no TTL and must never be silently dropped
// as "stale". The whole list is one preference value (a JSON array): it's capped at 10 items, so
// a row-per-entry table would buy nothing and cost a bridge round trip per row.

const DOMAIN = 'searchHistory';
const KEY = 'items';

// Most-recent-first, capped here. The 11th open drops the oldest.
export const HISTORY_LIMIT = 10;

// A stored value that isn't the shape we wrote (hand-edited, or written by an older build with a
// different shape) is treated as "no history" rather than crashing the screen — the next open
// overwrites it with a valid list.
function parse(raw: string | undefined): SearchHistoryItem[] {
  if (!raw) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(
      (item): item is SearchHistoryItem =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as SearchHistoryItem).seriesId === 'string' &&
        typeof (item as SearchHistoryItem).name === 'string',
    );
  } catch {
    return [];
  }
}

function write(items: SearchHistoryItem[]): Promise<SearchHistoryItem[]> {
  return PreferencesManager.put({ key: KEY, value: JSON.stringify(items), domain: DOMAIN })
    .then(() => items)
    .catch(() => items);
}

export const SearchHistory = {
  // Newest first. A read failure is an empty history, never an error the screen has to render.
  list(): Promise<SearchHistoryItem[]> {
    return PreferencesManager.get({ key: KEY })
      .then(entry => parse(entry?.value))
      .catch(() => []);
  },

  // Records an open. An id already in the list is MOVED to the top (not duplicated) with a fresh
  // timestamp, so reopening an old row revives it. Returns the list as written, so the caller can
  // render it without a second read.
  put({ item }: { item: SearchHistoryItem }): Promise<SearchHistoryItem[]> {
    return SearchHistory.list().then(current => {
      const withoutIt = current.filter(i => i.seriesId !== item.seriesId);
      return write([item, ...withoutIt].slice(0, HISTORY_LIMIT));
    });
  },

  delete({ seriesId }: { seriesId: string }): Promise<SearchHistoryItem[]> {
    return SearchHistory.list().then(current => write(current.filter(i => i.seriesId !== seriesId)));
  },

  clear(): Promise<SearchHistoryItem[]> {
    return write([]);
  },
};
