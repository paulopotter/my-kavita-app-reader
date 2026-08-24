import { DigestBridge, type PageDigest } from '../../bridge/digest';
import { ServerBridge, type PluginPageDimension } from '../../bridge/server';
import { Methods } from '../../tools/methods';

// Layer 4 — thin wrapper over DigestBridge.getPageDigest (get) and, for raw, ServerBridge
// (Server, Layer 2 — direct plugin-level reads the Digest only aggregates). No cache, no
// transformation: callers get exactly what the bridge produced. get() returns the full
// PageDigest (Success/Failure, discriminated by isSuccess) — there is no full/light distinction
// for pages, unlike Chapter/Serial. Every method takes a single named-argument object (never
// positional params) — this is what lets bound() merge in fixed ids without needing to know
// each method's parameter order.
export const PageService = {
  get({
    seriesId,
    chapterId,
    pageIndex,
  }: {
    seriesId: string;
    chapterId: string;
    pageIndex: number;
  }): Promise<PageDigest> {
    return DigestBridge.getPageDigest(seriesId, chapterId, pageIndex);
  },
  // Raw plugin-level page data, straight from ServerBridge — no Digest involved. There is no
  // batch/write operation for Page on the bridge today.
  raw: {
    dimensions({
      seriesId,
      chapterId,
      pageIndex,
    }: {
      seriesId: string;
      chapterId: string;
      pageIndex: number;
    }): Promise<PluginPageDimension> {
      return ServerBridge.getPageDimensions(seriesId, chapterId, pageIndex);
    },
    url({
      seriesId,
      chapterId,
      pageIndex,
    }: {
      seriesId: string;
      chapterId: string;
      pageIndex: number;
    }): Promise<string> {
      return ServerBridge.getPageUrl(seriesId, chapterId, pageIndex);
    },
  },
  // bound({seriesId, chapterId, pageIndex}) fixes only the ids (object-merge underneath, via
  // Methods.bound), never a fetched digest — see serials.services.ts for the same pattern and
  // rationale.
  bound(fixed: { seriesId: string; chapterId: string; pageIndex: number }) {
    return Methods.bound(PageService, [], fixed);
  },
};
