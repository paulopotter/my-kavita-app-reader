import { createNavigateAction, type ActionContract } from '../actions/action.tool';
import { Routes } from '../../../navigation/routes';
import { ChapterService } from '../../services/chapters';
import { EventBus, createEvent } from '../../managers/events';
import { PreferencesManager } from '../../managers/preferences';
import type { Strings } from '../../i18n/strings';
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

// ── ChapterEvents — EventBus tokens this module emits (plano 017, Task 013) ─────────────────
// Declared here, next to the emitter (ChapterTool.mark.*), per Task 013: an event lives with
// whichever module raises it. A listener imports `ChapterEvents.x` (autocomplete, no typo) and
// never writes the event-name string. The bus imposes no shared payload shape — this one is
// chapter's own.

// `phase` maps ChapterTool.mark.*'s optimistic/confirm/revert flow: the tool emits once
// immediately ('optimistic'), then again when ChapterService.status.set resolves ('confirmed')
// or rejects ('reverted' — readStatus is then the value it fell back to). A listener that only
// cares about the visible outcome can act on 'optimistic' + 'reverted' and ignore 'confirmed'.
//
// `changed.prevStatus` is the chapter's status right before this change, when the caller knew it:
// mark.toggle always supplies it (it reads the digest first); mark.read/unread carry it only when
// their own caller passed `prevStatus`. A listener keeping a running aggregate (e.g. the Library's
// readChapters count) uses it to decide whether this change actually crosses the READ boundary
// (prev !== 'READ' && next === 'READ' → +1, and the mirror for −1); when it's absent, the
// listener falls back to an optimistic ±1 with a clamp and lets a background refetch reconcile.
export interface ChapterReadStatusChangedPayload {
  chapter: { id: string; seriesId: string };
  changed: { readStatus: ChapterReadStatus; prevStatus?: ChapterReadStatus };
  phase: 'optimistic' | 'confirmed' | 'reverted';
}

export const ChapterEvents = {
  readStatusChanged: createEvent<ChapterReadStatusChangedPayload>('chapterReadStatusChanged'),
} as const;

function emitReadStatusChanged(
  update: ChapterMarkUpdate,
  phase: ChapterReadStatusChangedPayload['phase'],
  prevStatus?: ChapterReadStatus,
): void {
  EventBus.emit(ChapterEvents.readStatusChanged, {
    chapter: { id: update.chapterId, seriesId: update.seriesId },
    changed: { readStatus: update.readStatus, prevStatus },
    phase,
  });
}

// Shared body of ChapterTool.mark.readMany / unreadMany — see readMany's doc. One
// ChapterService.status.setMany for the whole list; optimistic/confirm/revert applied per id.
function markMany(
  {
    seriesId,
    chapterIds,
    prevStatusById,
    onUpdate,
  }: {
    seriesId: string;
    chapterIds: string[];
    prevStatusById?: Record<string, ChapterReadStatus>;
    onUpdate?: (update: ChapterMarkUpdate) => void;
  },
  isRead: boolean,
): Promise<ChapterMarkUpdate[]> {
  const targetStatus: ChapterReadStatus = isRead ? 'READ' : 'UNREAD';
  const fallbackStatus: ChapterReadStatus = isRead ? 'UNREAD' : 'READ';
  const optimistic: ChapterMarkUpdate[] = chapterIds.map(chapterId => ({
    seriesId,
    chapterId,
    readStatus: targetStatus,
  }));

  optimistic.forEach(update => {
    onUpdate?.(update);
    emitReadStatusChanged(update, 'optimistic', prevStatusById?.[update.chapterId]);
  });

  ChapterService.status
    .setMany({ seriesId, chapterIds, isRead })
    .then(() => {
      optimistic.forEach(update => {
        onUpdate?.(update);
        emitReadStatusChanged(update, 'confirmed', prevStatusById?.[update.chapterId]);
      });
    })
    .catch(() => {
      chapterIds.forEach(chapterId => {
        const reverted: ChapterMarkUpdate = {
          seriesId,
          chapterId,
          readStatus: prevStatusById?.[chapterId] ?? fallbackStatus,
        };
        onUpdate?.(reverted);
        // From an aggregate listener's POV the "previous" state is the optimistic one it already
        // applied — so it can undo exactly that.
        emitReadStatusChanged(reverted, 'reverted', targetStatus);
      });
    });

  return Promise.resolve(optimistic);
}

// Raw chapter fields needed to compose the displayed label. Own interface (not Pick<SerieChapter>)
// so any shape carrying these raw fields — SerieChapter, the reader screen's ReaderChapter, or a
// future one — is structurally compatible.
export interface ChapterTitleFields {
  title: string;
  number?: number;
  decimalNumber?: number;
  specialLabel?: string;
  isSpecial?: boolean;
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

// Two channels, on purpose, one not replacing the other:
//  - `onUpdate` (callback param) — the LOCAL channel: the caller wires it to its own React state
//    (e.g. SerieScreen updating its chapter list in place). Every value — optimistic, confirmed,
//    reverted — flows through it. The returned Promise is a convenience for a caller that only
//    wants the immediate optimistic value without awaiting the network call.
//  - ChapterEvents.readStatusChanged (EventBus) — the CROSS-SCREEN channel: any part of the app
//    not in this component tree (e.g. the Library, mounted in the nav stack) reacts without the
//    emitter knowing it exists. Emitted at the same three moments, with the same `phase`.
//
// Reader (Task 029 Fase 2) now marks through this tool too, so a mark from the Reader also emits
// the event.
//
// KNOWN GAP — cache not invalidated after a mark. ChapterService.status.set writes to the server
// but the ChapterDigest / SeriesDigest entries in Cache.persistent (Kotlin) still hold the
// pre-mark readStatus until their TTL (~15min) expires. A screen that mounts AFTER the mark
// (e.g. the Reader opened from the series screen right after marking there) reads that stale
// cache. The EventBus covers screens already mounted; it does not cover this. A per-key
// invalidation was tried and reverted — invalidating by domain was too broad (dropped every
// series/chapter for one mark), and invalidating by key would couple RN to the Kotlin key
// format. The fix is a scoped invalidation/patch of exactly the two affected entries, its own
// task — and per the user's call it must live in RN, not Kotlin (Kotlin stays "dumb"). See
// _freshness-principles.md § "Consequences for open work".
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

  format: {
    // Displayed label for a chapter, the single source of truth for how a chapter is named
    // anywhere in the app (the list, the "continue reading" button, …). Early-return cascade:
    //   1. a special's own label
    //   2. "<number>. <title>" when there's a REAL title — a title is not real when it's empty
    //      or it's just a number (int or decimal), regardless of which number: Kavita fills it
    //      with a bare number in many shapes ("6", "6.0", "06", "104" on chapter 105 via an
    //      off-by-one). Anything with a non-numeric char ("Chapter 6", "6: The Arrival") is real.
    //   3. "Capítulo <number>" (i18n)
    //   4. "Sem título" (i18n)
    // `t` is injected because this tool is pure — it has no language context of its own. Moved
    // here out of chapter-list-item.component.tsx (a dumb component holds no logic).
    title(chapter: ChapterTitleFields, t: Strings): string {
      if (chapter.isSpecial && chapter.specialLabel) {return chapter.specialLabel;}

      const num = chapter.number ?? chapter.decimalNumber;
      const trimmed = chapter.title.trim();
      const isJustANumber = trimmed.length === 0 || /^\d+(\.\d+)?$/.test(trimmed);

      if (!isJustANumber) {return num != null ? `${num}. ${trimmed}` : trimmed;}
      if (num != null) {return t.seriesDetailChapterNumberLabel.replace('{0}', String(num));}
      return t.seriesDetailChapterUntitled;
    },
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
      emitReadStatusChanged(optimistic, 'optimistic', prevStatus);

      ChapterService.status.set({ seriesId, chapterId, isRead: true })
        .then(() => {
          onUpdate?.(optimistic);
          emitReadStatusChanged(optimistic, 'confirmed', prevStatus);
        })
        .catch(() => {
          const reverted: ChapterMarkUpdate = { seriesId, chapterId, readStatus: prevStatus ?? 'UNREAD' };
          onUpdate?.(reverted);
          // On revert the "previous" state, from the aggregate's point of view, is the optimistic
          // READ it already applied — so it can undo exactly that.
          emitReadStatusChanged(reverted, 'reverted', 'READ');
        });

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
      emitReadStatusChanged(optimistic, 'optimistic', prevStatus);

      ChapterService.status.set({ seriesId, chapterId, isRead: false })
        .then(() => {
          onUpdate?.(optimistic);
          emitReadStatusChanged(optimistic, 'confirmed', prevStatus);
        })
        .catch(() => {
          const reverted: ChapterMarkUpdate = { seriesId, chapterId, readStatus: prevStatus ?? 'READ' };
          onUpdate?.(reverted);
          // On revert the "previous" state, from the aggregate's point of view, is the optimistic
          // UNREAD it already applied — so it can undo exactly that.
          emitReadStatusChanged(reverted, 'reverted', 'UNREAD');
        });

      return Promise.resolve(optimistic);
    },

    // Batch mark — ONE ChapterService.status.setMany call for the whole list (Kavita's
    // mark-multiple-read), not a loop of `read`/`unread`. Same optimistic → confirmed/reverted
    // shape, applied to every id: emit + onUpdate the optimistic value for each chapter now, one
    // network call, then on success re-emit 'confirmed' for each / on failure emit 'reverted'
    // (readStatus falls back to `prevStatusById[id] ?? UNREAD/READ`) for each. Looping the
    // single-chapter mark instead fires N parallel POSTs that saturate the server — the failures
    // then get optimistically reverted, which shows up as "marked chapters unmark themselves".
    readMany: (args: {
      seriesId: string;
      chapterIds: string[];
      prevStatusById?: Record<string, ChapterReadStatus>;
      onUpdate?: (update: ChapterMarkUpdate) => void;
    }): Promise<ChapterMarkUpdate[]> => markMany(args, true),

    unreadMany: (args: {
      seriesId: string;
      chapterIds: string[];
      prevStatusById?: Record<string, ChapterReadStatus>;
      onUpdate?: (update: ChapterMarkUpdate) => void;
    }): Promise<ChapterMarkUpdate[]> => markMany(args, false),

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
