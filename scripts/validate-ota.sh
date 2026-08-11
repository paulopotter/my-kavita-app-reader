#!/usr/bin/env bash
# Validates policy-pending.json and latest.json for OTA infrastructure.
# Exit 1 on any validation error.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

PENDING_FILE="$ROOT_DIR/policy-pending.json"
LATEST_FILE="$ROOT_DIR/latest.json"

VALID_LEVELS=("required" "highly_recommended" "recommended")
VALID_TYPES=("app" "rn" "kotlin")

error() { echo "❌ $*" >&2; exit 1; }
ok()    { echo "✅ $*"; }

# ── Validate policy-pending.json ──────────────────────────────────────────────

[ -f "$PENDING_FILE" ] || error "policy-pending.json not found at $PENDING_FILE"

python3 -c "import json,sys; json.load(open('$PENDING_FILE'))" \
  || error "policy-pending.json is not valid JSON"

PENDING_LEVEL=$(python3 -c "import json; d=json.load(open('$PENDING_FILE')); print(d.get('level',''))")
PENDING_TYPE=$(python3 -c "import json; d=json.load(open('$PENDING_FILE')); print(d.get('type',''))")
PENDING_MIN=$(python3 -c "import json; d=json.load(open('$PENDING_FILE')); print(d.get('minVersion',''))")
PENDING_KEYS=$(python3 -c "import json; d=json.load(open('$PENDING_FILE')); print(len(d))")

if [ "$PENDING_KEYS" -gt 0 ]; then
  # Non-empty — validate required fields
  [ -n "$PENDING_LEVEL" ] || error "policy-pending.json: missing 'level' field"
  [ -n "$PENDING_TYPE"  ] || error "policy-pending.json: missing 'type' field"
  [ -n "$PENDING_MIN"   ] || error "policy-pending.json: missing 'minVersion' field"

  LEVEL_VALID=false
  for v in "${VALID_LEVELS[@]}"; do [ "$PENDING_LEVEL" = "$v" ] && LEVEL_VALID=true; done
  $LEVEL_VALID || error "policy-pending.json: invalid 'level' '$PENDING_LEVEL'. Must be one of: ${VALID_LEVELS[*]}"

  TYPE_VALID=false
  for v in "${VALID_TYPES[@]}"; do [ "$PENDING_TYPE" = "$v" ] && TYPE_VALID=true; done
  $TYPE_VALID || error "policy-pending.json: invalid 'type' '$PENDING_TYPE'. Must be one of: ${VALID_TYPES[*]}"

  ALLOWED_KEYS='{"level","type","minVersion"}'
  UNKNOWN=$(python3 -c "
import json
d = json.load(open('$PENDING_FILE'))
allowed = {'level','type','minVersion'}
unknown = set(d.keys()) - allowed
print(' '.join(unknown))
")
  [ -z "$UNKNOWN" ] || error "policy-pending.json: unknown fields: $UNKNOWN"

  ok "policy-pending.json: valid (level=$PENDING_LEVEL, type=$PENDING_TYPE, minVersion=$PENDING_MIN)"
else
  ok "policy-pending.json: empty (no pending policy)"
fi

# ── Validate latest.json (if it exists) ───────────────────────────────────────

if [ ! -f "$LATEST_FILE" ]; then
  ok "latest.json not found — skipping (first release)"
  exit 0
fi

python3 -c "import json,sys; json.load(open('$LATEST_FILE'))" \
  || error "latest.json is not valid JSON"

python3 -c "
import json, sys

REQUIRED_FIELDS = {'lastRNVersion', 'url', 'bundleHash', 'minKotlinVersion', 'lastAppVersion'}
VALID_POLICY_KEYS = {'required', 'highly_recommended', 'recommended'}
VALID_ENTRY_FIELDS = {'type', 'minVersion', 'releaseNotesUrl'}
VALID_TYPES = {'app', 'rn', 'kotlin'}

d = json.load(open('$LATEST_FILE'))
missing = REQUIRED_FIELDS - set(d.keys())
if missing:
    print(f'missing required fields: {missing}', file=sys.stderr); sys.exit(1)

if not d.get('bundleHash', '').startswith('sha256:'):
    print('bundleHash must start with sha256:', file=sys.stderr); sys.exit(1)

policies = d.get('policies')
if policies is not None:
    if not isinstance(policies, dict):
        print('policies must be an object', file=sys.stderr); sys.exit(1)
    unknown_keys = set(policies.keys()) - VALID_POLICY_KEYS
    if unknown_keys:
        print(f'unknown policies keys: {unknown_keys}', file=sys.stderr); sys.exit(1)
    for level, entries in policies.items():
        if not isinstance(entries, list):
            print(f'policies.{level} must be an array', file=sys.stderr); sys.exit(1)
        for i, entry in enumerate(entries):
            missing_entry = VALID_ENTRY_FIELDS - set(entry.keys())
            if missing_entry:
                print(f'policies.{level}[{i}] missing fields: {missing_entry}', file=sys.stderr); sys.exit(1)
            if entry['type'] not in VALID_TYPES:
                print(f'policies.{level}[{i}].type invalid: {entry[\"type\"]}', file=sys.stderr); sys.exit(1)

print('OK')
" || error "latest.json failed validation"

ok "latest.json: valid"
