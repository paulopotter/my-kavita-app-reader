#!/usr/bin/env bash
# Computes next semver for Kotlin and RN based on conventional commits since last tag.
# Outputs lines suitable for >> $GITHUB_OUTPUT.
set -euo pipefail

LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")

if [ -z "$LAST_TAG" ]; then
  COMMIT_RANGE="HEAD"
else
  COMMIT_RANGE="${LAST_TAG}..HEAD"
fi

KOTLIN_CURRENT=$(grep -oP '(?<=versionName = ").*(?=")' android/app/build.gradle.kts 2>/dev/null || echo "0.1.0")
RN_CURRENT=$(node -p "require('./frontend/package.json').version" 2>/dev/null || echo "0.1.0")

KOTLIN_BUMP="none"
RN_BUMP="none"

bump_level() {
  local type="$1"
  local is_breaking="$2"
  if [ "$is_breaking" = "true" ] || echo "$type" | grep -q '!'; then
    echo "major"
  elif [ "$type" = "feat" ]; then
    echo "minor"
  elif [ "$type" = "fix" ] || [ "$type" = "perf" ]; then
    echo "patch"
  else
    echo "none"
  fi
}

upgrade_bump() {
  local current="$1"
  local new="$2"
  if [ "$new" = "major" ]; then
    echo "major"
  elif [ "$new" = "minor" ] && [ "$current" != "major" ]; then
    echo "minor"
  elif [ "$new" = "patch" ] && [ "$current" = "none" ]; then
    echo "patch"
  else
    echo "$current"
  fi
}

while IFS= read -r entry; do
  MSG=$(echo "$entry" | grep -oP '^.*(?=\|\|)')
  HASH=$(echo "$entry" | grep -oP '(?<=\|\|).*')
  FILES=$(git diff-tree --no-commit-id -r --name-only "$HASH" 2>/dev/null | tr '\n' ',')

  TYPE=$(echo "$MSG" | grep -oP '^[a-z]+(?=[(:!])' || echo "")
  IS_BREAKING=$(echo "$MSG" | grep -q 'BREAKING CHANGE' && echo true || echo false)

  TOUCHES_ANDROID=false
  TOUCHES_FRONTEND=false
  while IFS= read -r f; do
    [[ "$f" == android/* ]] && TOUCHES_ANDROID=true
    [[ "$f" == frontend/* ]] && TOUCHES_FRONTEND=true
  done <<< "$(echo "$FILES" | tr ',' '\n')"

  if [ "$TOUCHES_ANDROID" = "true" ]; then
    LEVEL=$(bump_level "$TYPE" "$IS_BREAKING")
    KOTLIN_BUMP=$(upgrade_bump "$KOTLIN_BUMP" "$LEVEL")
  fi

  if [ "$TOUCHES_FRONTEND" = "true" ]; then
    LEVEL=$(bump_level "$TYPE" "$IS_BREAKING")
    RN_BUMP=$(upgrade_bump "$RN_BUMP" "$LEVEL")
  fi
done < <(git log "$COMMIT_RANGE" --format="%s||%H" 2>/dev/null)

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

KOTLIN_NEXT=$(apply_bump "$KOTLIN_CURRENT" "$KOTLIN_BUMP")
RN_NEXT=$(apply_bump "$RN_CURRENT" "$RN_BUMP")

echo "kotlin_current=$KOTLIN_CURRENT"
echo "kotlin_next=$KOTLIN_NEXT"
echo "kotlin_bump=$KOTLIN_BUMP"
echo "rn_current=$RN_CURRENT"
echo "rn_next=$RN_NEXT"
echo "rn_bump=$RN_BUMP"
