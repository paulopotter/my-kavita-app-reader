import { ChapterTool, type SerieChapter } from '../chapters';
import { EventBus, EventsManager } from '../../managers/events';
import type { ContentEvent } from '../../managers/events';
import { NotificationEvents } from '../../services/notifications';
import { FollowedSeriesBridge } from '../../bridge';
import type { Strings } from '../../i18n';
import type { ChapterDigestSuccess, ImageDescriptor, SerialDigestSuccess, SerialResumePoint, ServerActiveInfo } from '../../bridge';

// SerieChapter is re-exported from chapters/ (its actual home — ChapterTool.normalize) via
// shared/tools/index.ts already; not re-exported again from here to avoid the ambiguous-export
// combination TypeScript otherwise flags on `export * from './chapters'` + `export * from
// './serials'` both naming it.

// SerieTool — the normalizer for the "series" domain: turns SerialDigest (or any future raw
// source) into a stable, canonical shape every screen/component reads the same way, regardless
// of where the data actually came from. Each chapter is normalized by ChapterTool (chapter's own
// domain — Domain Composition: Series delegates downward to Chapter), never re-implemented here.

export interface Serie {
  id: string;
  name: string;
  library?: SerialDigestSuccess['library'];
  lastUpdatesUTC?: SerialDigestSuccess['lastUpdatesUTC'];
  coverImage: ImageDescriptor;
  chapters: SerieChapter[];
  // Which chapter to resume at ("in progress" > first unread > first unfinished, or absent when
  // every chapter is fully read) — already decided by the Kotlin digest builder (SerialDigest.
  // chapters.resumePoint), never recomputed here.
  resumePoint?: SerialResumePoint;
  otherNames?: SerialDigestSuccess['otherNames'];
  sortName?: string;
  otherIds?: SerialDigestSuccess['otherIds'];
  colors?: SerialDigestSuccess['colors'];
  metadata?: SerialDigestSuccess['metadata'];
  // Page-level read progress — present when this Serie came from the batch listing
  // (SeriesTool.normalize, which only has Kavita's series-level pagesRead/totalPages, no
  // per-chapter data). Absent when it came from SerieTool.normalize (a full digest), where
  // progress is derived from `chapters` instead. Named/nested per the digest's own convention
  // (chapters.readCount/total, pages.count/readCount on ChapterDigest).
  pages?: {
    read: number;
    total: number;
  };
  resolvedAtEpochMs: number;
  server: ServerActiveInfo;
  events: SerieEventsContract; // not present on SerialDigestSuccess — added by this normalizer
}

// What can happen to a serie, as the serie domain itself declares it. Armed on every normalized
// serie; only whoever actually opens one calls `exec` (see EventsManager's own doc).
export interface SerieEventsContract {
  opened: ContentEvent;
}

// Exported for the same reason chapterEvents is: anything holding a serie's id (a test fixture,
// a future caller that doesn't go through normalize) can build the same contract.
export function serieEvents({ seriesId }: { seriesId: string }): SerieEventsContract {
  const events = EventsManager.build({ domain: 'serie', content: { seriesId } });
  return {
    // Opening the serie is what "consumes" a notification that identified no chapter (a new
    // serie, or an event whose publisher carried no chapter detail) — see
    // NotificationEvents.contentConsumed's own doc. Chapter-specific rows are never touched by
    // this: those wait for their own chapter to be opened.
    ...events.opened({
      after: () => EventBus.emit(NotificationEvents.contentConsumed, { content: { seriesId } }),
    }),
  };
}

// ── SerialCard — one serial, shaped for a card/list row ──────────────────────────────────────

export type PublicationStatus = 'ONGOING' | 'COMPLETED' | 'CANCELLED' | 'ON_HIATUS' | 'ABANDONED';

// What ONE row renders. Composed by SerialTool.normalize.card from a Serie plus whatever
// enrichment the caller happens to have. Every label is already a localized string — the card is
// a dumb component. Fields a caller can't supply are simply absent and the card omits that line.
export interface SerialCard {
  id: string;
  name: string;
  coverUrl: string;
  progressFraction: number; // 0..1
  progressLabel: string;
  readStatus: 'UNREAD' | 'IN_PROGRESS' | 'READ';
  readStatusLabel: string;
  isFollowed: boolean;
  readChapters?: number;
  chapterCount?: number;
  chapterCountLabel?: string;
  // Raw provider status as it arrived, kept so a caller patching this field in place writes what
  // it has (a BFF string) and lets relabel do the mapping — same shape as the raw counts below.
  rawPublicationStatus?: string;
  publicationStatus?: PublicationStatus;
  publicationLabel?: string;
  // Raw BFF counts kept alongside their label: the Library patches these as its per-card
  // enrichment lands, then rebuilds the labels through SerieTool.relabel.
  downloadedChapters?: number;
  totalChapters?: number;
  downloadedLabel?: string;
  hasErrors?: boolean;
  errorsLabel?: string;
  // Epoch ms — only for the Library's RECENTLY_UPDATED sort; the card itself never shows it.
  lastChapterAddedEpochMs?: number;
}

// The optional extras a caller may already have. The Library has all of them (BFF match + its
// persistent digest index + the followed set); Search has only isFollowed.
export interface SerialCardEnrichment {
  isFollowed?: boolean;
  // Real chapter counts — from the Library's SeriesDigestIndex. Absent → page-based progress.
  readChapters?: number;
  totalChapters?: number;
  // BFF/M3 enrichment.
  publicationStatus?: string;
  // Next source tried when `publicationStatus` is missing OR unrecognized (the Library's own
  // digest-index value, which speaks Kavita's enum rather than the BFF's vocabulary).
  fallbackPublicationStatus?: string;
  downloadedChapters?: number;
  bffTotalChapters?: number;
  hasErrors?: boolean;
}

// Which raw strings mean each status. Written this way round — status → its synonyms — for two
// reasons: the Record is keyed by the enum, so adding a status to PublicationStatus without
// listing its raw spellings fails to compile; and the synonyms of one status stay together
// instead of scattering as repeated values. Two provider vocabularies land here: the BFF's
// ("ongoing", "publishing_finished", …) and Kavita's own ("OnGoing", "Hiatus", …).
const RAW_PUBLICATION_STATUS: Record<PublicationStatus, string[]> = {
  ONGOING: ['ongoing'],
  COMPLETED: ['completed', 'ended', 'publishing_finished'],
  CANCELLED: ['cancelled'],
  ON_HIATUS: ['on_hiatus', 'hiatus'],
  ABANDONED: ['abandoned'],
};

// The lookup direction the code actually needs, inverted once at module load.
const PUBLICATION_STATUS_BY_RAW: Record<string, PublicationStatus> = Object.fromEntries(
  Object.entries(RAW_PUBLICATION_STATUS).flatMap(([status, raws]) =>
    raws.map(raw => [raw, status as PublicationStatus]),
  ),
);

// Raw provider status → the card's enum, case-insensitively. Unknown/empty → undefined (no
// badge): the input is an arbitrary string off the network, so "I don't recognize this" is a
// normal outcome, not an error. Private: a caller never asks for this on its own, it's a step
// of normalize.card.
function publicationStatusFrom(raw: string | undefined): PublicationStatus | undefined {
  return raw ? PUBLICATION_STATUS_BY_RAW[raw.toLowerCase()] : undefined;
}

function clamp01(n: number): number {
  if (Number.isNaN(n) || n < 0) {
    return 0;
  }
  return n > 1 ? 1 : n;
}

// Chapter counts when the caller has them, else Kavita's series-level page progress.
function resolveProgress(
  serial: Serie,
  enrichment: SerialCardEnrichment | undefined,
): { fraction: number; readStatus: SerialCard['readStatus']; readChapters?: number; chapterCount?: number } {
  const rc = enrichment?.readChapters;
  const tc = enrichment?.totalChapters;
  if (rc != null && tc != null && tc > 0) {
    const fraction = clamp01(rc / tc);
    return {
      fraction,
      readStatus: rc <= 0 ? 'UNREAD' : rc >= tc ? 'READ' : 'IN_PROGRESS',
      readChapters: rc,
      chapterCount: tc,
    };
  }
  const read = serial.pages?.read ?? 0;
  const total = serial.pages?.total ?? 0;
  const fraction = total > 0 ? clamp01(read / total) : 0;
  return { fraction, readStatus: fraction <= 0 ? 'UNREAD' : fraction >= 1 ? 'READ' : 'IN_PROGRESS' };
}

// "3/12 caps." — undefined when either half is missing, so the card omits the line entirely.
function countLabel(read: number | undefined, total: number | undefined, t: Strings): string | undefined {
  if (read == null || total == null) {
    return undefined;
  }
  return `${read}/${total} ${t.chaptersFormat}`;
}

// status → the string that names it. Keyed by the enum, so a new status that nobody gave a
// label to fails to compile rather than rendering blank.
const PUBLICATION_LABEL_KEY: Record<PublicationStatus, keyof Strings> = {
  ONGOING: 'publicationOngoing',
  COMPLETED: 'publicationCompleted',
  CANCELLED: 'publicationCancelled',
  ON_HIATUS: 'publicationOnHiatus',
  ABANDONED: 'publicationAbandoned',
};

const READ_STATUS_LABEL_KEY: Record<SerialCard['readStatus'], keyof Strings> = {
  UNREAD: 'readStatusUnread',
  IN_PROGRESS: 'readStatusReading',
  READ: 'readStatusRead',
};

function publicationLabel(status: PublicationStatus, t: Strings): string {
  return t[PUBLICATION_LABEL_KEY[status]];
}

function readStatusLabel(status: SerialCard['readStatus'], t: Strings): string {
  return t[READ_STATUS_LABEL_KEY[status]];
}

export const SerieTool = {
  // Which chapter is "continue from" — the same 2-level cascade the Kotlin digest builder uses
  // (SerialDigest.chapters.resumePoint, see _contract-design-notes.md): first IN_PROGRESS chapter
  // in reading order → else first UNREAD chapter in reading order → else null (everything read,
  // "reread" state). The Kotlin resumePoint is authoritative on a real fetch; this recomputes it
  // locally between fetches so an optimistic mark (single or batch) reflects immediately without
  // a round trip. Sorts by decimalNumber ?? number ascending internally — READING order, never
  // the display sort (which the user may have set to DESCENDING).
  resolveResumeChapterId(chapters: SerieChapter[]): string | null {
    const ordered = [...chapters].sort((a, b) => {
      const na = a.decimalNumber ?? a.number;
      const nb = b.decimalNumber ?? b.number;
      if (na != null && nb != null && na !== nb) {return na - nb;}
      if (na != null && nb == null) {return -1;}
      if (na == null && nb != null) {return 1;}
      return a.title.localeCompare(b.title);
    });
    return (
      ordered.find(c => c.readStatus === 'IN_PROGRESS')?.id ??
      ordered.find(c => c.readStatus === 'UNREAD')?.id ??
      null
    );
  },

  normalize: {
    // Discards a chapter that failed to resolve (isSuccess: false) instead of surfacing it in
    // the canonical list — the screen never needs to know a specific chapter failed, at least
    // for now.
    digest({ digest }: { digest: SerialDigestSuccess }): Serie {
      return {
        id: digest.id,
        name: digest.name,
        library: digest.library,
        lastUpdatesUTC: digest.lastUpdatesUTC,
        coverImage: digest.coverImage,
        chapters: (digest.chapters?.list ?? [])
          .filter((c): c is ChapterDigestSuccess => c.isSuccess)
          .map(chapter => ChapterTool.normalize({ chapter, seriesId: digest.id })),
        resumePoint: digest.chapters?.resumePoint,
        otherNames: digest.otherNames,
        sortName: digest.sortName,
        otherIds: digest.otherIds,
        colors: digest.colors,
        // Kavita's series-level page progress — present on both a full digest and a minimal
        // list-row digest (SerialsDigest). LibraryTool falls back to this when there's no chapters
        // block yet.
        pages: digest.pages,
        metadata: digest.metadata,
        resolvedAtEpochMs: digest.resolvedAtEpochMs,
        server: digest.server,
        events: serieEvents({ seriesId: digest.id }),
      };
    },

    // → SerialCard, the shape ONE row renders (grid card or its list variant). Every label is
    // resolved here, with `t`, because the card is a dumb component: it takes strings, never an
    // enum and never i18n of its own. The optional fields are the enrichments only some callers
    // have — the Library passes its BFF match and digest-index counts, Search passes neither and
    // the card simply renders without those lines.
    card({ serial, t, enrichment }: {
      serial: Serie;
      t: Strings;
      enrichment?: SerialCardEnrichment;
    }): SerialCard {
      const progress = resolveProgress(serial, enrichment);
      // Cascade over MAPPED values, never raw ones: an unrecognized status string must fall
      // through to the next source, not win the ?? and resolve to undefined. The raw string that
      // won is kept alongside, so relabel can redo this without the original sources.
      const rawPublicationStatus = [
        enrichment?.publicationStatus,
        enrichment?.fallbackPublicationStatus,
        serial.metadata?.publicationStatus,
      ].find(raw => publicationStatusFrom(raw) != null);
      const publicationStatus = publicationStatusFrom(rawPublicationStatus);
      return {
        id: serial.id,
        name: serial.name,
        coverUrl: serial.coverImage.url,
        progressFraction: progress.fraction,
        progressLabel: `${Math.round(progress.fraction * 100)}%`,
        readStatus: progress.readStatus,
        readStatusLabel: readStatusLabel(progress.readStatus, t),
        isFollowed: enrichment?.isFollowed ?? false,
        readChapters: progress.readChapters,
        chapterCount: progress.chapterCount,
        chapterCountLabel: countLabel(progress.readChapters, progress.chapterCount, t),
        rawPublicationStatus,
        publicationStatus,
        publicationLabel: publicationStatus ? publicationLabel(publicationStatus, t) : undefined,
        downloadedChapters: enrichment?.downloadedChapters,
        totalChapters: enrichment?.bffTotalChapters,
        downloadedLabel: countLabel(enrichment?.downloadedChapters, enrichment?.bffTotalChapters, t),
        hasErrors: enrichment?.hasErrors,
        errorsLabel: enrichment?.hasErrors ? t.hasErrors : undefined,
        lastChapterAddedEpochMs: serial.lastUpdatesUTC?.chapterAdded,
      };
    },
  },

  // Rebuilds every derived field (progress + labels) from the card's own raw numbers. A caller
  // that patches a count in place (the Library's lazy enrichment) runs the row through this so a
  // label never disagrees with the number beside it. Pure — no fetch, no domain lookup.
  relabel({ card, t }: { card: SerialCard; t: Strings }): SerialCard {
    const hasChapters = card.readChapters != null && card.chapterCount != null && card.chapterCount > 0;
    const fraction = hasChapters ? clamp01(card.readChapters! / card.chapterCount!) : card.progressFraction;
    // A patch may have written only the raw string; map it here so the enum and its label stay
    // in step with whatever the caller last wrote.
    const status = publicationStatusFrom(card.rawPublicationStatus) ?? card.publicationStatus;
    const readStatus: SerialCard['readStatus'] = hasChapters
      ? card.readChapters! <= 0
        ? 'UNREAD'
        : card.readChapters! >= card.chapterCount!
          ? 'READ'
          : 'IN_PROGRESS'
      : card.readStatus;
    return {
      ...card,
      progressFraction: fraction,
      progressLabel: `${Math.round(fraction * 100)}%`,
      readStatus,
      readStatusLabel: readStatusLabel(readStatus, t),
      chapterCountLabel: countLabel(card.readChapters, card.chapterCount, t),
      publicationStatus: status,
      publicationLabel: status ? publicationLabel(status, t) : undefined,
      downloadedLabel: countLabel(card.downloadedChapters, card.totalChapters, t),
      errorsLabel: card.hasErrors ? t.hasErrors : undefined,
    };
  },

  // Series "follow" is 100% local today (FollowedSeriesBridge → FollowedSeriesDao, Room — no
  // Kavita server round trip). Known limitation, deliberately not solved here: stays a plain
  // local toggle until a richer "followed series" design (possibly server-synced) replaces it —
  // that future work only touches this file, not any of its callers.
  isFollowed(seriesId: string): Promise<boolean> {
    return FollowedSeriesBridge.isFollowed({ seriesId });
  },

  // Same optimistic/confirm/revert shape as ChapterTool.mark.read/unread — onUpdate fires
  // immediately with the optimistic value (the opposite of prevValue, defaulting to `true` when
  // the caller doesn't know the current state), then again once FollowedSeriesBridge.toggle
  // actually resolves (confirming it) or rejects (reverting). The returned Promise is a
  // convenience for a caller that only wants the immediate value.
  toggleFollow({
    seriesId,
    prevValue,
    onUpdate,
  }: {
    seriesId: string;
    prevValue?: boolean;
    onUpdate?: (isFollowed: boolean) => void;
  }): Promise<boolean> {
    const optimistic = !(prevValue ?? false);
    onUpdate?.(optimistic);

    FollowedSeriesBridge.toggle({ seriesId })
      .then(() => onUpdate?.(optimistic))
      .catch(() => onUpdate?.(!optimistic));

    return Promise.resolve(optimistic);
  },
};
