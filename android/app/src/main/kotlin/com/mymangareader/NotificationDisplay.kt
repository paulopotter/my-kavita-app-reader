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
import com.mymangareader.notifications.NotificationPoster
import com.mymangareader.notifications.NotificationPreferenceKeys
import com.mymangareader.notifications.NotificationTapTarget
import com.mymangareader.notifications.Notifications
import com.mymangareader.notifications.ResolvedSeriesEvent
import com.mymangareader.notifications.explodeToHistoryItems
import com.mymangareader.notifications.tapTarget
import com.mymangareader.preferences.Preferences
import com.mymangareader.server.Server
import com.mymangareader.tools.locale.AppLocale
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

private const val GROUP_NEW_CHAPTERS = "new_chapters_group"
private const val BRAND_COLOR = 0xFF1A1A2E.toInt()
// The small round avatar next to the notification's text — Android crops/circles this regardless
// of what's given, so it stays a modest square. The actual "bigger, vertical, like inside the app"
// cover (README's ask) is the BigPictureStyle image below instead, which Android only crops to fit
// its own frame, never forces circular.
private const val LARGE_ICON_TARGET_SIZE_PX = 256
// A manga cover's usual aspect ratio (~2:3, same as the Library/Serie screens' own cover tiles) —
// wide enough for BigPictureStyle's frame, tall enough to actually read as a cover once expanded.
private const val BIG_PICTURE_WIDTH_PX = 480
private const val BIG_PICTURE_HEIGHT_PX = 720

/**
 * Builds and posts the native "new chapter" notification — README's Decision 7 (format) and
 * Decision 6 (recipient filter, already applied by [com.mymangareader.notifications.NotificationResolver]
 * before this is ever called). One row/one system-tray notification per resolved BATCH, always —
 * never collapsed/replaced by a later batch for the same serial (see NotificationHistoryEntity's
 * own doc); each batch gets its own fresh history id ([Notifications.History.insert]) and its own
 * Android notification id derived from it, so multiple pending notifications for the same serial
 * can coexist in the tray, each independently tappable. Whether the in-app history LIST visually
 * groups rows that arrived close together is a separate, RN-side presentation concern
 * (collapseSerialChaptersNotification) that never reaches this class.
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
    ) : NotificationPoster {
        private val notificationManager = NotificationManagerCompat.from(context)

        override suspend fun post(resolved: ResolvedSeriesEvent) {
            // Exploded to one history row PER CHAPTER (NotificationHistoryEntity's own doc) — a
            // batch of N chapters detected together is still ONE system-tray notification below
            // (the tray always reflects the batch as received, never split per chapter), but N
            // separate rows in storage. The first row's id is what the tray notification itself
            // gets derived from/tap-linked to — an arbitrary but stable choice among the batch's
            // own rows, never meaningful on its own (markReadOnOpen-equivalent concerns are a
            // separate, not-yet-built piece — see this task's own scope note).
            val historyIds = resolved.explodeToHistoryItems().map { notifications.history.insert(it) }
            val historyId = historyIds.first()
            NotificationsBridgeModule.notifyUnreadCountChanged(notifications.history.countUnread())

            if (AppForegroundState.isForeground.value) {
                NotificationsBridgeModule.notifyNewNotificationReceived()
                return
            }

            // Same cover URL for both — Coil's own cache means only the first of these two actually
            // hits the network; the second is a cache-backed decode at a different target size.
            val coverUrl = runCatching { server.serial(resolved.seriesId).getCoverImage().url }.getOrNull()
            val largeIcon = coverUrl?.let { runCatching { loadCoverBitmap(it, LARGE_ICON_TARGET_SIZE_PX, LARGE_ICON_TARGET_SIZE_PX) }.getOrNull() }
            val bigPicture = coverUrl?.let { runCatching { loadCoverBitmap(it, BIG_PICTURE_WIDTH_PX, BIG_PICTURE_HEIGHT_PX) }.getOrNull() }
            // The app's own per-app language (AppLocale, `:tools`), never the OS system locale —
            // this Service has no JS/RN context to ask, so it resolves the same override
            // ConfigRepository.getAppLocale() reports to RN, independently.
            val body = buildBody(AppLocale.contextFor(context), resolved.chapterIds, resolved.chapterNumbers)
            val groupAcrossSeries = preferences.get(NotificationPreferenceKeys.GROUP_ACROSS_SERIES)?.value == "true"

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
                    .setContentIntent(buildTapPendingIntent(historyId, resolved.tapTarget()))
            largeIcon?.let { builder.setLargeIcon(it) }
            // Only the expanded (pulled-down) view shows this — the collapsed view still shows
            // just largeIcon + title/body, same as before.
            bigPicture?.let { builder.setStyle(NotificationCompat.BigPictureStyle().bigPicture(it)) }

            if (groupAcrossSeries) {
                builder.setGroup(GROUP_NEW_CHAPTERS)
            }

            notificationManager.notify(notificationId(historyId), builder.build())

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

        private suspend fun loadCoverBitmap(
            coverUrl: String,
            widthPx: Int,
            heightPx: Int,
        ): Bitmap? {
            val request = ImageRequest.Builder(context).data(coverUrl).build()
            val drawable = context.imageLoader.execute(request).drawable ?: return null
            return drawable.toBitmap(widthPx, heightPx)
        }

        // [target] decides WHERE the tap lands (NotificationTapTarget, `:notifications` — the
        // module already knows "1 known chapter -> reader, else -> serial", this only turns that
        // decision into a real deep link URI/Intent, per the same generalization rule as the rest
        // of `:notifications`: it knows "the serial's own server-assigned id", never "Kavita").
        private fun buildTapPendingIntent(
            historyId: String,
            target: NotificationTapTarget,
        ): PendingIntent {
            val uri =
                when (target) {
                    is NotificationTapTarget.Chapter -> "mymangareader://reader/${target.serialId}/${target.chapterId}"
                    is NotificationTapTarget.Serial -> "mymangareader://series/${target.serialId}"
                }
            val intent =
                Intent(context, MainActivity::class.java).apply {
                    action = Intent.ACTION_VIEW
                    data = Uri.parse(uri)
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                    // A tap-specific id, distinct from notificationId(historyId) below (which is
                    // still per-batch, but each batch is now its own row/notification, never
                    // reused across batches — see this class's own doc) — MainActivity.getIntent()
                    // consumes this exactly once (see its own doc), so re-opening the app later
                    // (icon, recents) with the same underlying Intent never re-triggers this deep
                    // link.
                    putExtra(MainActivity.EXTRA_DEEPLINK_TAP_ID, DeepLinkTapId.next())
                }
            return PendingIntent.getActivity(
                context,
                notificationId(historyId),
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            )
        }

        companion object {
            // Derived from the history row's own fresh id (a UUID, one per resolved batch) — never
            // derived from the serial's id anymore, since multiple pending notifications for the
            // same serial can now coexist in the tray (one per batch), each needing its own
            // distinct Android notification id rather than replacing one another.
            fun notificationId(historyId: String): Int = historyId.hashCode()

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
