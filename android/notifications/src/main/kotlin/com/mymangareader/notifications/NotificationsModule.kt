package com.mymangareader.notifications

import com.mymangareader.notifications.plugins.NotificationPluginRegistration
import com.mymangareader.notifications.plugins.ntfy.NtfyPlugin
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object NotificationsModule {
    // Every NotificationPlugin implementation's companion registration, keyed by its own id —
    // the one place that knows every real plugin class exists. Add a new plugin here (and
    // nowhere else) when a second one is implemented (e.g. Firebase Cloud Messaging).
    @Provides
    @Singleton
    fun provideNotificationPluginRegistrations(): Map<String, NotificationPluginRegistration> =
        mapOf(
            NtfyPlugin.Info.id to NtfyPlugin.Info,
        )
}
