package com.mymangareader

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.net.Uri
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.graphics.drawable.toBitmap
import coil.imageLoader
import coil.request.ImageRequest
import com.mymangareader.notifications.NewNotificationHistoryItem
import com.mymangareader.notifications.Notifications
import com.mymangareader.notifications.ResolvedSeriesEvent
import com.mymangareader.preferences.Preferences
import com.mymangareader.server.Server
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

private const val CHANNEL_NEW_CHAPTERS = "new_chapters"
private const val GROUP_NEW_CHAPTERS = "new_chapters_group"
private const val PREFERENCES_KEY_GROUP_ACROSS_SERIES = "groupAcrossSeries"
private const val BRAND_COLOR = 0xFF1A1A2E.toInt()
private const val COVER_TARGET_SIZE_PX = 256

/**
 * Builds and posts the native "new chapter" notification — README's Decision 7 (format) and
 * Decision 6 (recipient filter, already applied by [com.mymangareader.notifications.NotificationResolver]
 * before this is ever called). One notification per series, deterministic id so a new batch for
 * the same series replaces rather than stacks (same id also used as the history row's PK).
 *
 * Per the user's own rule: a visible system-tray notification only makes sense while the app is
 * NOT the thing the user is already looking at. When [AppForegroundState.isForeground] is true,
 * [post] skips the system tray entirely — it only records history/updates the unread badge and
 * emits [NotificationsBridgeModule.notifyNewNotificationReceived] for a future in-app banner to
 * react to (not built here — see this task's own scope note).
 */
@Singleton
class NotificationDisplay
    @Inject
    constructor(
        @ApplicationContext private val context: Context,
        private val notifications: Notifications,
        private val server: Server,
        private val preferences: Preferences,
    ) {
        private val notificationManager = NotificationManagerCompat.from(context)

        suspend fun post(resolved: ResolvedSeriesEvent) {
            notifications.history.insertOrReplace(
                NewNotificationHistoryItem(
                    id = notificationHistoryId(resolved.seriesId),
                    seriesId = resolved.seriesId,
                    seriesName = resolved.seriesName,
                    chapterIds = resolved.chapterIds,
                    chapterNumbers = resolved.chapterNumbers,
                    detectedAtMs = resolved.detectedAtMs,
                ),
            )

            if (AppForegroundState.isForeground.value) {
                NotificationsBridgeModule.notifyNewNotificationReceived()
                return
            }

            val largeIcon = runCatching { loadCoverBitmap(resolved.seriesId) }.getOrNull()
            val body = buildBody(context, resolved.chapterIds, resolved.chapterNumbers)
            val groupAcrossSeries = preferences.get(PREFERENCES_KEY_GROUP_ACROSS_SERIES)?.value == "true"

            val builder =
                NotificationCompat
                    .Builder(context, CHANNEL_NEW_CHAPTERS)
                    .setContentTitle(resolved.seriesName)
                    .setContentText(body)
                    .setSmallIcon(R.drawable.ic_notification)
                    .setColor(BRAND_COLOR)
                    .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                    .setWhen(resolved.detectedAtMs)
                    .setAutoCancel(true)
                    .setContentIntent(buildTapPendingIntent(resolved))
            largeIcon?.let { builder.setLargeIcon(it) }

            if (groupAcrossSeries) {
                builder.setGroup(GROUP_NEW_CHAPTERS)
            }

            notificationManager.notify(notificationId(resolved.seriesId), builder.build())

            if (groupAcrossSeries) {
                postGroupSummary()
            }
        }

        private fun postGroupSummary() {
            val summary =
                NotificationCompat
                    .Builder(context, CHANNEL_NEW_CHAPTERS)
                    .setSmallIcon(R.drawable.ic_notification)
                    .setColor(BRAND_COLOR)
                    .setGroup(GROUP_NEW_CHAPTERS)
                    .setGroupSummary(true)
                    .setAutoCancel(true)
                    .build()
            notificationManager.notify(GROUP_NEW_CHAPTERS.hashCode(), summary)
        }

        private suspend fun loadCoverBitmap(seriesId: String): Bitmap? {
            val coverUrl = server.serial(seriesId).getCoverImage().url
            val request = ImageRequest.Builder(context).data(coverUrl).build()
            val drawable = context.imageLoader.execute(request).drawable ?: return null
            return drawable.toBitmap(COVER_TARGET_SIZE_PX, COVER_TARGET_SIZE_PX)
        }

        private fun buildTapPendingIntent(resolved: ResolvedSeriesEvent): PendingIntent {
            val singleKnownChapterId = resolved.chapterIds?.singleOrNull()
            val uri =
                if (singleKnownChapterId != null) {
                    "mymangareader://reader/${resolved.seriesId}/$singleKnownChapterId"
                } else {
                    "mymangareader://series/${resolved.seriesId}"
                }
            val intent =
                Intent(context, MainActivity::class.java).apply {
                    action = Intent.ACTION_VIEW
                    data = Uri.parse(uri)
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                }
            return PendingIntent.getActivity(
                context,
                notificationId(resolved.seriesId),
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            )
        }

        suspend fun markReadOnOpen(seriesId: String) = notifications.history.markRead(notificationHistoryId(seriesId))

        companion object {
            // Deterministic — the same series always produces the same id, so a new batch for it
            // replaces the previous system-tray notification instead of stacking (README Decision 7).
            fun notificationId(seriesId: String): Int = seriesId.hashCode()

            // Same value, different type — NotificationHistoryEntity's PK is a String, Android's
            // notification id is an Int. Kept as one function each so neither call site has to
            // convert between them itself.
            fun notificationHistoryId(seriesId: String): String = notificationId(seriesId).toString()

            fun buildBody(
                context: Context,
                chapterIds: List<String>?,
                chapterNumbers: List<String>?,
            ): String {
                val count = chapterIds?.size ?: chapterNumbers?.size ?: 0
                return when {
                    count > 1 -> context.getString(R.string.notification_new_chapters_batch, count)
                    chapterNumbers?.singleOrNull() != null ->
                        context.getString(R.string.notification_new_chapter_numbered, chapterNumbers.single())
                    else -> context.getString(R.string.notification_new_chapter_unnumbered)
                }
            }
        }
    }
