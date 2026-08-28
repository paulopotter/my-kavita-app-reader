package com.mymangareader.core.database

import android.content.Context
import androidx.room.Room
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): AppDatabase =
        Room.databaseBuilder(context, AppDatabase::class.java, "mymangareader.db")
            .addMigrations(
                AppDatabase.MIGRATION_1_2,
                AppDatabase.MIGRATION_2_3,
                AppDatabase.MIGRATION_3_4,
                AppDatabase.MIGRATION_4_5,
                AppDatabase.MIGRATION_5_6,
                AppDatabase.MIGRATION_6_7,
                AppDatabase.MIGRATION_7_8,
                AppDatabase.MIGRATION_8_9,
                AppDatabase.MIGRATION_9_8,
                AppDatabase.MIGRATION_9_10,
                AppDatabase.MIGRATION_10_9,
                AppDatabase.MIGRATION_10_11,
                AppDatabase.MIGRATION_11_10,
                AppDatabase.MIGRATION_11_12,
                AppDatabase.MIGRATION_12_11,
            )
            .build()

    @Provides
    fun provideServerConfigDao(db: AppDatabase): ServerConfigDao = db.serverConfigDao()

    @Provides
    fun provideServerGroupDao(db: AppDatabase): ServerGroupDao = db.serverGroupDao()

    @Provides
    fun provideServerUrlDao(db: AppDatabase): ServerUrlDao = db.serverUrlDao()

    @Provides
    fun provideAuthConfigDao(db: AppDatabase): AuthConfigDao = db.authConfigDao()

    @Provides
    fun provideUiPreferencesDao(db: AppDatabase): UiPreferencesDao = db.uiPreferencesDao()

    @Provides
    fun provideChapterCacheDao(db: AppDatabase): ChapterCacheDao = db.chapterCacheDao()

    @Provides
    fun provideReadingProgressDao(db: AppDatabase): ReadingProgressDao = db.readingProgressDao()

    @Provides
    fun provideBffMatchDao(db: AppDatabase): BffMatchDao = db.bffMatchDao()

    @Provides
    fun provideBffServerConfigDao(db: AppDatabase): BffServerConfigDao = db.bffServerConfigDao()

    @Provides
    fun provideFollowedSeriesDao(db: AppDatabase): FollowedSeriesDao = db.followedSeriesDao()

    @Provides
    fun provideSeriesSortPrefsDao(db: AppDatabase): SeriesSortPrefsDao = db.seriesSortPrefsDao()

    @Provides
    fun providePageCacheDao(db: AppDatabase): PageCacheDao = db.pageCacheDao()

    @Provides
    fun provideSeriesDetailCacheDao(db: AppDatabase): SeriesDetailCacheDao = db.seriesDetailCacheDao()

    @Provides
    fun provideExternalMetadataGroupDao(db: AppDatabase): ExternalMetadataGroupDao = db.externalMetadataGroupDao()

    @Provides
    fun provideExternalMetadataUrlDao(db: AppDatabase): ExternalMetadataUrlDao = db.externalMetadataUrlDao()

    @Provides
    fun provideCacheDao(db: AppDatabase): CacheDao = db.cacheDao()

    @Provides
    fun providePreferenceDao(db: AppDatabase): PreferenceDao = db.preferenceDao()
}
