import { EventBus } from '../../managers/events';
import { Store } from '../../managers/store';
import { SerieEvents } from './serie.events';

// SeriesDigestIndex — a per-series "what I already know about this series" record, kept in the
// generic Store (domain 'seriesDigest', persistent). Written whenever a SeriesDigest is resolved
// anywhere (SerieEvents.digestResolved), read by the Library so a series the user opened once —
// followed or not — shows its real chapter counts / publication status without the Library
// itself fetching that series' digest.
//
// This is NOT the digest cache (that's Kotlin's :cache, keyed by the full digest). It's a tiny
// projection: just the handful of fields the Library card renders. `updatedAtEpochMs` (from the
// Store entry) lets the Library prefer a fresh SerialService.get result over a stale index hit.

export interface SeriesDigestIndexEntry {
  readChapters?: number;
  totalChapters?: number;
  publicationStatus?: string;
}

const store = Store.for<SeriesDigestIndexEntry>({ domain: 'seriesDigest' });

export const SeriesDigestIndex = {
  get(seriesId: string) {
    return store.get(seriesId);
  },
  set(seriesId: string, entry: SeriesDigestIndexEntry) {
    return store.set(seriesId, entry);
  },
};

// Auto-registered on import: keeps the index in sync with every resolved digest, app-wide,
// whether or not the Library is mounted. Idempotent — registering twice would just add a second
// identical handler, so this module must only be imported through the series tools barrel (which
// a single boot import pulls in once). No unsubscribe: this listener lives for the whole app
// lifetime by design.
let registered = false;

export function registerSeriesDigestIndexListener(): void {
  if (registered) {
    return;
  }
  registered = true;
  EventBus.on(SerieEvents.digestResolved, ({ seriesId, readChapters, totalChapters, publicationStatus }) => {
    SeriesDigestIndex.set(seriesId, { readChapters, totalChapters, publicationStatus }).catch(() => {});
  });
}

registerSeriesDigestIndexListener();
