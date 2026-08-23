package com.mymangareader.server

import com.mymangareader.server.plugins.ServerPluginRegistration
import com.mymangareader.server.plugins.kavita.KavitaServerPlugin
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object ServerModule {
    // Every ServerPlugin implementation's companion registration, keyed by its own id — the one
    // place that knows every real plugin class exists. Add a new provider here (and nowhere
    // else in Server.kt) when a second one is implemented.
    @Provides
    @Singleton
    fun providePluginRegistrations(): Map<String, ServerPluginRegistration> = mapOf(
        KavitaServerPlugin.Info.id to KavitaServerPlugin.Info,
    )
}
