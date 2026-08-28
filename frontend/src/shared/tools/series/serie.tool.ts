import { createNavigateAction, type ActionContract } from '../actions/action.tool';
import { Routes } from '../../../navigation/routes';
import { FollowedSeriesBridge } from '../../bridge/followedSeries';
import type {
  ChapterDigestSuccess,
  ImageDescriptor,
  SeriesDigestSuccess,
  SeriesResumePoint,
  ServerActiveInfo,
} from '../../bridge/digest';

// SerieTool — the normalizer for the "series" domain: turns SeriesDigest (or any future raw
// source) into a stable, canonical shape every screen/component reads the same way, regardless
// of where the data actually came from. Chapter/action handling here is deliberately temporary —
// it belongs to the chapter domain (Domain Composition: Series delegates downward to Chapter),
// and will move to a future shared/tools/chapters/chapter.tool.ts once it exists; Series has no
// substitute today, so it's absorbed here rather than blocking on a task not yet started.

// Deliberately duplicated from SeriesDigestSuccess/ChapterDigestSuccess (bridge/digest.ts)
// instead of re-exporting those types: this is a normalizer's own contract, free to evolve
// independently of whatever shape the raw digest happens to have.
export interface SerieChapter {
  id: string;
  seriesId: string;
  decimalNumber?: number;
  number?: number;
  specialLabel?: string;
  isSpecial?: boolean;
  title: string;
  createdUtc?: string;
  coverImage: ImageDescriptor;
  readStatus: ChapterDigestSuccess['readStatus'];
  pages: ChapterDigestSuccess['pages'];
  resolvedAtEpochMs: number;
  server: ServerActiveInfo;
  action: ActionContract; // not present on ChapterDigestSuccess — added by this normalizer
}

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

// Private to this module — SerieTool exposes only `normalize`, the single public entry point for
// this domain (no sub-composition of unrelated concerns here, unlike CacheManager's
// persistent/memory/network namespaces — everything below is the same "series" subject).
function normalizeChapter({ chapter, seriesId }: { chapter: ChapterDigestSuccess; seriesId: string }): SerieChapter {
  return {
    id: chapter.id,
    seriesId: chapter.seriesId,
    decimalNumber: chapter.decimalNumber,
    number: chapter.number,
    specialLabel: chapter.specialLabel,
    isSpecial: chapter.isSpecial,
    title: chapter.title,
    createdUtc: chapter.createdUtc,
    coverImage: chapter.coverImage,
    readStatus: chapter.readStatus,
    pages: chapter.pages,
    resolvedAtEpochMs: chapter.resolvedAtEpochMs,
    server: chapter.server,
    // `origin` is navigation state, not domain data — useAction() merges it in at realize time,
    // this action never carries it.
    action: createNavigateAction({ route: Routes.READER, params: { seriesId, chapterId: chapter.id } }),
  };
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
        .map(chapter => normalizeChapter({ chapter, seriesId: digest.id })),
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
