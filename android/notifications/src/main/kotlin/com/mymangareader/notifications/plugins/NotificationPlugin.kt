package com.mymangareader.notifications.plugins

import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.StateFlow

// Provider-agnostic shapes NotificationPlugin speaks in — same idiom as PluginSerial/
// PluginChapter in ServerPlugin. A concrete adapter (e.g. NtfyPlugin) is responsible for
// translating its own wire protocol into these; nothing above plugins/<name>/ ever sees a
// provider-specific type.

/**
 * One URL candidate to connect a [NotificationPlugin] to — mirrors `NotificationUrlInfo`'s shape
 * but is provider-input only (no id/groupId), since a plugin never persists anything itself.
 */
data class NotificationUrl(
    val url: String,
    val topic: String,
    val timeoutMs: Int,
)

/**
 * One decoded event, already stripped of any provider-specific envelope — the payload contract's
 * shape (see this plan's README), not the raw wire frame. `seriesId` absent means the caller
 * (`NotificationResolver`, Task 003) must fall back to an exact `seriesName` match.
 */
data class RawNotificationEvent(
    val seriesId: String?,
    val seriesName: String,
    val chapterIds: List<String>?,
    val chapterNumbers: List<String>?,
    val detectedAtMs: Long,
)

enum class ConnectionState {
    DISCONNECTED,
    CONNECTING,
    CONNECTED,
}

/**
 * Contract every notification-provider plugin must satisfy — the shape a future foreground
 * service (Task 006) knows how to drive, regardless of which real push protocol answers behind
 * it. Named around what a plugin contractually does (connect/observe), never around "ntfy" —
 * same naming discipline as [com.mymangareader.server.plugins.ServerPlugin].
 *
 * [connect] does not throw on a transient failure — reconnection-with-backoff is each plugin's
 * own internal responsibility (its protocol resilience is its own concern, not the caller's); a
 * [Result.failure] here means the initial attempt itself could not even start (e.g. a malformed
 * URL). [events] and [connectionState] keep emitting for as long as the plugin is alive, across
 * any internal reconnect the plugin performs on its own.
 */
interface NotificationPlugin {
    suspend fun connect(url: NotificationUrl): Result<Unit>

    suspend fun disconnect()

    val events: Flow<RawNotificationEvent>

    val connectionState: StateFlow<ConnectionState>
}

/**
 * Everything the module needs to know about one [NotificationPlugin] implementation's static
 * identity, without constructing an instance — same idiom as `ServerPluginRegistration`. Add a
 * new plugin here (and nowhere else) when a second one is implemented (e.g. Firebase Cloud
 * Messaging).
 */
interface NotificationPluginRegistration {
    val id: String
    val displayName: String
    val version: String
    val factory: () -> NotificationPlugin
}
