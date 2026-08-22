# Task 017 — Implement the `Server` module for real (Phase 4 — Implementation)

**Status:** todo (blocked by Task 016 — needs the relocated Kavita plugin to build the adapter
around)

## Objective

Implement the `Server` module (Layer 2) for real, per Task 014's structural design: routing
(which provider is active — today, only Kavita) plus a `KavitaAdapter` (inside
`Server/plugins/kavita/`) that translates the raw plugin's native format into the shared internal
contract. `Server` exposes domain methods directly (e.g. `Server.getChapter(id)`,
`Server.getSeries(id)`), resolving the active provider transparently inside each call — there is
no standalone "get active implementation"/"list implementations" operation, per Task 014's final
simplification.

**No cache in this task.** Every call goes straight to the network. Caching (`Cache`/
`CacheManager`) is deliberately deferred to Task 023, at the end of this phase — the goal here is
to get the direct network path working end-to-end first, without the cache design blocking the
rest of the base.

## Inputs

- Task 014's structural design (`_contract-design-notes.md` § "Task 014" — all 4 entries), in
  particular: the routing-only responsibility of `Server` itself, the adapter doing the real
  translation, `Server`'s public API being independent of the adapter interface's shape, and
  infrastructure-only methods with no adapter counterpart (e.g. `Server.getActiveUrl()`, using
  the `UrlSelector` tool directly — absorbing `KavitaUrlSelector` per Task 012's decision that it
  is removed entirely).
- Task 016's relocated plugin — `KavitaAdapter` lives inside `Server/plugins/kavita/`, alongside
  the raw plugin code it adapts.

## Steps

1. Create the `Server` facade module (Layer 2) exposing domain methods directly
   (`Server.getChapter(id)`, `Server.getSeries(id)`, and any other operation the Layer 3 contracts
   from Tasks 018-020 will need) — `Server` itself has zero domain knowledge, only routing to the
   active provider.
2. Implement `KavitaAdapter` inside `Server/plugins/kavita/`, doing the real translation from
   Kavita's native DTOs (already relocated in Task 016) into whatever intermediate shape `Server`
   needs to hand upward — this is where real domain understanding lives, not in `Server` itself.
3. Absorb `KavitaUrlSelector`'s logic directly into `Server` (per Task 012), using the generic
   `UrlSelector` tool — no provider-named URL-selection class survives.
4. Wire every call straight to the network — no cache-then-network sequencing, no TTL, no
   `CacheDescriptor` resolution yet (that is Task 023's job).
5. Confirm the design validates on paper against a future second provider (no real second
   provider needs to exist — just confirm nothing in `Server`'s public API assumes Kavita).

## Completion criteria

- `Server` module exists, exposing domain methods directly, with zero Kavita-specific naming in
  its public API.
- `KavitaAdapter` (inside `Server/plugins/kavita/`) does the real format translation; `Server`
  itself only routes.
- `KavitaUrlSelector` no longer exists as a standalone class — its logic lives inside `Server`.
- Every `Server` method call goes directly to the network — no cache logic anywhere in this task.
- Tested on a real device by the user.
- `make coverage` shows no drop relative to the current floor.
- Explicit user approval before `finalizar-task`.
- Blocks Tasks 018-020 (the Layer 3 contracts consume `Server`'s methods) and, transitively,
  Task 021 (Services) and Task 023 (Cache, which wraps `Server` calls with caching at the end).
