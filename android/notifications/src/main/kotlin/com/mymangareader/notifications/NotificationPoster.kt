package com.mymangareader.notifications

/**
 * Boundary between `:notifications` (this module, Kotlin-only) and whatever actually knows how to
 * post a native Android notification — `NotificationDisplay` (`android/app/`, Task 005), which
 * depends on `Context`/Coil/`NotificationManagerCompat` and therefore can't live in this module
 * without inverting the dependency direction (`:notifications` would have to depend on `:app`).
 *
 * [NotificationEventPipeline] depends only on this interface, never on `NotificationDisplay`
 * directly — the same "Layer 2 knows the shape, Layer above provides the implementation" split
 * already used elsewhere in this codebase.
 */
fun interface NotificationPoster {
    suspend fun post(resolved: ResolvedSeriesEvent)
}
