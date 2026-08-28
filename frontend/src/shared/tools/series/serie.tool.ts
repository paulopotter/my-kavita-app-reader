import { ChapterTool, type SerieChapter } from '../chapters/chapters.tool';
import { FollowedSeriesBridge } from '../../bridge/followedSeries';
import type { ChapterDigestSuccess, ImageDescriptor, SeriesDigestSuccess, SeriesResumePoint, ServerActiveInfo } from '../../bridge/digest';

// SerieChapter is re-exported from chapters/ (its actual home — ChapterTool.normalize) via
// shared/tools/index.ts already; not re-exported again from here to avoid the ambiguous-export
// combination TypeScript otherwise flags on `export * from './chapters'` + `export * from
// './series'` both naming it.

// SerieTool — the normalizer for the "series" domain: turns SeriesDigest (or any future raw
// source) into a stable, canonical shape every screen/component reads the same way, regardless
// of where the data actually came from. Each chapter is normalized by ChapterTool (chapter's own
// domain — Domain Composition: Series delegates downward to Chapter), never re-implemented here.

export interface Serie {
  id: string;
  name: string;
  library?: SeriesDigestSuccess['library'];
  lastUpdatesUTC?: SeriesDigestSuccess['lastUpdatesUTC'];
  coverImage: ImageDescriptor;
  chapters: SerieChapter[];
  // Which chapter to resume at ("in progress" > first unread > first unfinished, or absent when
  // every chapter is fully read) — already decided by the Kotlin digest builder (SeriesDigest.
  // chapters.resumePoint), never recomputed here.
  resumePoint?: SeriesResumePoint;
  otherNames?: SeriesDigestSuccess['otherNames'];
  sortName?: string;
  otherIds?: SeriesDigestSuccess['otherIds'];
  colors?: SeriesDigestSuccess['colors'];
  metadata?: SeriesDigestSuccess['metadata'];
  resolvedAtEpochMs: number;
  server: ServerActiveInfo;
}

export const SerieTool = {
  // Discards a chapter that failed to resolve (isSuccess: false) instead of surfacing it in the
  // canonical list — the screen never needs to know a specific chapter failed, at least for now.
  normalize({ digest }: { digest: SeriesDigestSuccess }): Serie {
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
