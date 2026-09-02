import type { ExternalMetadataMatch } from '../../shared/bridge/external';
import type { Strings } from '../../shared/i18n/strings';
import type { Serie } from '../../shared/tools/series';
import type { SeriesDigestIndexEntry } from '../../shared/tools/series';

// LibraryTool — the screen-local tool for the Library/Following screen (same pattern as
// screens/reader/reading-mode.tool.ts). It takes what library.hooks.ts already fetched — Serie[]
// (already normalized by SeriesTool), the positional BFF match array, the persistent
// per-series digest index, and the followed-id set — and produces LibraryEntry[], the shape the
// card renders. It never fetches; the hook owns "when/how to fetch".
//
// "Library" is not a domain (plan 017, Task 011) — it's a listing view over Series plus a
// filter. So this composition lives with the screen, not in shared/tools/series (which would put
// Library-shaped logic inside the Series domain — Domain Composition only flows Series → Library,
// never back).

export type PublicationStatus = 'ONGOING' | 'COMPLETED' | 'CANCELLED' | 'ON_HIATUS' | 'ABANDONED';

// The shape one Library/Following card renders. Composed from: Serie (id/name/cover + page
// progress from the batch listing), the digest index (real chapter counts + Kavita publication
// status, only for series opened at least once / followed), and the BFF match (downloaded counts,
// hasErrors, publication status). Every enrichment is optional — with no BFF and a series never
// opened, the card still renders from Serie alone.
export interface LibraryEntry {
  id: string;
  name: string;
  coverUrl: string;
  // 0..1. Chapter-based (index readChapters/totalChapters) when available, else page-based
  // (serie.pages.read/total).
  progressFraction: number;
  readStatus: 'UNREAD' | 'IN_PROGRESS' | 'READ';
  isFollowed: boolean;
  // Epoch ms; used only for the RECENTLY_UPDATED sort. Absent when the series carried no
  // last-chapter-added timestamp.
  lastChapterAddedEpochMs?: number;
  // Chapter counts — only when the digest index has them. Absent → card shows page-based
  // progress only, no "X/Y chapters" line.
  readChapters?: number;
  chapterCount?: number;
  // BFF/M3 enrichment. All absent with no BFF match for this series.
  publicationStatus?: PublicationStatus;
  downloadedChapters?: number;
  totalChapters?: number;
  hasErrors?: boolean;
}

// Maps a raw status string — BFF vocabulary ("ongoing", "completed", "publishing_finished", …)
// OR Kavita's own publicationStatus enum string ("OnGoing", "Hiatus", …) — to the card's enum.
// Unknown/empty → undefined (no badge).
export function normalizePublicationStatus(raw: string | undefined): PublicationStatus | undefined {
  if (!raw) {
    return undefined;
  }
  switch (raw.toLowerCase()) {
    case 'ongoing':
      return 'ONGOING';
    case 'completed':
    case 'ended':
    case 'publishing_finished':
      return 'COMPLETED';
    case 'cancelled':
      return 'CANCELLED';
    case 'on_hiatus':
    case 'hiatus':
      return 'ON_HIATUS';
    case 'abandoned':
      return 'ABANDONED';
    default:
      return undefined;
  }
}

function clamp01(n: number): number {
  if (Number.isNaN(n) || n < 0) {
    return 0;
  }
  return n > 1 ? 1 : n;
}

function resolveProgress(
  serie: Serie,
  index: SeriesDigestIndexEntry | null,
): { fraction: number; readChapters?: number; chapterCount?: number } {
  const rc = index?.readChapters;
  const tc = index?.totalChapters;
  if (rc != null && tc != null && tc > 0) {
    return { fraction: clamp01(rc / tc), readChapters: rc, chapterCount: tc };
  }
  const read = serie.pages?.read ?? 0;
  const total = serie.pages?.total ?? 0;
  return { fraction: total > 0 ? clamp01(read / total) : 0 };
}

function deriveReadStatus(fraction: number, readChapters?: number, chapterCount?: number): LibraryEntry['readStatus'] {
  if (readChapters != null && chapterCount != null && chapterCount > 0) {
    if (readChapters <= 0) {
      return 'UNREAD';
    }
    return readChapters >= chapterCount ? 'READ' : 'IN_PROGRESS';
  }
  if (fraction <= 0) {
    return 'UNREAD';
  }
  return fraction >= 1 ? 'READ' : 'IN_PROGRESS';
}

function toEntry({
  serie,
  match,
  index,
  isFollowed,
}: {
  serie: Serie;
  match: ExternalMetadataMatch | null;
  index: SeriesDigestIndexEntry | null;
  isFollowed: boolean;
}): LibraryEntry {
  const progress = resolveProgress(serie, index);
  return {
    id: serie.id,
    name: serie.name,
    coverUrl: serie.coverImage.url,
    progressFraction: progress.fraction,
    readStatus: deriveReadStatus(progress.fraction, progress.readChapters, progress.chapterCount),
    isFollowed,
    lastChapterAddedEpochMs: serie.lastUpdatesUTC?.chapterAdded,
    readChapters: progress.readChapters,
    chapterCount: progress.chapterCount,
    // Cascade: BFF match first, then the digest index's Kavita value, then undefined.
    publicationStatus:
      normalizePublicationStatus(match?.status) ?? normalizePublicationStatus(index?.publicationStatus),
    downloadedChapters: match?.downloadedChapters,
    totalChapters: match?.totalChapters,
    hasErrors: match?.hasErrors,
  };
}

export const LibraryTool = {
  // Composes the whole list. `matches[i]` corresponds to `series[i]` (positional, from the BFF
  // batch — null = no match). `indexBySeriesId` holds whatever the persistent SeriesDigestIndex
  // had for each id (resolved by the hook). `followedIds` is the current followed set.
  normalize({
    series,
    matches,
    indexBySeriesId,
    followedIds,
  }: {
    series: Serie[];
    matches: (ExternalMetadataMatch | null)[];
    indexBySeriesId: Map<string, SeriesDigestIndexEntry>;
    followedIds: Set<string>;
  }): LibraryEntry[] {
    return series.map((serie, i) =>
      toEntry({
        serie,
        match: matches[i] ?? null,
        index: indexBySeriesId.get(serie.id) ?? null,
        isFollowed: followedIds.has(serie.id),
      }),
    );
  },

  // i18n labels — the card is a dumb component, so it takes strings, not enums. Moved here from
  // the legacy LibraryTransform (publicationLabel / statusLabel / formatProgress).
  label: {
    publication(status: PublicationStatus, t: Strings): string {
      switch (status) {
        case 'ONGOING':
          return t.publicationOngoing;
        case 'COMPLETED':
          return t.publicationCompleted;
        case 'CANCELLED':
          return t.publicationCancelled;
        case 'ON_HIATUS':
          return t.publicationOnHiatus;
        case 'ABANDONED':
          return t.publicationAbandoned;
      }
    },
    readStatus(status: LibraryEntry['readStatus'], t: Strings): string {
      switch (status) {
        case 'UNREAD':
          return t.readStatusUnread;
        case 'IN_PROGRESS':
          return t.readStatusReading;
        case 'READ':
          return t.readStatusRead;
      }
    },
    progressPercent(fraction: number): string {
      return `${Math.round(fraction * 100)}%`;
    },
  },
};
