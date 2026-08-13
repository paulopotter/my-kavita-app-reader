package com.mymangareader

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager
import com.mymangareader.core.database.ChapterCacheDao
import com.mymangareader.core.database.DbStatusProvider
import com.mymangareader.core.database.FollowedSeriesDao
import com.mymangareader.core.database.ServerConfigDao
import com.mymangareader.core.database.SeriesSortPrefsDao
import com.mymangareader.core.database.UiPreferencesDao
import com.mymangareader.features.bff.BffFeature
import com.mymangareader.features.kavita.KavitaAuthFeature
import com.mymangareader.features.kavita.KavitaUrlSource
import com.mymangareader.features.kavita.chapter.KavitaChapterFeature
import com.mymangareader.features.kavita.series.KavitaSeriesFeature
import com.mymangareader.features.startup.SplashSyncCoordinator
import com.mymangareader.tools.bridge.ConfigRepository
import com.mymangareader.tools.bridge.ConfigStore
import com.mymangareader.tools.bridge.DbValidatorModule
import com.mymangareader.tools.ota.OtaStore

class AppReactPackage(
    private val configStore: ConfigStore,
    private val dbStatus: DbStatusProvider,
    private val otaStore: OtaStore,
    private val kavitaUrlSource: KavitaUrlSource,
    private val kavitaAuthFeature: KavitaAuthFeature,
    private val kavitaSeriesFeature: KavitaSeriesFeature,
    private val kavitaChapterFeature: KavitaChapterFeature,
    private val bffFeature: BffFeature,
    private val followedSeriesDao: FollowedSeriesDao,
    private val serverConfigDao: ServerConfigDao,
    private val splashSyncCoordinator: SplashSyncCoordinator,
    private val chapterCacheDao: ChapterCacheDao,
    private val uiPreferencesDao: UiPreferencesDao,
    private val seriesSortPrefsDao: SeriesSortPrefsDao,
) : ReactPackage {

    override fun createNativeModules(context: ReactApplicationContext): List<NativeModule> {
        val otaBridge = OtaEventBridge(context, otaStore)
        OtaEventBridge.register(otaBridge)
        return listOf(
            ConfigRepository(configStore, context),
            DbValidatorModule(dbStatus, context),
            otaBridge,
            LibraryModule(kavitaSeriesFeature, kavitaChapterFeature, bffFeature, followedSeriesDao, context),
            SetupModule(kavitaUrlSource, kavitaAuthFeature, bffFeature, context),
            StartupModule(serverConfigDao, followedSeriesDao, splashSyncCoordinator, context),
            SeriesModule(
                kavitaSeriesFeature,
                kavitaChapterFeature,
                chapterCacheDao,
                followedSeriesDao,
                uiPreferencesDao,
                seriesSortPrefsDao,
                context,
            ),
        )
    }

    override fun createViewManagers(context: ReactApplicationContext): List<ViewManager<*, *>> =
        emptyList()
}
