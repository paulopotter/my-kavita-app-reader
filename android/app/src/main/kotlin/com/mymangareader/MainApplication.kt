package com.mymangareader

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.soloader.SoLoader
import com.mymangareader.core.database.DbStatusProvider
import com.mymangareader.features.bff.BffFeature
import com.mymangareader.features.kavita.KavitaAuthFeature
import com.mymangareader.features.kavita.KavitaSeriesFeature
import com.mymangareader.features.kavita.KavitaUrlSource
import com.mymangareader.tools.bridge.ConfigStore
import com.mymangareader.tools.ota.OtaStore
import dagger.hilt.android.HiltAndroidApp
import javax.inject.Inject

@HiltAndroidApp
class MainApplication : Application(), ReactApplication {

    @Inject lateinit var configStore: ConfigStore
    @Inject lateinit var dbStatus: DbStatusProvider
    @Inject lateinit var otaStore: OtaStore
    @Inject lateinit var crashGuard: CrashGuard
    @Inject lateinit var kavitaUrlSource: KavitaUrlSource
    @Inject lateinit var kavitaAuthFeature: KavitaAuthFeature
    @Inject lateinit var kavitaSeriesFeature: KavitaSeriesFeature
    @Inject lateinit var bffFeature: BffFeature

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
                    bffFeature = bffFeature,
                )

            override fun getJSMainModuleName(): String = "index"
            override fun getUseDeveloperSupport(): Boolean = false
            override val isNewArchEnabled: Boolean = true
            override val isHermesEnabled: Boolean = true
            override fun getJSBundleFile(): String? =
                otaStore.bundleFile.takeIf { it.exists() }?.absolutePath
        }
    }

    override val reactHost: ReactHost
        get() = getDefaultReactHost(applicationContext, reactNativeHost)

    override fun onCreate() {
        super.onCreate()
        SoLoader.init(this, false)
        if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
            DefaultNewArchitectureEntryPoint.load()
        }
        crashGuard.install()
    }
}
