---
task: 007 - build + install on device
plan: 001 - Config Screen
status: pending
---

# 007 — Build + Install on Device

Generate the first installable build of the new app and validate the
Config screen on a real device.

## Deliverables

- APK built and installed via `make deploy`
- JS bundle loaded by the APK
- Config screen functional on physical device

## Verification (manual — real device required)

1. `make deploy` completes without errors
2. App opens showing the Config screen
3. Add a Kavita server URL → appears in the list
4. Remove a URL → disappears from the list
5. Enter API key → tap save → status shows "authenticated" or error
6. "Test connection" → status reflects result
7. Toggle "keep screen on" → preference persists after app restart
8. Chapter sort mode selector → preference persists after app restart

## Notes

- Apply `versionar-build` skill before building (bumps to `0.1.0-rc1`).
- Version promoted to `0.1.0` only after user explicitly approves this build.
- This task is the acceptance gate for the entire plan 001.
