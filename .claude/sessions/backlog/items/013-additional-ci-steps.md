# Backlog 013 — Additional CI Steps

## What
Activate the placeholder CI steps in `pr.yml` and `release.yml` as the
corresponding code is implemented.

## Why
Each placeholder was left with a clear comment about what needs to exist
to activate it. This item tracks the activation work.

## Steps (activate as prerequisites land)

| Step | Activate when |
|------|--------------|
| `ktlint` in `pr.yml` | Plan 001 (Android scaffold) |
| ESLint in `pr.yml` | Plan 001 task 005 (frontend setup) |
| `test-kotlin` in `pr.yml` | First Kotlin unit tests written |
| `test-js` in `pr.yml` | First JS unit tests written |
| `test-bridge` in `pr.yml` | Bridge contract tests written |
| `check-migrations` in `pr.yml` | Backlog 012 (JS-side DB) |
| APK build in `pr.yml` + `release.yml` | Plan 001 (Android scaffold) |
| Bundle build in `pr.yml` + `release.yml` | Plan 001 task 005 (frontend) |
| `latest.json` + bundle publish in `release.yml` | Backlog 010 (OTA) |
| GitHub Pages deploy in `release.yml` | `site/` has content |

## Dependencies
- Each row depends on its prerequisite column
