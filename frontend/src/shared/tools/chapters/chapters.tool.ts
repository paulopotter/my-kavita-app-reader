import { createNavigateAction, type ActionContract } from '../actions/action.tool';
import { Routes } from '../../../navigation/routes';
import { ChapterService } from '../../services/chapters';
import { PreferencesManager } from '../../managers/preferences';
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
//
// Known gap: ChapterService.status.set writes straight to the Kavita server (ServerBridge,
// Layer 2) and never invalidates the SeriesDigest/ChapterDigest entries Cache.persistent (Kotlin)
// already holds for this series/chapter. The optimistic onUpdate covers the UI while this screen
// stays mounted, but leaving and reopening the series within the digest's TTL (~15min default)
// can show the pre-mark status again until it expires — the legacy screen avoided this via its
// own local cache (replaceCachedChapters), which this tool has no equivalent of. Deliberately not
// solved here — would mean ChapterTool reaching into CacheManager.persistent.invalidate*
// (key/domain conventions it otherwise has no reason to know) right after a successful mark.
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

// ── ChaptersTool.sort — chapter sort preferences (global + per-series override) ────────────

// Deliberately duplicated from shared/bridge/series.ts's ChapterSortMode (legacy — see
// shared/index.ts's Legacy* re-exports) instead of reusing it: this domain never depends on
// legacy code, even for a plain string-literal union that happens to share the same 4 values
// today.
export type ChapterSortMode = 'ASCENDING' | 'DESCENDING' | 'AUTO_FIXED' | 'AUTO_PROGRESS';

export interface ChapterSortPrefs {
  mode: ChapterSortMode;
  fixedThreshold?: number;
  progressPercent: number;
}

const CHAPTER_SORT_PREFS_DOMAIN = 'chapterSortPrefs';
const GLOBAL_SORT_PREFS_KEY = 'global';
const DEFAULT_SORT_PREFS: ChapterSortPrefs = { mode: 'ASCENDING', progressPercent: 50 };

export type ChapterSortScope = { domain: 'global' } | { domain: 'series'; seriesId: string };

function readSortPrefs(key: string): Promise<ChapterSortPrefs | null> {
  return PreferencesManager.get({ key }).then(entry => (entry ? JSON.parse(entry.value) : null));
}

// get()'s two overloads mirror the scope: 'global' always returns the plain prefs (there's no
// "override" concept for the global default itself); 'series' returns the same plain shape PLUS
// `isOverride: true` — but only when a real per-series override exists. When it doesn't, the
// series lookup falls through to the exact same global read as 'global' would have made, and the
// result is indistinguishable from a globally-scoped call (no isOverride key at all) — its mere
// presence, not a boolean value, is what tells a caller "this came from an override". Declared as
// a standalone function (not inline in the ChaptersTool object literal below) — TypeScript
// doesn't allow overload signatures on an object literal's own method shorthand.
function getSortPrefs(scope: { domain: 'global' }): Promise<ChapterSortPrefs>;
function getSortPrefs(scope: { domain: 'series'; seriesId: string }): Promise<ChapterSortPrefs | (ChapterSortPrefs & { isOverride: true })>;
function getSortPrefs(scope: ChapterSortScope): Promise<ChapterSortPrefs | (ChapterSortPrefs & { isOverride: true })> {
  const seriesLookup = scope.domain === 'series' ? readSortPrefs(scope.seriesId) : Promise.resolve(null);

  return seriesLookup.then(seriesPrefs => {
    if (seriesPrefs) {return { ...seriesPrefs, isOverride: true as const };}
    return readSortPrefs(GLOBAL_SORT_PREFS_KEY).then(globalPrefs => globalPrefs ?? DEFAULT_SORT_PREFS);
  });
}

// ChaptersTool (plural) — separate from ChapterTool (singular, normalize/mark) above: this is a
// distinct set of concerns (a persisted preference, not a per-chapter domain operation) that
// happens to live in the same file/module since both are "chapter" domain, per the user's own
// call.
export const ChaptersTool = {
  sort: {
    get: getSortPrefs,

    put(scope: ChapterSortScope, prefs: ChapterSortPrefs): Promise<void> {
      const key = scope.domain === 'series' ? scope.seriesId : GLOBAL_SORT_PREFS_KEY;
      return PreferencesManager.put({ key, value: JSON.stringify(prefs), domain: CHAPTER_SORT_PREFS_DOMAIN }).then(() => undefined);
    },

    // Removes the per-series override and returns the global default that now applies — there's
    // no "reset the global" concept (nothing to fall back to beyond DEFAULT_SORT_PREFS, already
    // covered by get({ domain: 'global' })).
    reset({ seriesId }: { seriesId: string }): Promise<ChapterSortPrefs> {
      return PreferencesManager.delete({ key: seriesId }).then(() => getSortPrefs({ domain: 'global' }));
    },
  },
};
