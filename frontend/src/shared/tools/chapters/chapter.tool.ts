import { ChapterService } from '../../services/chapters';
import type { ChapterReadStatus } from '../../bridge/digest';

// ChapterTool — normalizer/facade for the "chapter" domain. Minimal today: only the read/unread/
// toggle mark actions, absorbed here (not inside serie.tool.ts) because marking a chapter read is
// chapter's own concern (Domain Composition: Series delegates downward to Chapter).

export interface ChapterMarkUpdate {
  seriesId: string;
  chapterId: string;
  readStatus: ChapterReadStatus;
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
