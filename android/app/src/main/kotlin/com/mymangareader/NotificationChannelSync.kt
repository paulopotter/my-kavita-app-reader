package com.mymangareader

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.provider.Settings
import androidx.core.app.NotificationManagerCompat
import com.mymangareader.notifications.NotificationChannelState
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

const val CHANNEL_NEW_CHAPTERS = "new_chapters"
const val CHANNEL_CONNECTION = "notifications_connection"

/**
 * Owns the two Android notification channels this plan needs — creates/names them once, on first
 * run. Deliberately does NOT try to flip a channel's enabled state programmatically: Android does
 * not allow an app to change a channel's importance once the user has seen it (only the user can,
 * via system Settings) — so there is no "app writes the channel" direction here, only "app reads
 * it" ([isChannelEnabled], the [NotificationChannelState] implementation
 * [NotificationResolver]/[NotificationConnectionGate] consult) and "app sends the user to the
 * right place to change it" ([openChannelSettings]).
 */
@Singleton
class NotificationChannelSync
    @Inject
    constructor(
        @ApplicationContext private val context: Context,
    ) : NotificationChannelState {
        fun ensureChannelsCreated() {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
            val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            val newChaptersChannel =
                NotificationChannel(
                    CHANNEL_NEW_CHAPTERS,
                    context.getString(R.string.notification_channel_new_chapters_name),
                    NotificationManager.IMPORTANCE_DEFAULT,
                ).apply {
                    description = context.getString(R.string.notification_channel_new_chapters_description)
                }
            manager.createNotificationChannel(newChaptersChannel)

            val connectionChannel =
                NotificationChannel(
                    CHANNEL_CONNECTION,
                    context.getString(R.string.notification_channel_connection_name),
                    NotificationManager.IMPORTANCE_LOW,
                ).apply {
                    description = context.getString(R.string.notification_channel_connection_description)
                    setSound(null, null)
                    enableVibration(false)
                }
            manager.createNotificationChannel(connectionChannel)
        }

        // The one source of truth for "are new-chapter notifications enabled" — never a
        // :preferences flag that could disagree with what the user actually set in system
        // Settings. NotificationManagerCompat.areNotificationsEnabled() covers the app-wide
        // POST_NOTIFICATIONS grant; the channel's own importance covers this specific channel.
        override fun isEnabled(): Boolean {
            if (!NotificationManagerCompat.from(context).areNotificationsEnabled()) return false
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return true
            val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            val channel = manager.getNotificationChannel(CHANNEL_NEW_CHAPTERS) ?: return true
            return channel.importance != NotificationManager.IMPORTANCE_NONE
        }

        // Opens the system's own per-channel settings screen — the only way to actually flip the
        // channel's enabled state (or sound/vibration) once it has been created. FLAG_ACTIVITY_NEW_TASK
        // is required when starting an Activity from a non-Activity Context (this class is a plain
        // Hilt singleton, not bound to a UI Context).
        fun openChannelSettings() {
            val intent =
                Intent(Settings.ACTION_CHANNEL_NOTIFICATION_SETTINGS).apply {
                    putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
                    putExtra(Settings.EXTRA_CHANNEL_ID, CHANNEL_NEW_CHAPTERS)
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
            context.startActivity(intent)
        }
    }
