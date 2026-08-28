import { createNavigateAction, type ActionContract } from '../actions/action.tool';
import { Routes } from '../../../navigation/routes';
import { ChapterService } from '../../services/chapters';
import type { ChapterDigestSuccess, ChapterReadStatus, ImageDescriptor, ServerActiveInfo } from '../../bridge/digest';

// ChapterTool — normalizer/facade for the "chapter" domain: turns a ChapterDigestSuccess into the
// canonical shape SerieTool (and any future caller) reads, plus the read/unread/toggle mark
// actions. Absorbed here, not inside serie.tool.ts — normalizing/marking a chapter is chapter's
// own concern (Domain Composition: Series delegates downward to Chapter).

export interface ChapterMarkUpdate {
  seriesId: string;
  chapterId: string;
  readStatus: ChapterReadStatus;
}

// Deliberately duplicated from ChapterDigestSuccess (bridge/digest.ts) instead of re-exporting it:
// this is a normalizer's own contract, free to evolve independently of whatever shape the raw
// digest happens to have.
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

// `onUpdate` is the one channel every value — optimistic, confirmed, or reverted — flows through;
// the returned Promise is a convenience for a caller that only wants the immediate (optimistic)
// value, resolving right away without waiting for the real network call. `onUpdate` fires once
// immediately with that same optimistic value, then again later when ChapterService.status.set
// actually resolves (confirming it) or rejects (reverting to `prevStatus`, or the mark's own
// natural opposite when the caller doesn't know the real prior status). Kept as a plain callback
// parameter — not a hard EventBus dependency — so this stays the same call whether the caller
// wires it to local React state today or to EventBus.emit(...) once that exists (Task 013);
// nothing here needs to change either way.
export const ChapterTool = {
  // `origin` is navigation state, not domain data — useAction() merges it in at realize time,
  // this action never carries it.
  normalize({ chapter, seriesId }: { chapter: ChapterDigestSuccess; seriesId: string }): SerieChapter {
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
      action: createNavigateAction({ route: Routes.READER, params: { seriesId, chapterId: chapter.id } }),
    };
  },

  mark: {
    read({
      seriesId,
      chapterId,
      prevStatus,
      onUpdate,
    }: {
      seriesId: string;
      chapterId: string;
      prevStatus?: ChapterReadStatus;
      onUpdate?: (update: ChapterMarkUpdate) => void;
    }): Promise<ChapterMarkUpdate> {
      const optimistic: ChapterMarkUpdate = { seriesId, chapterId, readStatus: 'READ' };
      onUpdate?.(optimistic);

      ChapterService.status.set({ seriesId, chapterId, isRead: true })
        .then(() => onUpdate?.(optimistic))
        .catch(() => onUpdate?.({ seriesId, chapterId, readStatus: prevStatus ?? 'UNREAD' }));

      return Promise.resolve(optimistic);
    },

    unread({
      seriesId,
      chapterId,
      prevStatus,
      onUpdate,
    }: {
      seriesId: string;
      chapterId: string;
      prevStatus?: ChapterReadStatus;
      onUpdate?: (update: ChapterMarkUpdate) => void;
    }): Promise<ChapterMarkUpdate> {
      const optimistic: ChapterMarkUpdate = { seriesId, chapterId, readStatus: 'UNREAD' };
      onUpdate?.(optimistic);

      ChapterService.status.set({ seriesId, chapterId, isRead: false })
        .then(() => onUpdate?.(optimistic))
        .catch(() => onUpdate?.({ seriesId, chapterId, readStatus: prevStatus ?? 'READ' }));

      return Promise.resolve(optimistic);
    },

    // Reads the real current status first (so it can pass a real prevStatus down, instead of
    // read/unread's own binary-opposite default), then delegates — never re-implements the
    // optimistic/confirm/revert dance itself.
    toggle({
      seriesId,
      chapterId,
      onUpdate,
    }: {
      seriesId: string;
      chapterId: string;
      onUpdate?: (update: ChapterMarkUpdate) => void;
    }): Promise<ChapterMarkUpdate> {
      return ChapterService.get({ seriesId, chapterId }).then(digest => {
        const prevStatus: ChapterReadStatus = digest.isSuccess ? digest.readStatus : 'UNREAD';
        return prevStatus === 'READ'
          ? ChapterTool.mark.unread({ seriesId, chapterId, prevStatus, onUpdate })
          : ChapterTool.mark.read({ seriesId, chapterId, prevStatus, onUpdate });
      });
    },
  },
};
