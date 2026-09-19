# Plan 028 — Theme & Design Tokens — Tasks

See `README.md` for the phases already delivered, the user's decisions, the investigation findings,
non-goals, and the open questions each task is blocked on.

| # | Task | Depends on | Status |
|---|------|------------|--------|
| [001](001-semantic-taxonomy.md) | Semantic taxonomy + written application rules for every token | — | **done** |
| [002](002-opacity-as-a-separate-axis.md) | Opacity as a separate axis — scale, mechanic, and the end of `whiteNN`/`overlay*` | 001 | **done** |
| [003](003-typography-scale-and-family.md) | Typography module — size tokens as multipliers, weight, and the font-family token | 001 | **done** |
| [004](004-spacing-and-radius-tokens.md) | Sizing tokens — spacing, radius, border, gutter, line height and icon size | — | **done** |
| [005](005-eslint-no-color-literals.md) | ESLint `no-restricted-syntax` rule against colour literals | 001, 002, 004 | **done** |
| [006](006-theme-provider-and-use-theme.md) | `ThemeProvider` + `useTheme()` + `makeStyles(theme)` migration | 001, 002, 003, 004 | **done** |
| [007](007-theme-persistence.md) | Persistence via `:preferences` + resolution at boot/splash | 006 | **done** |
| [008](008-kotlin-reader-colours-and-i18n.md) | Kotlin: `ReaderPageList` takes colours from RN + i18n for its pt-BR strings | 003, 006 | **done** |
| [009](009-theme-config-screen.md) | `config/theme/` — the theme picker | 007 | **done** (as a select in Settings, not a sub-screen) |
| [010](010-app-identity-colour.md) | **Penultimate:** the app's identity colour (Android resources, splash, sync process) | 007 | **done** |
| [011](011-three-additional-themes.md) | **Last:** additional themes — six identities and four OLED variants, plus the generator | 010 | **done** |

## Suggested execution order

Sequential 001 → 011, with one fixed constraint from the user: **010 then 011 are the last two, in
that order** (README Decision 5).

Tasks 001-004 are the **foundation group**: they define every axis of the design system. Per
Decision 4e only the palette (001/002) is *in* the theme object; typography (003) and spacing/radius
(004) are constant sibling modules. They all precede Task 006 anyway, because that is the task that
rewrites the 44 `*.styles.ts` files — and those should be rewritten once, against every axis.

**001 first.** Every other task consumes the token names. Renaming after the provider, the lint rule
and the Kotlin prop path exist would mean touching all of them twice.

**002 immediately after 001**, because it *removes* 13 tokens (8 `whiteNN`, 5 `overlay*`) from the
table 001 just defined. Doing it later would mean publishing a taxonomy that is already wrong.

**003 before 006 — this is the binding reason for its position.** Typography is a separate token
module (Decision 4e), not part of the theme, but Task 006 is what rewrites the 44 `*.styles.ts`
files and fixes the consumption pattern — palette via `useTheme()`, type via direct import. If type
arrived after the provider, those 44 files would be rewritten twice for the same reason. Decision 4c
adds a second reason: rendered size becomes a **runtime-derived** value, so the pattern has to
account for that from the start.

**004 is its own task, not part of 003.** Both are non-chromatic axes, which is the argument for
merging them — but typography already carries a relative scale plus the RN/`sp` double-scaling risk,
and spacing has an unrelated failure mode (a near-complete step-of-4 scale punctured by ~10 odd
values). Merged, the review would mix two unrelated risks and a device regression could not be
attributed to either. It has no dependency on 001-003, so it can also run in parallel with them.

**005 after 002 and 004** — the lint rule can only be turned on once no legitimate literal remains,
otherwise it lands red and gets disabled. It comes after 004 because that task is what tells it
whether banning magic spacing numbers is even viable (Task 004's non-goal leaves legitimate numeric
literals in place).

**006 after the colour table, the type scale and the spacing scale are all final.** It distributes
the palette and fixes how the constant modules are consumed; converting 44 style files against
axes still in flux is the expensive mistake this order avoids.

**007 before 009** — the screen needs somewhere to write the choice to.

**008 after 003 and 006.** It needs `useTheme()` on the reader screen, and it shares the reader's
prop/SDU contract with Task 003's `fontSizeSp` decision — the two agree that shape **once**, rather
than changing it in consecutive tasks.

**010 penultimate, 011 last** — fixed by decision. 011 additionally may **not** ship palettes without
the user approving them first (README Decision 6), and proposes **colour only** — all themes inherit
the system font (Decision 4b) and one spacing scale (Decision 4d), because a theme is colour and
only colour (Decision 4e).

## Open questions blocking specific tasks

| Question (README) | Blocks |
|---|---|
| 1 — does the reader background follow the theme or stay black | 001, 011 |
| 2 — how many levels the opacity scale has | 002 |
| 3 — do `positive`/`msgOk` and `dangerDeep` stay distinct tokens | 001 |
| 4 — is the app identity colour inside or outside the themes | 010, inherited by 011 |
| 5 — how `colors.xml` and the RN token stay in sync | 010 |
| 6 — is the **reader** a special case for the system font scale | 003 (entangled with its `fontSizeSp` decision) |

## Contract-change gates

Tasks **001, 002, 003, 004, 006 and 008** each change a contract — the token table and the sibling
token modules that every style file imports, the `useTheme()` signature, the reader view's props.
Per CLAUDE.md, each must be **described in text and approved before any code is edited** — the task files
repeat this individually so it cannot be missed mid-plan.
