# Release Cycle — how versioning and publishing work

---

## Overview

```
dev writes [Unreleased] bullets
       ↓
push to main
       ↓
main.yml detects [Unreleased] has content
       ↓
AI (Groq → Gemini → Cloudflare → OpenAI) rewrites bullets
  → user-facing entry in CHANGELOG.md  (pt-BR + en)
  → technical annotation for the git tag
       ↓
pipeline bumps semver (Kotlin + RN independently)
creates annotated tag YYYY.MM.DD.HHmm
       ↓
release.yml triggers on new tag
  → builds APK (assembleDebug)
  → attaches APK to GitHub Release
  → updates docs/external/version.json + current-version.md
```

---

## Versioning

| Version | Format | Bumped by |
|---|---|---|
| App tag | `YYYY.MM.DD.HHmm` | pipeline always |
| Kotlin (Backend) | semver `X.Y.Z` | pipeline based on commits touching `android/` |
| React Native (Frontend) | semver `X.Y.Z` | pipeline based on commits touching `frontend/` |

**Semver bump rules** (per component):
- Any commit touching that component's directory counts
- `feat!` or `BREAKING CHANGE` in message → major
- `feat` → minor
- anything else (`fix`, `chore`, `refactor`, etc.) → patch
- If only one side changed, the other repeats its current version with "No changes"

**`Release-As:` override.** A `Release-As: <level>` **trailer** on any commit in the range
forces the bump, overriding the prefix calculation above. Use it when the accumulated commits
deserve a bigger bump than their prefixes give — most often at plan closure, where a large
architectural plan lands as dozens of polite `feat:` commits that together warrant a major.

```
Release-As: major                # both components
Release-As: minor (android)      # Kotlin only
Release-As: major (frontend)     # RN only
```

It must be a real git trailer: the **last paragraph** of the commit message, with **no blank
line** between it and any other trailer (`Co-Authored-By`, etc.). A mention in the body is
ignored. Decided consciously at plan closure, not by accident. Last `Release-As:` per component
wins. Handled by `scripts/ci/compute-semver-bumps.sh`.

---

## Writing the [Unreleased] section

The dev writes **technical bullets** in conventional commit style.
The AI converts them to user-facing language (pt-BR + en) automatically.

```markdown
## [Unreleased]

### **Backend**

- feat: add server health check endpoint with timeout
- fix: resolve crash when URL probe returns 408

### **Frontend**

- feat: add loading skeleton on library screen
- fix: correct scroll position reset on tab switch
```

Rules:
- Use `feat:`, `fix:`, `perf:`, `refactor:`, `chore:` prefixes
- `android/` changes → `### **Backend**` section
- `frontend/` changes → `### **Frontend**` section
- Do NOT write pt-BR/en — the AI handles that
- Do NOT use `**[pt-BR]**` / `**[en]**` markers — those are output format, not input
- CI/CD-only changes (pipeline fixes, doc updates) do NOT generate a tag — only code changes do

---

## Tag annotation vs CHANGELOG

| | CHANGELOG.md | Git tag annotation |
|---|---|---|
| Audience | End user | Developer |
| Language | pt-BR + en | English only |
| Terms | Plain language | Technical (feat:, fix:, module names) |
| Sections | Backend / Frontend | Kotlin / React Native |
| Rendered as | Markdown (GitHub Release) | Plain text |

---

## RC builds (test builds before merge)

Separate workflow (`rc-build.yml`), `issue_comment`-only — kept out of `pr-code.yml` so it never
shows up as a "skipped" check on the pull_request event. No manual "Run workflow" button (unlike
a GitLab-style pipeline): the only trigger is the `/rc` comment below.

On any open PR, post a comment with exactly `/rc` to trigger a test APK build.
Only the repository owner can trigger this.

The pipeline:
1. Posts a "building" comment immediately (with a link to the run) — there's no other
   in-progress notification, so this is the only signal until it finishes
2. Runs `compute-semver-bumps.sh` against the PR branch to get the version this PR would
   actually release as (honors any `Release-As:` override already on the branch) — not
   whatever `versionName` happens to be sitting on disk
3. Stamps `<target-version>-rc.pr<N>.<UTC-datetime>` on `versionName` (does NOT bump semver
   for real, nor write it anywhere) — PR number + datetime keeps successive RCs, and RCs from
   different PRs, from ever colliding
4. Builds the APK
5. Edits the same "building" comment in place with the result (success + download link, or
   failure + link to logs)

RC builds never create a tag or update the CHANGELOG.

---

## Secrets required

| Secret | Provider | Used for |
|---|---|---|
| `CHANGELOG_TOKEN` | GitHub PAT | pipeline commits trigger subsequent workflows |
| `GEMINI_API_KEY` | Google AI | primary AI provider |
| `GROQ_API_KEY` | Groq | fallback AI provider (recommended — generous free tier) |
| `CF_ACCOUNT_ID` + `CF_API_TOKEN` | Cloudflare | fallback AI provider |
| `OPENAI_API_KEY` | OpenAI | fallback AI provider |

At least one AI secret is required. Groq is the most reliable on the free tier.

---

**Last Updated**: 2026-08-10
