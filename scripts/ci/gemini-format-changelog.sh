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

NO_CHANGES_PT="Sem alteracoes nesta versao"
NO_CHANGES_EN="No changes in this version"

call_gemini() {
  local prompt="$1"
  local response text attempt
  # flash-lite tem RPM maior no tier gratuito; flash como fallback
  local models=("gemini-2.0-flash-lite" "gemini-2.0-flash")
  for attempt in 1 2 3; do
    for model in "${models[@]}"; do
      echo "Attempt $attempt with model $model..." >&2
      response=$(curl -s \
        "https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}" \
        -H 'Content-Type: application/json' \
        -d "$(jq -n --arg text "$prompt" '{contents:[{parts:[{text:$text}]}]}')")
      echo "--- Gemini raw response (first 300 chars) ---" >&2
      echo "$response" | head -c 300 >&2
      echo "" >&2
      if echo "$response" | grep -q '"code": 429'; then
        echo "Rate limited on $model, waiting 30s before next..." >&2
        sleep 30
        continue
      fi
      text=$(echo "$response" | jq -r '.candidates[0].content.parts[0].text // empty')
      if [ -n "$text" ]; then
        echo "$text"
        return 0
      fi
    done
    echo "All models exhausted on attempt $attempt, waiting 60s..." >&2
    sleep 60
  done
  echo "" # fallback vazio
}

# Ensures each non-empty line starts with "- " exactly once
fmt_bullets() {
  local text="$1" fallback="$2"
  if [ -z "$text" ]; then
    echo "- $fallback"
  else
    echo "$text" | sed '/^[[:space:]]*$/d' | sed 's/^[[:space:]]*-[[:space:]]*/- /; t; s/^[[:space:]]*/- /'
  fi
}

# ── User-facing changelog entry ────────────────────────────────────────────────

USER_PROMPT="You are a changelog editor for an Android app called My Manga Reader.
Produce a user-facing changelog entry in EXACTLY this markdown structure (no extra text, no code fences):

One or two sentence summary describing what changed, friendly and non-technical.

### **Backend** - \`${KOTLIN_NEXT}\`

**[pt-BR]**
- bullet em portugues brasileiro

**[en]**
- bullet in English

### **Frontend** - \`${RN_NEXT}\`

**[pt-BR]**
- bullet em portugues brasileiro

**[en]**
- bullet in English

Rules:
- Output ONLY the markdown above, nothing else before or after
- Always produce BOTH pt-BR and en translations for every bullet
- User-facing language: describe what the user gains or sees, not technical implementation
- Past tense (pt-BR: Adicionado/Corrigido/Melhorado; en: Added/Fixed/Improved)
- No conventional commit prefixes (no feat:, fix:, etc.) in bullet text
- Max 6 bullets per language per section
- If a section has no changes, write a single bullet: ${NO_CHANGES_PT} (pt-BR) / ${NO_CHANGES_EN} (en)
- If android draft is empty: Backend version stays ${KOTLIN_CURRENT} with no-changes bullet
- If frontend draft is empty: Frontend version stays ${RN_CURRENT} with no-changes bullet

android/ changes (Kotlin/Backend):
${ANDROID_DRAFT:-none}

frontend/ changes (React Native/Frontend):
${FRONTEND_DRAFT:-none}"

USER_ENTRY=$(call_gemini "$USER_PROMPT")

if [ -z "$USER_ENTRY" ]; then
  echo "WARNING: Gemini returned empty for user entry, using fallback" >&2
  ANDROID_BULLETS_PT=$(fmt_bullets "$ANDROID_DRAFT" "$NO_CHANGES_PT")
  ANDROID_BULLETS_EN=$(fmt_bullets "$ANDROID_DRAFT" "$NO_CHANGES_EN")
  FRONTEND_BULLETS_PT=$(fmt_bullets "$FRONTEND_DRAFT" "$NO_CHANGES_PT")
  FRONTEND_BULLETS_EN=$(fmt_bullets "$FRONTEND_DRAFT" "$NO_CHANGES_EN")

  USER_ENTRY="Melhorias internas nesta versao. / Internal improvements in this version.

### **Backend** - \`${KOTLIN_NEXT}\`

**[pt-BR]**
${ANDROID_BULLETS_PT}

**[en]**
${ANDROID_BULLETS_EN}

### **Frontend** - \`${RN_NEXT}\`

**[pt-BR]**
${FRONTEND_BULLETS_PT}

**[en]**
${FRONTEND_BULLETS_EN}"
fi

echo "$USER_ENTRY" > "$OUTPUT_USER"

# Pausa entre chamadas para não estourar RPM do tier gratuito
echo "Waiting 30s before second Gemini call..." >&2
sleep 30

# ── Technical tag annotation ───────────────────────────────────────────────────

TAG_PROMPT="You are a technical changelog formatter.
Produce a git tag annotation in EXACTLY this markdown structure (no extra text, no code fences):

### Kotlin - \`${KOTLIN_NEXT}\`

- feat: bullet describing the change

### React Native - \`${RN_NEXT}\`

- feat: bullet describing the change

Rules:
- Output ONLY the markdown above, nothing else before or after
- Use conventional commit prefixes: feat, fix, perf, chore, refactor, style
- Section header must say 'Kotlin' (not android/Android) and 'React Native' (not frontend/Frontend)
- Language: English only, technical and precise
- If a section has no changes, write exactly: - No changes
- Max 10 bullets per section

android/ changes (will become Kotlin section):
${ANDROID_DRAFT:-none}

frontend/ changes (will become React Native section):
${FRONTEND_DRAFT:-none}"

TAG_ENTRY=$(call_gemini "$TAG_PROMPT")

if [ -z "$TAG_ENTRY" ]; then
  echo "WARNING: Gemini returned empty for tag entry, using fallback" >&2
  TAG_ENTRY="### Kotlin - \`${KOTLIN_NEXT}\`

$(fmt_bullets "$ANDROID_DRAFT" "No changes")

### React Native - \`${RN_NEXT}\`

$(fmt_bullets "$FRONTEND_DRAFT" "No changes")"
fi

echo "$TAG_ENTRY" > "$OUTPUT_TAG"
