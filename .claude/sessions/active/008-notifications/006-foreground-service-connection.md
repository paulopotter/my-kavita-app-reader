# Task 006 — `NotificationConnectionService` (foreground service) + start/stop lifecycle

## Why after 002, 003, 005

This service is the thing that actually wires the provider (002), resolver (003), and display
(005) together into a running pipeline — it can't be built before any of the three exist.

## What to do

1. `NotificationConnectionService.kt` — a foreground `Service`:
   - `onStartCommand` picks the active group's highest-priority reachable URL (mirrors
     `ActiveUrlSelector`'s reasoning, reused if it can be generalized without coupling it to
     `:server`; otherwise a small `:notifications`-local equivalent — decide at implementation
     time, documented in this file's "Result" section once built), calls
     `NotificationProvider.connect(url)`.
   - Shows the required low-priority "connected" foreground notification immediately on start
     (Android requires this within a few seconds of `startForeground`).
   - Collects `NotificationProvider.events`, for each raw event: `NotificationResolver.resolve` →
     `shouldNotify` → `NotificationDisplay.post`.
   - On `connectionState` dropping to disconnected, lets the provider's own backoff (Task 002)
     handle reconnection — the service doesn't duplicate that logic, it just stays alive and keeps
     observing the same provider instance.
   - `onDestroy` calls `NotificationProvider.disconnect()` cleanly.
2. Start/stop triggers (both re-evaluated every time either changes):
   - **Start**: at least one `NotificationGroupEntity` has at least one URL **and** the
     `notifications` enabled preference is `true`.
   - **Stop**: either condition becomes false — last URL removed, or toggle turned off.
   This re-evaluation is driven from wherever groups/toggle are written (the bridge in Task 007),
   not polled from inside the service.
3. Manifest: declare the service with the appropriate foreground service type
   (`dataSync`/`connectedDevice`, whichever ntfy's persistent-connection nature best matches under
   current Android foreground-service-type rules at implementation time).

## Files to create

- `android/app/src/main/kotlin/com/mymangareader/NotificationConnectionService.kt`
- Matching test file — start/stop condition matrix (URL present/absent × toggle on/off → 4 cases,
  only "both true" starts), and a fake-provider test confirming an incoming event flows through
  resolver → display exactly once per event.

## Files to modify

- `android/app/src/main/AndroidManifest.xml` (service declaration + foreground service type +
  any required permission)

## Acceptance criteria

- All 4 start/stop matrix cases covered.
- Service posts the "connected" foreground notification before any Android foreground-service
  timeout would apply.
- `onDestroy` always calls `disconnect()`, even if `events` collection is mid-flight.
- `koverVerify` passes; floor bumped if coverage rose.

## Project-pattern checklist

- The service is thin orchestration — no resolution/display/protocol logic duplicated here, all
  of it delegates to Tasks 002, 003, 005.
- Start/stop is driven by config presence, never by an `if` scattered through unrelated code —
  the single re-evaluation point lives here.
