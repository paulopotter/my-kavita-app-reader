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

# Resolve sdk.dir: ANDROID_SDK_DIR in .env > ANDROID_HOME env var > ANDROID_SDK_ROOT env var > error
SDK_DIR_FROM_ENV="$(grep -v '^\s*#' "$ENV_FILE" | grep '^ANDROID_SDK_DIR=' | cut -d= -f2- | tr -d '[:space:]')"
if [ -n "$SDK_DIR_FROM_ENV" ]; then
  SDK_DIR="$SDK_DIR_FROM_ENV"
elif [ -n "${ANDROID_HOME:-}" ]; then
  SDK_DIR="$ANDROID_HOME"
elif [ -n "${ANDROID_SDK_ROOT:-}" ]; then
  SDK_DIR="$ANDROID_SDK_ROOT"
else
  echo "✗ Set ANDROID_SDK_DIR in .env (path to your Android SDK)" >&2
  exit 1
fi

# Write sdk.dir first, then .env values (skip comments, blank lines, sdk.dir, and ANDROID_SDK_DIR)
echo "sdk.dir=$SDK_DIR" > "$OUT_FILE"
grep -v '^\s*#' "$ENV_FILE" | grep -v '^\s*$' | grep -v '^sdk\.dir=' | grep -v '^ANDROID_SDK_DIR=' | while IFS= read -r line; do
  echo "$line" >> "$OUT_FILE"
done

echo "→ local.properties written"
