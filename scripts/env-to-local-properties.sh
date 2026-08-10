#!/usr/bin/env bash
# Converts .env to android/local.properties.
# Runs automatically via `make setup` and `make build-android`.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/.env"
OUT_FILE="$ROOT/android/local.properties"

if [ ! -f "$ENV_FILE" ]; then
  echo "✗ .env not found — copy .env.example and fill in your values" >&2
  exit 1
fi

# Write SDK path (required by Android build)
if [ -n "${ANDROID_HOME:-}" ]; then
  echo "sdk.dir=$ANDROID_HOME" > "$OUT_FILE"
elif [ -n "${ANDROID_SDK_ROOT:-}" ]; then
  echo "sdk.dir=$ANDROID_SDK_ROOT" > "$OUT_FILE"
else
  echo "✗ ANDROID_HOME not set — export ANDROID_HOME before building" >&2
  exit 1
fi

# Append .env values (skip comments and blank lines)
grep -v '^\s*#' "$ENV_FILE" | grep -v '^\s*$' | while IFS= read -r line; do
  echo "$line" >> "$OUT_FILE"
done

echo "→ local.properties written"
