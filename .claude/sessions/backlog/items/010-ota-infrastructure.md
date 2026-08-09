# Backlog 010 — OTA Infrastructure

## What
Over-the-air JS bundle updates: app checks `latest.json` on launch, downloads
newer bundle in background, switches on next open. Rollback on crash.

## Why
Core differentiator — lets UI ship without APK reinstall.

## Scope (when planned)
- Kotlin (`app/`): `OtaManager` — checks `latest.json`, downloads bundle, manages
  current + previous bundle on disk, marks bundle stable after N crash-free opens,
  reverts to previous bundle if crash detected before stability mark
- `latest.json` schema: `{ bundleVersion, minApkVersion, url }`
- URL precedence: GitHub Releases default → `.env` override at build time
- No runtime URL override
- CI/CD: `release.yml` already has the placeholder — activate it here

## Dependencies
- Plan 001 (Android scaffold must exist)
- Backlog 002 (Splash Screen — OTA check triggered there)
