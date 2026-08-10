#!/usr/bin/env bash
# Sends structured changelog draft to Gemini.
# Produces two outputs written to files:
#   $OUTPUT_USER  — user-facing CHANGELOG.md entry (pt-BR + en, friendly language)
#   $OUTPUT_TAG   — technical tag annotation (Kotlin/React Native, commit prefixes)
#
# Env vars required:
#   GEMINI_API_KEY
#   ANDROID_DRAFT   — raw bullets from ### android/ section (may be empty)
#   FRONTEND_DRAFT  — raw bullets from ### frontend/ section (may be empty)
#   PR_TITLE
#   KOTLIN_CURRENT  — current Kotlin semver (e.g. 0.1.0)
#   KOTLIN_NEXT     — next Kotlin semver after bump
#   RN_CURRENT      — current RN semver
#   RN_NEXT         — next RN semver after bump
#   OUTPUT_USER     — path to write user changelog entry
#   OUTPUT_TAG      — path to write tag annotation
set -euo pipefail

NO_CHANGES_PT="Sem alterações nesta versão"
NO_CHANGES_EN="No changes in this version"

call_gemini() {
  local prompt="$1"
  local response
  response=$(curl -s \
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}" \
    -H 'Content-Type: application/json' \
    -d "$(jq -n --arg text "$prompt" '{contents:[{parts:[{text:$text}]}]}')")
  echo "$response" | jq -r '.candidates[0].content.parts[0].text // empty'
}

# ── User-facing changelog entry ────────────────────────────────────────────────

USER_PROMPT="You are a changelog editor for an Android app called My Manga Reader.
Produce a user-facing changelog entry in EXACTLY this markdown structure, nothing else:

<one or two sentence summary of what changed in this version, friendly and non-technical>

### **Backend** — \`${KOTLIN_NEXT}\`

**[pt-BR]**
- bullet in Brazilian Portuguese

**[en]**
- bullet in English

### **Frontend** — \`${RN_NEXT}\`

**[pt-BR]**
- bullet in Brazilian Portuguese

**[en]**
- bullet in English

Rules:
- Summary: one or two sentences describing the most important user-visible changes across both components
- Translate all content to both pt-BR and en
- Language must be user-facing: what the user gains/sees, not implementation details
- Past tense (pt-BR: Adicionado/Corrigido/Melhorado; en: Added/Fixed/Improved)
- No commit prefixes like feat: or fix: in the user entry
- Max 6 bullets per language per section
- If a component has no changes, use exactly this for both languages:
  pt-BR: ${NO_CHANGES_PT}
  en: ${NO_CHANGES_EN}
- Backend section version: if android draft is empty, keep showing ${KOTLIN_CURRENT} with no-changes message
- Frontend section version: if frontend draft is empty, keep showing ${RN_CURRENT} with no-changes message

PR title: ${PR_TITLE}

android/ changes (Kotlin/Backend):
${ANDROID_DRAFT:-none}

frontend/ changes (React Native/Frontend):
${FRONTEND_DRAFT:-none}"

USER_ENTRY=$(call_gemini "$USER_PROMPT")

if [ -z "$USER_ENTRY" ]; then
  fmt_bullets() {
    local text="$1" fallback="$2"
    if [ -z "$text" ]; then
      echo "- $fallback"
    else
      # Each line from draft becomes its own bullet
      echo "$text" | sed '/^[[:space:]]*$/d' | sed 's/^[[:space:]]*/- /'
    fi
  }
  ANDROID_BULLETS_PT=$(fmt_bullets "$ANDROID_DRAFT" "$NO_CHANGES_PT")
  ANDROID_BULLETS_EN=$(fmt_bullets "$ANDROID_DRAFT" "$NO_CHANGES_EN")
  FRONTEND_BULLETS_PT=$(fmt_bullets "$FRONTEND_DRAFT" "$NO_CHANGES_PT")
  FRONTEND_BULLETS_EN=$(fmt_bullets "$FRONTEND_DRAFT" "$NO_CHANGES_EN")

  USER_ENTRY="Melhorias internas nesta versão. / Internal improvements in this version.

### **Backend** -- \`${KOTLIN_NEXT}\`

**[pt-BR]**
${ANDROID_BULLETS_PT}

**[en]**
${ANDROID_BULLETS_EN}

### **Frontend** -- \`${RN_NEXT}\`

**[pt-BR]**
${FRONTEND_BULLETS_PT}

**[en]**
${FRONTEND_BULLETS_EN}"
fi

echo "$USER_ENTRY" > "$OUTPUT_USER"

# ── Technical tag annotation ───────────────────────────────────────────────────

TAG_PROMPT="You are a technical changelog formatter.
Produce a tag annotation in EXACTLY this markdown structure, nothing else:

### Kotlin -- ${KOTLIN_NEXT}

- feat: bullet (or fix:, perf:, chore:, refactor:, style:)

### React Native -- ${RN_NEXT}

- feat: bullet

Rules:
- Keep or add conventional commit prefixes (feat, fix, perf, chore, refactor, style)
- Rename android or Android to Kotlin in the section header
- Rename frontend or Frontend to React Native in the section header
- Language: English only, technical and precise
- If a section has no changes, write: - No changes
- Max 10 bullets per section

android/ changes (will become Kotlin section):
${ANDROID_DRAFT:-none}

frontend/ changes (will become React Native section):
${FRONTEND_DRAFT:-none}"

TAG_ENTRY=$(call_gemini "$TAG_PROMPT")

if [ -z "$TAG_ENTRY" ]; then
  fmt_bullets() {
    local text="$1" fallback="$2"
    if [ -z "$text" ]; then
      echo "- $fallback"
    else
      echo "$text" | sed '/^[[:space:]]*$/d' | sed 's/^[[:space:]]*/- /'
    fi
  }
  TAG_ENTRY="### Kotlin -- ${KOTLIN_NEXT}

$(fmt_bullets "$ANDROID_DRAFT" "No changes")

### React Native -- ${RN_NEXT}

$(fmt_bullets "$FRONTEND_DRAFT" "No changes")"
fi

echo "$TAG_ENTRY" > "$OUTPUT_TAG"
