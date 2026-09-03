import { EventBus } from '../events';
import { SerieEvents } from '../../tools/series/serie.events';
import { Store } from './store.manager';

// SeriesDigestIndex — a per-series "what I already know about this series" record: the handful of
// fields a Library card renders (chapter counts, publication status), bound to the generic Store
// under the `seriesDigest` domain (persistent). Written whenever a SerieDigest resolves anywhere
// (SerieEvents.digestResolved), so a series the user opened once — followed or not — shows real
// numbers on the Library without the Library refetching that series' digest.
//
// Same shape as ReadingProgressManager (this folder): a thin bind of Store to one domain. It is
// NOT the digest cache (that's Kotlin's :cache, keyed by the full digest); it's a tiny local
// projection. `updatedAtEpochMs` (from the Store record) lets the Library prefer a fresh
// SerialService.get result over a stale index hit.

export interface SeriesDigestIndexEntry {
  readChapters?: number;
  totalChapters?: number;
  publicationStatus?: string;
}

const domain = Store.for<SeriesDigestIndexEntry>({ domain: 'seriesDigest' });

export const SeriesDigestIndex = {
  get(seriesId: string) {
    return domain.get(seriesId);
  },
  set(seriesId: string, entry: SeriesDigestIndexEntry) {
    return domain.set(seriesId, entry);
  },
};

// Subscribes SeriesDigestIndex to every resolved digest, app-wide, so it stays current whether or
// not the Library is mounted. Idempotent (a second call is a no-op) and never unsubscribes — the
// listener is meant to live for the whole app lifetime. Call this once during app boot; it is NOT
// an import side effect (a barrel must never register a global listener just by being imported).
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
