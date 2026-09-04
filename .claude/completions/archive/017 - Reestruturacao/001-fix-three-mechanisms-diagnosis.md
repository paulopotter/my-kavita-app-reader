# Task 001 — Fix the 3-mechanisms diagnosis (Phase 0 — Foundations)

**Status:** done

## Objective

The original plan 017 diagnosis (Task "001 — chapter navigation contract") assumed RN→RN was an
existing mechanism to be *mapped*, citing `SeriesProgressChangedEmitter` as an example. That is
wrong: `SeriesProgressChangedEmitter` originates in Kotlin — it is Kotlin→RN, not RN→RN. This
task corrects that diagnosis before any contract modeling proceeds, so Phase 2.5 (formalizing
the 3 mechanisms) starts from an accurate map.

## Corrected state of the 3 mechanisms

1. **Kotlin→RN** (native event reporting state): exists and works as a real event
   (`NativeEventEmitter`/callback) — e.g. `onVisiblePageChanged`, `onScrollToChapterHandled`,
   `SeriesProgressChangedEmitter`. Already documented informally as "Bridge Stream" in
   `architecture.md`, but never formalized as a per-domain contract.
2. **RN→Kotlin** (RN requests a native action): has a "good" form already documented as
   "Bridge RPC" (`request`/`cachedRequest`/`authenticatedRequest`/`db.*`) — but the Reader also
   uses a separate ad-hoc form, the **"one-shot state"**: RN writes a value into a state field
   (e.g. `scrollToChapterId: "123"`), Kotlin observes it via `LaunchedEffect`, performs the
   action, and reports back (`onScrollToChapterHandled`) so RN can manually zero the field —
   otherwise the next read re-triggers the same action. This ad-hoc form is the identified root
   cause of the race bug documented in Task 029 (delayed/concurrent zeroing racing another
   in-flight action). Deciding its fate (replace with imperative `ref` call vs. formalize with
   a race guard) is explicitly part of Phase 2 (Task 013), not implicit or assumed here.
3. **RN→RN** (React dispatches, React itself listens — e.g. an operation finishes, an event
   fires, another part of the app reacts): **does not exist today**. It is new capability to be
   *designed and built from scratch* in Task 013 — not something to survey or map, because
   there is nothing in the codebase implementing this pattern yet.

## Steps

1. Update this plan's `README.md` "3 communication mechanisms" section (already done as part
   of this expansion — this task formalizes that the correction is final and no longer a draft).
2. Update Task 029 (the reslotted original "chapter navigation contract" task) to reference this
   corrected diagnosis instead of the original wrong one — done as part of writing Task 029.
3. Confirm with the user that the corrected diagnosis is accurate before Phase 1/2 tasks start
   consuming it (Tasks 004, 008, 013 all depend on this being right).

## Completion criteria

- README.md and Task 029 both reflect the corrected diagnosis (RN→RN is new, not existing;
  "one-shot state" is a known-fragile RN→Kotlin variant whose fate is decided in Task 013).
- User confirms the corrected diagnosis before Phase 1 survey tasks begin.

## Result

`README.md`'s "3 communication mechanisms" section and Task 029's framing note both reflect
the corrected diagnosis. A residual stale reference ("Task 5.1" from the pre-expansion
numbering) was found and fixed to "Task 029" in `README.md` during this review. User confirmed
the corrected diagnosis is accurate, and separately confirmed that RN→Kotlin ("one-shot state"
fate) is explicitly in scope of Task 013, not silently dropped.
