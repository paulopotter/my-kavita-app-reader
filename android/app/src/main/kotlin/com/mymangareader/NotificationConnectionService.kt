package com.mymangareader

import android.app.Notification
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.IBinder
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import com.mymangareader.notifications.NotificationConnectionGate
import com.mymangareader.notifications.NotificationEventPipeline
import com.mymangareader.notifications.NotificationGroupResolver
import com.mymangareader.notifications.Notifications
import com.mymangareader.notifications.plugins.ConnectionState
import com.mymangareader.notifications.plugins.NotificationPlugin
import com.mymangareader.notifications.plugins.NotificationPluginRegistration
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.cancel
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
 * never re-implements reconnection itself.
 */
@AndroidEntryPoint
class NotificationConnectionService : Service() {
    @Inject lateinit var pluginRegistrations: Map<String, @JvmSuppressWildcards NotificationPluginRegistration>

    @Inject lateinit var groupResolver: NotificationGroupResolver

    @Inject lateinit var eventPipeline: NotificationEventPipeline

    @Inject lateinit var notifications: Notifications

    @Inject lateinit var connectionGate: NotificationConnectionGate

    private val scope = CoroutineScope(Dispatchers.IO + Job())
    private var activePlugin: NotificationPlugin? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(
        intent: Intent?,
        flags: Int,
        startId: Int,
    ): Int {
        startForegroundWithConnectedNotification()
        updateStatus(NotificationServiceStatus.CONNECTING)
        scope.launch { connectAndObserve() }
        return START_STICKY
    }

    override fun onDestroy() {
        scope.launch { activePlugin?.disconnect() }
        scope.cancel()
        updateStatus(NotificationServiceStatus.STOPPED)
        super.onDestroy()
    }

    private suspend fun connectAndObserve() {
        if (!connectionGate.shouldConnect()) {
            stopSelf()
            return
        }
        val group = notifications.groups.list().firstOrNull() ?: return
        val plugin = pluginRegistrations[group.providerId]?.factory?.invoke() ?: return
        activePlugin = plugin

        val url = groupResolver.resolveActiveUrl()
        plugin.connect(url)

        scope.launch {
            plugin.connectionState.collect { state ->
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

    private fun updateStatus(status: NotificationServiceStatus) {
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

    private fun buildConnectedNotification(): Notification =
        NotificationCompat
            .Builder(this, CHANNEL_CONNECTION)
            .setContentTitle(getString(R.string.notification_connection_connected))
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
