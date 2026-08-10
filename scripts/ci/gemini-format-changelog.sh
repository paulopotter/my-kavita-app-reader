#!/usr/bin/env bash
# Sends changelog draft to Gemini and returns formatted pt-BR + en entry.
# Env vars required: GEMINI_API_KEY, CHANGELOG_DRAFT, PR_TITLE
set -euo pipefail

PROMPT="You are a technical changelog editor for a Kotlin + React Native Android app called My Manga Reader.
Take the raw changelog draft below and return ONLY a formatted entry in this exact structure,
with no extra text, no markdown fences, no explanation.
Structure: [pt-BR] followed by bullets, then [en] followed by bullets.
Rules: translate to both pt-BR and en; user-facing language (what changed, not how);
past tense verbs (pt-BR: Adicionado/Corrigido/Melhorado, en: Added/Fixed/Improved);
no section headers like Added -- only the [pt-BR] and [en] blocks;
max 8 bullets per language;
if input is already in both languages, keep and improve them.

PR: ${PR_TITLE}

Draft:
${CHANGELOG_DRAFT}"

RESPONSE=$(curl -s \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}" \
  -H 'Content-Type: application/json' \
  -d "$(jq -n --arg text "$PROMPT" '{contents:[{parts:[{text:$text}]}]}')")

FORMATTED=$(echo "$RESPONSE" | jq -r '.candidates[0].content.parts[0].text // empty')

if [ -z "$FORMATTED" ]; then
  echo "Gemini returned empty, using raw draft as fallback" >&2
  echo "$CHANGELOG_DRAFT"
else
  echo "$FORMATTED"
fi
