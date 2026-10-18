# Task 002 — Paginate chapters on the series screen

**Status:** on_hold (2026-10-18) — conditional, contract change; the user parked it, not to be touched until they ask

## Why

Task 001 fixes the cache, but the whole chapter list still crosses the RN bridge and is rendered
by the series screen, and every mark-as-read still rewrites a whole segment's worth of data.
This task exists **only if**, after Task 001 and a device test with the 3000-chapter manga,
opening the page is still too heavy (bridge or render). Otherwise it is cancelled.

## CONTRACT CHANGE — needs approval first

This task changes the meaning of `SerialDigest.chapters`. Per the project process, describe the
change in text and **wait for a new user approval before editing any code**, even if it looks
small. The approval of Task 001 does not cover it.

## What to do (proposal, to be confirmed in the approval)

- `SerialDigest.chapters` returns a **window** (offset/limit); `total`, `readCount` and
  `resumePoint` stay **series-wide**.
- The series screen requests more windows as the user scrolls.
- The Reader gets a **light ordered id list** (ids only) instead of full `ChapterDigest`s.

## Consumers of `chapters.list` today (all must be reviewed)

- `serie.hooks.ts`
- `reader.model.ts` / `reader.types.ts`
- `dashboard.tool.ts` (Home rails)
- `serial.tool.ts`
- debug screens

## Tests (beside the code)

- Kotlin: window boundaries, series-wide aggregates unchanged by the window, reads that span
  segments (Task 001).
- Jest: series hook requesting further windows, Reader consuming the id list, Home rails and debug
  screens unaffected.
- `make coverage` must pass; bump the floor if it rose.

## Done when

- Opening the 3000-chapter manga's page is light on the device.
- All consumers above work with the windowed digest.
- Coverage passes.
