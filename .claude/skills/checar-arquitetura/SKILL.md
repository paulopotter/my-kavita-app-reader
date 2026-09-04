---
name: checar-arquitetura
description: Mechanical, diff-level architectural compliance check. Runs as step 0 of finalizar-task (blocking) and can be invoked directly. Checks a task's committed changes against the CLAUDE.md invariants and architecture.md structural rules — dumb components, screen isolation, provider knowledge in plugins/, Service isolation, i18n, Kotlin coupling direction. Reports findings; does not auto-fix.
---

# Checar Arquitetura

A mechanical, diff-level review of a task's changes against the project's
structural rules. It complements — never replaces — the human contract-vs-point-fix
judgment call (`CLAUDE.md` § Process); this skill only catches the mechanically
checkable violations.

## When it runs

- **Step 0 of `finalizar-task`, blocking.** `finalizar-task` invokes this
  first. If it reports any finding, `finalizar-task` stops until the user
  either confirms each finding is a false positive ("não é violação") or the
  code is fixed.
- Directly, any time (`/checar-arquitetura`), e.g. before asking for review.

## Scope of the diff

Check only what **this task** changed, not the whole tree.

1. Identify the task's commits: `git log --oneline -40` and pick the run whose
   messages reference this task (`Task NNN`, `— fatia N`, the task's scope).
   The task file's own creation commit (`docs(session): abre a task NNN`) is
   the lower bound; `HEAD` is the upper bound.
2. `git diff <lower>..HEAD --stat` to list touched files, then
   `git diff <lower>..HEAD -- <path>` per file for the checks below.
3. If the range is ambiguous, ask the user which commit range is the task.

Only **added or modified** lines count. A pre-existing violation the task
merely moved is noted as "pre-existing, not introduced here" and does not block.

## Checks

Run each. For every hit, record: file:line, the rule, the offending text, and
whether it's newly introduced or pre-existing.

### 1. Dumb component imports a service — BLOCKS

A file under `frontend/src/screens/*/components/` or
`frontend/src/shared/components/` that imports from `shared/services/`, a
`*Service`, `NativeModules.`, or a `*Bridge`.

```
git diff <lower>..HEAD -- 'frontend/src/**/components/**' | grep -nE '^\+.*(from .*services|from .*[Ss]ervice|NativeModules\.|from .*[Bb]ridge)'
```

No legitimate exception — a dumb component renders props, the hook orchestrates.

### 2. Screen imports from another screen — BLOCKS

An `import` inside `frontend/src/screens/X/` that resolves to
`frontend/src/screens/Y/` where `Y != X`.

```
git diff <lower>..HEAD -- 'frontend/src/screens/**' | grep -nE "^\+.*from '\.\./\.\./[a-z-]+/" | grep -vE "shared|navigation"
```

Manually confirm the relative path lands in another screen folder, not
`shared/` or `navigation/`. No exception.

### 3. Provider knowledge outside `plugins/` — BLOCKS if newly introduced

New Kotlin/TS code **outside** these paths that names a provider in an
identifier (class, function, variable, import) — not in a comment:

- allowed: `android/features/kavita/**` (legacy, listed in
  `architecture.md § Legacy Kotlin — being removed`),
  `android/server/plugins/kavita/**`,
  `android/external-metadata-server/plugins/m3/**`,
  `frontend/src/shared/bridge/*` (bridge type files name the legacy modules),
  the legacy bridges (`SeriesModule.kt`, `ReaderChapterModule.kt`,
  `SetupModule.kt`, `StartupModule.kt`, `LibraryModule.kt` if it still exists)
  and `AppReactPackage.kt` / `MainApplication.kt` (they wire everything).

```
git diff <lower>..HEAD -- 'android/**/*.kt' 'frontend/src/**/*.ts' 'frontend/src/**/*.tsx' \
  | grep -E '^\+' \
  | grep -E 'Kavita|Bff|BFF| m3 |"m3"|/m3/' \
  | grep -vE "^\+[[:space:]]*(//|\*|/\*)"
```

(Use `[[:space:]]`, not `\s` — this repo runs on macOS/BSD grep. Match plain
substrings, not `\b…\b`: `KavitaAuthFeature` has no word boundary after
`Kavita`.)

- **Filter out comments** (`// maps Kavita's real SortOrder` is fine — it's
  documentation, not a dependency). The `grep -vE "^\+[[:space:]]*(//|\*|/\*)"`
  above drops full-line comments; eyeball anything with a trailing `// …`
  comment on a code line.
- **Filter out the allowed paths above.**
- What remains — new non-comment code naming a provider outside a plugin — is
  a finding. Judgment call: an import of a legacy `features/kavita/*` symbol
  from a legacy bridge is expected during the migration and does not block; a
  *new* module or Service reaching for it does.

### 4. Service calls another domain's bridge/digest — BLOCKS

A new/modified `frontend/src/shared/services/<domain>/*.services.ts` that
imports `DigestBridge`/`ServerBridge` types for a *different* domain, or
imports another domain's `*Service` or `*Digest` directly.

```
git diff <lower>..HEAD -- 'frontend/src/shared/services/**/*.services.ts' | grep -nE "^\+.*(import.*Digest|import.*Service)" | grep -v "from './"
```

A Service aggregates its own domain's bridge(s) only. Needs another domain's
data → calls that domain's Service, at the hook/screen level, not inside the
Service file. No exception.

### 5. Hardcoded UI string (i18n) — REPORTS (does not block)

New JSX with a visible literal string instead of `{t.key}` / `useStrings()`.

```
git diff <lower>..HEAD -- 'frontend/src/**/*.tsx' | grep -nE "^\+.*<Text[^>]*>[A-Za-z]{3,}" | grep -vE "\{t\.|\{strings\.|testID|accessibilityLabel"
```

- **Ignore** single glyphs (`‹`, `✕`, `→`), `testID`, `accessibilityLabel`,
  and obviously-technical strings.
- A real user-facing sentence with no `t.` → report it. Non-blocking: some are
  deliberate (debug screens, dev-only). The user decides.

### 6. Kotlin coupling direction reversed — BLOCKS

`android/core/**` importing from `tools`/`features`; `android/tools/**`
importing from `features`.

```
git diff <lower>..HEAD -- 'android/core/**/*.kt' | grep -nE "^\+import com\.mymangareader\.(tools|features)"
git diff <lower>..HEAD -- 'android/tools/**/*.kt' | grep -nE "^\+import com\.mymangareader\.features"
```

`:cache` and `:preferences` are Layer-2 generic modules — `core ← tools`
still holds; `:tools` may import `:cache` (documented in
`architecture.md § Kotlin Layer Rules`). No other exception.

## Output

Print a compact report:

```
## Architecture check — Task NNN (diff <lower>..HEAD)

BLOCKING (N):
  - <file>:<line> — <rule> — `<text>` [new]
  ...

REPORT-ONLY (M):
  - <file>:<line> — i18n — `<text>`
  ...

PRE-EXISTING, not introduced here (K):
  - ...
```

If **BLOCKING is empty**: `✓ Architecture check passed — no blocking findings.`
`finalizar-task` proceeds.

If **BLOCKING is non-empty**: stop. List the findings, say `finalizar-task is
blocked — fix these, or confirm each is a false positive.` Wait for the user.

## What this skill does not do

- Does not auto-fix anything.
- Does not judge "is this a contract change" — that's the pre-implementation
  conversation (`CLAUDE.md` § Process), a human call.
- Does not check test coverage — the `make coverage` pre-commit hook does.
- Does not commit or touch git state.
