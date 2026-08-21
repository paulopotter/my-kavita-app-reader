# Task 007 — Survey: direct Kavita coupling points outside the 3 core domains (Phase 1 — Survey)

**Status:** todo (blocked by Task 001)

## Objective

**Survey only.** Sweep the codebase for any file, outside Chapter/Series/Library, that knows
the Kavita format/name directly — Page domain included, plus anything else in the project
(settings, auth, image loading, notifications scaffolding, etc.). This decides the scope of
Task 012 (additional `DataSource`s) and feeds Task 014 (plugin manager module design).

## Steps

1. Grep the Kotlin tree (`core/tools/features/app`) for `Kavita`-named classes/strings outside
   the already-known `KavitaChapterFeature`/`KavitaSeriesFeature`.
2. Grep the RN tree (`screens/*`, `shared/*`) for any hardcoded Kavita-specific field name,
   endpoint shape, or response format that leaks into UI/hook code instead of going through a
   `Service`/`Transform` layer.
3. For each point found, note: what it knows about Kavita specifically, whether it already goes
   through some kind of translation boundary, and whether it plausibly needs a `DataSource`-style
   isolation (per Task 002's premise) or is a one-off that does not justify the pattern.
4. Explicitly check auth/config (base URL, API key) — these are expected to reference Kavita by
   design (the app talks to one server type today) — flag them as "expected, not a violation"
   rather than omitting them silently.
5. Write findings as a plain inventory — no proposed fix, no contract shape.

## Completion criteria

- Every direct Kavita-coupling point outside Chapter/Series/Library is listed with file:line
  and a note on whether it's a plausible `DataSource` candidate.
- Findings handed off to Task 012 (which sub-tasks it spawns, if any) and Task 014 (manager
  module design) as input — no fix applied here.
