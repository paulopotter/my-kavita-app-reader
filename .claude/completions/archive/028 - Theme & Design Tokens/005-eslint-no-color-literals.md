# Task 005 — ESLint rule against colour literals

## Why here

Commit `639d808` reviewed 206 literals across 47 files by hand to reach zero literals outside
`shared/theme/`. Nothing currently stops the 207th from being added tomorrow, and the moment a runtime
theme exists (Task 006) a stray literal stops being untidy and becomes a bug: it will not repaint
when the theme changes.

It runs **after** 001 and 002 because those two are the tasks that remove the last legitimate
literals from the table. Turning the rule on earlier means landing it red and having someone disable
it.

## What to do

1. A `no-restricted-syntax` entry in `frontend/.eslintrc.js` — the project is on ESLint 8 with
   `lint` = `eslint src --ext .ts,.tsx`, and this rule needs **no custom plugin**. Match string
   literals shaped like a colour: `#RGB`/`#RRGGBB`/`#RRGGBBAA`/`#AARRGGBB`, `rgb(`/`rgba(`,
   `hsl(`/`hsla(`.
2. Scope the ban with an `overrides` block: `frontend/src/shared/theme/**` is where colours are
   *supposed* to live and is exempt.
3. **Do not break the known-good exception.** `'#123456'` in
   `frontend/src/shared/components/follow-star/follow-star.tests.tsx` is an arbitrary assertion
   value proving the `activeColor` prop is honoured — not a UI colour (README context). Either the
   pattern excludes test files, or that one line carries a justified inline disable with a comment
   explaining why. Choose deliberately; silently deleting the assertion is not an option.
4. The error message must be actionable — it should name `shared/theme/` and, once Task 002 exists,
   mention the opacity helper, so the person hitting it knows what to write instead.

## Should it also ban magic spacing/radius numbers?

Task 004 tokenizes spacing and radius, which raises the obvious question. **Decide it here, and the
default answer is no**, for a concrete reason: unlike colours, **legitimate numeric literals still
exist** after Task 004 — every fixed `width`/`height` is one, by that task's explicit non-goal. A
broad numeric rule would fire on all of them, and a lint rule that cries wolf gets disabled, taking
the colour protection down with it.

If a version is adopted, it must be **narrowly scoped to the properties that have a scale** —
`padding*`, `margin*`, `gap`, `borderRadius` — never to numbers in general. Justify whichever way it
goes.

## How it actually landed

`no-restricted-syntax` in `frontend/.eslintrc.js`, matching `#RGB`…`#RRGGBBAA` and
`rgb()`/`rgba()`/`hsl()`/`hsla()` on the literal's raw text, with two `overrides`: `src/shared/theme/**`,
where colours belong, and test files.

Exempting whole test files — rather than an inline disable on the `follow-star.tests.tsx` line —
was deliberate: a colour in a test is an assertion value, and the next test that needs one would
otherwise have to repeat the disable.

**Spacing/radius are not covered**, for the reason this task anticipated: legitimate numeric
literals survive Task 004 (every fixed width/height), so a numeric rule would cry wolf and get
switched off, taking the colour protection with it.

Verified both ways: the rule passes clean on the current tree, and flags a freshly added literal.

## Blocked on

Nothing. The colour decisions it enforces are already made; the spacing question above is settled
inside this task.

## Files to modify

- `frontend/.eslintrc.js`.
- Possibly `frontend/src/shared/components/follow-star/follow-star.tests.tsx` (inline disable +
  comment, if that is the route chosen in step 3).

## Acceptance criteria

- `npm run lint` passes on the current tree with the rule enabled.
- A deliberately added literal (`'#FF0000'`) in a screen style file fails lint, verified manually.
- The same literal inside `shared/theme/` passes.
- `follow-star.tests.tsx` still asserts on `'#123456'` and still passes.
- `rgba(...)` and `hsl(...)` forms are caught, not just hex.

## Project-pattern checklist

- No new ESLint plugin dependency — `no-restricted-syntax` only, per the investigation.
- The exemption is expressed as config, not as a scattering of inline disables across the codebase.
