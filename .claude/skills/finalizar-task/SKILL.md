---
name: finalizar-task
description: Use when a task from a plan under .claude/sessions/active/ is implemented, tested, and approved by the user — walks through updating the plan's INDEX.md, creating the per-task completion doc, and preparing (never auto-running) the Conventional Commits message. Do not use to create new plans/tasks (see plan-manager) or before the user has explicitly approved the work.
---

# Finalizar Task

Formalise the closing of a single task from an active plan, following
the `CLAUDE.md` rule: *test, document, and get user approval before
committing*. This skill only runs after that approval.

## Preconditions — stop and ask if any aren't true

- The task's implementation is done and was actually tested (per the plan's
  own verification section — real-device checks for Android/OTA tasks; never
  claim a UI feature works without exercising it).
- The user has explicitly approved the result in this conversation.

## Steps

1. **Locate the plan folder** under `.claude/sessions/active/[N] - [name]/`.
   If unsure, check `.claude/sessions/INDEX.md`.

2. **Update the task file**: set frontmatter `status: done`, append a
   `## Result` section (what was implemented, versions before/after, tests
   run).

3. **Update the plan's `INDEX.md`**: flip the task's status to `done`.

4. **Create the per-task completion doc** from `.claude/templates/completion.md`
   at `.claude/completions/[YYYY-MM-DD]_[task-number]-[task-name].md`:
   - **What was delivered**: 2-4 sentences, name main files/modules.
   - **How it was tested**: exact commands and results; note if real device.
   - **Approval**: how/when the user approved.
   - **Notes**: breaking changes, follow-ups, decisions worth keeping.
   Write this doc in Portuguese.

5. **Check if the whole plan is done**. If every task is `done`, hand off to
   the `plan-manager` agent — do not archive the plan yourself.

6. **Prepare the commit message — do not run `git commit`**. Draft a
   Conventional Commits message in Portuguese, e.g.:
   ```
   feat: adiciona bridge RPC para requests autenticados

   Implementa authenticatedRequest no Kotlin tools layer com cache em disco
   e seleção automática de URL ativa. Tipos TypeScript gerados em shared/bridge/.
   ```
   No `Co-Authored-By` line — ever. Show the message and the files that
   would be staged. Staging/committing is a separate explicit step.

## What this skill does not do

- Does not judge correctness — that's the conversation before this skill runs.
- Does not run `git add`/`git commit`/`git push`.
- Does not archive a whole plan — that's `plan-manager`.
- Does not invent test results.
