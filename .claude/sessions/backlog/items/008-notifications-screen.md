# Backlog 008 — Notifications Screen

## What
In-app notification centre + notification provider configuration (ntfy, Firebase, etc.).
Eighth screen in migration order.

## Why
Lets users know when new chapters are available without opening the app.

## Scope (when planned)
- Kotlin: `NotificationProvider` plugin abstraction + ntfy implementation
  (first provider, others are future plugins)
- RN: `NotificationsScreen` → provider config + notification history list
- `events.notification` bridge stream consumed here
- Provider configured by URL + topic (from Config-adjacent settings)

## Dependencies
- Plan 001 (Config — URL/config storage pattern)
- Backlog 003 (Library — series data for notification enrichment)
