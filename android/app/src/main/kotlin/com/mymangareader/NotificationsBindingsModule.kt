package com.mymangareader

import com.mymangareader.notifications.NotificationPoster
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent

// Binds NotificationDisplay (the concrete implementation, depends on Context/Coil/
// NotificationManagerCompat) as the NotificationPoster interface :notifications' own
// NotificationEventPipeline (Task 006) depends on — the Layer-below-provides-the-interface split
// documented on NotificationPoster itself.
@Module
@InstallIn(SingletonComponent::class)
abstract class NotificationsBindingsModule {
    @Binds
    abstract fun bindNotificationPoster(display: NotificationDisplay): NotificationPoster
}
