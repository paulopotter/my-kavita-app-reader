# Plan 030 — Series Cache in Segments

## Context

`SerialDigest` caches a whole series as ONE Room row. Its JSON embeds the full `chapters.list`:
every `ChapterDigest` with its cover, server info and the prev/next neighbours (which carry their
page lists). A manga with 3000+ chapters produced a row above Android's ~2 MB `CursorWindow`.
Writes succeed, but every read that touches the row throws `Row too big to fit into CursorWindow`.
That broke the Library list read (a `SELECT *` over the serial domain) and the series page.

Commit `c03ed8e` (`fix(cache)`) added a stopgap in `:cache`:

- values above `CACHE_MAX_VALUE_BYTES` (1.5 MB) are not persisted (the older copy is deleted);
- an unreadable row is treated as a miss and deleted.

The reads no longer crash, but such a series now has **no cache at all** and is rebuilt from the
network on every open. This plan removes the cause instead of the symptom.

## Other costs of the single-row design

- The whole 3000-chapter list crosses the RN bridge and is rendered by the series screen.
- Every mark-as-read rewrites the whole row.

Task 001 does **not** solve these two. Task 002 exists for them, and only if still needed.

## Decisions (approved by the user on 2026-10-17)

1. **Split first, paginate only if needed.** Step 1 (Task 001) is internal and changes no public
   contract. Step 2 (Task 002) is a contract change and is conditional.
2. **Segments of ~300-500 chapters**, stored as separate rows. The main series row keeps what is
   small and series-wide: the series fields, the chapters aggregates (`status`, `readCount`,
   `total`, `resumePoint`) and the segment count.
3. **Reads reassemble the full `SerialDigest`**, so the digest returned to RN is identical to today.
   A missing or unreadable segment is a cache miss for the whole series (rebuild from the network).

## Slices

- **Task 001 (Step 1, internal, NO contract change)** — segment `chapters.list` in the cache; the
  digest that reaches RN is unchanged.
- **Task 002 (Step 2, conditional, CONTRACT CHANGE)** — paginate chapters on the series screen.
  Needs a **new user approval, in text, before any code**. Built only if, after Task 001 and a
  device test with the 3000-chapter manga, opening the page is still too heavy (bridge or render).

## Contract-change gate

Task 001 changes no public hook signature, event shape, route or domain digest. If during
implementation it turns out that it must (for example the shape of `SerialDigest` seen by RN),
stop and ask for approval first. Task 002 changes `SerialDigest.chapters` semantics and therefore
cannot start without the user's approval.

## Relations

- **Backlog 017 — cascading cache** ([item](../../backlog/items/017-cache-cascata-referencia.md)):
  Series/Chapter referencing Page/Chapter by key. Segmentation is a related but narrower step: it
  splits one oversized value by key, it does not make chapters reference each other. Check the
  key scheme against 017 so the two do not collide.
- **Broader review of the `:content-digest` cache rules**: the user wants a wider review of those
  rules (cache-first without write invalidation has caused several bugs). This plan fixes one size
  problem only; it is not that review, and must not grow into it.

## Non-goals

- Changing the `SerialDigest` shape seen by RN (Task 002 only, with approval).
- Reworking cache invalidation rules or the cascading cache (backlog 017 / the broader review).
- Changing the `:cache` stopgap thresholds from `c03ed8e`; it stays as the safety net.
