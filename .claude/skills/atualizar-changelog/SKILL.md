---
name: atualizar-changelog
description: Use when the user asks to update the changelog, or when preparing a commit that closes a plan. Rewrites only the content inside the [Unreleased] section of CHANGELOG.md. Never infers versions, never touches any other section.
---

# Atualizar Changelog

Rewrite the content inside `## [Unreleased]` in `CHANGELOG.md`.

## Trigger conditions

- User explicitly asks to update/change the changelog, OR
- A commit that closes a plan is being prepared (called automatically alongside `finalizar-task` or `plan-manager` archiving).

## Rules — read before touching the file

- **Only edit between `## [Unreleased]` and the next `## [` heading.** Everything outside that block is off-limits.
- **No version inference.** Do not add a version number, date, or release tag to the Unreleased block. The CI pipeline does that.
- **Portuguese only.** All bullet text in pt-BR. No English parallel.
- **Semantic Release format.** Group bullets under subsection headings that match the layers of this project:
  - `### Backend` — Kotlin / native changes
  - `### Frontend` — React Native / bundle changes
  - Omit a section if there is nothing to add for that layer.
- **One bullet = one user-visible change.** Prefixed with the Conventional Commits type: `feat:`, `fix:`, `perf:`, etc. No implementation details, no file names, no "foi adicionado X em Y.kt".
- **Do not infer or pad.** Every bullet must correspond to a real change — either implemented and approved in this conversation, or plainly visible in the `<origin-tag>..HEAD` diff (the cross-check below). Never speculate about work that isn't in one of those two.
- **Append, do not replace**, unless the user explicitly says to rewrite. If `[Unreleased]` already has content, add new bullets under the appropriate section heading (create the heading if missing).

## Input — conversation context, cross-checked against the real diff

The conversation is the primary source for *what* to write and *how* to phrase it. But a long
session can implement things that never got a clear line in the chat — so also cross-check
against the real diff since the last release, and fold in anything user-visible that the
conversation missed.

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
   Skim the file areas and commit subjects for *user-visible* changes the conversation didn't
   already surface — a shipped feature, a fixed bug, a perf win. For a plan closure this is
   large; it's a skim, not an exhaustive file review.
   - `feat` / `fix` / `perf` — the obvious candidates.
   - `refactor` — **read the subject, don't skip it.** Many `refactor:` commits here change
     observable behavior (a pref resets, a screen looks different, a table is dropped). If the
     effect is visible to the user, it earns a bullet — as `feat`/`fix`, whatever fits the
     effect, not `refactor`.
   - Skip pure-internal churn: file moves/renames with no behavior change, `test:`,
     `docs`/`chore`, `.claude/`, `ci`.
3. If the diff shows a user-visible change the conversation context missed, add a bullet for it
   — same rules (pt-BR, Conventional Commits prefix, one line, no file names). If the diff and
   the conversation agree, no extra bullets.

## Steps

1. Read the current `CHANGELOG.md`.
2. Do the tag + diff cross-check above; combine with what was implemented and approved in this
   conversation.
3. Draft the new bullets in pt-BR, grouped under `### Backend` / `### Frontend` as appropriate.
4. Edit only the block between `## [Unreleased]` and the next `## [` line.
5. Show the diff to the user before finalising (quote the before/after of the Unreleased block),
   and note which bullets came from the diff cross-check rather than the conversation.

## What this skill does not do

- Does not add version numbers or dates.
- Does not touch any released section.
- Does not write in English.
- Does not commit anything.
