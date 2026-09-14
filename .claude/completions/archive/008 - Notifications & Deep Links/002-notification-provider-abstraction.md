# Task 002 — `NotificationProvider` (L2) + `NtfyProvider` (L1) — ntfy WebSocket plugin

## Why after 001

The provider reads/selects the active URL from the groups schema built in Task 001, and needs
somewhere to persist "last known connection state" if that's ever cached.

## What to do

1. Define the Layer 2 contract in `:notifications`, named in contract vocabulary — mirroring how
   `ServerPlugin` is named around what a server *does*, not around "Kavita":

   ```kotlin
   interface NotificationProvider {
       suspend fun connect(url: NotificationUrl): Result<Unit>
       suspend fun disconnect()
       val events: Flow<RawNotificationEvent>
       val connectionState: StateFlow<ConnectionState>
   }
   ```

   `RawNotificationEvent` and `ConnectionState` are provider-agnostic shapes (decoded JSON, not
   raw ntfy wire format) — same idiom as `PluginSerial`/`PluginChapter` in `ServerPlugin`.
2. Implement `notifications/plugins/ntfy/NtfyProvider.kt` — the real ntfy WebSocket client
   (`wss://{host}/{topic}/ws` or ntfy's documented WebSocket endpoint), decoding each frame into
   `RawNotificationEvent` (which itself wraps the payload array described in the README's
   contract table — one raw event per array element).
3. `notifications/plugins/ntfy/NtfyPayload.kt` — the raw JSON DTOs for the wire payload (array of
   `{seriesId?, seriesName, chapterIds?, chapterNumbers?, detectedAtMs}`), plus the mapping
   function into the provider-agnostic `RawNotificationEvent`.
4. Reconnect-with-backoff lives inside `NtfyProvider` itself (the plugin owns its own protocol
   resilience) — exponential backoff capped at a sane ceiling, reset on a successful frame.
5. `companion object Info` on `NtfyProvider` for plugin registration, same idiom as
   `KavitaServerPlugin.Info`.

## Files to create

- `android/notifications/src/main/kotlin/com/mymangareader/notifications/NotificationProvider.kt`
- `android/notifications/src/main/kotlin/com/mymangareader/notifications/plugins/ntfy/NtfyProvider.kt`
- `android/notifications/src/main/kotlin/com/mymangareader/notifications/plugins/ntfy/NtfyPayload.kt`
- Matching `src/test/` files — provider contract tests with a fake WebSocket, and payload-mapping
  tests (malformed JSON, missing optional fields, empty array).

## Acceptance criteria

- A malformed JSON frame is dropped and logged, never crashes the provider.
- A frame with a JSON array of N objects yields N `RawNotificationEvent`s in order.
- Backoff reconnect attempts increase between failures and reset after a successful connection.
- `NtfyPayload` → `RawNotificationEvent` mapping test covers: both `chapterIds`/`chapterNumbers`
  present and same length, both absent, only one of the two present.
- `koverVerify` passes; floor bumped if coverage rose.

## Project-pattern checklist

- All ntfy-specific knowledge (WebSocket URL shape, wire JSON) stays inside
  `plugins/ntfy/` — nothing above this folder ever imports an ntfy-specific type.
- `NotificationProvider` is named around what it contractually does (connect/observe), never
  around "ntfy".
