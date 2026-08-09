#!/usr/bin/env bash
# Generates a Room migration skeleton from the latest two exported schema files.
#
# Usage:
#   scripts/generate-migration.sh            # auto-detects from → to from schemas/
#   scripts/generate-migration.sh 1 2        # explicit from → to
#
# Output: android/core/src/main/kotlin/com/mymangareader/core/database/migrations/Migration_N_M.kt
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCHEMA_DIR="$ROOT/android/core/schemas/com.mymangareader.core.database.AppDatabase"
MIGRATIONS_DIR="$ROOT/android/core/src/main/kotlin/com/mymangareader/core/database/migrations"

if [ ! -d "$SCHEMA_DIR" ]; then
  echo "✗ Schema directory not found: $SCHEMA_DIR"
  echo "  Build the project first: make build-android"
  exit 1
fi

# Resolve from/to versions
if [ $# -eq 2 ]; then
  FROM="$1"
  TO="$2"
else
  # Auto-detect: two highest version numbers
  VERSIONS=$(ls "$SCHEMA_DIR"/*.json 2>/dev/null | sed 's/.*\/\([0-9]*\)\.json/\1/' | sort -n)
  COUNT=$(echo "$VERSIONS" | wc -l | tr -d ' ')
  if [ "$COUNT" -lt 2 ]; then
    echo "✗ Need at least 2 schema versions to generate a migration."
    echo "  Only found: $VERSIONS"
    exit 1
  fi
  TO=$(echo "$VERSIONS" | tail -1)
  FROM=$(echo "$VERSIONS" | tail -2 | head -1)
fi

OUTPUT="$MIGRATIONS_DIR/Migration_${FROM}_${TO}.kt"

if [ -f "$OUTPUT" ]; then
  echo "✗ Migration already exists: $OUTPUT"
  exit 1
fi

mkdir -p "$MIGRATIONS_DIR"

# Extract table changes by diffing the two schema JSON files
FROM_SCHEMA="$SCHEMA_DIR/${FROM}.json"
TO_SCHEMA="$SCHEMA_DIR/${TO}.json"

if [ ! -f "$FROM_SCHEMA" ]; then
  echo "✗ Schema not found: $FROM_SCHEMA"
  exit 1
fi
if [ ! -f "$TO_SCHEMA" ]; then
  echo "✗ Schema not found: $TO_SCHEMA"
  exit 1
fi

# Extract table names from both schemas (requires jq)
if command -v jq >/dev/null 2>&1; then
  FROM_TABLES=$(jq -r '.database.entities[].tableName' "$FROM_SCHEMA" 2>/dev/null | sort)
  TO_TABLES=$(jq -r '.database.entities[].tableName' "$TO_SCHEMA" 2>/dev/null | sort)
  NEW_TABLES=$(comm -13 <(echo "$FROM_TABLES") <(echo "$TO_TABLES"))
  REMOVED_TABLES=$(comm -23 <(echo "$FROM_TABLES") <(echo "$TO_TABLES"))
else
  NEW_TABLES=""
  REMOVED_TABLES=""
  echo "  ⚠ jq not found — skipping table diff (install via: brew install jq)"
fi

# Build SQL hints
SQL_HINTS=""
if [ -n "$NEW_TABLES" ]; then
  while IFS= read -r table; do
    SQL_HINTS="${SQL_HINTS}        // TODO: CREATE TABLE $table (...)\n"
  done <<< "$NEW_TABLES"
fi
if [ -n "$REMOVED_TABLES" ]; then
  while IFS= read -r table; do
    SQL_HINTS="${SQL_HINTS}        // TODO: DROP TABLE IF EXISTS $table\n"
  done <<< "$REMOVED_TABLES"
fi
if [ -z "$SQL_HINTS" ]; then
  SQL_HINTS="        // TODO: add your SQL statements here (ALTER TABLE, CREATE TABLE, etc.)\n"
fi

cat > "$OUTPUT" <<KOTLIN
package com.mymangareader.core.database.migrations

import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase

val Migration_${FROM}_${TO} = object : Migration($FROM, $TO) {
    override fun migrate(db: SupportSQLiteDatabase) {
$(printf "%b" "$SQL_HINTS")    }
}
KOTLIN

echo "✓ Migration skeleton created: $OUTPUT"
echo "  Fill in the SQL statements and register it in AppDatabase."
