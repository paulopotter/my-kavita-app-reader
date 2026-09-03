import { ChapterTool, type SerieChapter } from '../chapters/chapters.tool';
import { FollowedSeriesBridge } from '../../bridge/followed-series';
import type { ChapterDigestSuccess, ImageDescriptor, SerialDigestSuccess, SerialResumePoint, ServerActiveInfo } from '../../bridge/digest';

// SerieChapter is re-exported from chapters/ (its actual home — ChapterTool.normalize) via
// shared/tools/index.ts already; not re-exported again from here to avoid the ambiguous-export
// combination TypeScript otherwise flags on `export * from './chapters'` + `export * from
// './series'` both naming it.

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

  // Discards a chapter that failed to resolve (isSuccess: false) instead of surfacing it in the
  // canonical list — the screen never needs to know a specific chapter failed, at least for now.
  normalize({ digest }: { digest: SerialDigestSuccess }): Serie {
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
