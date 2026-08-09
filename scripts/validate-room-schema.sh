#!/usr/bin/env bash
# Blocks commit if Room schema changed without a corresponding migration file.
# Called by the pre-commit hook when android/core/schemas/ is staged.
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
SCHEMAS_DIR="$ROOT/android/core/schemas"
MIGRATIONS_DIR="$ROOT/android/core/src/main/kotlin/com/mymangareader/core/database/migrations"

if [ ! -d "$SCHEMAS_DIR" ]; then
  echo "  ⚠ schemas/ not found — skipping"
  exit 0
fi

# Find the highest schema version number
LATEST_SCHEMA=$(ls "$SCHEMAS_DIR/com.mymangareader.core.database.AppDatabase/" 2>/dev/null \
  | grep '\.json$' | sed 's/\.json//' | sort -n | tail -1)

if [ -z "$LATEST_SCHEMA" ]; then
  exit 0
fi

PREV_VERSION=$((LATEST_SCHEMA - 1))

if [ "$PREV_VERSION" -lt 1 ]; then
  # Version 1 — no migration needed
  exit 0
fi

# Check that a migration from prev to latest exists
MIGRATION_FILE=$(find "$MIGRATIONS_DIR" -name "Migration_${PREV_VERSION}_${LATEST_SCHEMA}.kt" 2>/dev/null || true)

if [ -z "$MIGRATION_FILE" ]; then
  echo "✗ Room schema updated to v$LATEST_SCHEMA but no migration found."
  echo "  Expected: $MIGRATIONS_DIR/Migration_${PREV_VERSION}_${LATEST_SCHEMA}.kt"
  echo "  Run: scripts/generate-migration.sh to create a skeleton."
  exit 1
fi

exit 0
