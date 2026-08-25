package com.mymangareader.externalmetadataserver

import com.mymangareader.externalmetadataserver.plugins.ExternalMetadataPluginRegistration
import com.mymangareader.externalmetadataserver.plugins.m3.M3Plugin
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object ExternalMetadataServerModule {
    // Every ExternalMetadataPlugin implementation's companion registration, keyed by its own id
    // — the one place that knows every real plugin class exists. Add a new provider here (and
    // nowhere else in ExternalMetadataServer.kt) when a second one is implemented.
    @Provides
    @Singleton
    fun providePluginRegistrations(): Map<String, ExternalMetadataPluginRegistration> = mapOf(
        M3Plugin.Info.id to M3Plugin.Info,
    )
}
