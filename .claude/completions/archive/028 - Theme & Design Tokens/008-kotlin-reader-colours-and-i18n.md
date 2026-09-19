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

---

## Result — done

### What changed, and the decision that shaped it

The task's own proposal was a `placeholder` prop carrying named fields (spinner colour, error text,
retry label…). The user rejected it for a better reason than convenience: `SduNode.kt`'s own
doc says Kotlin "never encodes what a header or footer IS", and a prop with those names would have
taught it exactly that. So the reader sends **two SDU trees** instead, and Kotlin stays an
interpreter.

That needed three additions to the SDU vocabulary — `Spinner`, `Pressable`, and a generic
`placeholder` on `TextNode` that the interpreter substitutes without learning what the value
means, so the wording and the position of the error code stay with the language.

### The finding that simplified the contract

The retry is **not** an RN action. `ReaderPageImage` keeps a local `retryCount` that goes in as a
Coil request parameter, so a failed request is not served from its error cache. Nothing needs to
cross the bridge: `SduNodeView`'s `onAction` is resolved inside Compose. This removed the whole
`onSduAction` event path the contract had originally proposed.

### Three bugs the device check exposed

- **Every colour crossing to native was being dropped.** `android.graphics.Color.parseColor`
  accepts hex and throws on `rgb(...)`, which is the notation every token uses — so the retry
  button drew transparent and the text fell back to white. This was **not new**: the chapter bands
  had been hitting the same fallback since the colour task, invisibly, because the fallback is
  white and the text is white. Fixed at the origin with `ColorTool.to.hex`, typed `RgbColor →
  HexColor` so handing a raw token across is now a compile error.
- **The spinner rendered as a dot** — `CircularProgressIndicator` with no size inside a page-sized
  placeholder. It takes `icon.size[9]` now; sending a React icon is not possible, since an SduNode
  becomes native Compose.
- **`*Px` fields were read as `.dp`.** RN multiplied them by screen density on the way out and
  Kotlin treated the result as dp again, so the chapter bands were drawn at three times the padding
  their constants named. Renamed to `*Dp` and `dpToPx` deleted.

### Verification

`tsc --noEmit` clean, ESLint 0 errors, 100 suites / 1291 JS tests, Kotlin compiles and
`make coverage-kotlin` passes (`koverVerify` across every module). Verified on the real device by
pulling the network with the reader open: the message, the retry button and the spinner draw in the
theme's colours, in the app's language, and the `{code}` substitution works.

One acceptance criterion was **not** exercised: the placeholder was never seen under a *second*
theme, only under the active one. What the device confirmed is that the colours arrive and apply —
the repaint path itself (useMemo on `colors`) is the same one every other screen uses, but it was
not observed switching.

Versions: `1.3.0-rc26` → `1.3.0-rc27` (APK), `1.2.0-rc26` → `1.2.0-rc27` (bundle).

### Worth watching

The chapter bands are now three times smaller, which is correct but changes their share of the
list. `itemHeights` measures **every** entry, bands included, and feeds `computeChapterFraction` —
so the progress bar's arithmetic has shifted. It should be more accurate (less non-page height in
the total), but it was not measured. The user raised this and chose to leave it: *"não sei o quanto
isso vai afetar as regras de progresso, vamos descobrir no futuro."*

### Left alone, as the task specified

`NotificationDisplay.kt:28` keeps its fixed colour — the notification is drawn by the system with
the app possibly dead, so there is no live RN to ask. `ViewManager`'s `"#FFFFFF"` default is the
`TextNode` fallback on a different path and did not change.
