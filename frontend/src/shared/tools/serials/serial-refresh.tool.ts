import { EventBus } from '../../managers/events';
import { SerialService } from '../../services/serials';
import { SerieEvents } from './serial.events';

// SerialRefreshTool — keeps ONE series' cached digest honest after the user reads in it.
//
// The Kotlin patch for a read-status change does not recompute chapters.resumePoint, and a page
// position never touches the serial cache at all (see the KNOWN GAP in chapters.tool.ts), so
// "where to continue" in the cache lags up to the 15 min TTL. Rather than reach into Kotlin's
// cache keys, this re-fetches that one series with force — which rewrites its entry — and then
// announces it, so a screen showing the resume point (the Dashboard) can re-read the fresh cache.
//
// Debounced per series, trailing: reading emits progress every few seconds, but the series only
// needs to be re-fetched once things go quiet (or the reader closes — the timer outlives it).

export const REFRESH_DEBOUNCE_MS = 3000;

const timers = new Map<string, ReturnType<typeof setTimeout>>();

export const SerialRefreshTool = {
  afterReading({ seriesId }: { seriesId: string }): void {
    const pending = timers.get(seriesId);
    if (pending) {clearTimeout(pending);}
    timers.set(
      seriesId,
      setTimeout(() => {
        timers.delete(seriesId);
        SerialService.get({ seriesId, force: true })
          .then(digest => {
            if (digest.isSuccess) {EventBus.emit(SerieEvents.refreshed, { seriesId });}
          })
          .catch(() => {});
      }, REFRESH_DEBOUNCE_MS),
    );
  },
};
