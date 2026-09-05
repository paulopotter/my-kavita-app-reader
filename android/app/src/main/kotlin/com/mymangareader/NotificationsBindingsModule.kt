package com.mymangareader

import com.mymangareader.notifications.NotificationChannelState
import com.mymangareader.notifications.NotificationPoster
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent

// Binds NotificationDisplay (the concrete implementation, depends on Context/Coil/
// NotificationManagerCompat) as the NotificationPoster interface :notifications' own
// NotificationEventPipeline (Task 006) depends on, and NotificationChannelSync as the
// NotificationChannelState interface NotificationResolver/NotificationConnectionGate (Task 007)
// depend on — the Layer-below-provides-the-interface split documented on each interface itself.
@Module
@InstallIn(SingletonComponent::class)
abstract class NotificationsBindingsModule {
    @Binds
    abstract fun bindNotificationPoster(display: NotificationDisplay): NotificationPoster

    @Binds
    abstract fun bindNotificationChannelState(sync: NotificationChannelSync): NotificationChannelState
}
