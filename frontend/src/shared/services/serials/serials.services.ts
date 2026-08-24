import { DigestBridge, type SeriesDigest } from '../../bridge/digest';
import { ServerBridge, type PluginChapter, type PluginSerial } from '../../bridge/server';
import { Methods } from '../../tools/methods';

// Layer 4 — SerialsService (plural) is the batch namespace: it goes straight to
// ServerBridge.listSerials (Server, Layer 2), not through the Digest — there is no batch digest
// operation today. Returns the raw PluginSerial[] as Server produced it, no transformation.
// Callers needing the enriched SeriesDigest shape per series call SerialService.get/getFull in a
// loop over the ids this returns. list() takes no arguments, so it stays the one method here
// with no single-object-argument shape to bind.
export const SerialsService = {
  list(): Promise<PluginSerial[]> {
    return ServerBridge.listSerials();
  },
};

// SerialService (singular) — thin wrapper over DigestBridge.getSeriesDigest and, for raw and
// chapters.status, ServerBridge (Server, Layer 2 — direct plugin-level reads/writes the Digest
// only aggregates). No cache, no transformation: reads get the raw SeriesDigest (Success/
// Failure, discriminated by isSuccess) exactly as :content-digest's buildSeriesDigest produced
// it. get() always asks for the light payload (full=false); getFull() asks for the complete one
// — the caller decides which one it needs, never a boolean flag. Every method that takes an
// argument uses a single named-argument object (never positional params) — this is what lets
// bound() merge in the fixed seriesId without needing to know each method's parameter order.
export const SerialService = {
  get({ seriesId }: { seriesId: string }): Promise<SeriesDigest> {
    return DigestBridge.getSeriesDigest(seriesId, false);
  },
  getFull({ seriesId }: { seriesId: string }): Promise<SeriesDigest> {
    return DigestBridge.getSeriesDigest(seriesId, true);
  },
  // Raw plugin-level reads, straight from ServerBridge — no Digest involved, no computed fields.
  raw: {
    get({ seriesId }: { seriesId: string }): Promise<PluginSerial> {
      return ServerBridge.getSerial(seriesId);
    },
    chapters: {
      list({ seriesId }: { seriesId: string }): Promise<PluginChapter[]> {
        return ServerBridge.listChapters(seriesId);
      },
    },
  },
  chapters: {
    status: {
      set({
        seriesId,
        chapterIds,
        isRead,
      }: {
        seriesId: string;
        chapterIds: string[];
        isRead: boolean;
      }): Promise<void> {
        return ServerBridge.setChaptersRead(seriesId, isRead, chapterIds);
      },
    },
    read({ seriesId, chapterIds }: { seriesId: string; chapterIds: string[] }): Promise<void> {
      return SerialService.chapters.status.set({ seriesId, chapterIds, isRead: true });
    },
    unread({ seriesId, chapterIds }: { seriesId: string; chapterIds: string[] }): Promise<void> {
      return SerialService.chapters.status.set({ seriesId, chapterIds, isRead: false });
    },
  },
  // bound({seriesId}) fixes only the id (object-merge underneath, via Methods.bound), never a
  // fetched digest. No state beyond that id: every call on the returned object still hits
  // DigestBridge/ServerBridge fresh, same as calling SerialService directly.
  bound(fixed: { seriesId: string }) {
    return Methods.bound(SerialService, [], fixed);
  },
};
