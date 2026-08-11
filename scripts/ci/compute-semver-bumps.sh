#!/usr/bin/env bash
# Computes next semver for Kotlin and RN based on commits since last tag.
# Any commit touching android/ or frontend/ counts.
# Bump level: feat! / BREAKING CHANGE -> major, feat -> minor, everything else -> patch.
# Outputs key=value lines for >> $GITHUB_OUTPUT.
set -euo pipefail

LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
COMMIT_RANGE="${LAST_TAG:+${LAST_TAG}..HEAD}"
COMMIT_RANGE="${COMMIT_RANGE:-HEAD}"

KOTLIN_CURRENT=$(grep -oP '(?<=versionName = ").*(?=")' android/app/build.gradle.kts 2>/dev/null || echo "0.1.0")
RN_CURRENT=$(node -p "require('./frontend/package.json').version" 2>/dev/null || echo "0.1.0")

KOTLIN_BUMP="none"
RN_BUMP="none"

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
  IFS='.' read -r major minor patch <<< "$version"
  case "$bump" in
    major) echo "$((major + 1)).0.0" ;;
    minor) echo "${major}.$((minor + 1)).0" ;;
    patch) echo "${major}.${minor}.$((patch + 1))" ;;
    *)     echo "$version" ;;
  esac
}

while IFS=$'\t' read -r msg hash; do
  [ -z "$hash" ] && continue
  FILES=$(git diff-tree --no-commit-id -r --name-only "$hash" 2>/dev/null || echo "")

  TOUCHES_ANDROID=false
  TOUCHES_FRONTEND=false
  while IFS= read -r f; do
    [[ "$f" == android/* ]] && TOUCHES_ANDROID=true
    [[ "$f" == frontend/* ]] && TOUCHES_FRONTEND=true
  done <<< "$FILES"

  if [ "$TOUCHES_ANDROID" = "true" ]; then
    LEVEL=$(bump_level "$msg")
    KOTLIN_BUMP=$(upgrade_bump "$KOTLIN_BUMP" "$LEVEL")
  fi

  if [ "$TOUCHES_FRONTEND" = "true" ]; then
    LEVEL=$(bump_level "$msg")
    RN_BUMP=$(upgrade_bump "$RN_BUMP" "$LEVEL")
  fi
done < <(git log "$COMMIT_RANGE" --format="%s%x09%H" 2>/dev/null)

KOTLIN_NEXT=$(apply_bump "$KOTLIN_CURRENT" "$KOTLIN_BUMP")
RN_NEXT=$(apply_bump "$RN_CURRENT" "$RN_BUMP")

echo "kotlin_current=$KOTLIN_CURRENT"
echo "kotlin_next=$KOTLIN_NEXT"
echo "kotlin_bump=$KOTLIN_BUMP"
echo "rn_current=$RN_CURRENT"
echo "rn_next=$RN_NEXT"
echo "rn_bump=$RN_BUMP"
