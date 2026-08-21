# Task 022 — Reader: progress sync audit local↔server (Phase 5 — Reader)

**Status:** todo

> This task is the original plan 017 "Task 002 — Auditoria de sincronização de progresso
> local↔servidor", reslotted into Phase 5 unchanged.

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

## Completion criteria

- Audit report presented to the user, with exact points (file:line) where progress is or should
  be synced.
- User decision on which gaps to fix, and whether that happens in this task or becomes a
  separate task.
