# Task 030 — Reader: progress sync audit local↔server (Phase 6 — Reader)

**Status:** done (2026-09-01). Audit delivered + all 3 gaps fixed (commit `fix(rn): fecha os 3
gaps de sync de progresso do leitor`), device-validated by the user. Report + `## Result` below.

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

### Fixes applied (2026-09-01, `reader.hooks.ts`)

All three, in one commit. A single `flushProgress(chapter, { page, scrollFraction })` helper
writes both stores at once (local always; server only while `!isChapterEffectivelyRead`, mirroring
the 20s timer's mark handling) and updates `lastSyncedPageRef` / `lastLocalSavedRef` +
`EventBus.emit(ReaderEvents.progressChanged)`. Every "save now" caller goes through it.

1. **GAP 1** — new `useEffect` registering `AppState.addEventListener('change', …)`: a change to
   `'background'` or `'inactive'` runs `flushProgress` for the focused chapter. Cleaned up with
   `sub.remove()`.
2. **GAP 2** — `openChapter` now flushes the outgoing chapter (`stateRef.current.window`'s
   focused entry) before `dispatch({ type: 'LOADING' })`, unless it's reopening the same
   chapter id. Covers the overlay arrow and any future jump (both route through `openChapter`).
   `onScreenExit` rewritten to just clear the timers + call `flushProgress`.
3. **GAP 3** — the 2s local timer keeps a `lastLocalSavedRef` per chapter and skips the Room
   write when `page` + `scrollFraction` are unchanged since its previous tick.

Tests: `reader.hooks.tests.ts` gained a `describe('progress flush (Task 030 gaps)')` block — 6
cases (onScreenExit both stores, background flush, `'active'` does NOT flush, arrow flushes the
left chapter, reopening the same chapter does NOT flush, a read chapter skips the server). JS
branch coverage 90.22% → 90.46% (floor 90); `yarn test:coverage` exits 0.

**Not addressed here (out of scope, own task):** the boot-time reconciliation that pushes newer
local entries to the server and prunes caught-up ones (Splash refactor) — its absence is noted
in `reading-progress.manager.ts:6-9`, not a finding of this audit.

## Completion criteria

- [x] Audit report presented to the user, with exact points (file:line) where progress is or
  should be synced.
- [x] User decision on which gaps to fix — user approved fixing all three; done in this task.
- [x] Device validation — user confirmed "aparentemente funcionou".
- [x] `make coverage` — JS branch coverage 90.46% → 90.51% (floor 90).
- [x] `finalizar-task`.

## Result

Audit found the reader writes reading position to two stores — local
(`ReadingProgressManager.set` → `CacheManager.persistent`) and server (`ChapterService.progress.set`
→ Kavita) — at three moments: a 2s local timer, a 20s server timer, and `onScreenExit`. Three
gaps, all fixed in `frontend/src/screens/reader/hooks/reader.hooks.ts`:

- **GAP 1** — no `AppState` listener anywhere in `frontend/`, so backgrounding/killing the app
  never flushed to the server (up to 20s+ stale). Added a `useEffect` on
  `AppState.addEventListener('change')` → `flushProgress` on `background`/`inactive`.
- **GAP 2** — an arrow/jump reloads via `openChapter` without hitting `onScreenExit`, so the
  chapter being left was never flushed (the timers effect cleanup only `clearInterval`s). Added
  a flush of the outgoing chapter at the top of `openChapter`, unless reopening the same id.
- **GAP 3** — the 2s local timer wrote to Room unconditionally. Added a `lastLocalSavedRef` guard
  (skip when `page` + `scrollFraction` unchanged since the previous tick).

All three route through one `flushProgress(chapter, { page, scrollFraction })` helper (local
always; server only while `!isChapterEffectivelyRead`), which `onScreenExit` was rewritten to
call. 6 new tests in `reader.hooks.tests.ts`.

Not addressed (own task, noted in `reading-progress.manager.ts:6-9`): the boot-time
reconciliation that pushes newer local entries to the server and prunes caught-up ones (Splash
refactor).
