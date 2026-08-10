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

On any open PR, post a comment with `/rc` to trigger a test APK build.
Only the repository owner can trigger this.

The pipeline:
1. Stamps `-rcN` suffix on `versionName` (does NOT bump semver)
2. Builds the APK
3. Posts a comment on the PR with the download link

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
