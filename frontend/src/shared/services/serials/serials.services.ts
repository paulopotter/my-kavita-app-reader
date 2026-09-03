import { DigestBridge, ExternalMetadataBridge, ServerBridge } from '../../bridge';
import type { ExternalMetadataMatch, PluginChapter, SerialData, SerialDigest, SerialsDigest } from '../../bridge';
import { Methods } from '../../tools/methods';

// Layer 4 — SerialsService (plural) is the batch namespace. get() is the list counterpart of
// SerialService.get: it goes through DigestBridge.getSerialsDigest (:content-digest, Layer 3),
// which is cache-first (each series merged into its own per-series cache) and reports how fresh
// the data is via lastUpdatedEpochMs. Callers wanting the canonical Serie[] shape run
// result.serials through SeriesTool.normalize (shared/tools/series), the plural sibling of
// SerieTool.normalize. `raw.list()` is the un-digested escape hatch — a bare ServerBridge
// (Layer 2) call returning SerialData[] straight from the plugin, for the smoke test / debugging
// only.
export const SerialsService = {
  get({ force }: { force?: boolean } = {}): Promise<SerialsDigest> {
    return DigestBridge.getSerialsDigest({ force });
  },
  // Batch external-metadata lookup, no hint — mirrors ExternalMetadataServer.matches.sync():
  // resolves against whichever group is already active (or activates one via the 2-level
  // fallback), positional result (result[i] ↔ series[i], null meaning no match). The only shape
  // that makes sense here — a caller already dealing with a list of series never has a specific
  // groupId/kavitaServerGroupId/kavitaUrl to hand in; that's ExternalMetadataServer's own job to
  // resolve. The other 3 resolution shapes (explicit group/server) live under raw.externalDetails
  // instead, for callers that DO already know which one they want (e.g. a config screen).
  externalDetails: {
    sync({
      series,
    }: {
      series: { seriesId: string; seriesName: string }[];
    }): Promise<(ExternalMetadataMatch | null)[]> {
      return ExternalMetadataBridge.matchesSync(
        series.map((s) => s.seriesId),
        series.map((s) => s.seriesName),
      );
    },
  },
  // Un-digested escape hatch — bare Server (Layer 2) reads and all 4 resolution shapes
  // ExternalMetadataServer.matches exposes, straight passthrough, no Digest involved.
  raw: {
    // Bare serials.list() — SerialData[] straight from the plugin, no cache, no digest. For the
    // smoke test / debugging only; real callers use get() (cache-first, freshness-aware).
    list(): Promise<SerialData[]> {
      return ServerBridge.listSerials().then((payload) => payload?.serials ?? []);
    },
    externalDetails: {
      syncByGroup({
        groupId,
        series,
      }: {
        groupId: string;
        series: { seriesId: string; seriesName: string }[];
      }): Promise<(ExternalMetadataMatch | null)[]> {
        return ExternalMetadataBridge.matchesSyncByGroup(
          groupId,
          series.map((s) => s.seriesId),
          series.map((s) => s.seriesName),
        );
      },
      syncByServerId({
        kavitaServerGroupId,
        series,
      }: {
        kavitaServerGroupId: string;
        series: { seriesId: string; seriesName: string }[];
      }): Promise<(ExternalMetadataMatch | null)[]> {
        return ExternalMetadataBridge.matchesSyncByServerId(
          kavitaServerGroupId,
          series.map((s) => s.seriesId),
          series.map((s) => s.seriesName),
        );
      },
      syncByServerUrl({
        kavitaUrl,
        series,
      }: {
        kavitaUrl: string;
        series: { seriesId: string; seriesName: string }[];
      }): Promise<(ExternalMetadataMatch | null)[]> {
        return ExternalMetadataBridge.matchesSyncByServerUrl(
          kavitaUrl,
          series.map((s) => s.seriesId),
          series.map((s) => s.seriesName),
        );
      },
    },
  },
};

// SerialService (singular) — thin wrapper over DigestBridge.getSerialDigest and, for raw and
// chapters.status, ServerBridge (Server, Layer 2 — direct plugin-level reads/writes the Digest
// only aggregates). No cache, no transformation: reads get the raw SerialDigest (Success/
// Failure, discriminated by isSuccess) exactly as :content-digest's buildSeriesDigest produced
// it. get() always asks for the light payload (full=false, no external metadata); getFull() asks
// for the complete one (full=true) — external metadata is opted into separately via
// includeExternalMetadata, never bundled into "full" (a caller wanting chapters+pages but not the
// BFF/M3 round trip shouldn't have to pay for it). `force` (default false) skips the cache
// entirely and re-fetches from the server — a manual pull-to-refresh, never a plain mount/focus
// load. Every method that takes an argument uses a single named-argument object (never positional
// params) — this is what lets bound() merge in the fixed seriesId without needing to know each
// method's parameter order.
export const SerialService = {
  get({ seriesId, force }: { seriesId: string; force?: boolean }): Promise<SerialDigest> {
    return DigestBridge.getSerialDigest(seriesId, { full: false, force });
  },
  getFull({ seriesId, force }: { seriesId: string; force?: boolean }): Promise<SerialDigest> {
    return DigestBridge.getSerialDigest(seriesId, { full: true, force });
  },
  // Raw Server-level reads, straight from ServerBridge — no Digest involved, no computed fields
  // beyond Server's own coverImage normalization (SerialData).
  raw: {
    get({ seriesId }: { seriesId: string }): Promise<SerialData> {
      return ServerBridge.getSerial(seriesId);
    },
    chapters: {
      list({ seriesId }: { seriesId: string }): Promise<PluginChapter[]> {
        return ServerBridge.listChapters(seriesId);
      },
    },
    // Raw access to all 4 resolution shapes ExternalMetadataServer.match exposes — straight
    // passthrough to ExternalMetadataBridge, no Digest involved (unlike externalDetail below,
    // which goes through SerialDigest.metadata.external).
    externalDetail: {
      syncByGroup({
        groupId,
        seriesId,
        seriesName,
      }: {
        groupId: string;
        seriesId: string;
        seriesName: string;
      }): Promise<ExternalMetadataMatch | null> {
        return ExternalMetadataBridge.matchSyncByGroup(groupId, seriesId, seriesName);
      },
      syncByServerId({
        kavitaServerGroupId,
        seriesId,
        seriesName,
      }: {
        kavitaServerGroupId: string;
        seriesId: string;
        seriesName: string;
      }): Promise<ExternalMetadataMatch | null> {
        return ExternalMetadataBridge.matchSyncByServerId(kavitaServerGroupId, seriesId, seriesName);
      },
      syncByServerUrl({
        kavitaUrl,
        seriesId,
        seriesName,
      }: {
        kavitaUrl: string;
        seriesId: string;
        seriesName: string;
      }): Promise<ExternalMetadataMatch | null> {
        return ExternalMetadataBridge.matchSyncByServerUrl(kavitaUrl, seriesId, seriesName);
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
  // Convenience mirror of ExternalMetadataServer.match.sync() (no hint) — straight passthrough
  // to ExternalMetadataBridge, same shape as SerialsService.externalDetails above but singular.
  externalDetail: {
    sync({ seriesId, seriesName }: { seriesId: string; seriesName: string }): Promise<ExternalMetadataMatch | null> {
      return ExternalMetadataBridge.matchSync(seriesId, seriesName);
    },
  },
  // bound({seriesId}) fixes only the id (object-merge underneath, via Methods.bound), never a
  // fetched digest. No state beyond that id: every call on the returned object still hits
  // DigestBridge/ServerBridge fresh, same as calling SerialService directly.
  bound(fixed: { seriesId: string }) {
    return Methods.bound(SerialService, [], fixed);
  },
};
