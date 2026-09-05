package com.mymangareader.notifications

import com.mymangareader.notifications.plugins.RawNotificationEvent
import javax.inject.Inject
import javax.inject.Singleton

/**
 * The one place a raw plugin event turns into (or doesn't turn into) a posted notification —
 * `resolve` → `shouldNotify` → `post`, exactly once per event, never duplicated inline inside
 * [com.mymangareader.NotificationConnectionService] (`android/app/`, Task 006). Extracted as its
 * own class specifically so this orchestration is testable with fakes, without needing a real
 * Android `Service` under Robolectric.
 */
@Singleton
class NotificationEventPipeline
    @Inject
    constructor(
        private val resolver: NotificationResolver,
        private val poster: NotificationPoster,
    ) {
        suspend fun handle(event: RawNotificationEvent) {
            val resolved = resolver.resolve(event) ?: return
            if (resolver.shouldNotify(resolved)) {
                poster.post(resolved)
            }
        }
    }
