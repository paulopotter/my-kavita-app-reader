#!/usr/bin/env bash
# Converts .env to android/local.properties.
# Runs automatically via `make setup` and `make build-android`.
# Idempotent: only rewrites the file if the computed content actually changed.
#
# .env is optional — if absent, this only relies on ANDROID_HOME/ANDROID_SDK_ROOT (shell env) to
# find the SDK, and every other key is simply absent from local.properties (never written as
# blank). It only fails if the SDK truly can't be resolved by any means.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/.env"
OUT_FILE="$ROOT/android/local.properties"
MAX_DEEPLINK_HOSTS=5

ENV_CONTENT=""
if [ -f "$ENV_FILE" ]; then
  ENV_CONTENT="$(grep -v '^\s*#' "$ENV_FILE" | grep -v '^\s*$' || true)"
fi

# Resolve sdk.dir: ANDROID_SDK_DIR in .env (if present) > ANDROID_HOME env var > ANDROID_SDK_ROOT
# env var > error. .env itself is never required for this to succeed.
SDK_DIR_FROM_ENV="$(printf '%s\n' "$ENV_CONTENT" | grep '^ANDROID_SDK_DIR=' | cut -d= -f2- | tr -d '[:space:]' || true)"
if [ -n "$SDK_DIR_FROM_ENV" ]; then
  SDK_DIR="$SDK_DIR_FROM_ENV"
elif [ -n "${ANDROID_HOME:-}" ]; then
  SDK_DIR="$ANDROID_HOME"
elif [ -n "${ANDROID_SDK_ROOT:-}" ]; then
  SDK_DIR="$ANDROID_SDK_ROOT"
else
  echo "✗ Could not resolve the Android SDK path — set ANDROID_SDK_DIR in .env, or export ANDROID_HOME/ANDROID_SDK_ROOT" >&2
  exit 1
fi

# DEEPLINK_HOSTS is a comma-separated list in .env (e.g. "host1.com,host2.com:8080") but the
# Gradle side (generateDeepLinkHosts, android/app/build.gradle.kts) expects it expanded into
# numbered keys — deeplink.host1, deeplink.host2, ... Anything beyond MAX_DEEPLINK_HOSTS is
# dropped with a warning rather than silently truncated.
DEEPLINK_HOSTS_RAW="$(printf '%s\n' "$ENV_CONTENT" | grep '^DEEPLINK_HOSTS=' | cut -d= -f2- | tr -d '[:space:]' || true)"
DEEPLINK_LINES=""
if [ -n "$DEEPLINK_HOSTS_RAW" ]; then
  IFS=',' read -ra HOSTS <<< "$DEEPLINK_HOSTS_RAW"
  if [ "${#HOSTS[@]}" -gt "$MAX_DEEPLINK_HOSTS" ]; then
    echo "⚠ DEEPLINK_HOSTS has more than $MAX_DEEPLINK_HOSTS entries — only the first $MAX_DEEPLINK_HOSTS are used" >&2
  fi
  index=1
  for host in "${HOSTS[@]}"; do
    [ "$index" -gt "$MAX_DEEPLINK_HOSTS" ] && break
    [ -z "$host" ] && continue
    DEEPLINK_LINES="${DEEPLINK_LINES}deeplink.host${index}=${host}
"
    index=$((index + 1))
  done
fi

# Build the full desired content in memory first — everything from .env (skip comments, blank
# lines, sdk.dir, ANDROID_SDK_DIR, and DEEPLINK_HOSTS itself, which is expanded above instead;
# empty ENV_CONTENT when .env is absent just means nothing extra gets added here) plus sdk.dir
# and the expanded deeplink.hostN lines.
NEW_CONTENT="sdk.dir=$SDK_DIR
$(printf '%s\n' "$ENV_CONTENT" | grep -v '^sdk\.dir=' | grep -v '^ANDROID_SDK_DIR=' | grep -v '^DEEPLINK_HOSTS=' || true)
${DEEPLINK_LINES}"

# Compare against a temp file (not `$(cat ...)`, which strips trailing newlines and would never
# match $NEW_CONTENT's own trailing newline) so this is idempotent — a repeated run with the same
# .env content is a true no-op, no mtime churn on local.properties.
NEW_FILE="$(mktemp)"
trap 'rm -f "$NEW_FILE"' EXIT
printf '%s' "$NEW_CONTENT" > "$NEW_FILE"

if [ -f "$OUT_FILE" ] && cmp -s "$OUT_FILE" "$NEW_FILE"; then
  echo "→ local.properties already up to date"
else
  mv "$NEW_FILE" "$OUT_FILE"
  trap - EXIT
  echo "→ local.properties written"
fi
