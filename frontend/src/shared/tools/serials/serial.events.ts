import { createEvent } from '../../managers/events';
import type { SerialDigestSuccess } from '../../bridge';

// EventBus tokens the "series" domain emits (plano 017, Task 013 — Mechanism 3, RN→RN). Declared
// next to the emitter (serie.hooks.ts / SerieTool), per Task 013: an event lives with whichever
// module raises it, and a listener imports the token (autocomplete, no typo).

// Emitted whenever any screen resolves a fresh SerialDigest for a series (SerieScreen's load,
// and any future caller). Carries only the subset the Library card needs — NOT the whole digest
// — so a listener can keep a lightweight per-series index warm without the emitter knowing who
// listens or why. The SeriesDigestIndex listener (shared/managers/store/series-digest.store.ts) is the first
// consumer: it lets a series the user opened once (followed or not) show its real chapter
// counts / publication status in the Library without the Library itself fetching that digest.
export interface SerieDigestResolvedPayload {
  seriesId: string;
  // Chapter read counts — from SerialDigest.chapters (readCount / total). Absent when the digest
  // carried no chapters block (e.g. a genuinely empty "coming soon" series).
  readChapters?: number;
  totalChapters?: number;
  // From SerialDigest.metadata.publicationStatus (Kavita's own value), when present.
  publicationStatus?: string;
}

export const SerieEvents = {
  digestResolved: createEvent<SerieDigestResolvedPayload>('serieDigestResolved'),
} as const;

// Builds the event payload from a resolved digest — the one place the "which fields the Library
// cares about" projection lives, shared by every emitter so they never diverge.
export function serieDigestResolvedPayload(digest: SerialDigestSuccess): SerieDigestResolvedPayload {
  return {
    seriesId: digest.id,
    readChapters: digest.chapters?.readCount,
    totalChapters: digest.chapters?.total,
    publicationStatus: digest.metadata?.publicationStatus,
  };
}
