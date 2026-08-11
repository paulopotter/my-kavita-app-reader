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
- **Do not infer.** Only describe changes that were actually implemented and approved in the current conversation. Do not speculate or pad.
- **Append, do not replace**, unless the user explicitly says to rewrite. If `[Unreleased]` already has content, add new bullets under the appropriate section heading (create the heading if missing).

## Steps

1. Read the current `CHANGELOG.md`.
2. Identify what was implemented and approved in this conversation — use the conversation context; do not read git diff.
3. Draft the new bullets in pt-BR, grouped under `### Backend` / `### Frontend` as appropriate.
4. Edit only the block between `## [Unreleased]` and the next `## [` line.
5. Show the diff to the user before finalising (quote the before/after of the Unreleased block).

## What this skill does not do

- Does not add version numbers or dates.
- Does not touch any released section.
- Does not write in English.
- Does not commit anything.
