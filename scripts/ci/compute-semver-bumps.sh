#!/usr/bin/env bash
# Computes next semver for Kotlin and RN based on commits since last tag.
# Any commit touching android/ or frontend/ counts.
#
# Bump level per commit (by conventional-commit prefix):
#   feat! / fix! / BREAKING CHANGE -> major
#   feat                          -> minor
#   everything else               -> patch
#
# Explicit override — a `Release-As:` trailer on ANY commit in the range forces
# the bump, overriding the prefix calculation. Use it to promote a release the
# accumulated prefixes don't capture (e.g. a large architectural plan landed as
# dozens of polite `feat:` commits that together deserve major):
#   Release-As: major                -> both components
#   Release-As: minor (android)      -> Kotlin only
#   Release-As: major (frontend)     -> RN only
# It must be a real git trailer — in the LAST paragraph of the commit message,
# no blank line between it and any other trailer (e.g. Co-Authored-By). A
# mention in the body is ignored. The last `Release-As:` seen per component wins.
#
# Outputs key=value lines for >> $GITHUB_OUTPUT.
set -euo pipefail

LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
COMMIT_RANGE="${LAST_TAG:+${LAST_TAG}..HEAD}"
COMMIT_RANGE="${COMMIT_RANGE:-HEAD}"

KOTLIN_CURRENT=$(grep -oP '(?<=versionName = ").*(?=")' android/app/build.gradle.kts 2>/dev/null || echo "0.1.0")
RN_CURRENT=$(node -p "require('./frontend/package.json').version" 2>/dev/null || echo "0.1.0")

KOTLIN_BUMP="none"
RN_BUMP="none"
KOTLIN_OVERRIDE=""
RN_OVERRIDE=""

bump_level() {
  local msg="$1"
  local type
  type=$(echo "$msg" | grep -oP '^[a-z]+(?=[(:!])' || echo "")
  if echo "$msg" | grep -qP '(BREAKING CHANGE|feat!|fix!)'; then
    echo "major"
  elif [ "$type" = "feat" ]; then
    echo "minor"
  else
    echo "patch"
  fi
}

upgrade_bump() {
  local current="$1"
  local new="$2"
  case "$new" in
    major) echo "major" ;;
    minor) [ "$current" = "major" ] && echo "major" || echo "minor" ;;
    patch) [ "$current" = "none" ] && echo "patch" || echo "$current" ;;
    *)     echo "$current" ;;
  esac
}

apply_bump() {
  local version="$1"
  local bump="$2"
  local major minor patch
  # Strip any pre-release/build suffix (e.g. "0.8.0-rc109") before bumping.
  version="${version%%-*}"
  IFS='.' read -r major minor patch <<< "$version"
  major="${major:-0}"; minor="${minor:-0}"; patch="${patch:-0}"
  case "$bump" in
    major) echo "$((major + 1)).0.0" ;;
    minor) echo "${major}.$((minor + 1)).0" ;;
    patch) echo "${major}.${minor}.$((patch + 1))" ;;
    *)     echo "$version" ;;
  esac
}

# --- pass 1: prefix-based bump, per component -------------------------------
while IFS=$'\t' read -r hash msg; do
  [ -z "$hash" ] && continue
  FILES=$(git diff-tree --no-commit-id -r --name-only "$hash" 2>/dev/null || echo "")

  TOUCHES_ANDROID=false
  TOUCHES_FRONTEND=false
  while IFS= read -r f; do
    [[ "$f" == android/* ]] && TOUCHES_ANDROID=true
    [[ "$f" == frontend/* ]] && TOUCHES_FRONTEND=true
  done <<< "$FILES"

  if [ "$TOUCHES_ANDROID" = "true" ]; then
    KOTLIN_BUMP=$(upgrade_bump "$KOTLIN_BUMP" "$(bump_level "$msg")")
  fi
  if [ "$TOUCHES_FRONTEND" = "true" ]; then
    RN_BUMP=$(upgrade_bump "$RN_BUMP" "$(bump_level "$msg")")
  fi
done < <(git log "$COMMIT_RANGE" --format="%H%x09%s" 2>/dev/null)

# --- pass 2: Release-As override -------------------------------------------
# Read the `Release-As` trailer (git recognises it as a trailer only when it's
# in the closing Key: value block — a mention in the body is ignored). Commits
# oldest-first, so a later Release-As wins per component.
while IFS= read -r spec; do
  [ -z "$spec" ] && continue
  level=$(echo "$spec" | grep -oiE '^(major|minor|patch)' | tr '[:upper:]' '[:lower:]')
  scope=$(echo "$spec" | grep -oiE '\((android|frontend|both)\)' | tr -d '()' | tr '[:upper:]' '[:lower:]')
  [ -z "$level" ] && continue
  case "${scope:-both}" in
    android)  KOTLIN_OVERRIDE="$level" ;;
    frontend) RN_OVERRIDE="$level" ;;
    both)     KOTLIN_OVERRIDE="$level"; RN_OVERRIDE="$level" ;;
  esac
done < <(git log "$COMMIT_RANGE" --reverse --format='%(trailers:key=Release-As,valueonly,separator=%x00)' 2>/dev/null | tr '\0' '\n')

[ -n "$KOTLIN_OVERRIDE" ] && KOTLIN_BUMP="$KOTLIN_OVERRIDE"
[ -n "$RN_OVERRIDE" ] && RN_BUMP="$RN_OVERRIDE"

KOTLIN_NEXT=$(apply_bump "$KOTLIN_CURRENT" "$KOTLIN_BUMP")
RN_NEXT=$(apply_bump "$RN_CURRENT" "$RN_BUMP")

echo "kotlin_current=$KOTLIN_CURRENT"
echo "kotlin_next=$KOTLIN_NEXT"
echo "kotlin_bump=$KOTLIN_BUMP"
echo "kotlin_override=${KOTLIN_OVERRIDE:-none}"
echo "rn_current=$RN_CURRENT"
echo "rn_next=$RN_NEXT"
echo "rn_bump=$RN_BUMP"
echo "rn_override=${RN_OVERRIDE:-none}"
