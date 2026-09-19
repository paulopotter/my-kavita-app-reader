# Task 008 — Kotlin: `ReaderPageList` takes its colours from RN, and its strings from i18n

## Why here

README Decision 4: the Kotlin side changes too. Without this task the reader has patches of UI that
ignore the theme entirely — and since it needs `useTheme()` available on the reader screen to have
anything to send, it runs after Task 006.

Two problems live in the same file, so they are fixed in the same task rather than two passes over
`ReaderPageList.kt`.

## What to do

### 1. Colours in from RN

`android/features/src/main/kotlin/com/mymangareader/features/kavita/reader/ui/ReaderPageList.kt`,
lines 888, 893, 925 (`Color.White`) and 929 (`Color.Black`), are **not on the SDU path**. They are
pure-Compose loading/error UI: the `CircularProgressIndicator`, the error text, and `RetryButton`
(white background, black label). The user decided these must be themed: **the colour comes from RN**,
via props on the view or SDU nodes for the placeholders, with **Kotlin keeping only a fallback**.

Evaluate `android/app/.../ReaderPageListViewManager.kt:110` (`"#FFFFFF"`) together with this — it is
the default of the very prop this task starts feeding, so its default has to be consistent with the
fallback chosen here.

**Explicitly out of scope:** `SduNode.kt` lines 51/69/102 are *already* correct —
`parseColorOrNull(node.color) ?: Color.White` is a fallback behind a real colour that RN already
sends over SDU. The only action there is confirming `frontend/src/screens/reader/reader-sdu.ts`
emits a token rather than a literal (covered by Tasks 001 and 005).

**Also explicitly out of scope, by decision:** `NotificationDisplay.kt:28` (`0xFF1A1A2E`) stays a
fixed colour. The native notification is drawn by the system with the app potentially dead, so there
is never a live RN to ask. This is recorded so it is not reopened.

### 2. i18n for the hardcoded pt-BR strings

Same file, violating CLAUDE.md's rule that all UI text is translatable:

- `"Falha ao carregar página"` and `"Falha ao carregar página (n)"` — `pageErrorMessage`, ~line 913.
- `"Tentar novamente"` — inside `RetryButton`, ~line 931.

They come from the RN i18n system (`frontend/src/shared/i18n`, `getStrings`, `LanguageContext`)
through the same channel the colours now use, with Kotlin holding at most a neutral fallback. The
keys exist in both `ptBR` and `en`.

## Coordination with Task 003

Task 003 must resolve how font size crosses to Kotlin without being scaled twice — `fontSizeSp`
travels the **same prop/SDU path** this task uses for colours, and `sp` already applies the system
font scale on the Compose side. **Agree the combined prop/SDU shape once**, when this task's contract
is described, rather than changing the same contract in two consecutive tasks.

## Contract-change gate

**Contract change** — the reader view's prop shape (and/or a new SDU node shape) is a public
contract between RN and Kotlin. Describe the props/nodes in text, get approval, then edit code.

## Blocked on

Task 006 (`useTheme()` must exist on the reader screen). No open README question blocks this one —
the treatments for (a), (b), (c) and (d) are all decided.

## Files to modify

- `android/features/src/main/kotlin/com/mymangareader/features/kavita/reader/ui/ReaderPageList.kt`
- `android/app/src/main/kotlin/com/mymangareader/ReaderPageListViewManager.kt`
- The RN reader screen — sends the colours and the strings.
- `frontend/src/shared/i18n/strings.ts` — new keys in both languages.
- Kotlin tests beside the changed files.

## Acceptance criteria

- Switching themes changes the colour of the reader's loading indicator, error text and retry button
  — verified on the real device, since this is native UI that Jest cannot see.
- With no colour supplied, the Kotlin fallback renders something legible — never an invisible
  control.
- No pt-BR string remains hardcoded in `ReaderPageList.kt`; switching the app language changes the
  error and retry text.
- `pageErrorMessage`'s numbered variant still interpolates the page number correctly under both
  languages.
- `NotificationDisplay.kt` is untouched.
- `make coverage` passes (`koverVerify` included); Kotlin floor bumped if coverage rose.

## Project-pattern checklist

- A Kotlin tool stays global, never screen-coupled.
- No new colour source is invented on the Kotlin side — RN is the single source of truth, Kotlin
  holds only a fallback.
- All UI text is translatable (CLAUDE.md fixed convention), in both `ptBR` and `en`.
- Note the known constraint from memory: `koverVerify` in the pre-commit hook does not cover every
  module, so run `make coverage-kotlin` manually for this task.
