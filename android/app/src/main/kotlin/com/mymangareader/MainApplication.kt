package com.mymangareader

import android.app.Application
import coil.ImageLoader
import coil.ImageLoaderFactory
import coil.disk.DiskCache
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.soloader.SoLoader
import com.mymangareader.core.database.ChapterCacheDao
import com.mymangareader.core.database.DbStatusProvider
import com.mymangareader.core.database.FollowedSeriesDao
import com.mymangareader.core.database.ServerConfigDao
import com.mymangareader.core.database.SeriesSortPrefsDao
import com.mymangareader.core.database.UiPreferencesDao
import com.mymangareader.features.bff.BffFeature
import com.mymangareader.features.kavita.ActiveUrlWatcher
import com.mymangareader.features.kavita.KavitaAuthFeature
import com.mymangareader.features.kavita.KavitaUrlSource
import com.mymangareader.features.kavita.chapter.ChapterDataSource
import com.mymangareader.features.kavita.chapter.KavitaChapterFeature
import com.mymangareader.features.kavita.reader.ui.ReaderDebugFlags
import com.mymangareader.features.kavita.reader.ui.SafeBitmapDecoder
import com.mymangareader.features.kavita.series.KavitaSeriesFeature
import com.mymangareader.features.startup.SplashSyncCoordinator
import com.mymangareader.tools.bridge.ConfigStore
import com.mymangareader.tools.ota.OtaManager
import com.mymangareader.tools.ota.OtaStore
import dagger.hilt.android.HiltAndroidApp
import javax.inject.Inject

@HiltAndroidApp
class MainApplication : Application(), ReactApplication, ImageLoaderFactory {

    @Inject lateinit var configStore: ConfigStore
    @Inject lateinit var dbStatus: DbStatusProvider
    @Inject lateinit var otaStore: OtaStore
    @Inject lateinit var otaManager: OtaManager
    @Inject lateinit var crashGuard: CrashGuard
    @Inject lateinit var kavitaUrlSource: KavitaUrlSource
    @Inject lateinit var kavitaAuthFeature: KavitaAuthFeature
    @Inject lateinit var kavitaSeriesFeature: KavitaSeriesFeature
    @Inject lateinit var kavitaChapterFeature: KavitaChapterFeature
    // Typed as the interface (not KavitaChapterFeature) so ReaderChapterModule's provider stays
    // swappable without touching this wiring — see ChapterDataSource's doc for the rationale.
    @Inject lateinit var chapterDataSource: ChapterDataSource
    @Inject lateinit var bffFeature: BffFeature
    @Inject lateinit var followedSeriesDao: FollowedSeriesDao
    @Inject lateinit var serverConfigDao: ServerConfigDao
    @Inject lateinit var splashSyncCoordinator: SplashSyncCoordinator
    @Inject lateinit var chapterCacheDao: ChapterCacheDao
    @Inject lateinit var uiPreferencesDao: UiPreferencesDao
    @Inject lateinit var seriesSortPrefsDao: SeriesSortPrefsDao
    @Inject lateinit var activeUrlWatcher: ActiveUrlWatcher

    override val reactNativeHost: ReactNativeHost by lazy {
        object : DefaultReactNativeHost(this) {
            override fun getPackages(): List<ReactPackage> =
                PackageList(this).packages + AppReactPackage(
                    configStore = configStore,
                    dbStatus = dbStatus,
                    otaStore = otaStore,
                    kavitaUrlSource = kavitaUrlSource,
                    kavitaAuthFeature = kavitaAuthFeature,
                    kavitaSeriesFeature = kavitaSeriesFeature,
                    kavitaChapterFeature = kavitaChapterFeature,
                    chapterDataSource = chapterDataSource,
                    bffFeature = bffFeature,
                    followedSeriesDao = followedSeriesDao,
                    serverConfigDao = serverConfigDao,
                    splashSyncCoordinator = splashSyncCoordinator,
                    chapterCacheDao = chapterCacheDao,
                    uiPreferencesDao = uiPreferencesDao,
                    seriesSortPrefsDao = seriesSortPrefsDao,
                    activeUrlWatcher = activeUrlWatcher,
                )

            override fun getJSMainModuleName(): String = "index"
            override fun getUseDeveloperSupport(): Boolean = false
            override val isNewArchEnabled: Boolean = false
            override val isHermesEnabled: Boolean = true
            override fun getJSBundleFile(): String? =
                otaStore.bundleFile.takeIf { it.exists() }?.absolutePath
        }
    }

    override val reactHost: ReactHost? = null

    override fun onCreate() {
        super.onCreate()
        ReaderDebugFlags.d("CoilDiagnostic") { "app version=${BuildConfig.KOTLIN_VERSION_NAME}" }
        otaManager.discardStaleBundleIfNeeded()
        SoLoader.init(this, false)
        if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
            DefaultNewArchitectureEntryPoint.load()
        }
        crashGuard.install()
    }

    // Registers SafeBitmapDecoder globally so every Coil request (reader pages included) decodes
    // very tall images in tiles via BitmapRegionDecoder instead of asking BitmapFactory to decode
    // the raw resolution in one shot — see SafeBitmapDecoder for why that matters on-device.
    override fun newImageLoader(): ImageLoader =
        ImageLoader.Builder(this)
            .components { add(SafeBitmapDecoder.Factory()) }
            // Coil's default disk cache is 2% of free disk space, which on a nearly-full device
            // can be too small to hold more than a couple of chapters — pages get evicted and
            // re-downloaded on every reopen even though nothing on the server changed. A manga
            // reader's pages are exactly the kind of content worth a generous, explicit floor.
            .diskCache {
                DiskCache.Builder()
                    .directory(cacheDir.resolve("coil_page_cache"))
                    .maxSizeBytes(READER_DISK_CACHE_MAX_BYTES)
                    .build()
            }
            // Temporary diagnostic: confirms whether a failing request ever reached
            // SafeBitmapDecoder.Factory.create() at all. Remove once the tiled decode is confirmed
            // working.
            .eventListener(object : coil.EventListener {
                override fun onError(request: coil.request.ImageRequest, result: coil.request.ErrorResult) {
                    android.util.Log.e(
                        "CoilDiagnostic",
                        "onError url=${request.data} throwable=${result.throwable}",
                        result.throwable,
                    )
                }
            })
            .build()

    companion object {
        private const val READER_DISK_CACHE_MAX_BYTES = 500L * 1024 * 1024
    }
}
