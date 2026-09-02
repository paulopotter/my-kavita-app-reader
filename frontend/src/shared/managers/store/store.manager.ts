import { CacheManager } from '../caches/cache.manager';

// Store — a generic typed key/value store, one namespace per `domain`, backed by
// CacheManager.persistent (Room via the Kotlin :cache module) so entries survive the app being
// killed. Each value is stored as JSON under a caller-chosen `id`; `get` folds the cache entry's
// own `cachedAtEpochMs` back in as `updatedAtEpochMs` (every `set` re-stamps it), so a caller can
// compare it against another timestamp and let the newer one win.
//
// This is deliberately NOT a cache: no TTL, no cache-first/refresh decision. It's a durable local
// record — a temporary sync buffer in front of a real source of truth (the reader's local
// position vs. the Kavita server; the Library's list snapshot vs. a fresh fetch). Callers that
// need staleness semantics implement them on top, using `updatedAtEpochMs`.
//
// `Store.for<T>({ domain })` returns a small bound object (get/set/clear) for that one domain —
// this is the only entry point. Two domains never collide: the `domain` is passed through to
// CacheManager on every write and scopes invalidation.
//
// History: this module was `reading-progress.manager.ts` (ReadingProgressManager) — created with
// a domain-specific name for a use case that was always generic. Renamed and generalized so the
// Library's list snapshot and per-series digest index can reuse the exact same mechanism instead
// of each re-implementing the JSON-over-CacheManager.persistent pattern.

export interface StoreRecordMeta {
  updatedAtEpochMs: number;
}

export interface StoreDomain<T> {
  // Returns the stored value plus `updatedAtEpochMs` (the cache entry's own write timestamp), or
  // null when there is no entry or the stored value isn't valid JSON.
  get(id: string): Promise<(T & StoreRecordMeta) | null>;
  // Overwrites the entry for `id`, re-stamping `updatedAtEpochMs` to now. Resolves to undefined
  // (never the cache descriptor).
  set(id: string, value: T): Promise<void>;
  // Removes the entry for `id`.
  clear(id: string): Promise<void>;
}

export const Store = {
  for<T>({ domain }: { domain: string }): StoreDomain<T> {
    return {
      get(id: string): Promise<(T & StoreRecordMeta) | null> {
        return CacheManager.persistent.get({ key: id, variant: '' }).then(entry => {
          if (!entry) {
            return null;
          }
          try {
            const parsed = JSON.parse(entry.value) as T;
            return { ...parsed, updatedAtEpochMs: entry.cachedAtEpochMs };
          } catch {
            return null;
          }
        });
      },

      set(id: string, value: T): Promise<void> {
        return CacheManager.persistent
          .put({ key: id, value: JSON.stringify(value), domain, variant: '' })
          .then(() => undefined);
      },

      clear(id: string): Promise<void> {
        return CacheManager.persistent.invalidate({ key: id, variant: '' });
      },
    };
  },
};
