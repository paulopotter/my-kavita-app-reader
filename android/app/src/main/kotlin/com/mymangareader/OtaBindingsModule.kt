package com.mymangareader

import com.mymangareader.tools.ota.CurrentAppVersion
import com.mymangareader.tools.ota.EmbeddedBundleBuildTimeMs
import com.mymangareader.tools.ota.KotlinVersionName
import com.mymangareader.tools.ota.OtaFallback
import com.mymangareader.tools.ota.OtaFallbackConfig
import com.mymangareader.tools.ota.OtaManifestUrl
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object OtaBindingsModule {
    @Provides
    @Singleton
    @OtaManifestUrl
    fun provideOtaManifestUrl(): String = BuildConfig.OTA_MANIFEST_URL

    @Provides
    @Singleton
    @OtaFallback
    fun provideOtaFallbackConfig(): OtaFallbackConfig =
        OtaFallbackConfig(
            officialManifestUrl = BuildConfig.OTA_OFFICIAL_MANIFEST_URL,
            onError = BuildConfig.OTA_FALLBACK_ON_ERROR,
            onNoUpdate = BuildConfig.OTA_FALLBACK_ON_NO_UPDATE,
        )

    @Provides
    @Singleton
    @KotlinVersionName
    fun provideKotlinVersionName(): String = BuildConfig.KOTLIN_VERSION_NAME

    @Provides
    @Singleton
    @CurrentAppVersion
    fun provideCurrentAppVersion(): String = BuildConfig.APP_BUILD_DATETIME

    @Provides
    @Singleton
    @EmbeddedBundleBuildTimeMs
    fun provideEmbeddedBundleBuildTimeMs(): Long = BuildConfig.EMBEDDED_BUNDLE_BUILD_TIME_MS
}
