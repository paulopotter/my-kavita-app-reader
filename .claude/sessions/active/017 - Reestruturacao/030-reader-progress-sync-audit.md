# Task 030 — Reader: progress sync audit local↔server (Phase 6 — Reader)

**Status:** doing — audit done (2026-09-01). Report below. Two real gaps found (app
background/kill, chapter switch via arrow). User decision pending on which to fix here vs. spin
off.

> This task is the original plan 017 "Task 002 — Auditoria de sincronização de progresso
> local↔servidor", reslotted into Phase 6 unchanged.
>
> Audited against the **rewritten** reader (`screens/reader/`, ex-`reader-v2`), not the legacy
> one — the legacy reader was deleted in the "corte final" commit.

## Objective

The user suspects the app is not sending saved progress to the Kavita server at every point it
should — e.g. periodically during reading or when leaving the Reader. Confirm whether a real
gap exists before proposing any correction.

## Steps

1. Map every code point that saves progress, local (`saveLocalProgress`) and remote (whatever
   exists today for the server — check whether `KavitaChapterFeature.saveReadingProgress` is
   called in parallel or only on demand).
2. Map the current triggers: page change, chapter switch, Reader unmount (`useEffect` cleanup),
   app close.
3. Identify whether a periodic sync (timer) or a sync queue (mentioned in the original plan 007
   as something meant to exist) exists and is actually active.
4. Report findings to the user before implementing any fix — this plan prioritizes correct
   diagnosis over rushed correction, given this session's pattern of recurring bugs.

## Audit report (2026-09-01)

### The two stores

| Store | Written via | Backed by | Role |
|---|---|---|---|
| **Local** | `ReadingProgressManager.set(chapterId, { seriesId, page, scrollFraction })` — `frontend/src/shared/managers/reading-progress/reading-progress.manager.ts:40` | `CacheManager.persistent` (Room, `:cache` Kotlin module), `domain: 'readingProgress'` | Temporary sync buffer; survives app kill. `cachedAtEpochMs` is the "updated at". |
| **Server** | `ChapterService.progress.set({ seriesId, chapterId, pageIndex })` — `frontend/src/shared/services/chapters/chapters.services.ts:44` → `ServerBridge.setChapterProgress` → Kavita | Kavita server | Durable source of truth. `resolveInitialPage` compares its `resumePoint.recordedAtEpochMs` against the local `updatedAtEpochMs` — newest wins. |

No sync **queue** exists (the "sync queue" from plan 007 was never built). The current design is
timer + on-exit flush only.

### Every code point that writes progress (rewritten reader)

All in `frontend/src/screens/reader/hooks/reader.hooks.ts`:

| # | Trigger | Local write | Server write | Notes |
|---|---|---|---|---|
| 1 | **Timer, every 2s** while a window is mounted (`LOCAL_SAVE_INTERVAL_MS`) | `:495-501` `ReadingProgressManager.set` | — | Fires unconditionally every 2s with the current `page`/`scrollFraction` refs. |
| 2 | **Timer, every 20s** (`SERVER_SYNC_INTERVAL_MS`) | — | `:503-514` `ChapterService.progress.set` | Skips if `page === lastSyncedPageRef` (no change) or `suppressServerSyncRef.has(chId)` (a mark-as-read is pending). On success: `lastSyncedPageRef.set` + `EventBus.emit(ReaderEvents.progressChanged)`. |
| 3 | **Screen unmount** (`onScreenExit`, called from `reader.screen.tsx:38-43` `useEffect` cleanup) | `:546-550` `ReadingProgressManager.set` | `:551-555` `ChapterService.progress.set` — **only if `!isChapterEffectivelyRead(curr)`** | Clears both timers first. Best-effort (`.catch(() => {})`), not awaited. |
| 4 | **Mark-as-read at 98%** (`markAsReadIfNeeded`, `:534-536` via the `[state.window, currentVisiblePage, chapterFraction]` effect) | — | via `ChapterTool.mark.read` → `ChapterService.status.set` | Separate from progress; sets `readStatus`, not `pageIndex`. Adds `chId` to `suppressServerSyncRef` so timer #2 stops fighting it. |

### Gaps found

**GAP 1 — app backgrounded or killed → no flush.** `onScreenExit` only runs on React unmount
(`reader.screen.tsx:38`). There is **no `AppState` listener anywhere in `frontend/`** (grep:
zero hits). If the user backgrounds the app mid-chapter or the OS kills it:
- Local: last write is whatever timer #1 last saved — at most 2s stale. **OK.**
- Server: last write is timer #2 — **up to 20s stale, and often more** (timer #2 skips when the
  page index hasn't changed since the last sync, so slow scrolling within one page can go a full
  interval with nothing sent). Reopening the app on another device shows a stale resume point
  until the next foreground sync. This is the gap the user suspected.

**GAP 2 — chapter switch via the overlay arrow does not flush the chapter being left.** The
arrow calls `openChapter(targetId, { startAtBeginning: true })` (`:390`). `openChapter` does
**not** call `onScreenExit` or any flush — it just `dispatch({ type: 'LOADING' })` and rebuilds
the window. The progress-timer effect is keyed on `[state.window]`, so its cleanup runs (clears
the intervals) and re-runs for the new window — but the cleanup **does not save**, it only
`clearInterval`s (`:516-519`). So the last few seconds of reading in the chapter you just
arrowed away from are only persisted if timer #1/#2 happened to fire in that window. Server
progress for the left chapter can be as stale as "last 20s tick".
- Natural-scroll crossing (`moveFocus`) has the same shape but is less severe: you were
  physically scrolling, so timer #1 (2s) almost certainly captured a recent local page, and
  timer #2 fires against `focusedIndex`'s chapter — which flips to the new chapter on the
  crossing, so the *old* chapter's final page may never reach the server until boot
  reconciliation.

**GAP 3 (minor) — timer #1 writes every 2s even when nothing changed.** Not a correctness gap,
but it's an unconditional Room write every 2s for the whole reading session (timer #2 at least
guards on `lastSyncedPageRef`). Cheap, but worth a `lastLocalSavedRef` guard if touched.

### What is NOT a gap

- Local persistence survives app kill (Room-backed) — confirmed.
- `resolveInitialPage` newest-wins reconciliation on open — confirmed
  (`reader.transform.ts`, compares `updatedAtEpochMs` vs `resumePoint.recordedAtEpochMs`).
- Boot-time reconciliation (push newer local → server, drop caught-up entries) is **explicitly
  a separate task** (Splash refactor), noted in `reading-progress.manager.ts:6-9`. Its absence
  is known, not a finding here.

### Recommended fixes (user decision — this task or spin off)

1. **GAP 1** — add an `AppState` listener in the reader hook: on `change` to `background`/
   `inactive`, run the same flush `onScreenExit` does (local + conditional server). Small,
   self-contained, closes the biggest gap.
2. **GAP 2** — make `openChapter` (and `moveFocus`'s focus-moved branch) flush the chapter being
   left before rebuilding the window — factor the `onScreenExit` body into a
   `flushProgress(chapter)` helper and call it from all three (unmount, background, chapter
   switch).
3. **GAP 3** — optional `lastLocalSavedRef` guard on timer #1.

## Completion criteria

- [x] Audit report presented to the user, with exact points (file:line) where progress is or
  should be synced.
- [ ] User decision on which gaps to fix, and whether that happens in this task or becomes a
  separate task.
