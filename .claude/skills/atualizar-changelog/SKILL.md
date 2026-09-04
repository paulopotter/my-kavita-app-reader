---
name: atualizar-changelog
description: Use when the user asks to update the changelog, or when preparing a commit that closes a plan. Rewrites only the content inside the [Unreleased] section of CHANGELOG.md. Never infers versions, never touches any other section.
---

# Atualizar Changelog

Rewrite the content inside `## [Unreleased]` in `CHANGELOG.md`.

**Audience: contributors.** Bullets may name architectural concepts (`:cache`, the digest stack,
Gradle-module split). The release pipeline has a separate step that rephrases this into
end-user-facing language when it cuts a version — this skill does not do that translation.

## Trigger conditions

- User explicitly asks to update/change the changelog, OR
- A commit that closes a plan is being prepared (called automatically alongside `finalizar-task` or `plan-manager` archiving).

## Two modes

- **Normal update** (a task, a small change, a handful of commits since the last release) —
  one bullet per user-visible change, roughly 1:1 with the work.
- **Plan closure** (`plan-manager` archiving a finished plan, or the `<origin-tag>..HEAD` range
  has more than ~30 commits) — **do NOT list 1:1.** A 250-commit architecture plan is not 40
  bullets. Write:
  - **1–3 umbrella bullets** naming the plan's arc (`refactor: reformulação da arquitetura em
    módulos isolados para performance e manutenção`).
  - then only the **individually notable** changes — a contributor scanning the log would want
    each called out on its own (a shipped screen, a measurable perf win, a dropped table, a
    behavior change). Target ~8–12 total, not 40.
  - the granular detail already lives in `.claude/completions/` and the archived plan's
    `INDEX.md` — the changelog points there, it doesn't duplicate it.

## Rules — read before touching the file

- **Only edit between `## [Unreleased]` and the next `## [` heading.** Everything outside that block is off-limits.
- **No version inference.** Do not add a version number, date, or release tag to the Unreleased block. The CI pipeline does that.
- **Portuguese only.** All bullet text in pt-BR. No English parallel.
- **Semantic Release format.** Group bullets under subsection headings that match the layers of this project:
  - `### Backend` — Kotlin / native changes
  - `### Frontend` — React Native / bundle changes
  - Omit a section if there is nothing to add for that layer.
- **One bullet = one notable change** (in normal mode, ~1:1 with the work; in plan-closure mode,
  see "Two modes" — umbrella bullets + only the individually-notable items). Prefixed with the
  Conventional Commits type: `feat:`, `fix:`, `perf:`, `refactor:`. No file names, no "foi
  adicionado X em Y.kt" — the *what changed*, not the *where*.
- **Do not infer or pad.** Every bullet must correspond to a real change — either implemented and approved in this conversation, or plainly visible in the `<origin-tag>..HEAD` diff (the cross-check below). Never speculate about work that isn't in one of those two.
- **Append, do not replace**, unless the user explicitly says to rewrite. If `[Unreleased]` already has content, add new bullets under the appropriate section heading (create the heading if missing).

## Input — conversation context, cross-checked against the real diff

The conversation is the primary source for *what* to write and *how* to phrase it. But a long
session can implement things that never got a clear line in the chat — so also cross-check
against the real diff since the last release, and fold in anything notable (a shipped feature, a
fixed bug, a perf win, a behavior change) the conversation missed.

1. **Find the latest release tag on `origin`** — not just locally (the user may not have
   fetched). Tags here are date-stamped (`2026.08.20.0248`), so `-v:refname` sorts them newest
   first:
   ```
   git ls-remote --tags --sort=-v:refname origin | grep -v '\^{}' | head -1 | sed 's#.*refs/tags/##'
   ```
   If `origin` is unreachable, fall back to `git tag --sort=-v:refname | head -1` and say so.
2. **Read the diff `<latest-origin-tag>..HEAD`** as a cross-check:
   ```
   git diff <tag>..HEAD --stat
   git log <tag>..HEAD --oneline
   ```
   Skim the file areas and commit subjects for notable changes the conversation didn't already
   surface. For a plan closure this is large; it's a skim, not an exhaustive file review.
   - `feat` / `fix` / `perf` — the obvious candidates.
   - `refactor` — **read the subject, don't skip it.** Many `refactor:` commits here change
     observable behavior (a pref resets, a screen looks different, a table is dropped) or land a
     structural milestone worth noting. Give those a bullet — `feat`/`fix` if the effect is a
     behavior change, `refactor` if it's a structural one.
   - Skip pure-internal churn: file moves/renames with no behavior change, `test:`,
     `docs`/`chore`, `.claude/`, `ci`.
3. If the diff shows a notable change the conversation context missed, add a bullet for it
   — same rules (pt-BR, Conventional Commits prefix, one line, no file names). If the diff and
   the conversation agree, no extra bullets.

## Steps

1. Read the current `CHANGELOG.md`.
2. Do the tag + diff cross-check above; combine with what was implemented and approved in this
   conversation. Count the commits in `<origin-tag>..HEAD` — >~30 → **plan-closure mode**.
3. Draft the new bullets in pt-BR, grouped under `### Backend` / `### Frontend`. In plan-closure
   mode: the umbrella bullets first, then only the individually-notable items (~8–12 total).
4. Edit only the block between `## [Unreleased]` and the next `## [` line.
5. Show the diff to the user before finalising (quote the before/after of the Unreleased block).
   Note which bullets came from the diff cross-check vs. the conversation, and — in plan-closure
   mode — say how many commits were rolled up and roughly how (e.g. "38 refactor commits → 1
   umbrella bullet").

## What this skill does not do

- Does not add version numbers or dates.
- Does not touch any released section.
- Does not write in English.
- Does not commit anything.
