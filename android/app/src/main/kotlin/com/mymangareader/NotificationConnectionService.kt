package com.mymangareader

import android.app.Notification
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import com.mymangareader.notifications.NotificationConnectionGate
import com.mymangareader.notifications.NotificationEventPipeline
import com.mymangareader.notifications.NotificationGroupResolver
import com.mymangareader.notifications.Notifications
import com.mymangareader.notifications.plugins.ConnectionState
import com.mymangareader.notifications.plugins.NotificationPlugin
import com.mymangareader.notifications.plugins.NotificationPluginRegistration
import com.mymangareader.notifications.plugins.NotificationUrl
import com.mymangareader.tools.locale.AppLocale
import com.mymangareader.tools.network.NetworkAvailability
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

// Whether the service itself is running (not just the underlying plugin's WebSocket state) — a
// stopped service is DISCONNECTED regardless of what its last-known plugin state was, since
// nothing here re-reads a destroyed plugin instance.
enum class NotificationServiceStatus {
    STOPPED,
    CONNECTING,
    CONNECTED,
    DISCONNECTED,
}

private const val NOTIFICATION_ID_CONNECTED = 1001
private const val TAG = "NotificationConnService"

/**
 * Foreground service that owns the notification plugin's WebSocket lifecycle — wires the plugin
 * (Task 002), the group/URL resolver (Task 006), the series resolver (Task 003), and the display
 * (Task 005) into one running pipeline.
 *
 * [start]/[stop] (both plain [Context] calls — [Context.startService]/[Context.stopService], the
 * normal Service idiom, not a method called on a live instance) are exposed for a caller to drive
 * directly. The automatic "start when config appears, stop when it disappears" trigger is Task
 * 007's job (wherever groups/toggle become writable from RN) — this task only proves the pipeline
 * itself works when driven directly.
 *
 * Never duplicates resolution/display/protocol logic — every step delegates to the task that
 * already owns it. On a dropped connection, the plugin's own internal backoff (Task 002) handles
 * reconnection; this service only stays alive and keeps observing the same plugin instance — it
 * never re-implements reconnection itself. The one thing this service DOES own is retrying URL
 * resolution before a socket ever opens — see [resolveUrlWithRetry]'s own doc — since no candidate
 * being healthy yet is a different failure mode than a socket that connected once and dropped.
 */
@AndroidEntryPoint
class NotificationConnectionService : Service() {
    @Inject lateinit var pluginRegistrations: Map<String, @JvmSuppressWildcards NotificationPluginRegistration>

    @Inject lateinit var groupResolver: NotificationGroupResolver

    @Inject lateinit var eventPipeline: NotificationEventPipeline

    @Inject lateinit var notifications: Notifications

    @Inject lateinit var connectionGate: NotificationConnectionGate

    @Inject lateinit var networkAvailability: NetworkAvailability

    private val scope = CoroutineScope(Dispatchers.IO + Job())
    private var activePlugin: NotificationPlugin? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(
        intent: Intent?,
        flags: Int,
        startId: Int,
    ): Int {
        Log.i(TAG, "onStartCommand() — starting foreground service")
        startForegroundWithConnectedNotification()
        updateStatus(NotificationServiceStatus.CONNECTING)
        scope.launch { connectAndObserve() }
        return START_STICKY
    }

    override fun onDestroy() {
        Log.i(TAG, "onDestroy() — stopping foreground service")
        scope.launch { activePlugin?.disconnect() }
        scope.cancel()
        updateStatus(NotificationServiceStatus.STOPPED)
        super.onDestroy()
    }

    private suspend fun connectAndObserve() {
        if (!connectionGate.shouldConnect()) {
            Log.w(TAG, "connectAndObserve() — gate refused connection (channel disabled or no group configured), stopping self")
            updateStatus(NotificationServiceStatus.STOPPED)
            stopSelf()
            return
        }
        val group = notifications.groups.list().firstOrNull()
        if (group == null) {
            Log.w(TAG, "connectAndObserve() — no notification group found, aborting")
            updateStatus(NotificationServiceStatus.STOPPED)
            return
        }
        val plugin = pluginRegistrations[group.providerId]?.factory?.invoke()
        if (plugin == null) {
            Log.e(TAG, "connectAndObserve() — no plugin registered for providerId=${group.providerId}, aborting")
            updateStatus(NotificationServiceStatus.STOPPED)
            return
        }
        activePlugin = plugin

        val url = resolveUrlWithRetry(group.id) ?: return // gate turned this off mid-retry — already STOPPED
        Log.i(TAG, "connectAndObserve() — group=${group.id} (${group.name}) providerId=${group.providerId} url=${url.url} topic=${url.topic}")
        plugin.connect(url)

        scope.launch {
            plugin.connectionState.collect { state ->
                Log.d(TAG, "connectionState changed -> $state")
                updateStatus(
                    when (state) {
                        ConnectionState.CONNECTING -> NotificationServiceStatus.CONNECTING
                        ConnectionState.CONNECTED -> NotificationServiceStatus.CONNECTED
                        ConnectionState.DISCONNECTED -> NotificationServiceStatus.DISCONNECTED
                    },
                )
            }
        }
        scope.launch {
            plugin.events.collect { rawEvent -> eventPipeline.handle(rawEvent) }
        }
    }

    // Keeps retrying, with an exponential backoff capped at an hour (notificationResolveRetryDelayMs),
    // until either a healthy URL resolves or connectionGate says to stop (the user turned
    // notifications off, or removed the group, while this loop was waiting). Once a URL DOES
    // resolve and plugin.connect() runs, any FURTHER drop is NtfyPlugin's own much shorter reconnect
    // backoff (capped at 30s) — this loop only ever covers the step before a socket ever opens.
    //
    // Never retries while there's no network at all (airplane mode, no SIM/Wi-Fi) — a health check
    // against an unreachable network is doomed anyway, so skipping it straight to the next delayed
    // attempt avoids hammering a call that can't succeed. Still governed by the SAME backoff clock:
    // "no network" doesn't reset or fast-track the schedule, it just skips this attempt's probe.
    private suspend fun resolveUrlWithRetry(groupId: String): NotificationUrl? {
        var attempt = 0
        while (true) {
            if (!connectionGate.shouldConnect()) {
                Log.w(TAG, "resolveUrlWithRetry() — gate refused connection while retrying, stopping self")
                updateStatus(NotificationServiceStatus.STOPPED)
                return null
            }

            if (!networkAvailability.isConnected()) {
                Log.w(TAG, "resolveUrlWithRetry() — no network available, skipping this attempt (still counts toward backoff)")
            } else {
                val resolved =
                    runCatching { groupResolver.resolveActiveUrl() }
                        .onFailure { Log.e(TAG, "resolveUrlWithRetry() — could not resolve an active URL for group=$groupId (attempt=$attempt)", it) }
                        .getOrNull()
                if (resolved != null) return resolved
            }

            updateStatus(NotificationServiceStatus.DISCONNECTED)
            val delayMs = notificationResolveRetryDelayMs(attempt)
            Log.i(TAG, "resolveUrlWithRetry() — retrying in ${delayMs}ms (attempt=$attempt)")
            delay(delayMs)
            attempt++
        }
    }

    private fun updateStatus(status: NotificationServiceStatus) {
        Log.i(TAG, "status -> $status")
        _status.value = status
        NotificationsBridgeModule.notifyConnectionStatusChanged(status)
    }

    private fun startForegroundWithConnectedNotification() {
        val notification = buildConnectedNotification()
        ServiceCompat.startForeground(
            this,
            NOTIFICATION_ID_CONNECTED,
            notification,
            ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC,
        )
    }

    // AppLocale.contextFor(this), not this.getString(...) directly — the app's own per-app
    // language, never the OS system locale (same reasoning as NotificationDisplay's own doc).
    private fun buildConnectedNotification(): Notification =
        NotificationCompat
            .Builder(this, CHANNEL_CONNECTION)
            .setContentTitle(AppLocale.contextFor(this).getString(R.string.notification_connection_connected))
            .setSmallIcon(R.drawable.ic_notification)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .build()

    companion object {
        // Same-process, no IPC: read by NotificationsBridgeModule.getConnectionStatus() for a
        // point-in-time read, and mirrored into a native-origin RN event (see updateStatus above)
        // for the config screen to update live without polling. STOPPED is the correct initial
        // value — nothing has ever started this service in this process yet.
        private val _status = MutableStateFlow(NotificationServiceStatus.STOPPED)
        val status: StateFlow<NotificationServiceStatus> = _status.asStateFlow()

        fun start(context: Context) {
            context.startService(Intent(context, NotificationConnectionService::class.java))
        }

        fun stop(context: Context) {
            context.stopService(Intent(context, NotificationConnectionService::class.java))
        }
    }
}
