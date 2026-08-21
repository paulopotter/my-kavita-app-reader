# Task 002 — Formalize the provider isolation premise (Phase 0 — Foundations)

**Status:** done

## Objective

Write out, in text, the "provider isolation" premise the user raised during this planning
session, and review it with the user before it becomes part of `CLAUDE.md`/`architecture.md`
(the final wording is written as part of Task 024, but the *content* is decided here because it
guides every later phase — surveys, contract modeling, and corrections all reference it).

## The premise (draft, from the planning conversation)

> No part of the project outside an external provider's translation module should know that
> provider's name/format. A single module per provider "translates" to the project's internal
> format (the domain contract) — the rest of the app consumes only the contract, never the
> provider's native format. Switching providers in the future (e.g. another manga server,
> another notification provider) should not require changes outside that module.

This is a generalization, not an invention: `ChapterDataSource` (interface) +
`KavitaChapterFeature` (impl) + Hilt `@Binds` binding is the existing precedent, documented in
`architecture.md` § "ChapterDataSource — the swappable-provider boundary".

## Correction: this is bigger than "replicate `ChapterDataSource` per domain"

The user was explicit that the premise is not just "give Series and Library their own
`DataSource` interface like Chapter has." It is a **plugin manager module** per category (e.g.
"server module", "notification module"). This module:

- Is the only part of the app that knows which concrete implementations exist (Kavita, a future
  second server, ntfy, Firebase, etc.).
- Knows how to manage multiple implementations simultaneously (today's `ChapterDataSource` binds
  exactly one implementation once, via Hilt — there is no registry).
- Is the app's single point of contact — the app never talks to a concrete implementation
  directly. At most, it may, *through* the manager module, explicitly request "use provider X"
  — an operation of the module's own contract, not a bypass of it.

The actual registry/manager design is Task 014 (Phase 2.5b); this task only formalizes the
premise text and gets user sign-off on the concept before design work starts.

## Steps

1. Write the premise as a short, standalone paragraph (see draft above), suitable for later
   insertion into `CLAUDE.md` § Invariants.
2. Review with the user: confirm the "manager module" framing (not "1 interface per domain")
   is correct before Task 014 designs it.
3. Note the two concrete first use cases that will exercise this design once built: backlog 011
   (BFF plugin — multiple `MetadataSource`) and backlog 008 (Notifications — multiple
   providers). Neither is implemented yet; this task does not touch that code.
4. Hand off the reviewed premise text to Task 024 (CLAUDE.md wording) and Task 014 (design).

## Completion criteria

- User confirms the "manager module" framing (not a 1:1 `ChapterDataSource` replication) is the
  correct target design.
- Premise text is stable enough for Task 014 to design against and Task 024 to formalize into
  `CLAUDE.md`.

## Result

User explicitly confirmed the "manager module" framing in this task's draft text is correct —
a single module per provider category (server, notification) that knows every concrete
implementation, can manage more than one simultaneously, and is the app's only point of
contact (with an explicit "use provider X" operation as part of its own contract, not a
bypass). Premise text is stable and ready for Task 014 (design) and Task 024 (CLAUDE.md
wording) to build on.
