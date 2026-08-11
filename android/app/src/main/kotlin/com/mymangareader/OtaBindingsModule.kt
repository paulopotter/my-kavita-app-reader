package com.mymangareader

import com.mymangareader.tools.ota.CurrentAppVersion
import com.mymangareader.tools.ota.KotlinVersionName
import com.mymangareader.tools.ota.OtaManifestUrl
import com.mymangareader.tools.ota.OtaStore
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
    @KotlinVersionName
    fun provideKotlinVersionName(): String = BuildConfig.KOTLIN_VERSION_NAME

    @Provides
    @Singleton
    @CurrentAppVersion
    fun provideCurrentAppVersion(): String = BuildConfig.APP_BUILD_DATETIME
}
