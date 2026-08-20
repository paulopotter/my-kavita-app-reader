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
            )
            .build()

    @Provides
    fun provideServerConfigDao(db: AppDatabase): ServerConfigDao = db.serverConfigDao()

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
}
