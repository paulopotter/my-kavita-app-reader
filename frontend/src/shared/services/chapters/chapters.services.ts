import { DigestBridge, type ChapterDigest } from '../../bridge/digest';
import { ServerBridge, type PluginChapter, type PluginProgress } from '../../bridge/server';
import { Methods } from '../../tools/methods';

// Layer 4 — thin wrapper over DigestBridge.getChapterDigest (get/getFull) and, for raw/progress/
// status, ServerBridge (Server, Layer 2 — direct plugin-level reads/writes the Digest only
// aggregates). No cache, no transformation: reads get exactly what the bridge produced. get()
// always asks for the light Digest payload (full=false); getFull() asks for the complete one
// (pages.list, prev/next chapter) — the caller decides which one it needs, never a boolean flag.
// `force` (default false) skips the cache entirely and re-fetches from the server — a manual
// pull-to-refresh, never a plain mount/focus load. Every method takes a single named-argument
// object (never positional params) — this is what lets bound() merge in fixed ids without needing
// to know each method's parameter order.
export const ChapterService = {
  get({ seriesId, chapterId, force }: { seriesId: string; chapterId: string; force?: boolean }): Promise<ChapterDigest> {
    return DigestBridge.getChapterDigest(seriesId, chapterId, { full: false, force });
  },
  getFull({ seriesId, chapterId, force }: { seriesId: string; chapterId: string; force?: boolean }): Promise<ChapterDigest> {
    return DigestBridge.getChapterDigest(seriesId, chapterId, { full: true, force });
  },
  // Raw plugin-level chapter data (title, number, pageCount, pagesRead, isSpecial), straight
  // from ServerBridge.getChapter — no Digest involved, no computed fields (e.g. no readStatus
  // enum; that's the Digest's job, deliberately not duplicated here).
  raw: {
    get({ seriesId, chapterId }: { seriesId: string; chapterId: string }): Promise<PluginChapter> {
      return ServerBridge.getChapter(seriesId, chapterId);
    },
  },
  // Last-read-page + timestamp, straight from ServerBridge.getChapterProgress/setChapterProgress
  // — not the same as ChapterDigest.pages.resumePoint, which the Digest computes separately.
  progress: {
    get({ seriesId, chapterId }: { seriesId: string; chapterId: string }): Promise<PluginProgress | null> {
      return ServerBridge.getChapterProgress(seriesId, chapterId);
    },
    set({
      seriesId,
      chapterId,
      pageIndex,
    }: {
      seriesId: string;
      chapterId: string;
      pageIndex: number;
    }): Promise<void> {
      return ServerBridge.setChapterProgress(seriesId, chapterId, pageIndex);
    },
  },
  status: {
    set({
      seriesId,
      chapterId,
      isRead,
    }: {
      seriesId: string;
      chapterId: string;
      isRead: boolean;
    }): Promise<void> {
      return ServerBridge.setChapterRead(seriesId, chapterId, isRead);
    },
  },
  read({ seriesId, chapterId }: { seriesId: string; chapterId: string }): Promise<void> {
    return ChapterService.status.set({ seriesId, chapterId, isRead: true });
  },
  unread({ seriesId, chapterId }: { seriesId: string; chapterId: string }): Promise<void> {
    return ChapterService.status.set({ seriesId, chapterId, isRead: false });
  },
  // bound({seriesId, chapterId}) fixes only the ids (object-merge underneath, via Methods.bound),
  // never a fetched digest — see serials.services.ts for the same pattern and rationale. Every
  // call on the returned object still hits DigestBridge/ServerBridge fresh.
  bound(fixed: { seriesId: string; chapterId: string }) {
    return Methods.bound(ChapterService, [], fixed);
  },
};
