#!/usr/bin/env bash
# Formats changelog draft using AI providers in priority order:
#   1. Gemini (Google) — primary
#   2. Groq             — fallback 1 (set GROQ_API_KEY secret)
#   3. Cloudflare AI    — fallback 2 (set CF_ACCOUNT_ID + CF_API_TOKEN secrets)
#   4. OpenAI           — fallback 3 (set OPENAI_API_KEY secret)
#
# Single AI call produces BOTH outputs (user entry + tag annotation) to reduce RPM usage.
#
# Env vars required:
#   ANDROID_DRAFT   — raw bullets from ### Backend section
#   FRONTEND_DRAFT  — raw bullets from ### Frontend section
#   PR_TITLE
#   KOTLIN_CURRENT, KOTLIN_NEXT, RN_CURRENT, RN_NEXT
#   OUTPUT_USER     — path to write user-facing changelog entry
#   OUTPUT_TAG      — path to write tag annotation
#
# Optional (each enables a provider):
#   GEMINI_API_KEY, GROQ_API_KEY, CF_ACCOUNT_ID + CF_API_TOKEN, OPENAI_API_KEY
set -euo pipefail

NO_CHANGES_PT="Sem alterações nesta versão"
NO_CHANGES_EN="No changes in this version"

# Ensures each non-empty line starts with "- " exactly once
fmt_bullets() {
  local text="$1" fallback="$2"
  if [ -z "$text" ]; then
    echo "- $fallback"
  else
    echo "$text" | sed '/^[[:space:]]*$/d' | sed 's/^[[:space:]]*-[[:space:]]*/- /; t; s/^[[:space:]]*/- /'
  fi
}

# ── Prompt (shared across all providers) ──────────────────────────────────────

COMBINED_PROMPT="You are a changelog editor for an Android manga reading app called My Manga Reader.
Your audience for Section 1 is the END USER — someone who just wants to know what is new or fixed in the app, not a developer.
Produce TWO sections separated by exactly this delimiter on its own line: ---SPLIT---

SECTION 1: User-facing CHANGELOG.md entry in this exact markdown structure:

[pt-BR summary: one or two sentences in Brazilian Portuguese telling a friend what is new. Warm, direct, non-technical.] / [en summary: same sentence(s) translated to English.]

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

---SPLIT---

SECTION 2: Git tag annotation in this exact markdown structure:

### Kotlin - \`${KOTLIN_NEXT}\`

- feat: bullet in English

### React Native - \`${RN_NEXT}\`

- feat: bullet in English

Rules for Section 1 (user-facing):
- Output ONLY the two sections and the delimiter, nothing else. No code fences.
- REWRITE bullets in plain language — do NOT copy technical terms like scaffold, Room, Native Module, bridge, Hilt, JWT, semver, CI/CD pipeline, apiKey. Replace with what the user actually experiences.
  Examples of good pt-BR rewrites (use these as style reference — note the correct accents):
    feat: add Room v1 database -> Suas configurações são salvas mesmo ao fechar o app
    feat: add Kavita authentication via apiKey -> Agora você pode fazer login na sua biblioteca Kavita
    feat: add active URL selector -> O app encontra automaticamente o melhor endereço para o seu servidor
    feat: add CI/CD pipeline -> (omit entirely — not visible to users)
    feat: add ConfigScreen -> Nova tela de configurações com seções para servidor, login e preferências
    feat: add TypeScript bridges -> Interface visual conectada ao servidor nativo
- IMPORTANT: pt-BR bullets MUST use full Brazilian Portuguese orthography with all accents: ã, õ, ç, é, ê, á, â, í, ó, ô, ú, ü. Never write "configuracoes" — always "configurações". Never "secoes" — always "seções". Never "preferencias" — always "preferências".
- Always produce BOTH pt-BR and en for every bullet. Translate naturally, not word-for-word.
- Past tense. Max 5 bullets per language per section.
- Backend and Frontend sections MUST have DIFFERENT bullets. Backend = server/data/auth features. Frontend = UI/screens/visual features. Do not repeat the same bullet in both sections.
- If a component has no changes: pt-BR: ${NO_CHANGES_PT} | en: ${NO_CHANGES_EN}
- If android draft is empty: Backend version stays \`${KOTLIN_CURRENT}\`
- If frontend draft is empty: Frontend version stays \`${RN_CURRENT}\`

Rules for Section 2 (technical tag annotation):
- Output ONLY two subsections separated by a blank line. No extra text.
- MUST include BOTH subsection headers: ### Kotlin - \`${KOTLIN_NEXT}\` and ### React Native - \`${RN_NEXT}\`
- Assign each bullet to the correct subsection: android/ changes go under Kotlin, frontend/ changes go under React Native
- English only, precise, keep technical terms
- Conventional commit prefixes: feat, fix, perf, chore, refactor, style
- If a subsection has no changes: - No changes
- Max 10 bullets per subsection

android/ changes (Kotlin/Backend):
${ANDROID_DRAFT:-none}

frontend/ changes (React Native/Frontend):
${FRONTEND_DRAFT:-none}"

# ── Provider call functions ────────────────────────────────────────────────────

call_gemini() {
  local models=("gemini-2.0-flash-lite" "gemini-2.0-flash")
  local response text
  for model in "${models[@]}"; do
    echo "Trying Gemini model $model..." >&2
    response=$(curl -s \
      "https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}" \
      -H 'Content-Type: application/json' \
      -d "$(jq -n --arg text "$COMBINED_PROMPT" '{contents:[{parts:[{text:$text}]}]}')")
    echo "Gemini response (first 200 chars): $(echo "$response" | head -c 200)" >&2
    if echo "$response" | grep -q '"code": 429'; then
      echo "Gemini $model rate limited, trying next model..." >&2
      sleep 10
      continue
    fi
    text=$(echo "$response" | jq -r '.candidates[0].content.parts[0].text // empty')
    if [ -n "$text" ]; then echo "$text"; return 0; fi
  done
  return 1
}

call_groq() {
  [ -z "${GROQ_API_KEY:-}" ] && return 1
  echo "Trying Groq..." >&2
  local response text
  response=$(curl -s https://api.groq.com/openai/v1/chat/completions \
    -H "Authorization: Bearer ${GROQ_API_KEY}" \
    -H 'Content-Type: application/json' \
    -d "$(jq -n --arg text "$COMBINED_PROMPT" '{
      model: "llama-3.3-70b-versatile",
      messages: [{role: "user", content: $text}],
      temperature: 0.3
    }')")
  text=$(echo "$response" | jq -r '.choices[0].message.content // empty')
  echo "Groq extracted text (first 500 chars): $(echo "$text" | head -c 500)" >&2
  if [ -n "$text" ]; then echo "$text"; return 0; fi
  return 1
}

call_cloudflare() {
  [ -z "${CF_ACCOUNT_ID:-}" ] || [ -z "${CF_API_TOKEN:-}" ] && return 1
  echo "Trying Cloudflare AI..." >&2
  local response text
  response=$(curl -s \
    "https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/@cf/meta/llama-3.3-70b-instruct-fp8-fast" \
    -H "Authorization: Bearer ${CF_API_TOKEN}" \
    -H 'Content-Type: application/json' \
    -d "$(jq -n --arg text "$COMBINED_PROMPT" '{
      messages: [{role: "user", content: $text}]
    }')")
  echo "Cloudflare response (first 200 chars): $(echo "$response" | head -c 200)" >&2
  text=$(echo "$response" | jq -r '.result.response // empty')
  if [ -n "$text" ]; then echo "$text"; return 0; fi
  return 1
}

call_openai() {
  [ -z "${OPENAI_API_KEY:-}" ] && return 1
  echo "Trying OpenAI..." >&2
  local response text
  response=$(curl -s https://api.openai.com/v1/chat/completions \
    -H "Authorization: Bearer ${OPENAI_API_KEY}" \
    -H 'Content-Type: application/json' \
    -d "$(jq -n --arg text "$COMBINED_PROMPT" '{
      model: "gpt-4o-mini",
      messages: [{role: "user", content: $text}],
      temperature: 0.3
    }')")
  echo "OpenAI response (first 200 chars): $(echo "$response" | head -c 200)" >&2
  text=$(echo "$response" | jq -r '.choices[0].message.content // empty')
  if [ -n "$text" ]; then echo "$text"; return 0; fi
  return 1
}

# ── Call providers in order ────────────────────────────────────────────────────

AI_OUTPUT=""

if [ -n "${GEMINI_API_KEY:-}" ]; then
  AI_OUTPUT=$(call_gemini) || true
fi

if [ -z "$AI_OUTPUT" ] && [ -n "${GROQ_API_KEY:-}" ]; then
  AI_OUTPUT=$(call_groq) || true
fi

if [ -z "$AI_OUTPUT" ] && [ -n "${CF_ACCOUNT_ID:-}" ] && [ -n "${CF_API_TOKEN:-}" ]; then
  AI_OUTPUT=$(call_cloudflare) || true
fi

if [ -z "$AI_OUTPUT" ] && [ -n "${OPENAI_API_KEY:-}" ]; then
  AI_OUTPUT=$(call_openai) || true
fi

# ── Split output or use fallback ───────────────────────────────────────────────

echo "=== Full AI output ===" >&2
echo "$AI_OUTPUT" >&2
echo "=== End AI output ===" >&2

# Normalize: strip code fences, collapse any ---*SPLIT*--- variant to ---SPLIT---
AI_OUTPUT_CLEAN=$(echo "$AI_OUTPUT" \
  | sed 's/^```[a-z]*$//' \
  | sed 's/^```$//' \
  | sed 's/^[[:space:]]*-\{3,\}SPLIT-\{3,\}[[:space:]]*$/---SPLIT---/' \
  | sed 's/^[[:space:]]*---[[:space:]]*SPLIT[[:space:]]*---[[:space:]]*$/---SPLIT---/')

if [ -n "$AI_OUTPUT_CLEAN" ] && echo "$AI_OUTPUT_CLEAN" | grep -q '^---SPLIT---$'; then
  USER_ENTRY=$(echo "$AI_OUTPUT_CLEAN" | awk '/^---SPLIT---$/{exit} {print}')
  TAG_ENTRY=$(echo "$AI_OUTPUT_CLEAN"  | awk 'found{print} /^---SPLIT---$/{found=1}')
  # Ensure blank line before ### headers and **[xx]** markers so markdown renders correctly
  USER_ENTRY=$(echo "$USER_ENTRY" | awk 'NR>1 && /^(###|\*\*\[)/ && prev!="" {print ""} {print; prev=$0}')
  TAG_ENTRY=$(echo "$TAG_ENTRY"   | awk 'NR>1 && /^###/ && prev!="" {print ""} {print; prev=$0}')
else
  echo "WARNING: No AI output or ---SPLIT--- delimiter missing — using fallback" >&2
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

  TAG_ENTRY="### Kotlin - \`${KOTLIN_NEXT}\`

$(fmt_bullets "$ANDROID_DRAFT" "No changes")

### React Native - \`${RN_NEXT}\`

$(fmt_bullets "$FRONTEND_DRAFT" "No changes")"
fi

echo "$USER_ENTRY" > "$OUTPUT_USER"
echo "$TAG_ENTRY"  > "$OUTPUT_TAG"

echo "Done. User entry: $(wc -l < "$OUTPUT_USER") lines, Tag entry: $(wc -l < "$OUTPUT_TAG") lines" >&2
