#!/usr/bin/env bash
# Installs git hooks from scripts/hooks/ into .git/hooks/.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOOKS_SRC="$ROOT/scripts/hooks"
HOOKS_DST="$ROOT/.git/hooks"

if [ ! -d "$ROOT/.git" ]; then
  echo "✗ Not a git repository: $ROOT"
  exit 1
fi

for hook in "$HOOKS_SRC"/*; do
  name="$(basename "$hook")"
  dst="$HOOKS_DST/$name"

  cp "$hook" "$dst"
  chmod +x "$dst"
  echo "  ✓ installed $name"
done

echo "→ Git hooks installed"
