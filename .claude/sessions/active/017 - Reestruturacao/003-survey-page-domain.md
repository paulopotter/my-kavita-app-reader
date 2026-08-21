# Task 003 — Survey: Page domain (Phase 1 — Survey)

**Status:** todo (blocked by Task 001)

## Objective

**Survey only — do not propose a contract in this task.** Catalogue what exists today for the
Page domain (the smallest unit — today it only exists inside the Reader) so the modeling
conversation in Task 009 has real ground to stand on.

## Scope

Page is the finest-grained domain: an individual manga page inside a chapter (image, dimensions,
aspect ratio, read/scroll position within it). Today it has no standalone contract — it only
exists as data embedded inside Reader-specific structures (`ViewerChapters`, page blocks).

## Steps

1. List every field currently associated with a "page" across Kotlin and RN — e.g. page index,
   image URL, width/height/aspect ratio, decode/cache state, scroll fraction within page.
2. List every operation performed on page data — fetch, prefetch/preload window, dimension
   lookup, aspect-ratio lookup, cache read/write.
3. List every consumer (RN hooks/components, Kotlin modules/features) that reads or writes page
   data, and how (direct call, event, bridge RPC, Room, in-memory).
4. Note any inconsistency already visible (e.g. same page property computed in more than one
   place, or with slightly different names/types between Kotlin and TS).
5. Write findings as a plain inventory (tables are fine) — no proposed contract shape, no
   recommendation. That is explicitly out of scope for this task.

## Completion criteria

- Inventory of fields, operations, and consumers for the Page domain is complete and reviewed.
- No contract shape proposed (that is Task 009).
