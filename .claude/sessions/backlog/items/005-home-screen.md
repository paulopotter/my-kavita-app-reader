# Backlog 005 — Dashboard (Home)

## Status
Implemented as `screens/dashboard/` (code name "dashboard"; user-facing label "Home").
Rails: continue reading, new chapters (followed), recently updated, up next (followed), new in
library, plus a stats strip. Start screen is a setting (`StartScreenPrefs`); the tab is unlocked
on first consumption and never locks again. Resume-point freshness lives in the series domain
(`SerialRefreshTool`), not in the screen.

## Still open
- Adult-content filter (hide / blur / adult-only) across Library, Search and Dashboard.
- Series-level progress bar on Library/Following cards (the Dashboard bar is per chapter).
