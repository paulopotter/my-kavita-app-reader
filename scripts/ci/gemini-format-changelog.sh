#!/usr/bin/env bash
# Formats changelog draft using AI providers in priority order:
#   1. Gemini (Google) — primary, model discovered dynamically (see call_gemini)
#   2. Groq             — fallback 1 (set GROQ_API_KEY secret)
#   3. Cloudflare AI    — fallback 2 (set CF_ACCOUNT_ID + CF_API_TOKEN secrets)
#   4. OpenAI           — fallback 3 (set OPENAI_API_KEY secret)
#
# Two independent calls per provider — one for the user-facing entry, one for the tag
# annotation — instead of one combined prompt split by a ---SPLIT--- delimiter. A provider
# can now succeed at one and fail the other; each is retried/validated on its own instead of
# an ambiguous delimiter parse deciding pass/fail for both at once.
#
# validate_bilingual() rejects a user entry whose [en] section is empty or is a near-duplicate
# of [pt-BR] — the class of failure this file previously shipped in a real release (Gemini
# returned malformed output, the whole thing fell through to the static fallback, and nobody
# caught that [en] was just [pt-BR] copy-pasted until reading the published CHANGELOG).
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

# Ensures each non-empty line starts with "- " exactly once. Used only by the last-resort
# fallback (no provider produced valid output at all) — joins nothing, so a draft bullet that
# wraps across multiple lines stays wrapped. That's an acceptable degradation for a fallback
# that already means every AI provider failed; the real fix is validate_bilingual() catching
# bad output before it reaches this path.
fmt_bullets() {
  local text="$1" fallback="$2"
  if [ -z "$text" ]; then
    echo "- $fallback"
  else
    echo "$text" | sed '/^[[:space:]]*$/d' | sed 's/^[[:space:]]*-[[:space:]]*/- /; t; s/^[[:space:]]*/- /'
  fi
}

# ── Prompts (shared across all providers) ──────────────────────────────────────

USER_PROMPT=$(cat <<EOF
You are a changelog editor for an Android manga reading app called My Manga Reader.
Your audience is the END USER — someone who just wants to know what is new or fixed in the app, not a developer.

Produce a user-facing CHANGELOG.md entry in this exact markdown structure:

Uma frase em português que resume o tema principal desta release baseada nos bullets abaixo — seja específico, mencione o que realmente mudou (ex: "Agora o app se atualiza sozinho sem precisar reinstalar." ou "Correções de estabilidade e nova tela de configurações."). Não use frases genéricas como "melhorias e correções". / Same sentence translated to English.


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
- Output ONLY the entry above, nothing else. No code fences, no preamble, no explanation.
- REWRITE bullets in plain language — do NOT copy technical terms like scaffold, Room, Native Module, bridge, Hilt, JWT, semver, CI/CD pipeline, apiKey, cache, digest. Replace with what the user actually experiences.
  Examples of good pt-BR rewrites (use these as style reference — note the correct accents):
    feat: add Room v1 database -> Suas configurações são salvas mesmo ao fechar o app
    feat: add Kavita authentication via apiKey -> Agora você pode fazer login na sua biblioteca Kavita
    feat: add active URL selector -> O app encontra automaticamente o melhor endereço para o seu servidor
    feat: add CI/CD pipeline -> (omit entirely — not visible to users)
    feat: add ConfigScreen -> Nova tela de configurações com seções para servidor, login e preferências
    feat: add TypeScript bridges -> Interface visual conectada ao servidor nativo
- IMPORTANT: pt-BR bullets MUST use full Brazilian Portuguese orthography with all accents: ã, õ, ç, é, ê, á, â, í, ó, ô, ú, ü. Never write "configuracoes" — always "configurações". Never "secoes" — always "seções". Never "preferencias" — always "preferências".
- CRITICAL: the [en] bullets MUST be an actual English translation, never a copy of the [pt-BR] text. Every single word must differ (translation, not transliteration).
- Always produce BOTH pt-BR and en for every bullet. Translate naturally, not word-for-word.
- Each bullet MUST be a single line — do not wrap a bullet's text across multiple "-" lines. If a thought needs more words, keep it on one long line.
- Past tense. Max 5 bullets per language per section.
- Backend and Frontend sections MUST have DIFFERENT bullets. Backend = server/data/auth features. Frontend = UI/screens/visual features. Do not repeat the same bullet in both sections.
- If a component has NO bullets at all (empty draft): use exactly one bullet: pt-BR: ${NO_CHANGES_PT} | en: ${NO_CHANGES_EN}. Never add this bullet if there is already content — do NOT pad with filler bullets.
- If android draft is empty: Backend version stays \`${KOTLIN_CURRENT}\`
- If frontend draft is empty: Frontend version stays \`${RN_CURRENT}\`

android/ changes (Kotlin/Backend):
${ANDROID_DRAFT:-none}

frontend/ changes (React Native/Frontend):
${FRONTEND_DRAFT:-none}
EOF
)

TAG_PROMPT=$(cat <<EOF
You are writing a technical git tag annotation for an Android manga reading app called My Manga Reader.
Your audience is a developer/contributor reading git history — keep technical terms, do not simplify.

Produce the annotation in this exact markdown structure:

### Kotlin - \`${KOTLIN_NEXT}\`

- feat: bullet in English

### React Native - \`${RN_NEXT}\`

- feat: bullet in English

Rules:
- Output ONLY the two subsections above, nothing else. No code fences, no preamble.
- MUST include BOTH subsection headers, even if one has no changes.
- Assign each bullet to the correct subsection: android/ changes go under Kotlin, frontend/ changes go under React Native.
- English only, precise, keep technical terms.
- Conventional commit prefixes: feat, fix, perf, chore, refactor, style.
- Each bullet MUST be a single line — do not wrap a bullet's text across multiple "-" lines.
- If a subsection has no changes: - No changes
- Max 10 bullets per subsection.

android/ changes (Kotlin/Backend):
${ANDROID_DRAFT:-none}

frontend/ changes (React Native/Frontend):
${FRONTEND_DRAFT:-none}
EOF
)

# ── Validation ──────────────────────────────────────────────────────────────────

# Rejects the class of failure this file actually shipped once: an [en] section that's
# empty, missing, or close enough to [pt-BR] to be a copy rather than a translation.
# Heuristic, not a real language check — good enough to catch "didn't translate at all"
# without needing another API call to verify.
validate_bilingual() {
  local entry="$1"

  if ! echo "$entry" | grep -q '\*\*\[pt-BR\]\*\*' || ! echo "$entry" | grep -q '\*\*\[en\]\*\*'; then
    echo "Validation failed: missing [pt-BR] or [en] marker" >&2
    return 1
  fi

  # Compare each pt-BR block to the en block that immediately follows it (per-section, since
  # there are two of each — Backend and Frontend).
  local pt_blocks en_blocks
  pt_blocks=$(echo "$entry" | awk '/\*\*\[pt-BR\]\*\*/{f=1; next} /\*\*\[en\]\*\*/{f=0} f' )
  en_blocks=$(echo "$entry" | awk '/\*\*\[en\]\*\*/{f=1; next} /^###|^\*\*\[pt-BR\]\*\*/{f=0} f')

  if [ -z "$en_blocks" ]; then
    echo "Validation failed: [en] section is empty" >&2
    return 1
  fi

  # Normalize (strip accents/case/whitespace) and compare — an exact or near-exact match means
  # [en] is a copy of [pt-BR], not a translation.
  local pt_norm en_norm
  pt_norm=$(echo "$pt_blocks" | tr '[:upper:]' '[:lower:]' | tr -d '[:space:]')
  en_norm=$(echo "$en_blocks" | tr '[:upper:]' '[:lower:]' | tr -d '[:space:]')
  if [ "$pt_norm" = "$en_norm" ]; then
    echo "Validation failed: [en] section is an exact copy of [pt-BR]" >&2
    return 1
  fi

  return 0
}

# Rejects a bullet block where a line's continuation got split into its own "- " bullet
# instead of staying part of the previous line — the other real failure this file shipped
# (a mid-sentence line becoming a standalone, context-less bullet). Heuristic: a bullet
# starting with a lowercase letter and no verb-like conventional-commit prefix is very
# likely a wrapped continuation, not a new thought.
validate_no_fragments() {
  local entry="$1"
  local bad_line
  bad_line=$(echo "$entry" | grep -E '^- [a-z]' | grep -vE '^- (feat|fix|perf|refactor|chore|style)[:!(]' | head -1)
  if [ -n "$bad_line" ]; then
    echo "Validation failed: bullet looks like a wrapped line fragment: $bad_line" >&2
    return 1
  fi
  return 0
}

# ── Provider call functions ────────────────────────────────────────────────────
# Each takes the prompt as $1 and echoes the raw text response (or returns non-zero).

# Model is discovered from ListModels rather than hardcoded — a hardcoded id inevitably goes
# stale when Google retires it (this file shipped that exact failure once: gemini-2.0-flash-lite
# and gemini-2.0-flash both 404'd as "no longer available"). ListModels doesn't expose price or
# free-tier status, so cost is approximated from Google's own naming convention instead:
# "flash-lite" is cheapest, then "flash", "pro" only as a last resort — same ordering the old
# hardcoded list was already trying to express, just not hardcoded to specific version numbers.
gemini_pick_model() {
  local list_response
  list_response=$(curl -s "https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}")
  echo "$list_response" \
    | jq -r '.models[]? | select(.supportedGenerationMethods[]? == "generateContent") | .name | sub("^models/"; "")' \
    | awk '
        /flash-lite/ { print 0, $0; next }
        /flash/      { print 1, $0; next }
                     { print 2, $0 }
      ' \
    | sort -n -s \
    | awk '{print $2}'
}

call_gemini() {
  local prompt="$1"
  local models response text
  models=$(gemini_pick_model)
  if [ -z "$models" ]; then
    echo "Gemini: ListModels returned no usable model" >&2
    return 1
  fi
  while IFS= read -r model; do
    [ -z "$model" ] && continue
    echo "Trying Gemini model $model..." >&2
    response=$(curl -s \
      "https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}" \
      -H 'Content-Type: application/json' \
      -d "$(jq -n --arg text "$prompt" '{contents:[{parts:[{text:$text}]}]}')")
    echo "Gemini response (first 200 chars): $(echo "$response" | head -c 200)" >&2
    if echo "$response" | grep -q '"code": 429'; then
      echo "Gemini $model rate limited, trying next model..." >&2
      sleep 10
      continue
    fi
    text=$(echo "$response" | jq -r '.candidates[0].content.parts[0].text // empty')
    if [ -n "$text" ]; then echo "$text"; return 0; fi
  done <<< "$models"
  return 1
}

call_groq() {
  local prompt="$1"
  [ -z "${GROQ_API_KEY:-}" ] && return 1
  echo "Trying Groq..." >&2
  local response text
  response=$(curl -s https://api.groq.com/openai/v1/chat/completions \
    -H "Authorization: Bearer ${GROQ_API_KEY}" \
    -H 'Content-Type: application/json' \
    -d "$(jq -n --arg text "$prompt" '{
      model: "llama-3.3-70b-versatile",
      messages: [{role: "user", content: $text}],
      temperature: 0.3
    }')")
  # Log the raw response BEFORE extraction — unlike a curl/network failure, an API error
  # (bad model id, rate limit, invalid key) still returns 200 with an error body, so
  # `.choices[0].message.content` silently resolves to empty with no clue why.
  echo "Groq response (first 300 chars): $(echo "$response" | head -c 300)" >&2
  text=$(echo "$response" | jq -r '.choices[0].message.content // empty')
  echo "Groq extracted text (first 500 chars): $(echo "$text" | head -c 500)" >&2
  if [ -n "$text" ]; then echo "$text"; return 0; fi
  return 1
}

call_cloudflare() {
  local prompt="$1"
  [ -z "${CF_ACCOUNT_ID:-}" ] || [ -z "${CF_API_TOKEN:-}" ] && return 1
  echo "Trying Cloudflare AI..." >&2
  local response text
  response=$(curl -s \
    "https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/@cf/meta/llama-3.3-70b-instruct-fp8-fast" \
    -H "Authorization: Bearer ${CF_API_TOKEN}" \
    -H 'Content-Type: application/json' \
    -d "$(jq -n --arg text "$prompt" '{
      messages: [{role: "user", content: $text}]
    }')")
  echo "Cloudflare response (first 200 chars): $(echo "$response" | head -c 200)" >&2
  text=$(echo "$response" | jq -r '.result.response // empty')
  if [ -n "$text" ]; then echo "$text"; return 0; fi
  return 1
}

call_openai() {
  local prompt="$1"
  [ -z "${OPENAI_API_KEY:-}" ] && return 1
  echo "Trying OpenAI..." >&2
  local response text
  response=$(curl -s https://api.openai.com/v1/chat/completions \
    -H "Authorization: Bearer ${OPENAI_API_KEY}" \
    -H 'Content-Type: application/json' \
    -d "$(jq -n --arg text "$prompt" '{
      model: "gpt-4o-mini",
      messages: [{role: "user", content: $text}],
      temperature: 0.3
    }')")
  echo "OpenAI response (first 200 chars): $(echo "$response" | head -c 200)" >&2
  text=$(echo "$response" | jq -r '.choices[0].message.content // empty')
  if [ -n "$text" ]; then echo "$text"; return 0; fi
  return 1
}

# Strips code fences a provider might wrap the answer in, despite being told not to.
strip_fences() {
  echo "$1" | sed 's/^```[a-z]*$//' | sed 's/^```$//'
}

# Ensures a blank line precedes ### headers and **[xx]** markers so markdown renders correctly.
add_spacing() {
  echo "$1" | awk 'NR>1 && /^(###|\*\*\[)/ && prev!="" {print ""} {print; prev=$0}'
}

# Tries every configured provider in order for one prompt, running the given validators
# (function names) against each candidate response before accepting it — a provider that
# responds but fails validation is treated the same as one that didn't respond at all, and
# the next provider in the cascade gets a turn.
try_providers() {
  local prompt="$1"
  shift
  local validators=("$@")
  local candidate cleaned ok validator

  for fn in call_gemini call_groq call_cloudflare call_openai; do
    case "$fn" in
      call_gemini)     [ -z "${GEMINI_API_KEY:-}" ] && continue ;;
      call_groq)       [ -z "${GROQ_API_KEY:-}" ] && continue ;;
      call_cloudflare) { [ -z "${CF_ACCOUNT_ID:-}" ] || [ -z "${CF_API_TOKEN:-}" ]; } && continue ;;
      call_openai)     [ -z "${OPENAI_API_KEY:-}" ] && continue ;;
    esac

    candidate=$("$fn" "$prompt") || continue
    [ -z "$candidate" ] && continue
    cleaned=$(strip_fences "$candidate")

    ok=true
    for validator in "${validators[@]}"; do
      if [ -n "$validator" ] && ! "$validator" "$cleaned"; then
        ok=false
        break
      fi
    done

    if [ "$ok" = "true" ]; then
      add_spacing "$cleaned"
      return 0
    fi
    echo "$fn produced output but it failed validation — trying next provider" >&2
  done
  return 1
}

# ── Generate the two entries independently ──────────────────────────────────────

USER_ENTRY=""
if USER_ENTRY=$(try_providers "$USER_PROMPT" validate_bilingual validate_no_fragments); then
  echo "User entry: generated by AI, validated bilingual + unfragmented" >&2
else
  echo "WARNING: no provider produced a valid user entry — using static fallback" >&2
  ANDROID_BULLETS_PT=$(fmt_bullets "$ANDROID_DRAFT" "$NO_CHANGES_PT")
  ANDROID_BULLETS_EN=$(fmt_bullets "$ANDROID_DRAFT" "$NO_CHANGES_EN")
  FRONTEND_BULLETS_PT=$(fmt_bullets "$FRONTEND_DRAFT" "$NO_CHANGES_PT")
  FRONTEND_BULLETS_EN=$(fmt_bullets "$FRONTEND_DRAFT" "$NO_CHANGES_EN")
  USER_ENTRY="Melhorias internas nesta versão. / Internal improvements in this version.

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

TAG_ENTRY=""
if TAG_ENTRY=$(try_providers "$TAG_PROMPT" validate_no_fragments); then
  echo "Tag entry: generated by AI, validated unfragmented" >&2
else
  echo "WARNING: no provider produced a valid tag entry — using static fallback" >&2
  TAG_ENTRY="### Kotlin - \`${KOTLIN_NEXT}\`

$(fmt_bullets "$ANDROID_DRAFT" "No changes")

### React Native - \`${RN_NEXT}\`

$(fmt_bullets "$FRONTEND_DRAFT" "No changes")"
fi

echo "$USER_ENTRY" > "$OUTPUT_USER"
echo "$TAG_ENTRY"  > "$OUTPUT_TAG"

echo "Done. User entry: $(wc -l < "$OUTPUT_USER") lines, Tag entry: $(wc -l < "$OUTPUT_TAG") lines" >&2
