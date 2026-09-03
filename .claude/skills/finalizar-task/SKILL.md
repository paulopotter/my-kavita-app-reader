---
name: finalizar-task
description: Use when a task from a plan under .claude/sessions/active/ is implemented, tested, and approved by the user — walks through updating the plan's INDEX.md, creating the per-task completion doc, and committing the closing paperwork. Do not use to create new plans/tasks (see plan-manager) or before the user has explicitly approved the work.
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

6. **Commit the closing paperwork.** The user has already approved the task in
   this conversation; the reached-here act of invoking `finalizar-task` is the
   go-ahead — do NOT ask for a separate commit confirmation.

   - Stage **only the session paperwork** this skill just wrote:
     the task file, the plan's `INDEX.md`, the new completion doc (and
     `.claude/sessions/INDEX.md` if a status line there changed). The
     implementation code was already committed during the task — do not
     re-stage or amend it here.
   - Run `git commit --no-verify -m "<message>"` (no-verify because paperwork
     never touches Kotlin/TS source, so the coverage pre-commit hook has
     nothing to check).
   - Commit message: Conventional Commits, pt-BR, imperative mood, no
     `Co-Authored-By` line ever. Use the `docs(session)` type/scope:
     ```
     docs(session): fecha a task NNN (resumo curto)
     ```
   - After committing, show the resulting `git log --oneline -3` and state
     plainly what was closed.
   - If `git commit` fails (e.g. nothing staged, or a hook still fires),
     stop and report — do not retry blindly.

   Product/code commits during the task itself still follow the usual rules
   (small, one concern per commit, Android separate from frontend, user
   approval before each) — this step is *only* the finalisation doc commit.

## What this skill does not do

- Does not judge correctness — that's the conversation before this skill runs.
- Does not commit or amend the task's implementation code — only the closing
  session paperwork (step 6).
- Does not run `git push`.
- Does not archive a whole plan — that's `plan-manager`.
- Does not invent test results.
