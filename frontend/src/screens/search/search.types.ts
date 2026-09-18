import type { SerialCard } from '../../shared/tools/serials';

// One row of the "recently opened from search" list. Deliberately NOT the typed query: the
// history records the SERIES the user reached through search, so tapping one goes straight back
// to it instead of replaying a text search that may no longer match the same thing.
export interface SearchHistoryItem {
  seriesId: string;
  name: string;
  coverUrl: string;
  openedAtEpochMs: number;
}

// A history item as the screen renders it: what was stored, plus the CURRENT followed flag. The
// flag is never persisted — it changes independently of the history, so it's resolved at read
// time from the live followed set.
export interface SearchHistoryRow extends SearchHistoryItem {
  isFollowed: boolean;
}

export interface UseSearchResult {
  query: string;
  setQuery: (query: string) => void;
  // Empty while the query is blank — the screen shows the history instead.
  results: SerialCard[];
  history: SearchHistoryRow[];
  loading: boolean;
  error: string | null;
  reload: () => void;
  // Records the series in the history. Called for a result AND for a history row (which revives
  // it to the top), so "recent" always means "most recently opened".
  recordOpened: (args: { seriesId: string }) => void;
  // Deleting a history row is confirmed first — requestDelete opens the dialog, confirm/cancel
  // close it. pendingDelete is the row awaiting an answer (null = no dialog).
  pendingDelete: SearchHistoryItem | null;
  requestDelete: (args: { seriesId: string }) => void;
  cancelDelete: () => void;
  confirmDelete: () => void;
}
